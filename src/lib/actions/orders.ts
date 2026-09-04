'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authorize, fail, succeed, logActivity, type ActionResult } from './shared'
import { orderSchema } from '@/lib/validation'
import { checkTransition, canReopen } from '@/domain/state-machine'
import { STATUS_CONFIG, type OrderStatus } from '@/domain/status'
import { addMinutes } from '@/domain/timing'
import { formatDateTime } from '@/lib/format'
import { can } from '@/domain/roles'
import type { ScheduleConflict } from '@/types/database'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

const OPERATIONAL_PATHS = ['/hoje', '/operacao', '/agenda', '/app', '/indicadores']

function revalidateOperation() {
  for (const path of OPERATIONAL_PATHS) revalidatePath(path)
}

/** Monta o instante a partir de data + hora no fuso local do navegador do servidor. */
function composeDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

// ---------------------------------------------------------------
// Conflitos de agenda (§31)
// ---------------------------------------------------------------

export async function checkConflicts(input: {
  date: string
  start_time: string
  duration_minutes: number
  employee_ids: string[]
  workstation_id: string | null
  exclude_order_id?: string | null
}): Promise<ActionResult<ScheduleConflict[]>> {
  const auth = await authorize('orders:create')
  if (!auth) return fail('Sem permissão para consultar a agenda.')

  const start = composeDateTime(input.date, input.start_time)
  const end = addMinutes(start, input.duration_minutes)

  const { data, error } = await auth.supabase.rpc('check_schedule_conflicts', {
    p_organization_id: auth.session.organization.id,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_employee_ids: input.employee_ids,
    p_workstation_id: input.workstation_id,
    p_exclude_order_id: input.exclude_order_id ?? null,
  })

  if (error) return fail(error.message)
  return succeed((data ?? []) as ScheduleConflict[])
}

// ---------------------------------------------------------------
// Criacao
// ---------------------------------------------------------------

export async function createOrder(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize('orders:create')
  if (!auth) return fail('Sem permissão para criar atendimentos.')

  const parsed = orderSchema.safeParse(raw)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  }
  const input = parsed.data
  const { session, supabase } = auth

  const start = composeDateTime(input.date, input.start_time)
  const end = addMinutes(start, input.duration_minutes)

  // Conflito nao bloqueia por padrao: informa e exige override de quem pode.
  const conflicts = await checkConflicts({
    date: input.date,
    start_time: input.start_time,
    duration_minutes: input.duration_minutes,
    employee_ids: input.employee_ids,
    workstation_id: input.workstation_id ?? null,
  })

  if (conflicts.ok && conflicts.data?.length && !input.force_conflict) {
    return fail('CONFLICT')
  }

  if (conflicts.data?.length && input.force_conflict && !can(session.role, 'orders:force_conflict')) {
    return fail('Somente a gestão pode confirmar um horário com conflito.')
  }

  const { data: serviceTypes, error: stError } = await supabase
    .from('service_types')
    .select('id, name, default_duration_minutes, default_price')
    .in('id', input.service_type_ids)
    .eq('organization_id', session.organization.id)

  if (stError || !serviceTypes?.length) return fail('Serviços não encontrados.')

  const { data: order, error } = await supabase
    .from('service_orders')
    .insert({
      organization_id: session.organization.id,
      location_id: session.locationId,
      customer_id: input.customer_id,
      vehicle_id: input.vehicle_id,
      service_address: input.service_address,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      current_status: 'scheduled' satisfies OrderStatus,
      priority: input.priority,
      workstation_id: input.workstation_id,
      internal_notes: input.internal_notes,
      customer_notes: input.customer_notes,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !order) return fail(error?.message ?? 'Não foi possível criar o atendimento.')

  // Snapshot dos servicos: preserva nome e duracao no momento do agendamento.
  const items = input.service_type_ids.map((id) => {
    const st = serviceTypes.find((s) => s.id === id)
    return {
      organization_id: session.organization.id,
      service_order_id: order.id,
      service_type_id: id,
      name_snapshot: st?.name ?? 'Serviço',
      duration_minutes: st?.default_duration_minutes ?? 60,
      price: st?.default_price ?? null,
      quantity: 1,
    }
  })
  await supabase.from('service_order_items').insert(items)

  if (input.employee_ids.length) {
    await supabase.from('service_order_employees').insert(
      input.employee_ids.map((employeeId, index) => ({
        organization_id: session.organization.id,
        service_order_id: order.id,
        employee_id: employeeId,
        is_lead: index === 0,
      })),
    )
  }

  await logActivity(supabase, {
    organizationId: session.organization.id,
    orderId: order.id,
    actorId: session.userId,
    actorName: session.profile.full_name,
    action: 'order.created',
    description: `Atendimento criado para ${formatDateTime(start)}`,
  })

  revalidateOperation()
  return succeed({ id: order.id })
}

// ---------------------------------------------------------------
// Transicao de status — o coracao da operacao
// ---------------------------------------------------------------

const statusChangeSchema = z.object({
  order_id: z.string().uuid(),
  to: z.enum([
    'scheduled', 'arrived', 'waiting', 'preparation', 'application',
    'inspection', 'ready', 'delivered', 'cancelled', 'no_show',
  ]),
  reason: z.string().trim().max(500).optional(),
})

export async function changeOrderStatus(raw: unknown): Promise<ActionResult> {
  const auth = await authorize('orders:advance_own')
  if (!auth) return fail('Sem permissão para alterar o atendimento.')

  const parsed = statusChangeSchema.safeParse(raw)
  if (!parsed.success) return fail('Dados inválidos.')

  const { order_id, to, reason } = parsed.data
  const { session, supabase } = auth

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, current_status, organization_id')
    .eq('id', order_id)
    .maybeSingle()

  if (!order) return fail('Atendimento não encontrado.')

  const from = order.current_status as OrderStatus
  const check = checkTransition(from, to, session.role)
  if (!check.allowed) return fail(check.reason ?? 'Transição não permitida.')

  if (check.requiresReason && !reason?.trim()) {
    return fail('Informe o motivo do cancelamento.')
  }

  // Conferencia exige checklist obrigatorio completo (§39).
  if (check.requiresChecklist) {
    const pending = await pendingChecklistItems(supabase, session.organization.id, order_id)
    if (pending > 0) return fail('CHECKLIST_REQUIRED')
  }

  const { error } = await supabase
    .from('service_orders')
    .update({
      current_status: to,
      ...(to === 'cancelled' ? { cancellation_reason: reason ?? null } : {}),
    })
    .eq('id', order_id)

  if (error) return fail('Não foi possível atualizar o status.')

  await logActivity(supabase, {
    organizationId: session.organization.id,
    orderId: order_id,
    actorId: session.userId,
    actorName: session.profile.full_name,
    action: 'order.status_changed',
    description: `${session.profile.full_name} alterou o status para "${STATUS_CONFIG[to].label}"`,
    metadata: { from, to, reason },
  })

  revalidateOperation()
  revalidatePath(`/app/servico/${order_id}`)
  return succeed()
}

async function pendingChecklistItems(
  supabase: SupabaseServerClient,
  organizationId: string,
  orderId: string,
): Promise<number> {
  const { data: template } = await supabase
    .from('checklist_templates')
    .select('id, items:checklist_items(id, is_required)')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!template) return 0

  const required = ((template.items ?? []) as { id: string; is_required: boolean }[]).filter(
    (i) => i.is_required,
  )
  if (!required.length) return 0

  const { data: responses } = await supabase
    .from('checklist_responses')
    .select('checklist_item_id, checked')
    .eq('service_order_id', orderId)

  const checked = new Set(
    (responses ?? []).filter((r) => r.checked).map((r) => r.checklist_item_id),
  )
  return required.filter((i) => !checked.has(i.id)).length
}

/** Reabertura explicita de atendimento terminal (§97). */
export async function reopenOrder(orderId: string, to: OrderStatus): Promise<ActionResult> {
  const auth = await authorize('orders:reopen')
  if (!auth) return fail('Somente a gestão pode reabrir um atendimento.')

  const { session, supabase } = auth
  const { data: order } = await supabase
    .from('service_orders')
    .select('current_status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return fail('Atendimento não encontrado.')
  if (!canReopen(order.current_status as OrderStatus, session.role)) {
    return fail('Este atendimento não pode ser reaberto.')
  }

  const { error } = await supabase
    .from('service_orders')
    .update({ current_status: to })
    .eq('id', orderId)

  if (error) return fail('Não foi possível reabrir o atendimento.')

  await logActivity(supabase, {
    organizationId: session.organization.id,
    orderId,
    actorId: session.userId,
    actorName: session.profile.full_name,
    action: 'order.reopened',
    description: `${session.profile.full_name} reabriu o atendimento`,
  })

  revalidateOperation()
  return succeed()
}

// ---------------------------------------------------------------
// Reagendamento, atribuicao e observacoes
// ---------------------------------------------------------------

const rescheduleSchema = z.object({
  order_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().min(15),
  force_conflict: z.boolean().default(false),
})

export async function rescheduleOrder(raw: unknown): Promise<ActionResult> {
  const auth = await authorize('orders:edit')
  if (!auth) return fail('Sem permissão para reagendar.')

  const parsed = rescheduleSchema.safeParse(raw)
  if (!parsed.success) return fail('Dados inválidos.')
  const input = parsed.data
  const { session, supabase } = auth

  const { data: order } = await supabase
    .from('service_orders')
    .select('scheduled_start, workstation_id')
    .eq('id', input.order_id)
    .maybeSingle()

  if (!order) return fail('Atendimento não encontrado.')

  const { data: assignments } = await supabase
    .from('service_order_employees')
    .select('employee_id')
    .eq('service_order_id', input.order_id)

  const start = composeDateTime(input.date, input.start_time)
  const end = addMinutes(start, input.duration_minutes)

  const conflicts = await checkConflicts({
    date: input.date,
    start_time: input.start_time,
    duration_minutes: input.duration_minutes,
    employee_ids: (assignments ?? []).map((a) => a.employee_id),
    workstation_id: order.workstation_id,
    exclude_order_id: input.order_id,
  })

  if (conflicts.data?.length && !input.force_conflict) return fail('CONFLICT')

  const { error } = await supabase
    .from('service_orders')
    .update({
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
    })
    .eq('id', input.order_id)

  if (error) return fail('Não foi possível reagendar.')

  await logActivity(supabase, {
    organizationId: session.organization.id,
    orderId: input.order_id,
    actorId: session.userId,
    actorName: session.profile.full_name,
    action: 'order.rescheduled',
    description: `Reagendado de ${formatDateTime(order.scheduled_start)} para ${formatDateTime(start)}`,
  })

  await supabase.from('notifications').insert({
    organization_id: session.organization.id,
    service_order_id: input.order_id,
    kind: 'rescheduled',
    title: 'Atendimento reagendado',
    body: `Novo horário: ${formatDateTime(start)}`,
  })

  revalidateOperation()
  return succeed()
}

export async function assignEmployees(
  orderId: string,
  employeeIds: string[],
  forceConflict = false,
): Promise<ActionResult> {
  const auth = await authorize('orders:assign')
  if (!auth) return fail('Sem permissão para atribuir aplicadores.')

  const { session, supabase } = auth

  const { data: order } = await supabase
    .from('service_orders')
    .select('scheduled_start, scheduled_end, workstation_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return fail('Atendimento não encontrado.')

  const { data: conflicts } = await supabase.rpc('check_schedule_conflicts', {
    p_organization_id: session.organization.id,
    p_start: order.scheduled_start,
    p_end: order.scheduled_end,
    p_employee_ids: employeeIds,
    p_workstation_id: null,
    p_exclude_order_id: orderId,
  })

  if ((conflicts as ScheduleConflict[] | null)?.length && !forceConflict) {
    return fail('CONFLICT')
  }

  const { data: previous } = await supabase
    .from('service_order_employees')
    .select('employee:employees(full_name)')
    .eq('service_order_id', orderId)

  await supabase.from('service_order_employees').delete().eq('service_order_id', orderId)

  if (employeeIds.length) {
    const { error } = await supabase.from('service_order_employees').insert(
      employeeIds.map((employeeId, index) => ({
        organization_id: session.organization.id,
        service_order_id: orderId,
        employee_id: employeeId,
        is_lead: index === 0,
      })),
    )
    if (error) return fail('Não foi possível atribuir os aplicadores.')
  }

  const { data: current } = await supabase
    .from('service_order_employees')
    .select('employee:employees(full_name)')
    .eq('service_order_id', orderId)

  const names = (list: typeof previous) =>
    (list ?? [])
      .map((r) => {
        const emp = r.employee as unknown as { full_name: string } | null
        return emp?.full_name
      })
      .filter(Boolean)
      .join(', ') || 'ninguém'

  await logActivity(supabase, {
    organizationId: session.organization.id,
    orderId,
    actorId: session.userId,
    actorName: session.profile.full_name,
    action: 'order.employees_changed',
    description: `${session.profile.full_name} alterou o aplicador de ${names(previous)} para ${names(current)}`,
  })

  revalidateOperation()
  return succeed()
}

export async function updateOrderNotes(
  orderId: string,
  notes: string,
): Promise<ActionResult> {
  const auth = await authorize('orders:advance_own')
  if (!auth) return fail('Sem permissão.')

  const { session, supabase } = auth
  const { error } = await supabase
    .from('service_orders')
    .update({ internal_notes: notes.trim() || null })
    .eq('id', orderId)

  if (error) return fail('Não foi possível salvar a observação.')

  await logActivity(supabase, {
    organizationId: session.organization.id,
    orderId,
    actorId: session.userId,
    actorName: session.profile.full_name,
    action: 'order.note_added',
    description: `${session.profile.full_name} adicionou uma observação`,
  })

  revalidateOperation()
  revalidatePath(`/app/servico/${orderId}`)
  return succeed()
}

export async function setWorkstation(
  orderId: string,
  workstationId: string | null,
): Promise<ActionResult> {
  const auth = await authorize('orders:edit')
  if (!auth) return fail('Sem permissão.')

  const { error } = await auth.supabase
    .from('service_orders')
    .update({ workstation_id: workstationId })
    .eq('id', orderId)

  if (error) return fail('Não foi possível alterar o box.')
  revalidateOperation()
  return succeed()
}
