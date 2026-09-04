'use server'

import { authorize } from './shared'
import type { StatusHistoryEntry, ChecklistTemplate, ChecklistItem, ChecklistResponse } from '@/types/database'

export interface OrderDetailExtras {
  history: StatusHistoryEntry[]
  checklist: {
    template: (ChecklistTemplate & { items: ChecklistItem[] }) | null
    responses: ChecklistResponse[]
  }
}

/** Carrega histórico e checklist sob demanda, ao abrir o drawer. */
export async function getOrderExtras(orderId: string): Promise<OrderDetailExtras> {
  const auth = await authorize('orders:advance_own')
  const empty: OrderDetailExtras = {
    history: [],
    checklist: { template: null, responses: [] },
  }
  if (!auth) return empty

  const [historyRes, templateRes, responsesRes] = await Promise.all([
    auth.supabase
      .from('status_history')
      .select('*')
      .eq('service_order_id', orderId)
      .order('changed_at', { ascending: false }),
    auth.supabase
      .from('checklist_templates')
      .select('*, items:checklist_items(*)')
      .eq('organization_id', auth.session.organization.id)
      .eq('is_default', true)
      .eq('is_active', true)
      .order('sort_order', { referencedTable: 'checklist_items' })
      .limit(1)
      .maybeSingle(),
    auth.supabase.from('checklist_responses').select('*').eq('service_order_id', orderId),
  ])

  return {
    history: (historyRes.data ?? []) as StatusHistoryEntry[],
    checklist: {
      template: (templateRes.data ?? null) as OrderDetailExtras['checklist']['template'],
      responses: (responsesRes.data ?? []) as ChecklistResponse[],
    },
  }
}
