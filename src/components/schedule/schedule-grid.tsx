'use client'

import { useMemo } from 'react'
import { differenceInMinutes, isSameDay } from 'date-fns'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { STATUS_CONFIG } from '@/domain/status'
import { formatTime, formatPlate } from '@/lib/format'
import type { ServiceOrderView, Employee } from '@/types/database'
import { cn } from '@/lib/utils'

const START_HOUR = 7
const END_HOUR = 20
const PX_PER_MINUTE = 1.15
const HOUR_HEIGHT = 60 * PX_PER_MINUTE

/**
 * Agenda em colunas por aplicador. A altura do evento e proporcional
 * a duracao, para que a capacidade seja lida visualmente (§29).
 */
export function ScheduleByEmployee({
  date,
  orders,
  employees,
  onSelect,
  onSlotClick,
}: {
  date: Date
  orders: ServiceOrderView[]
  employees: Employee[]
  onSelect: (order: ServiceOrderView) => void
  onSlotClick?: (employeeId: string, time: string) => void
}) {
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    [],
  )

  const dayOrders = orders.filter((o) => isSameDay(new Date(o.scheduled_start), date))

  const unassigned = dayOrders.filter((o) => o.employees.length === 0)
  const columns = [
    ...employees.map((employee) => ({
      id: employee.id,
      name: employee.full_name,
      color: employee.color,
      avatarUrl: employee.avatar_url,
      orders: dayOrders.filter((o) => o.employees.some((e) => e.employee_id === employee.id)),
    })),
    ...(unassigned.length
      ? [{ id: 'unassigned', name: 'A definir', color: '#94A3B8', avatarUrl: null, orders: unassigned }]
      : []),
  ]

  // A regua ocupa 56px; cada aplicador precisa de ~132px para o nome caber.
  const minWidth = 56 + columns.length * 132

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        {/* Cabecalho fixo com os aplicadores */}
        <div
          className="sticky top-0 z-10 flex border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]"
          style={{ paddingLeft: 56 }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex min-w-0 flex-1 items-center gap-2 border-l border-[var(--color-border)] px-2.5 py-2"
            >
              <EmployeeAvatar name={column.name} color={column.color} size="xs" />
              <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">
                {column.name}
              </span>
              <span className="tnum ml-auto shrink-0 text-[11px] text-[var(--color-ink-subtle)]">
                {column.orders.length}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex">
          {/* Regua de horarios */}
          <div className="w-14 shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-[var(--color-border)]"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="tnum absolute -top-2 right-2 text-[11px] text-[var(--color-ink-subtle)]">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {columns.map((column) => (
            <div
              key={column.id}
              className="relative min-w-0 flex-1 border-l border-[var(--color-border)]"
            >
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() =>
                    column.id !== 'unassigned' &&
                    onSlotClick?.(column.id, `${String(hour).padStart(2, '0')}:00`)
                  }
                  disabled={!onSlotClick || column.id === 'unassigned'}
                  aria-label={`Agendar às ${hour}:00 com ${column.name}`}
                  className="block w-full border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:hover:bg-transparent"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {column.orders.map((order) => (
                <ScheduleEvent key={order.id} order={order} onSelect={onSelect} />
              ))}
            </div>
          ))}

          <CurrentTimeLine date={date} />
        </div>
      </div>
    </div>
  )
}

function ScheduleEvent({
  order,
  onSelect,
}: {
  order: ServiceOrderView
  onSelect: (order: ServiceOrderView) => void
}) {
  const start = new Date(order.scheduled_start)
  const end = new Date(order.scheduled_end)

  const minutesFromTop =
    (start.getHours() - START_HOUR) * 60 + start.getMinutes()
  const durationMinutes = Math.max(30, differenceInMinutes(end, start))
  const config = STATUS_CONFIG[order.current_status]

  const TONE_BG: Record<string, string> = {
    neutral: 'bg-[var(--color-neutral-subtle)] border-[var(--color-neutral-border)]',
    info: 'bg-[var(--color-info-subtle)] border-[var(--color-info-border)]',
    progress: 'bg-[var(--color-accent-subtle)] border-[var(--color-info-border)]',
    warning: 'bg-[var(--color-warning-subtle)] border-[var(--color-warning-border)]',
    success: 'bg-[var(--color-success-subtle)] border-[var(--color-success-border)]',
    danger: 'bg-[var(--color-danger-subtle)] border-[var(--color-danger-border)]',
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className={cn(
        'absolute inset-x-1 overflow-hidden rounded-[7px] border px-2 py-1 text-left transition-shadow hover:shadow-[var(--shadow-raised)]',
        TONE_BG[config.tone],
      )}
      style={{
        top: minutesFromTop * PX_PER_MINUTE,
        height: Math.max(26, durationMinutes * PX_PER_MINUTE - 3),
      }}
    >
      <p className="tnum truncate text-[10.5px] font-semibold text-[var(--color-ink)]">
        {formatTime(start)}
      </p>
      <p className="truncate text-[11.5px] font-medium leading-tight text-[var(--color-ink)]">
        {order.vehicle
          ? `${order.vehicle.brand} ${order.vehicle.model}`
          : (order.customer?.name ?? 'Atendimento')}
      </p>
      {durationMinutes >= 60 ? (
        <p className="mt-0.5 truncate text-[10.5px] text-[var(--color-ink-muted)]">
          {order.items[0]?.name_snapshot}
          {order.vehicle?.plate ? ` · ${formatPlate(order.vehicle.plate)}` : ''}
        </p>
      ) : null}
    </button>
  )
}

/** Linha do "agora" — só aparece quando a data visível é hoje. */
function CurrentTimeLine({ date }: { date: Date }) {
  const now = new Date()
  if (!isSameDay(date, now)) return null

  const minutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes()
  if (minutes < 0 || minutes > (END_HOUR - START_HOUR) * 60) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top: minutes * PX_PER_MINUTE }}
    >
      <span className="tnum w-14 pr-1 text-right text-[10px] font-semibold text-[var(--color-danger)]">
        {formatTime(now)}
      </span>
      <span className="h-px flex-1 bg-[var(--color-danger)]" />
    </div>
  )
}
