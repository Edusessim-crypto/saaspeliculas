import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/data/session'
import { getCustomerById, getVehiclesByCustomer, getEmployees } from '@/lib/data/catalog'
import { getOrdersByCustomer } from '@/lib/data/orders'
import { CustomerDetail } from './customer-detail'

export const metadata: Metadata = { title: 'Cliente' }
export const dynamic = 'force-dynamic'

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  const { id } = await params

  const customer = await getCustomerById(id)
  if (!customer || customer.organization_id !== session.organization.id) notFound()

  const [vehicles, orders, employees] = await Promise.all([
    getVehiclesByCustomer(id),
    getOrdersByCustomer(id),
    getEmployees(session.organization.id),
  ])

  return (
    <CustomerDetail
      customer={customer}
      vehicles={vehicles}
      orders={orders}
      employees={employees}
      role={session.role}
    />
  )
}
