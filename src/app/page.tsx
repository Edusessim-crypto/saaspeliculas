import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/data/session'
import { defaultRouteFor } from '@/domain/roles'

export default async function RootPage() {
  const session = await getSessionContext()
  if (!session) redirect('/login')
  if (!session.organization.onboarding_completed) redirect('/onboarding')
  redirect(defaultRouteFor(session.role))
}
