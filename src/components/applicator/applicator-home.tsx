'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, Box, MapPin, Car, CircleCheckBig } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Stopwatch } from '@/components/orders/stopwatch'
import { DelayIndicator } from '@/components/orders/delay-indicator'
import { changeOrderStatus } from '@/lib/actions/orders'
import { primaryAction } from '@/domain/state-machine'
import { formatTime, formatTimeRange, formatPlate, formatVehicle } from '@/lib/format'
import type { ServiceOrderView } from '@/types/database'

/**
 * Home do aplicador. Um card grande para o "agora", uma lista simples
 * para o resto. Tudo operável com uma mão (§36-38).
 */
export function ApplicatorHome({
  orders,
  firstName,
}: {
  orders: ServiceOrderView[]
  firstName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const running = orders.find((o) =>
    ['preparation', 'application'].includes(o.current_status),
  )
  const next = orders.find((o) => ['scheduled', 'arrived', 'waiting'].includes(o.current_status))
  const current = running ?? next
  const upcoming = orders.filter((o) => o.id !== current?.id && !isDone(o))
  const done = orders.filter(isDone)

  function advance(order: ServiceOrderView) {
    const action = primaryAction(order.current_status, 'applicator')
    if (!action) return

    // Finalizar aplicacao exige checklist: manda para a tela do servico.
    if (action.to === 'inspection') {
      router.push(`/app/servico/${order.id}?checklist=1`)
      return
    }

    startTransition(async () => {
      const result = await changeOrderStatus({ order_id: order.id, to: action.to })
      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível atualizar.')
        return
      }
      toast.success(action.to === 'application' ? 'Serviço iniciado.' : 'Preparação iniciada.')
      router.refresh()
    })
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5">
      <header className="mb-5">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-0.5 text-[14px] text-[var(--color-ink-muted)]">
          {orders.length === 0
            ? 'Você não tem serviços hoje.'
            : `Hoje você tem ${orders.length} serviço${orders.length > 1 ? 's' : ''}.`}
        </p>
      </header>

      {current ? (
        <CurrentCard
          order={current}
          isRunning={Boolean(running)}
          pending={pending}
          onAdvance={() => advance(current)}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Nenhum serviço para hoje."
          description="Quando a recepção agendar algo para você, aparece aqui."
        />
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Próximos
          </h2>
          <ul className="space-y-2">
            {upcoming.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/app/servico/${order.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3.5 transition-colors active:bg-[var(--color-surface-hover)]"
                >
                  <span className="tnum w-12 shrink-0 text-[14px] font-semibold text-[var(--color-ink)]">
                    {formatTime(order.scheduled_start)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[var(--color-ink)]">
                      {order.vehicle
                        ? `${order.vehicle.brand} ${order.vehicle.model}`
                        : (order.customer?.name ?? 'Atendimento')}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-[var(--color-ink-muted)]">
                      {order.items.map((i) => i.name_snapshot).join(' · ')}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-[var(--color-ink-subtle)]"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {done.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Concluídos hoje
          </h2>
          <ul className="space-y-2">
            {done.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/app/servico/${order.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 py-3 transition-colors active:bg-[var(--color-surface-hover)]"
                >
                  <CircleCheckBig
                    className="size-4 shrink-0 text-[var(--color-success)]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                    {order.vehicle
                      ? `${order.vehicle.brand} ${order.vehicle.model}`
                      : (order.customer?.name ?? '')}
                  </span>
                  <StatusBadge status={order.current_status} size="sm" short />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function CurrentCard({
  order,
  isRunning,
  pending,
  onAdvance,
}: {
  order: ServiceOrderView
  isRunning: boolean
  pending: boolean
  onAdvance: () => void
}) {
  const action = primaryAction(order.current_status, 'applicator')
  const services = order.items.map((i) => i.name_snapshot).join(' · ')

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-raised)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-brand)] px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-white/80">
            {isRunning ? 'Em execução' : 'Agora'}
          </p>
          <DelayIndicator order={order} compact />
        </div>
      </div>

      <div className="p-4">
        <p className="flex items-center gap-1.5 text-[19px] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
          {order.vehicle ? (
            <Car className="size-[18px] shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
          ) : (
            <MapPin className="size-[18px] shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
          )}
          {order.vehicle ? formatVehicle(order.vehicle) : (order.customer?.name ?? 'Atendimento')}
        </p>

        {order.vehicle?.plate ? (
          <p className="tnum mt-1 text-[13px] font-medium tracking-wide text-[var(--color-ink-muted)]">
            {formatPlate(order.vehicle.plate)}
          </p>
        ) : null}

        <p className="mt-2.5 text-[15px] text-[var(--color-ink)]">{services}</p>

        <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3.5 text-[13px]">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Horário
            </dt>
            <dd className="tnum mt-0.5 font-semibold text-[var(--color-ink)]">
              {formatTimeRange(order.scheduled_start, order.scheduled_end)}
            </dd>
          </div>

          {order.workstation ? (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Box
              </dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold text-[var(--color-ink)]">
                <Box className="size-3.5" aria-hidden />
                {order.workstation.name}
              </dd>
            </div>
          ) : null}

          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Cliente
            </dt>
            <dd className="mt-0.5 truncate font-medium text-[var(--color-ink)]">
              {order.customer?.name ?? '—'}
            </dd>
          </div>

          {isRunning && order.actual_start ? (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Decorrido
              </dt>
              <dd className="mt-0.5 text-[17px] font-semibold text-[var(--color-accent)]">
                <Stopwatch actualStart={order.actual_start} />
              </dd>
            </div>
          ) : null}
        </dl>

        {isRunning && order.actual_start ? (
          <p className="mt-1.5 text-[12px] text-[var(--color-ink-subtle)]">
            Iniciado às {formatTime(order.actual_start)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-[var(--color-border)] p-3">
        {action ? (
          <Button variant="primary" size="xl" block loading={pending} onClick={onAdvance}>
            {action.label.toUpperCase()}
          </Button>
        ) : (
          <div className="py-1 text-center">
            <StatusBadge status={order.current_status} />
          </div>
        )}

        <Button variant="ghost" block asChild>
          <Link href={`/app/servico/${order.id}`}>Ver detalhes</Link>
        </Button>
      </div>
    </div>
  )
}

function isDone(order: ServiceOrderView) {
  return ['inspection', 'ready', 'delivered', 'cancelled', 'no_show'].includes(
    order.current_status,
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
