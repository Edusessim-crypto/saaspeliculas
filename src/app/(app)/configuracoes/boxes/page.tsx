import type { Metadata } from 'next'
import { requireSession } from '@/lib/data/session'
import { getWorkstations } from '@/lib/data/catalog'
import { WorkstationsSettings } from './workstations-settings'

export const metadata: Metadata = { title: 'Boxes' }
export const dynamic = 'force-dynamic'

export default async function WorkstationsPage() {
  const session = await requireSession()
  const workstations = await getWorkstations(session.organization.id, false)
  return <WorkstationsSettings workstations={workstations} role={session.role} />
}
