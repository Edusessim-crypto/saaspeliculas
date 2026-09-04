import type { Metadata } from 'next'
import { startOfDay, endOfDay } from 'date-fns'
import { requireSession } from '@/lib/data/session'
import { getEmployees } from '@/lib/data/catalog'
import { getActiveOrders, getOrdersInRange } from '@/lib/data/orders'
import { getEmployeeStats } from '@/lib/data/metrics'
import { TeamView } from './team-view'

export const metadata: Metadata = { title: 'Equipe' }
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const session = await requireSession()
  const now = new Date()

  const [employees, todayOrders, activeOrders, stats] = await Promise.all([
    getEmployees(session.organization.id, false),
    getOrdersInRange({
      organizationId: session.organization.id,
      from: startOfDay(now),
      to: endOfDay(now),
    }),
    getActiveOrders(session.organization.id),
    getEmployeeStats(session.organization.id, startOfDay(now), endOfDay(now)),
  ])

  const byId = new Map(todayOrders.map((o) => [o.id, o]))
  for (const order of activeOrders) byId.set(order.id, order)

  return (
    <TeamView
      employees={employees}
      orders={[...byId.values()]}
      stats={Object.fromEntries(stats)}
      role={session.role}
    />
  )
}
