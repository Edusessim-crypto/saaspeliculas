import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { requireSession } from '@/lib/data/session'
import { getEmployeeById } from '@/lib/data/catalog'
import { getOrdersInRange, getActiveOrders } from '@/lib/data/orders'
import { getEmployeeStats } from '@/lib/data/metrics'
import { EmployeeDetail } from './employee-detail'

export const metadata: Metadata = { title: 'Colaborador' }
export const dynamic = 'force-dynamic'

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  const employee = await getEmployeeById(id)
  if (!employee || employee.organization_id !== session.organization.id) notFound()

  const now = new Date()

  const [todayOrders, activeOrders, todayStats, weekStats] = await Promise.all([
    getOrdersInRange({
      organizationId: session.organization.id,
      from: startOfDay(now),
      to: endOfDay(now),
      employeeId: id,
    }),
    getActiveOrders(session.organization.id, id),
    getEmployeeStats(session.organization.id, startOfDay(now), endOfDay(now)),
    getEmployeeStats(session.organization.id, startOfDay(subDays(now, 6)), endOfDay(now)),
  ])

  const byId = new Map(todayOrders.map((o) => [o.id, o]))
  for (const order of activeOrders) byId.set(order.id, order)

  return (
    <EmployeeDetail
      employee={employee}
      specialties={employee.specialties.map((s) => s.specialty)}
      orders={[...byId.values()].sort(
        (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
      )}
      todayStats={todayStats.get(id) ?? null}
      weekStats={weekStats.get(id) ?? null}
      role={session.role}
    />
  )
}
