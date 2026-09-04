import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SessionContext } from '@/types/database'
import type { AppRole } from '@/domain/roles'

/**
 * Contexto do usuario logado: perfil, organizacao ativa, papel e vinculo
 * com colaborador. `cache` garante uma unica ida ao banco por request,
 * mesmo consultado por varios Server Components.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organization_id, organizations(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!membership?.organizations) return null

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  if (!organization) return null

  const { data: employee } = await supabase
    .from('employees')
    .select('id, location_id')
    .eq('user_id', user.id)
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  return {
    userId: user.id,
    profile,
    organization,
    role: membership.role as AppRole,
    employeeId: employee?.id ?? null,
    locationId: employee?.location_id ?? null,
  }
})

/** Exige sessao valida; caso contrario redireciona. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext()
  if (!session) redirect('/login')
  if (!session.organization.onboarding_completed) redirect('/onboarding')
  return session
}

/** Igual a requireSession, mas nao força o onboarding (usado na propria tela). */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}
