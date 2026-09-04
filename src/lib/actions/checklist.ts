'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authorize, fail, succeed, type ActionResult } from './shared'

const responseSchema = z.object({
  order_id: z.string().uuid(),
  responses: z.array(
    z.object({
      item_id: z.string().uuid(),
      label: z.string(),
      checked: z.boolean(),
      note: z.string().trim().max(300).optional(),
    }),
  ),
})

/**
 * Salva o checklist. Upsert por (atendimento, item) para que reabrir e
 * corrigir uma resposta nao duplique registros.
 */
export async function saveChecklist(raw: unknown): Promise<ActionResult> {
  const auth = await authorize('orders:advance_own')
  if (!auth) return fail('Sem permissão para preencher o checklist.')

  const parsed = responseSchema.safeParse(raw)
  if (!parsed.success) return fail('Dados inválidos.')

  const { order_id, responses } = parsed.data
  const { session, supabase } = auth

  const { error } = await supabase.from('checklist_responses').upsert(
    responses.map((r) => ({
      organization_id: session.organization.id,
      service_order_id: order_id,
      checklist_item_id: r.item_id,
      label_snapshot: r.label,
      checked: r.checked,
      note: r.note?.trim() || null,
      responded_by: session.userId,
      responded_at: new Date().toISOString(),
    })),
    { onConflict: 'service_order_id,checklist_item_id' },
  )

  if (error) return fail('Não foi possível salvar o checklist.')

  revalidatePath(`/app/servico/${order_id}`)
  revalidatePath('/operacao')
  return succeed()
}
