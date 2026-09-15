'use client'

import { memo } from 'react'
import { Car, MapPin, Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { AvatarGroup } from '@/components/ui/avatar'
import { DelayIndicator } from './delay-indicator'
import { PriorityBadge } from './priority-badge'
import { formatTime, formatTimeRange, formatPlate, formatVehicle } from '@/lib/format'
import type { ServiceOrderView } from '@/types/database'

/**
 * Linha da operacao. Meta: identificar horario, cliente, carro, servico,
 * aplicador, box e status em menos de 2 segundos (§21).
 *
 * Desktop: uma linha densa em grid.
 * Mobile: card estruturado — nunca uma tabela espremida (§56).
 */
function OrderRowBase({
  order,
  onSelect,
  showDate,
}: {
  order: ServiceOrderView
  onSelect: (order: ServiceOrderView) => void
  showDate?: boolean
}) {
  const services = order.items.map((i) => i.name_snapshot).join(' · ')
  const vehicleLabel = order.vehicle
    ? formatVehicle(order.vehicle)
    : (order.service_address ?? 'Serviço externo')

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className="group flex w-full items-start gap-3 px-3 py-3 text-left transition-colors duration-150 hover:bg-[var(--color-surface-hover)] sm:items-center sm:gap-4 sm:px-4"
    >
      {/* Horario */}
      <div className="w-[52px] shrink-0 sm:w-[60px]">
        <p className="tnum text-[14px] font-semibold leading-tight text-[var(--color-ink)]">
          {formatTime(order.scheduled_start)}
        </p>
        <p className="tnum mt-0.5 hidden text-[11px] text-[var(--color-ink-subtle)] sm:block">
          {formatTime(order.scheduled_end)}
        </p>
      </div>

      {/* Cliente + veiculo */}
      <div className="min-w-0 flex-1 sm:max-w-[260px]">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">
            {order.customer?.name ?? 'Cliente'}
          </p>
          <PriorityBadge priority={order.priority} />
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-[var(--color-ink-muted)]">
          {order.vehicle ? (
            <Car className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <MapPin className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="truncate">{vehicleLabel}</span>
          {order.vehicle?.plate ? (
            <span className="tnum shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-1 text-[10.5px] font-medium tracking-wide">
              {formatPlate(order.vehicle.plate)}
            </span>
          ) : null}
        </p>

        {/* No mobile, servico e aplicador entram aqui */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
          <span className="truncate text-[12px] text-[var(--color-ink-muted)]">{services}</span>
          {order.employees.length ? (
            <AvatarGroup people={order.employees} size="xs" max={2} />
          ) : null}
        </div>
      </div>

      {/* Servicos — desktop */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="truncate text-[13px] text-[var(--color-ink)]">{services || '—'}</p>
        {showDate ? (
          <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-subtle)]">
            {formatTimeRange(order.scheduled_start, order.scheduled_end)}
          </p>
        ) : null}
      </div>

      {/* Aplicador — desktop */}
      <div className="hidden w-[132px] shrink-0 items-center gap-2 md:flex">
        {order.employees.length ? (
          <>
            <AvatarGroup people={order.employees} size="sm" max={2} />
            <span className="truncate text-[12.5px] text-[var(--color-ink-muted)]">
              {order.employees[0]?.full_name.split(' ')[0]}
              {order.employees.length > 1 ? ` +${order.employees.length - 1}` : ''}
            </span>
          </>
        ) : (
          <span className="text-[12.5px] text-[var(--color-ink-subtle)]">A definir</span>
        )}
      </div>

      {/* Box — desktop */}
      <div className="hidden w-[92px] shrink-0 lg:block">
        {order.workstation ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-ink-muted)]">
            <Box className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{order.workstation.name}</span>
          </span>
        ) : (
          <span className="text-[12.5px] text-[var(--color-ink-subtle)]">—</span>
        )}
      </div>

      {/* Status + atraso */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={order.current_status} size="sm" short />
        <DelayIndicator order={order} compact />
      </div>
    </button>
  )
}

/** Cabecalho de colunas — apenas desktop, para orientar a leitura. */
/**
 * Memoizado: o realtime re-renderiza a lista inteira a cada evento, e
 * so as linhas cujo atendimento mudou precisam recalcular.
 */
export const OrderRow = memo(OrderRowBase)
OrderRow.displayName = 'OrderRow'

export function OrderRowHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'hidden items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] sm:flex',
        className,
      )}
    >
      <span className="w-[60px] shrink-0">Horário</span>
      <span className="max-w-[260px] flex-1">Cliente / Veículo</span>
      <span className="flex-1">Serviço</span>
      <span className="hidden w-[132px] shrink-0 md:block">Aplicador</span>
      <span className="hidden w-[92px] shrink-0 lg:block">Box</span>
      <span className="w-[104px] shrink-0 text-right">Status</span>
    </div>
  )
}
