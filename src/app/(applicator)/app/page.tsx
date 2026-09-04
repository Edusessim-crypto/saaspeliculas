import type { Metadata } from 'next'
import { startOfDay, endOfDay } from 'date-fns'
import { requireSession } from '@/lib/data/session'
import { getOrdersInRange, getActiveOrders } from '@/lib/data/orders'
import { ApplicatorHome } from '@/components/applicator/applicator-home'

export const metadata: Metadata = { title: 'Meus serviços' }
export const dynamic = 'force-dynamic'

export default async function ApplicatorPage() {
  const session = await requireSession()
  const now = new Date()

  const [today, active] = await Promise.all([
    getOrdersInRange({
      organizationId: session.organization.id,
      from: startOfDay(now),
      to: endOfDay(now),
      employeeId: session.employeeId,
    }),
    getActiveOrders(session.organization.id, session.employeeId),
  ])

  const byId = new Map(today.map((o) => [o.id, o]))
  for (const order of active) byId.set(order.id, order)

  const orders = [...byId.values()].sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
  )

  return <ApplicatorHome orders={orders} firstName={session.profile.full_name.split(' ')[0] ?? ''} />
}
