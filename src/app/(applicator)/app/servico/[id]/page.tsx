import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/data/session'
import { getOrderById, getOrderHistory } from '@/lib/data/orders'
import { getChecklistForOrder } from '@/lib/data/catalog'
import { ApplicatorOrderView } from '@/components/applicator/applicator-order-view'

export const metadata: Metadata = { title: 'Serviço' }
export const dynamic = 'force-dynamic'

export default async function ApplicatorOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ checklist?: string }>
}) {
  const session = await requireSession()
  const { id } = await params
  const { checklist } = await searchParams

  const order = await getOrderById(id)
  if (!order) notFound()

  const [history, checklistData] = await Promise.all([
    getOrderHistory(id),
    getChecklistForOrder(session.organization.id, id),
  ])

  return (
    <ApplicatorOrderView
      order={order}
      history={history}
      checklist={checklistData}
      startWithChecklist={checklist === '1'}
    />
  )
}
