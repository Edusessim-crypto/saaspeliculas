'use client'

import { Box, Car, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarGroup } from '@/components/ui/avatar'
import { DelayIndicator } from './delay-indicator'
import { PriorityBadge } from './priority-badge'
import { Stopwatch } from './stopwatch'
import { formatTime, formatPlate, formatDuration } from '@/lib/format'
import { totalDuration } from '@/domain/timing'
import type { ServiceOrderView } from '@/types/database'

/**
 * Card do Kanban. Informacao prioritaria apenas — o resto abre no
 * drawer ao clicar (§24). Cards pequenos mantem a coluna legivel.
 */
export function OrderCard({
  order,
  onSelect,
  dragging,
  className,
  footer,
}: {
  order: ServiceOrderView
  onSelect?: (order: ServiceOrderView) => void
  dragging?: boolean
  className?: string
  footer?: React.ReactNode
}) {
  const services = order.items.map((i) => i.name_snapshot).join(' · ')
  const isRunning = order.actual_start !== null && order.actual_end === null
  const planned = totalDuration(order.items)

  return (
    <div
      className={cn(
        'rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-subtle)] transition-shadow',
        dragging && 'opacity-60 shadow-[var(--shadow-overlay)]',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(order)}
        className="w-full rounded-t-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="tnum text-[12.5px] font-semibold text-[var(--color-ink)]">
            {formatTime(order.scheduled_start)}
          </span>
          <div className="flex items-center gap-1">
            <PriorityBadge priority={order.priority} />
            <DelayIndicator order={order} compact />
          </div>
        </div>

        <p className="mt-1.5 flex items-center gap-1 text-[13.5px] font-semibold leading-tight text-[var(--color-ink)]">
          {order.vehicle ? (
            <Car className="size-3.5 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
          ) : (
            <MapPin className="size-3.5 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
          )}
          <span className="truncate">
            {order.vehicle
              ? `${order.vehicle.brand} ${order.vehicle.model}`
              : (order.customer?.name ?? 'Atendimento')}
          </span>
        </p>

        {order.vehicle?.plate ? (
          <p className="tnum mt-0.5 text-[11px] font-medium tracking-wide text-[var(--color-ink-subtle)]">
            {formatPlate(order.vehicle.plate)}
          </p>
        ) : null}

        <p className="mt-1.5 truncate text-[12px] text-[var(--color-ink-muted)]">{services}</p>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {order.employees.length ? (
              <>
                <AvatarGroup people={order.employees} size="xs" max={2} />
                <span className="truncate text-[11.5px] text-[var(--color-ink-muted)]">
                  {order.employees[0]?.full_name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="text-[11.5px] text-[var(--color-ink-subtle)]">Sem aplicador</span>
            )}
          </div>

          {order.workstation ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-[var(--color-ink-subtle)]">
              <Box className="size-3" aria-hidden />
              {order.workstation.name}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-1 border-t border-[var(--color-border)] pt-2 text-[11.5px] text-[var(--color-ink-subtle)]">
          <Clock className="size-3" aria-hidden />
          {isRunning ? (
            <>
              <span>Em execução</span>
              <Stopwatch
                actualStart={order.actual_start}
                className="ml-auto font-semibold text-[var(--color-accent)]"
              />
            </>
          ) : (
            <>
              <span>Previsto</span>
              <span className="tnum ml-auto font-medium">{formatDuration(planned)}</span>
            </>
          )}
        </div>
      </button>
      {footer}
    </div>
  )
}
