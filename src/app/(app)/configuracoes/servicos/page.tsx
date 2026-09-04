import type { Metadata } from 'next'
import { requireSession } from '@/lib/data/session'
import { getServiceTypes } from '@/lib/data/catalog'
import { ServiceTypesSettings } from './service-types-settings'

export const metadata: Metadata = { title: 'Serviços' }
export const dynamic = 'force-dynamic'

export default async function ServiceTypesPage() {
  const session = await requireSession()
  const serviceTypes = await getServiceTypes(session.organization.id, false)
  return <ServiceTypesSettings serviceTypes={serviceTypes} role={session.role} />
}
