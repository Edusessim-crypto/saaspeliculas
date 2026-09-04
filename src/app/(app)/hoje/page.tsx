import type { Metadata } from 'next'
import { startOfDay, endOfDay } from 'date-fns'
import { requireSession } from '@/lib/data/session'
import { getOrdersInRange, getActiveOrders } from '@/lib/data/orders'
import { getEmployees } from '@/lib/data/catalog'
import { TodayView } from './today-view'

export const metadata: Metadata = { title: 'Hoje na loja' }
export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const session = await requireSession()
  const now = new Date()

  const [scheduled, active, employees] = await Promise.all([
    getOrdersInRange({
      organizationId: session.organization.id,
      from: startOfDay(now),
      to: endOfDay(now),
    }),
    getActiveOrders(session.organization.id),
    getEmployees(session.organization.id),
  ])

  // Ordens ativas de dias anteriores ainda pertencem ao dia de hoje na
  // pratica: o carro esta na loja. Unimos as duas listas sem duplicar.
  const byId = new Map(scheduled.map((o) => [o.id, o]))
  for (const order of active) byId.set(order.id, order)

  const orders = [...byId.values()].sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
  )

  return (
    <TodayView
      orders={orders}
      employees={employees}
      role={session.role}
      organizationId={session.organization.id}
    />
  )
}
