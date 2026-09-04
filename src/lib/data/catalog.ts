import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type {
  Employee,
  ServiceType,
  Workstation,
  Customer,
  Vehicle,
  BusinessHours,
  ChecklistTemplate,
  ChecklistItem,
} from '@/types/database'

/**
 * Cadastros de apoio. Mudam pouco e sao lidos por quase toda tela,
 * por isso ficam em `cache` por request.
 */

export const getEmployees = cache(
  async (organizationId: string, onlyActive = true): Promise<Employee[]> => {
    const supabase = await createClient()
    let query = supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name')
    if (onlyActive) query = query.eq('is_active', true)
    const { data } = await query
    return data ?? []
  },
)

export const getApplicators = cache(async (organizationId: string): Promise<Employee[]> => {
  const all = await getEmployees(organizationId)
  return all.filter((e) => e.role === 'applicator' || e.role === 'manager')
})

export const getServiceTypes = cache(
  async (organizationId: string, onlyActive = true): Promise<ServiceType[]> => {
    const supabase = await createClient()
    let query = supabase
      .from('service_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order')
      .order('name')
    if (onlyActive) query = query.eq('is_active', true)
    const { data } = await query
    return data ?? []
  },
)

export const getWorkstations = cache(
  async (organizationId: string, onlyActive = true): Promise<Workstation[]> => {
    const supabase = await createClient()
    let query = supabase
      .from('workstations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order')
      .order('name')
    if (onlyActive) query = query.eq('is_active', true)
    const { data } = await query
    return data ?? []
  },
)

export const getBusinessHours = cache(
  async (organizationId: string): Promise<BusinessHours[]> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('business_hours')
      .select('*')
      .eq('organization_id', organizationId)
      .order('weekday')
    return data ?? []
  },
)

export async function getCustomers(organizationId: string, search?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')
    .limit(200)

  if (search?.trim()) {
    const term = search.trim()
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const { data } = await query
  return (data ?? []) as Customer[]
}

export async function getCustomerById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
  return data as Customer | null
}

export async function getVehiclesByCustomer(customerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Vehicle[]
}

export async function getEmployeeById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('employees')
    .select('*, specialties:employee_specialties(specialty)')
    .eq('id', id)
    .maybeSingle()
  return data as (Employee & { specialties: { specialty: string }[] }) | null
}

export async function getChecklistForOrder(organizationId: string, orderId: string) {
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('checklist_templates')
    .select('*, items:checklist_items(*)')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('is_default', true)
    .order('sort_order', { referencedTable: 'checklist_items' })
    .limit(1)
    .maybeSingle()

  const { data: responses } = await supabase
    .from('checklist_responses')
    .select('*')
    .eq('service_order_id', orderId)

  return {
    template: template as (ChecklistTemplate & { items: ChecklistItem[] }) | null,
    responses: responses ?? [],
  }
}

/** Lista de clientes com dados agregados para a tabela /clientes. */
export async function getCustomersWithStats(organizationId: string) {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('*, vehicles(id, brand, model, year, plate)')
    .eq('organization_id', organizationId)
    .order('name')
    .limit(300)

  const { data: orders } = await supabase
    .from('service_orders')
    .select('customer_id, scheduled_start, current_status')
    .eq('organization_id', organizationId)

  const stats = new Map<string, { total: number; last: string | null }>()
  for (const order of orders ?? []) {
    if (order.current_status === 'cancelled') continue
    const entry = stats.get(order.customer_id) ?? { total: 0, last: null }
    entry.total += 1
    if (!entry.last || order.scheduled_start > entry.last) entry.last = order.scheduled_start
    stats.set(order.customer_id, entry)
  }

  return (customers ?? []).map((c) => {
    const vehicles = (c.vehicles ?? []) as Pick<
      Vehicle,
      'id' | 'brand' | 'model' | 'year' | 'plate'
    >[]
    const stat = stats.get(c.id)
    return {
      ...(c as Customer),
      vehicles,
      lastVehicle: vehicles[0] ?? null,
      totalOrders: stat?.total ?? 0,
      lastOrderAt: stat?.last ?? null,
    }
  })
}
