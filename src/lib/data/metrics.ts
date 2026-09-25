import { createClient } from '@/lib/supabase/server'
import { DEMO_MODE } from '@/lib/demo'
import { demoOrders } from '@/lib/demo/data'
import { executionMinutes, calculateDelay } from '@/domain/timing'
import type { OrderStatus } from '@/domain/status'

export interface EmployeeStats {
  employeeId: string
  total: number
  completed: number
  inProgress: number
  /** Minutos produtivos, medidos por execução real */
  productiveMinutes: number
  averageMinutes: number | null
  delayed: number
}

interface RawOrderRow {
  id: string
  current_status: OrderStatus
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  assignments: { employee_id: string }[] | null
}

/**
 * Produtividade por aplicador. Não usa "quem fez mais serviços" como
 * métrica isolada: durações diferem muito entre PPF e película, então
 * medimos também horas produtivas e tempo médio (§90).
 */
export async function getEmployeeStats(
  organizationId: string,
  from: Date,
  to: Date,
): Promise<Map<string, EmployeeStats>> {
  if (DEMO_MODE) {
    const stats = new Map<string, EmployeeStats>()
    for (const order of demoOrders) {
      const start = new Date(order.scheduled_start)
      if (start < from || start > to) continue
      for (const e of order.employees) {
        const cur = stats.get(e.employee_id) ?? {
          employeeId: e.employee_id, total: 0, completed: 0, inProgress: 0,
          productiveMinutes: 0, averageMinutes: null, delayed: 0,
        }
        cur.total += 1
        if (['ready', 'delivered'].includes(order.current_status)) cur.completed += 1
        if (['preparation', 'application'].includes(order.current_status)) cur.inProgress += 1
        cur.productiveMinutes += executionMinutes(order) ?? 0
        if (calculateDelay(order).isDelayed) cur.delayed += 1
        cur.averageMinutes = cur.completed ? Math.round(cur.productiveMinutes / cur.completed) : null
        stats.set(e.employee_id, cur)
      }
    }
    return stats
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('service_orders')
    .select(
      'id, current_status, scheduled_start, scheduled_end, actual_start, actual_end, assignments:service_order_employees(employee_id)',
    )
    .eq('organization_id', organizationId)
    .gte('scheduled_start', from.toISOString())
    .lte('scheduled_start', to.toISOString())

  const stats = new Map<string, EmployeeStats>()
  const durations = new Map<string, number[]>()
  const now = new Date()

  for (const row of (data ?? []) as RawOrderRow[]) {
    for (const assignment of row.assignments ?? []) {
      const id = assignment.employee_id
      const entry =
        stats.get(id) ??
        ({
          employeeId: id,
          total: 0,
          completed: 0,
          inProgress: 0,
          productiveMinutes: 0,
          averageMinutes: null,
          delayed: 0,
        } satisfies EmployeeStats)

      if (row.current_status === 'cancelled' || row.current_status === 'no_show') {
        stats.set(id, entry)
        continue
      }

      entry.total += 1

      if (['inspection', 'ready', 'delivered'].includes(row.current_status)) {
        entry.completed += 1
      }
      if (['preparation', 'application'].includes(row.current_status)) {
        entry.inProgress += 1
      }

      const minutes = executionMinutes(row)
      if (minutes !== null) {
        entry.productiveMinutes += minutes
        const list = durations.get(id) ?? []
        list.push(minutes)
        durations.set(id, list)
      }

      if (calculateDelay(row, now).isDelayed) entry.delayed += 1

      stats.set(id, entry)
    }
  }

  for (const [id, entry] of stats) {
    const list = durations.get(id) ?? []
    entry.averageMinutes = list.length
      ? Math.round(list.reduce((sum, v) => sum + v, 0) / list.length)
      : null
    stats.set(id, entry)
  }

  return stats
}

export interface DashboardMetrics {
  completed: number
  cancelled: number
  delayed: number
  averageExecutionMinutes: number | null
  occupancyRate: number
  byDay: { date: string; completed: number; scheduled: number }[]
  byCategory: { name: string; minutes: number; count: number }[]
}

export async function getDashboardMetrics(
  organizationId: string,
  from: Date,
  to: Date,
  capacityMinutesPerDay: number,
): Promise<DashboardMetrics> {
  if (DEMO_MODE) {
    const inRange = demoOrders.filter((o) => {
      const d = new Date(o.scheduled_start)
      return d >= from && d <= to
    })
    const completed = inRange.filter((o) => ['ready', 'delivered'].includes(o.current_status))
    const minutes = completed.map((o) => executionMinutes(o) ?? 0).filter(Boolean)
    const plannedMinutes = inRange.reduce(
      (sum, o) => sum + o.items.reduce((s2, i) => s2 + i.duration_minutes * i.quantity, 0),
      0,
    )
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000))

    const byDay = new Map<string, { completed: number; scheduled: number }>()
    for (const o of inRange) {
      const key = o.scheduled_start.slice(0, 10)
      const cur = byDay.get(key) ?? { completed: 0, scheduled: 0 }
      cur.scheduled += 1
      if (['ready', 'delivered'].includes(o.current_status)) cur.completed += 1
      byDay.set(key, cur)
    }

    const byCategory = new Map<string, { minutes: number; count: number }>()
    for (const o of inRange) {
      for (const item of o.items) {
        const cur = byCategory.get(item.name_snapshot) ?? { minutes: 0, count: 0 }
        cur.minutes += item.duration_minutes * item.quantity
        cur.count += item.quantity
        byCategory.set(item.name_snapshot, cur)
      }
    }

    return {
      completed: completed.length,
      cancelled: demoOrders.filter((o) => o.current_status === 'cancelled').length,
      delayed: inRange.filter((o) => calculateDelay(o).isDelayed).length,
      averageExecutionMinutes: minutes.length
        ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)
        : null,
      occupancyRate: Math.min(1, plannedMinutes / (capacityMinutesPerDay * days)),
      byDay: [...byDay.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byCategory: [...byCategory.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.minutes - a.minutes),
    }
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('service_orders')
    .select(
      'id, current_status, scheduled_start, scheduled_end, actual_start, actual_end, items:service_order_items(name_snapshot, duration_minutes, quantity)',
    )
    .eq('organization_id', organizationId)
    .gte('scheduled_start', from.toISOString())
    .lte('scheduled_start', to.toISOString())

  const rows = (data ?? []) as (RawOrderRow & {
    items: { name_snapshot: string; duration_minutes: number; quantity: number }[] | null
  })[]

  let completed = 0
  let cancelled = 0
  let delayed = 0
  let scheduledMinutes = 0
  const executionTimes: number[] = []
  const byDay = new Map<string, { completed: number; scheduled: number }>()
  const byCategory = new Map<string, { minutes: number; count: number }>()
  const now = new Date()

  for (const row of rows) {
    const day = row.scheduled_start.slice(0, 10)
    const dayEntry = byDay.get(day) ?? { completed: 0, scheduled: 0 }

    if (row.current_status === 'cancelled' || row.current_status === 'no_show') {
      cancelled += 1
      byDay.set(day, dayEntry)
      continue
    }

    dayEntry.scheduled += 1

    if (['inspection', 'ready', 'delivered'].includes(row.current_status)) {
      completed += 1
      dayEntry.completed += 1
    }

    if (calculateDelay(row, now).isDelayed) delayed += 1

    const minutes = executionMinutes(row)
    if (minutes !== null) executionTimes.push(minutes)

    for (const item of row.items ?? []) {
      const total = item.duration_minutes * item.quantity
      scheduledMinutes += total
      const entry = byCategory.get(item.name_snapshot) ?? { minutes: 0, count: 0 }
      entry.minutes += total
      entry.count += 1
      byCategory.set(item.name_snapshot, entry)
    }

    byDay.set(day, dayEntry)
  }

  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000))
  const capacity = capacityMinutesPerDay * days

  return {
    completed,
    cancelled,
    delayed,
    averageExecutionMinutes: executionTimes.length
      ? Math.round(executionTimes.reduce((sum, v) => sum + v, 0) / executionTimes.length)
      : null,
    occupancyRate: capacity > 0 ? Math.min(100, Math.round((scheduledMinutes / capacity) * 100)) : 0,
    byDay: [...byDay.entries()]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: [...byCategory.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8),
  }
}
