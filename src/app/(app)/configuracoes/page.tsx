import type { Metadata } from 'next'
import { requireSession } from '@/lib/data/session'
import { createClient } from '@/lib/supabase/server'
import { OrganizationSettings } from './organization-settings'

export const metadata: Metadata = { title: 'Configurações' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await requireSession()
  const supabase = await createClient()

  const [{ data: location }, { count: memberCount }] = await Promise.all([
    supabase
      .from('locations')
      .select('*')
      .eq('organization_id', session.organization.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organization.id),
  ])

  return (
    <OrganizationSettings
      organization={session.organization}
      locationName={location?.name ?? null}
      memberCount={memberCount ?? 0}
      role={session.role}
    />
  )
}
