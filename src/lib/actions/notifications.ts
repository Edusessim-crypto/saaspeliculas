'use server'

import { revalidatePath } from 'next/cache'
import { authorize, fail, succeed, type ActionResult } from './shared'

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const auth = await authorize('orders:advance_own')
  if (!auth) return fail('Sem permissão.')

  await auth.supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/hoje')
  return succeed()
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const auth = await authorize('orders:advance_own')
  if (!auth) return fail('Sem permissão.')

  await auth.supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('organization_id', auth.session.organization.id)
    .is('read_at', null)

  revalidatePath('/hoje')
  return succeed()
}
