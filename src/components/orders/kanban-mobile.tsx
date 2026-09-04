'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { OrderCard } from './order-card'
import { Button } from '@/components/ui/button'
import { STATUS_CONFIG, KANBAN_COLUMNS, type OrderStatus } from '@/domain/status'
import { checkTransition, primaryAction } from '@/domain/state-machine'
import { changeOrderStatus } from '@/lib/actions/orders'
import type { AppRole } from '@/domain/roles'
import type { ServiceOrderView } from '@/types/database'
import { cn } from '@/lib/utils'

/**
 * Mobile: uma coluna por vez, com tabs horizontais scrollaveis.
 * Avanco por botao no card, nunca por drag-and-drop (§103).
 */
export function KanbanMobile({
  orders,
  role,
  onSelect,
  onChecklistRequired,
}: {
  orders: ServiceOrderView[]
  role: AppRole
  onSelect: (order: ServiceOrderView) => void
  onChecklistRequired: (order: ServiceOrderView) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<OrderStatus>(() => {
    // Abre na primeira coluna que tem algo, para nao cair em tela vazia.
    for (const status of KANBAN_COLUMNS) {
      if (orders.some((o) => o.current_status === status)) return status
    }
    return 'waiting'
  })

  const grouped = useMemo(() => {
    const map = new Map<OrderStatus, ServiceOrderView[]>()
    for (const status of KANBAN_COLUMNS) map.set(status, [])
    for (const order of orders) {
      const target = order.current_status === 'arrived' ? 'waiting' : order.current_status
      map.get(target as OrderStatus)?.push(order)
    }
    return map
  }, [orders])

  const current = grouped.get(active) ?? []

  function advance(order: ServiceOrderView) {
    const action = primaryAction(order.current_status, role)
    if (!action) return

    const check = checkTransition(order.current_status, action.to, role)
    if (!check.allowed) {
      toast.error(check.reason ?? 'Não permitido.')
      return
    }

    startTransition(async () => {
      const result = await changeOrderStatus({ order_id: order.id, to: action.to })
      if (!result.ok) {
        if (result.error === 'CHECKLIST_REQUIRED') {
          onChecklistRequired(order)
          toast.info('Preencha o checklist para concluir.')
          return
        }
        toast.error(result.error ?? 'Não foi possível mover.')
        return
      }
      toast.success(`Movido para ${STATUS_CONFIG[action.to].label}.`)
      router.refresh()
    })
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Etapas da operação"
        className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-3"
      >
        {KANBAN_COLUMNS.map((status) => {
          const config = STATUS_CONFIG[status]
          const count = grouped.get(status)?.length ?? 0
          const selected = active === status
          return (
            <button
              key={status}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(status)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 text-[13px] font-medium transition-colors',
                selected
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                  : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)]',
              )}
            >
              {config.shortLabel}
              <span
                className={cn(
                  'tnum rounded-[var(--radius-pill)] px-1.5 text-[11px] font-semibold',
                  selected
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {current.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--color-ink-subtle)]">
          Nenhum atendimento em {STATUS_CONFIG[active].label.toLowerCase()}.
        </p>
      ) : (
        <div className="space-y-2.5">
          {current.map((order) => {
            const action = primaryAction(order.current_status, role)
            return (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={onSelect}
                footer={
                  action ? (
                    <div className="border-t border-[var(--color-border)] p-2">
                      <Button
                        variant="secondary"
                        block
                        size="sm"
                        loading={pending}
                        onClick={() => advance(order)}
                      >
                        {action.label}
                        <ArrowRight />
                      </Button>
                    </div>
                  ) : null
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
