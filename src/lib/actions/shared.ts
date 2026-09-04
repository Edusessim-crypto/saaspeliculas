import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/data/session'
import { can, type Permission } from '@/domain/roles'
import type { SessionContext } from '@/types/database'

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface ActionResult<T = void> {
  ok: boolean
  error?: string
  data?: T
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error }
}

export function succeed<T>(data?: T): ActionResult<T> {
  return { ok: true, data }
}

/**
 * Toda Server Action passa por aqui: garante sessao e checa a permissao
 * antes de tocar no banco. O RLS repete a verificacao — este check e para
 * dar uma mensagem util ao usuario, nao para ser a unica defesa (§91).
 */
export async function authorize(
  permission: Permission,
): Promise<{ session: SessionContext; supabase: SupabaseServerClient } | null> {
  const session = await getSessionContext()
  if (!session) return null
  if (!can(session.role, permission)) return null
  const supabase = await createClient()
  return { session, supabase }
}

export async function logActivity(
  supabase: SupabaseServerClient,
  params: {
    organizationId: string
    orderId?: string | null
    actorId: string
    actorName: string
    action: string
    description: string
    metadata?: Record<string, unknown>
  },
) {
  await supabase.from('activity_log').insert({
    organization_id: params.organizationId,
    service_order_id: params.orderId ?? null,
    actor_id: params.actorId,
    actor_name: params.actorName,
    action: params.action,
    description: params.description,
    metadata: params.metadata ?? null,
  })
}
