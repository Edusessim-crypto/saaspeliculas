'use server'

import { revalidatePath } from 'next/cache'
import { authorize, fail, succeed, type ActionResult } from './shared'
import { customerSchema, vehicleSchema } from '@/lib/validation'
import type { Customer, Vehicle } from '@/types/database'

export async function createCustomer(raw: unknown): Promise<ActionResult<Customer>> {
  const auth = await authorize('customers:manage')
  if (!auth) return fail('Sem permissão para cadastrar clientes.')

  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { data, error } = await auth.supabase
    .from('customers')
    .insert({ ...parsed.data, organization_id: auth.session.organization.id })
    .select('*')
    .single()

  if (error || !data) return fail('Não foi possível salvar o cliente.')

  revalidatePath('/clientes')
  return succeed(data as Customer)
}

export async function updateCustomer(id: string, raw: unknown): Promise<ActionResult<Customer>> {
  const auth = await authorize('customers:manage')
  if (!auth) return fail('Sem permissão para editar clientes.')

  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { data, error } = await auth.supabase
    .from('customers')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return fail('Não foi possível salvar as alterações.')

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return succeed(data as Customer)
}

export async function createVehicle(raw: unknown): Promise<ActionResult<Vehicle>> {
  const auth = await authorize('customers:manage')
  if (!auth) return fail('Sem permissão para cadastrar veículos.')

  const parsed = vehicleSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { data, error } = await auth.supabase
    .from('vehicles')
    .insert({ ...parsed.data, organization_id: auth.session.organization.id })
    .select('*')
    .single()

  if (error || !data) return fail('Não foi possível salvar o veículo.')

  revalidatePath('/clientes')
  return succeed(data as Vehicle)
}

export async function updateVehicle(id: string, raw: unknown): Promise<ActionResult<Vehicle>> {
  const auth = await authorize('customers:manage')
  if (!auth) return fail('Sem permissão para editar veículos.')

  const parsed = vehicleSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { data, error } = await auth.supabase
    .from('vehicles')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return fail('Não foi possível salvar as alterações.')

  revalidatePath('/clientes')
  return succeed(data as Vehicle)
}

/** Busca usada no passo 1 do novo agendamento e na pesquisa global. */
export async function searchCustomers(term: string) {
  const auth = await authorize('orders:create')
  if (!auth || term.trim().length < 2) return { ok: true as const, data: [] }

  const q = term.trim()
  const digits = q.replace(/\D/g, '')

  const { data } = await auth.supabase
    .from('customers')
    .select('*, vehicles(id, brand, model, year, plate)')
    .eq('organization_id', auth.session.organization.id)
    .or(
      digits.length >= 3
        ? `name.ilike.%${q}%,phone.ilike.%${digits}%,whatsapp.ilike.%${digits}%`
        : `name.ilike.%${q}%`,
    )
    .limit(12)

  return { ok: true as const, data: data ?? [] }
}
