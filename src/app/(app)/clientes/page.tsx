import type { Metadata } from 'next'
import { requireSession } from '@/lib/data/session'
import { getCustomersWithStats } from '@/lib/data/catalog'
import { CustomersView } from './customers-view'

export const metadata: Metadata = { title: 'Clientes' }
export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const session = await requireSession()
  const customers = await getCustomersWithStats(session.organization.id)
  return <CustomersView customers={customers} role={session.role} />
}
