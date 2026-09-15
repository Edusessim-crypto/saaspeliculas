'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { OrderCard } from './order-card'
import { EmptyState } from '@/components/ui/empty-state'
import { STATUS_CONFIG, KANBAN_COLUMNS, type OrderStatus } from '@/domain/status'
import { checkTransition } from '@/domain/state-machine'
import { changeOrderStatus } from '@/lib/actions/orders'
import type { AppRole } from '@/domain/roles'
import type { ServiceOrderView } from '@/types/database'
import { cn } from '@/lib/utils'
import { markLocalMutation } from '@/lib/local-mutation'

interface KanbanBoardProps {
  orders: ServiceOrderView[]
  role: AppRole
  onSelect: (order: ServiceOrderView) => void
  onChecklistRequired: (order: ServiceOrderView) => void
}

/**
 * Kanban desktop com drag-and-drop. O mobile usa tabs (§103) — o DnD
 * em tela pequena briga com o scroll e nao e confiavel.
 */
export function KanbanBoard({
  orders,
  role,
  onSelect,
  onChecklistRequired,
}: KanbanBoardProps) {
  const [dragging, setDragging] = useState<ServiceOrderView | null>(null)
  // Optimistic UI: move o card na hora e reverte se o backend recusar (§137).
  const [optimistic, setOptimistic] = useState<Record<string, OrderStatus>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const columns = useMemo(() => {
    const map = new Map<OrderStatus, ServiceOrderView[]>()
    for (const status of KANBAN_COLUMNS) map.set(status, [])

    for (const order of orders) {
      const status = optimistic[order.id] ?? order.current_status
      const list = map.get(status)
      // 'arrived' entra na coluna Aguardando: para a loja e a mesma fila.
      if (list) list.push(order)
      else if (status === 'arrived') map.get('waiting')?.push(order)
    }
    return map
  }, [orders, optimistic])

  function onDragStart(event: DragStartEvent) {
    const order = orders.find((o) => o.id === event.active.id)
    setDragging(order ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null)
    const { active, over } = event
    if (!over) return

    const order = orders.find((o) => o.id === active.id)
    const to = over.id as OrderStatus
    if (!order) return

    const from = optimistic[order.id] ?? order.current_status
    if (from === to) return

    const check = checkTransition(from, to, role)
    if (!check.allowed) {
      toast.error(check.reason ?? 'Movimentação não permitida.')
      return
    }

    setOptimistic((prev) => ({ ...prev, [order.id]: to }))
    markLocalMutation()

    void changeOrderStatus({ order_id: order.id, to }).then((result) => {
      if (!result.ok) {
        setOptimistic((prev) => {
          const next = { ...prev }
          delete next[order.id]
          return next
        })
        if (result.error === 'CHECKLIST_REQUIRED') {
          onChecklistRequired(order)
          toast.info('Preencha o checklist para concluir este serviço.')
          return
        }
        toast.error(result.error ?? 'Não foi possível mover o atendimento.')
        return
      }
      toast.success(`Movido para ${STATUS_CONFIG[to].label}.`)
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            orders={columns.get(status) ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="w-[260px] rotate-1">
            <OrderCard order={dragging} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  status,
  orders,
  onSelect,
}: {
  status: OrderStatus
  orders: ServiceOrderView[]
  onSelect: (order: ServiceOrderView) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div className="flex w-[272px] shrink-0 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <Icon className="size-4 text-[var(--color-ink-subtle)]" aria-hidden />
        <h2 className="text-[12.5px] font-semibold text-[var(--color-ink)]">{config.label}</h2>
        <span className="tnum ml-auto rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-ink-muted)]">
          {orders.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[160px] flex-1 flex-col gap-2 rounded-[var(--radius-card)] border border-dashed p-2 transition-colors',
          isOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)]/50',
        )}
      >
        {orders.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[var(--color-ink-subtle)]">
            Nenhum atendimento
          </p>
        ) : (
          orders.map((order) => (
            <DraggableCard key={order.id} order={order} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  order,
  onSelect,
}: {
  order: ServiceOrderView
  onSelect: (order: ServiceOrderView) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
      <OrderCard order={order} onSelect={onSelect} dragging={isDragging} />
    </div>
  )
}

/** Estado vazio compartilhado entre desktop e mobile. */
export function KanbanEmpty({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      title="Nenhum atendimento na operação."
      description="Quando um cliente chegar e o atendimento for liberado, ele aparece aqui."
      action={action}
    />
  )
}
