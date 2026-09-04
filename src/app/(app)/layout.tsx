import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/data/session'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/shell/app-shell'
import type { AppNotification } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  // O aplicador tem uma casca propria, mobile-first (§35).
  if (session.role === 'applicator') redirect('/app')

  const supabase = await createClient()

  const [{ data: notifications }, { data: location }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', session.organization.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('locations')
      .select('name')
      .eq('organization_id', session.organization.id)
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <AppShell
      role={session.role}
      userName={session.profile.full_name}
      userEmail={session.profile.email}
      organizationId={session.organization.id}
      organizationName={session.organization.name}
      locationName={location?.name ?? session.organization.name}
      notifications={(notifications ?? []) as AppNotification[]}
    >
      {children}
    </AppShell>
  )
}
