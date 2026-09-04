import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/data/session'
import { getSessionContext } from '@/lib/data/session'
import { OnboardingWizard } from './onboarding-wizard'

export const metadata: Metadata = { title: 'Configuração inicial' }
export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  await requireUser()
  const session = await getSessionContext()

  if (session?.organization.onboarding_completed) redirect('/hoje')

  return (
    <OnboardingWizard
      defaultCompanyName={session?.organization.name ?? ''}
      userName={session?.profile.full_name ?? ''}
    />
  )
}
