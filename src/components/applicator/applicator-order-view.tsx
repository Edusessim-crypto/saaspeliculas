'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Phone, Box, MapPin, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Checklist } from '@/components/orders/checklist'
import { Timeline } from '@/components/orders/timeline'
import { Stopwatch } from '@/components/orders/stopwatch'
import { changeOrderStatus, updateOrderNotes } from '@/lib/actions/orders'
import { primaryAction } from '@/domain/state-machine'
import {
  formatTimeRange,
  formatTime,
  formatPlate,
  formatVehicle,
  formatDuration,
  formatPhone,
} from '@/lib/format'
import { totalDuration } from '@/domain/timing'
import { markLocalMutation } from '@/lib/local-mutation'
import type {
  ServiceOrderView,
  StatusHistoryEntry,
  ChecklistTemplate,
  ChecklistItem,
  ChecklistResponse,
} from '@/types/database'

export function ApplicatorOrderView({
  order,
  history,
  checklist,
  startWithChecklist,
}: {
  order: ServiceOrderView
  history: StatusHistoryEntry[]
  checklist: {
    template: (ChecklistTemplate & { items: ChecklistItem[] }) | null
    responses: ChecklistResponse[]
  }
  startWithChecklist: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showChecklist, setShowChecklist] = useState(startWithChecklist)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(order.internal_notes ?? '')

  const action = primaryAction(order.current_status, 'applicator')
  const isRunning = order.actual_start !== null && order.actual_end === null
  const planned = totalDuration(order.items)

  function advance() {
    if (!action) return
    if (action.to === 'inspection') {
      setShowChecklist(true)
      return
    }
    startTransition(async () => {
      const result = await changeOrderStatus({ order_id: order.id, to: action.to })
      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível atualizar.')
        return
      }
      toast.success('Serviço atualizado.')
      markLocalMutation()
    })
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <Link
        href="/app"
        className="inline-flex h-10 items-center gap-1.5 text-[14px] font-medium text-[var(--color-ink-muted)] transition-colors active:text-[var(--color-ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Meus serviços
      </Link>

      <header className="mt-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
            {order.vehicle ? formatVehicle(order.vehicle) : (order.customer?.name ?? 'Atendimento')}
          </h1>
          <StatusBadge status={order.current_status} size="sm" short />
        </div>

        {order.vehicle?.plate ? (
          <p className="tnum mt-1 text-[13px] font-medium tracking-wide text-[var(--color-ink-muted)]">
            {formatPlate(order.vehicle.plate)}
          </p>
        ) : null}
      </header>

      <div className="mt-4 space-y-4">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Serviços
          </h2>
          <ul className="space-y-1.5">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">
                  {item.name_snapshot}
                </span>
                <span className="tnum shrink-0 text-[12.5px] text-[var(--color-ink-muted)]">
                  {formatDuration(item.duration_minutes * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3.5 text-[13px]">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Horário
              </dt>
              <dd className="tnum mt-0.5 font-semibold text-[var(--color-ink)]">
                {formatTimeRange(order.scheduled_start, order.scheduled_end)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                {isRunning ? 'Decorrido' : 'Previsto'}
              </dt>
              <dd className="tnum mt-0.5 font-semibold text-[var(--color-ink)]">
                {isRunning && order.actual_start ? (
                  <Stopwatch actualStart={order.actual_start} />
                ) : (
                  formatDuration(planned)
                )}
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
            {order.actual_start ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                  Iniciado
                </dt>
                <dd className="tnum mt-0.5 font-semibold text-[var(--color-ink)]">
                  {formatTime(order.actual_start)}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Cliente
          </h2>
          <p className="text-[14px] font-medium text-[var(--color-ink)]">
            {order.customer?.name ?? '—'}
          </p>
          {order.service_address ? (
            <p className="mt-1 flex items-start gap-1.5 text-[13px] text-[var(--color-ink-muted)]">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {order.service_address}
            </p>
          ) : null}
          {order.customer?.phone ? (
            <Button variant="secondary" size="sm" className="mt-2.5" asChild>
              <a href={`tel:${order.customer.phone}`}>
                <Phone />
                {formatPhone(order.customer.phone)}
              </a>
            </Button>
          ) : null}
        </section>

        {order.internal_notes || noteOpen ? (
          <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Observações
            </h2>
            {noteOpen ? (
              <div className="space-y-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="O que a equipe precisa saber"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setNote(order.internal_notes ?? '')
                      setNoteOpen(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    loading={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await updateOrderNotes(order.id, note)
                        if (!result.ok) {
                          toast.error(result.error ?? 'Não foi possível salvar.')
                          return
                        }
                        setNoteOpen(false)
                        toast.success('Observação salva.')
                        markLocalMutation()
                      })
                    }
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-ink)]">
                {order.internal_notes}
              </p>
            )}
          </section>
        ) : null}

        {showChecklist && checklist.template ? (
          <section className="rounded-[var(--radius-card)] border border-[var(--color-accent)] bg-[var(--color-surface-raised)] p-4">
            <h2 className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">
              Checklist de conferência
            </h2>
            <p className="mb-3 text-[13px] text-[var(--color-ink-muted)]">
              Confira cada item antes de concluir.
            </p>
            <Checklist
              orderId={order.id}
              items={checklist.template.items}
              responses={checklist.responses}
              advanceOnComplete
              onDone={() => {
                setShowChecklist(false)
                router.push('/app')
              }}
            />
          </section>
        ) : null}

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Histórico
          </h2>
          <Timeline entries={history} />
        </section>
      </div>

      {/* Barra de acao fixa: o CTA precisa estar sempre ao alcance do polegar */}
      {action && !showChecklist ? (
        <div className="safe-bottom sticky bottom-0 mt-4 -mx-4 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
          <Button variant="primary" size="xl" block loading={pending} onClick={advance}>
            {action.label.toUpperCase()}
          </Button>
          {!noteOpen ? (
            <Button variant="ghost" block className="mt-2" onClick={() => setNoteOpen(true)}>
              <MessageSquarePlus />
              Adicionar observação
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
