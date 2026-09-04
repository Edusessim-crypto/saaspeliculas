import { createClient } from '@/lib/supabase/server'
import type { ServiceOrderView } from '@/types/database'
import type { OrderStatus } from '@/domain/status'

/**
 * Shape unico de leitura de atendimento. Todas as telas (Hoje, Agenda,
 * Operacao, Aplicador) consomem esta projecao para nao divergirem.
 */
export const ORDER_SELECT = `
  *,
  customer:customers(id, name, phone, whatsapp),
  vehicle:vehicles(id, brand, model, year, color, plate),
  workstation:workstations(id, name),
  items:service_order_items(id, name_snapshot, duration_minutes, price, quantity),
  assignments:service_order_employees(
    is_lead,
    employee:employees(id, full_name, color, avatar_url)
  )
` as const

type RawAssignment = {
  is_lead: boolean
  employee: { id: string; full_name: string; color: string; avatar_url: string | null } | null
}

interface RawOrder extends Omit<ServiceOrderView, 'employees'> {
  assignments: RawAssignment[] | null
}

function normalize(row: RawOrder): ServiceOrderView {
  const { assignments, ...rest } = row
  return {
    ...rest,
    items: rest.items ?? [],
    employees: (assignments ?? [])
      .filter((a): a is RawAssignment & { employee: NonNullable<RawAssignment['employee']> } =>
        Boolean(a.employee),
      )
      .map((a) => ({
        employee_id: a.employee.id,
        full_name: a.employee.full_name,
        color: a.employee.color,
        avatar_url: a.employee.avatar_url,
        is_lead: a.is_lead,
      }))
      // Lider primeiro; o resto em ordem alfabetica para estabilidade visual.
      .sort((a, b) =>
        a.is_lead === b.is_lead
          ? a.full_name.localeCompare(b.full_name, 'pt-BR')
          : a.is_lead
            ? -1
            : 1,
      ),
  }
}

export function normalizeOrders(rows: unknown[]): ServiceOrderView[] {
  return (rows as RawOrder[]).map(normalize)
}

interface OrderRangeParams {
  organizationId: string
  from: Date
  to: Date
  /** Aplicador so enxerga as proprias ordens */
  employeeId?: string | null
  statuses?: OrderStatus[]
}

export async function getOrdersInRange({
  organizationId,
  from,
  to,
  employeeId,
  statuses,
}: OrderRangeParams): Promise<ServiceOrderView[]> {
  const supabase = await createClient()

  let query = supabase
    .from('service_orders')
    .select(ORDER_SELECT)
    .eq('organization_id', organizationId)
    .gte('scheduled_start', from.toISOString())
    .lte('scheduled_start', to.toISOString())
    .order('scheduled_start', { ascending: true })

  if (statuses?.length) query = query.in('current_status', statuses)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const orders = normalizeOrders(data ?? [])
  if (!employeeId) return orders
  return orders.filter((o) => o.employees.some((e) => e.employee_id === employeeId))
}

/** Ordens ativas na loja, independentemente da data agendada. */
export async function getActiveOrders(
  organizationId: string,
  employeeId?: string | null,
): Promise<ServiceOrderView[]> {
  const supabase = await createClient()
  const active: OrderStatus[] = [
    'arrived',
    'waiting',
    'preparation',
    'application',
    'inspection',
    'ready',
  ]

  const { data, error } = await supabase
    .from('service_orders')
    .select(ORDER_SELECT)
    .eq('organization_id', organizationId)
    .in('current_status', active)
    .order('scheduled_start', { ascending: true })

  if (error) throw new Error(error.message)

  const orders = normalizeOrders(data ?? [])
  if (!employeeId) return orders
  return orders.filter((o) => o.employees.some((e) => e.employee_id === employeeId))
}

export async function getOrderById(id: string): Promise<ServiceOrderView | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return normalize(data as unknown as RawOrder)
}

export async function getOrderHistory(orderId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('status_history')
    .select('*')
    .eq('service_order_id', orderId)
    .order('changed_at', { ascending: false })
  return data ?? []
}

export async function getOrdersByCustomer(customerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_orders')
    .select(ORDER_SELECT)
    .eq('customer_id', customerId)
    .order('scheduled_start', { ascending: false })
    .limit(50)
  return normalizeOrders(data ?? [])
}
