import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/data/session'
import { ApplicatorShell } from '@/components/applicator/applicator-shell'

export default async function ApplicatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  // Gestao tambem pode espiar a visao do aplicador, mas so se tiver
  // um colaborador vinculado — sem isso nao ha o que mostrar.
  if (!session.employeeId) redirect('/hoje')

  return (
    <ApplicatorShell
      userName={session.profile.full_name}
      organizationId={session.organization.id}
      canReturnToAdmin={session.role !== 'applicator'}
    >
      {children}
    </ApplicatorShell>
  )
}
