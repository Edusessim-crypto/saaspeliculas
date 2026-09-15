import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SessionContext, Profile, Organization } from '@/types/database'
import type { AppRole } from '@/domain/roles'

/**
 * Contexto do usuario logado: perfil, organizacao ativa, papel e vinculo
 * com colaborador. `cache` garante uma unica ida ao banco por request,
 * mesmo consultado por varios Server Components.
 *
 * Perfil, vinculo e colaborador vem em UMA query aninhada. Eram quatro
 * chamadas sequenciais, e cada ida ao Supabase custa 200-550ms de rede:
 * medimos 1,7s sequencial contra 448ms assim. Como toda pagina autenticada
 * passa por aqui, era o maior custo fixo do produto.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select(
      `*,
       memberships:organization_members(role, organization_id, is_active, organizations(*)),
       employees(id, location_id, organization_id)`,
    )
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null

  const { memberships, employees, ...profile } = data as Profile & {
    memberships: Array<{
      role: string
      organization_id: string
      is_active: boolean
      organizations: Organization | Organization[] | null
    }> | null
    employees: Array<{ id: string; location_id: string | null; organization_id: string }> | null
  }

  const membership = (memberships ?? []).find((m) => m.is_active)
  if (!membership) return null

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  if (!organization) return null

  // Um usuario pode ter cadastro de colaborador em mais de uma organizacao.
  const employee = (employees ?? []).find((e) => e.organization_id === membership.organization_id)

  return {
    userId: user.id,
    profile: profile as Profile,
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
