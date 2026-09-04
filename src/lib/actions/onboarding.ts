'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/data/session'
import { fail, succeed, type ActionResult } from './shared'
import { DEFAULT_SERVICE_TYPES, DEFAULT_CHECKLIST, DEFAULT_HOURS } from '@/domain/defaults'

const onboardingSchema = z.object({
  company_name: z.string().trim().min(2, 'Informe o nome da empresa'),
  location_name: z.string().trim().min(1, 'Informe o nome da unidade'),
  location_address: z.string().trim().optional().default(''),
  hours: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        is_open: z.boolean(),
        opens_at: z.string().nullable(),
        closes_at: z.string().nullable(),
      }),
    )
    .optional(),
  employees: z
    .array(
      z.object({
        full_name: z.string().trim().min(2),
        role: z.enum(['manager', 'reception', 'applicator']),
        color: z.string().default('#2563EB'),
      }),
    )
    .optional()
    .default([]),
  service_type_ids: z.array(z.string()).optional().default([]),
})

/**
 * Cria a organizacao completa em um passo: unidade, horarios, equipe,
 * catalogo de servicos e checklist padrao. Tudo que a loja precisa para
 * comecar a agendar no minuto seguinte.
 */
export async function completeOnboarding(raw: unknown): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fail('Sessão expirada. Entre novamente.')

  const parsed = onboardingSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const input = parsed.data

  const existing = await getSessionContext()
  let organizationId = existing?.organization.id ?? null

  if (!organizationId) {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({
        name: input.company_name,
        slug: input.company_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40),
      })
      .select('id')
      .single()

    if (error || !org) return fail('Não foi possível criar a empresa.')
    organizationId = org.id

    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: organizationId,
      user_id: user.id,
      role: 'owner',
    })
    if (memberError) return fail('Não foi possível vincular seu usuário à empresa.')
  } else {
    await supabase
      .from('organizations')
      .update({ name: input.company_name })
      .eq('id', organizationId)
  }

  const { data: location } = await supabase
    .from('locations')
    .upsert(
      {
        organization_id: organizationId,
        name: input.location_name,
        address: input.location_address || null,
      },
      { onConflict: 'id' },
    )
    .select('id')
    .single()

  const locationId = location?.id ?? null

  const hours = input.hours ?? DEFAULT_HOURS
  if (locationId) {
    await supabase.from('business_hours').upsert(
      hours.map((h) => ({
        organization_id: organizationId,
        location_id: locationId,
        weekday: h.weekday,
        is_open: h.is_open,
        opens_at: h.opens_at,
        closes_at: h.closes_at,
        break_start: null,
        break_end: null,
      })),
      { onConflict: 'location_id,weekday' },
    )
  }

  // O proprietario tambem vira colaborador, para aparecer na equipe.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (!count) {
    await supabase.from('employees').insert({
      organization_id: organizationId,
      location_id: locationId,
      user_id: user.id,
      full_name: profile?.full_name || 'Proprietário',
      role: 'owner',
      job_title: 'Proprietário',
      color: '#172554',
    })
  }

  if (input.employees.length) {
    await supabase.from('employees').insert(
      input.employees.map((e) => ({
        organization_id: organizationId,
        location_id: locationId,
        full_name: e.full_name,
        role: e.role,
        job_title: e.role === 'applicator' ? 'Aplicador' : null,
        color: e.color,
      })),
    )
  }

  const selected = input.service_type_ids.length
    ? DEFAULT_SERVICE_TYPES.filter((s) => input.service_type_ids.includes(s.key))
    : DEFAULT_SERVICE_TYPES

  const { count: serviceCount } = await supabase
    .from('service_types')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (!serviceCount) {
    await supabase.from('service_types').insert(
      selected.map((s, index) => ({
        organization_id: organizationId,
        name: s.name,
        category: s.category,
        default_duration_minutes: s.duration,
        default_employee_count: s.employees,
        requires_workstation: s.requiresWorkstation,
        color: s.color,
        sort_order: index,
      })),
    )

    await supabase.from('workstations').insert(
      [
        { name: 'Box 01', sort_order: 0 },
        { name: 'Box 02', sort_order: 1 },
      ].map((w) => ({
        ...w,
        organization_id: organizationId,
        location_id: locationId,
      })),
    )
  }

  const { data: template } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .maybeSingle()

  if (!template) {
    const { data: newTemplate } = await supabase
      .from('checklist_templates')
      .insert({
        organization_id: organizationId,
        name: DEFAULT_CHECKLIST.name,
        is_default: true,
      })
      .select('id')
      .single()

    if (newTemplate) {
      await supabase.from('checklist_items').insert(
        DEFAULT_CHECKLIST.items.map((item, index) => ({
          template_id: newTemplate.id,
          label: item.label,
          is_required: item.required,
          sort_order: index,
        })),
      )
    }
  }

  await supabase
    .from('organizations')
    .update({ onboarding_completed: true })
    .eq('id', organizationId)

  revalidatePath('/', 'layout')
  return succeed()
}
