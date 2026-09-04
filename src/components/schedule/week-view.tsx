'use client'

import { useMemo } from 'react'
import { startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { AvatarGroup } from '@/components/ui/avatar'
import { STATUS_CONFIG } from '@/domain/status'
import { formatTime, formatShortDate } from '@/lib/format'
import type { ServiceOrderView } from '@/types/database'
import { cn } from '@/lib/utils'

/** Visão semanal: sete colunas, uma lista cronológica em cada. */
export function WeekView({
  date,
  orders,
  onSelect,
  onDayClick,
}: {
  date: Date
  orders: ServiceOrderView[]
  onSelect: (order: ServiceOrderView) => void
  onDayClick: (date: Date) => void
}) {
  const days = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [date])

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[820px] grid-cols-7 gap-2">
        {days.map((day) => {
          const dayOrders = orders
            .filter((o) => isSameDay(new Date(o.scheduled_start), day))
            .sort(
              (a, b) =>
                new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
            )
          const today = isToday(day)

          return (
            <div key={day.toISOString()} className="min-w-0">
              <button
                type="button"
                onClick={() => onDayClick(day)}
                className={cn(
                  'mb-2 flex w-full items-center justify-between gap-1 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]',
                  today && 'bg-[var(--color-brand-subtle)]',
                )}
              >
                <span
                  className={cn(
                    'text-[12px] font-semibold',
                    today ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink)]',
                  )}
                >
                  {formatShortDate(day)}
                </span>
                <span className="tnum text-[11px] text-[var(--color-ink-subtle)]">
                  {dayOrders.length}
                </span>
              </button>

              <div className="space-y-1.5">
                {dayOrders.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11.5px] text-[var(--color-ink-subtle)]">
                    Livre
                  </p>
                ) : (
                  dayOrders.map((order) => {
                    const config = STATUS_CONFIG[order.current_status]
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => onSelect(order)}
                        className="w-full overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                config.tone === 'success'
                                  ? 'var(--color-success)'
                                  : config.tone === 'progress'
                                    ? 'var(--color-accent)'
                                    : config.tone === 'warning'
                                      ? 'var(--color-warning)'
                                      : config.tone === 'danger'
                                        ? 'var(--color-danger)'
                                        : 'var(--color-neutral)',
                            }}
                          />
                          <span className="tnum text-[11px] font-semibold text-[var(--color-ink)]">
                            {formatTime(order.scheduled_start)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--color-ink)]">
                          {order.vehicle
                            ? `${order.vehicle.brand} ${order.vehicle.model}`
                            : (order.customer?.name ?? '')}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--color-ink-muted)]">
                          {order.items[0]?.name_snapshot ?? ''}
                        </p>
                        {order.employees.length ? (
                          <div className="mt-1.5">
                            <AvatarGroup people={order.employees} size="xs" max={2} />
                          </div>
                        ) : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
