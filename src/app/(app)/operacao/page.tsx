import type { Metadata } from 'next'
import { requireSession } from '@/lib/data/session'
import { getActiveOrders } from '@/lib/data/orders'
import { getEmployees, getWorkstations } from '@/lib/data/catalog'
import { OperationView } from './operation-view'

export const metadata: Metadata = { title: 'Operação' }
export const dynamic = 'force-dynamic'

export default async function OperationPage() {
  const session = await requireSession()

  const [orders, employees, workstations] = await Promise.all([
    getActiveOrders(session.organization.id),
    getEmployees(session.organization.id),
    getWorkstations(session.organization.id),
  ])

  return (
    <OperationView
      orders={orders}
      employees={employees}
      workstations={workstations}
      role={session.role}
      organizationId={session.organization.id}
    />
  )
}
