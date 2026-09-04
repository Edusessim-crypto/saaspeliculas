'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authorize, fail, succeed, type ActionResult } from './shared'
import { employeeSchema, serviceTypeSchema, workstationSchema } from '@/lib/validation'
import type { Employee, ServiceType, Workstation } from '@/types/database'

// ---------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------

export async function saveEmployee(
  id: string | null,
  raw: unknown,
): Promise<ActionResult<Employee>> {
  const auth = await authorize('team:manage')
  if (!auth) return fail('Sem permissão para gerenciar a equipe.')

  const parsed = employeeSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { specialties, ...fields } = parsed.data
  const { session, supabase } = auth

  const { data, error } = id
    ? await supabase.from('employees').update(fields).eq('id', id).select('*').single()
    : await supabase
        .from('employees')
        .insert({ ...fields, organization_id: session.organization.id })
        .select('*')
        .single()

  if (error || !data) return fail('Não foi possível salvar o colaborador.')

  await supabase.from('employee_specialties').delete().eq('employee_id', data.id)
  if (specialties.length) {
    await supabase
      .from('employee_specialties')
      .insert(specialties.map((specialty) => ({ employee_id: data.id, specialty })))
  }

  revalidatePath('/equipe')
  revalidatePath(`/equipe/${data.id}`)
  return succeed(data as Employee)
}

/** Soft delete: colaborador vira inativo, o historico permanece (§139). */
export async function setEmployeeActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await authorize('team:manage')
  if (!auth) return fail('Sem permissão.')

  const { error } = await auth.supabase
    .from('employees')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return fail('Não foi possível alterar o colaborador.')
  revalidatePath('/equipe')
  return succeed()
}

// ---------------------------------------------------------------
// Servicos
// ---------------------------------------------------------------

export async function saveServiceType(
  id: string | null,
  raw: unknown,
): Promise<ActionResult<ServiceType>> {
  const auth = await authorize('service_types:manage')
  if (!auth) return fail('Sem permissão para gerenciar serviços.')

  const parsed = serviceTypeSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { session, supabase } = auth
  const { data, error } = id
    ? await supabase.from('service_types').update(parsed.data).eq('id', id).select('*').single()
    : await supabase
        .from('service_types')
        .insert({ ...parsed.data, organization_id: session.organization.id })
        .select('*')
        .single()

  if (error || !data) return fail('Não foi possível salvar o serviço.')

  revalidatePath('/configuracoes/servicos')
  return succeed(data as ServiceType)
}

export async function setServiceTypeActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await authorize('service_types:manage')
  if (!auth) return fail('Sem permissão.')

  const { error } = await auth.supabase
    .from('service_types')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return fail('Não foi possível alterar o serviço.')
  revalidatePath('/configuracoes/servicos')
  return succeed()
}

// ---------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------

export async function saveWorkstation(
  id: string | null,
  raw: unknown,
): Promise<ActionResult<Workstation>> {
  const auth = await authorize('workstations:manage')
  if (!auth) return fail('Sem permissão para gerenciar boxes.')

  const parsed = workstationSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { session, supabase } = auth
  const { data, error } = id
    ? await supabase.from('workstations').update(parsed.data).eq('id', id).select('*').single()
    : await supabase
        .from('workstations')
        .insert({
          ...parsed.data,
          organization_id: session.organization.id,
          location_id: session.locationId,
        })
        .select('*')
        .single()

  if (error || !data) return fail('Não foi possível salvar o box.')

  revalidatePath('/configuracoes/boxes')
  return succeed(data as Workstation)
}

export async function setWorkstationActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await authorize('workstations:manage')
  if (!auth) return fail('Sem permissão.')

  const { error } = await auth.supabase
    .from('workstations')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return fail('Não foi possível alterar o box.')
  revalidatePath('/configuracoes/boxes')
  return succeed()
}

// ---------------------------------------------------------------
// Horario de funcionamento
// ---------------------------------------------------------------

const hoursSchema = z.object({
  hours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      is_open: z.boolean(),
      opens_at: z.string().nullable(),
      closes_at: z.string().nullable(),
      break_start: z.string().nullable(),
      break_end: z.string().nullable(),
    }),
  ),
})

export async function saveBusinessHours(raw: unknown): Promise<ActionResult> {
  const auth = await authorize('org:settings')
  if (!auth) return fail('Sem permissão para alterar os horários.')

  const parsed = hoursSchema.safeParse(raw)
  if (!parsed.success) return fail('Dados inválidos.')

  const { session, supabase } = auth
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('organization_id', session.organization.id)
    .limit(1)
    .maybeSingle()

  if (!location) return fail('Unidade não encontrada.')

  const { error } = await supabase.from('business_hours').upsert(
    parsed.data.hours.map((h) => ({
      ...h,
      organization_id: session.organization.id,
      location_id: location.id,
    })),
    { onConflict: 'location_id,weekday' },
  )

  if (error) return fail('Não foi possível salvar os horários.')
  revalidatePath('/configuracoes/horarios')
  return succeed()
}

export async function updateOrganization(name: string): Promise<ActionResult> {
  const auth = await authorize('org:settings')
  if (!auth) return fail('Sem permissão.')
  if (name.trim().length < 2) return fail('Informe o nome da empresa.')

  const { error } = await auth.supabase
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', auth.session.organization.id)

  if (error) return fail('Não foi possível salvar.')
  revalidatePath('/configuracoes')
  return succeed()
}
