'use client'

import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CalendarCheck,
  Wrench,
  PackageCheck,
  AlertTriangle,
  Plus,
  CalendarPlus,
  RefreshCw,
} from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { MetricCard } from '@/components/metrics/metric-card'
import { OrderRow, OrderRowHeader } from '@/components/orders/order-row'
import { OrderDrawer } from '@/components/orders/order-drawer'
import { NewOrderSheet } from '@/components/schedule/new-order-sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRealtimeOrders } from '@/hooks/use-realtime-orders'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { calculateDelay } from '@/domain/timing'
import { STATUS_CONFIG } from '@/domain/status'
import { formatLongDate, formatTime, relativeTime } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceOrderView, Employee } from '@/types/database'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'scheduled' | 'active' | 'ready' | 'delayed'

export function TodayView({
  orders,
  employees,
  role,
  organizationId,
}: {
  orders: ServiceOrderView[]
  employees: Employee[]
  role: AppRole
  organizationId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lastUpdate } = useRealtimeOrders(organizationId)

  const [filter, setFilter] = useState<Filter>('all')
  const [newOrderOpen, setNewOrderOpen] = useState(false)

  const selectedId = searchParams.get('atendimento')
  const selected = orders.find((o) => o.id === selectedId) ?? null

  useKeyboardShortcut('n', () => setNewOrderOpen(true), can(role, 'orders:create'))

  const stats = useMemo(() => {
    const now = new Date()
    let scheduled = 0
    let active = 0
    let ready = 0
    let delayed = 0

    for (const order of orders) {
      const config = STATUS_CONFIG[order.current_status]
      if (order.current_status === 'scheduled') scheduled += 1
      if (['preparation', 'application'].includes(order.current_status)) active += 1
      if (order.current_status === 'ready') ready += 1
      if (config.active || order.current_status === 'scheduled') {
        if (calculateDelay(order, now).isDelayed) delayed += 1
      }
    }
    return { scheduled, active, ready, delayed, total: orders.length }
  }, [orders])

  const filtered = useMemo(() => {
    const now = new Date()
    switch (filter) {
      case 'scheduled':
        return orders.filter((o) => o.current_status === 'scheduled')
      case 'active':
        return orders.filter((o) =>
          ['preparation', 'application'].includes(o.current_status),
        )
      case 'ready':
        return orders.filter((o) => o.current_status === 'ready')
      case 'delayed':
        return orders.filter((o) => calculateDelay(o, now).isDelayed)
      default:
        return orders
    }
  }, [orders, filter])

  function openOrder(order: ServiceOrderView) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('atendimento', order.id)
    router.replace(`/hoje?${params}`, { scroll: false })
  }

  function closeOrder(open: boolean) {
    if (open) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('atendimento')
    router.replace(params.size ? `/hoje?${params}` : '/hoje', { scroll: false })
  }

  const toggle = (value: Filter) => setFilter((prev) => (prev === value ? 'all' : value))

  return (
    <PageContainer>
      <PageHeader
        title="Hoje na loja"
        subtitle={formatLongDate(new Date())}
        actions={
          can(role, 'orders:create') ? (
            <Button variant="primary" onClick={() => setNewOrderOpen(true)}>
              <Plus />
              <span className="hidden sm:inline">Novo agendamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <MetricCard
            label="Agendados hoje"
            value={stats.scheduled}
            icon={CalendarCheck}
            onClick={() => toggle('scheduled')}
            active={filter === 'scheduled'}
          />
          <MetricCard
            label="Em atendimento"
            value={stats.active}
            icon={Wrench}
            tone="accent"
            onClick={() => toggle('active')}
            active={filter === 'active'}
          />
          <MetricCard
            label="Prontos"
            value={stats.ready}
            icon={PackageCheck}
            tone="success"
            onClick={() => toggle('ready')}
            active={filter === 'ready'}
          />
          <MetricCard
            label="Atrasados"
            value={stats.delayed}
            icon={AlertTriangle}
            tone={stats.delayed > 0 ? 'warning' : 'default'}
            onClick={() => toggle('delayed')}
            active={filter === 'delayed'}
          />
        </div>
      </PageHeader>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-[var(--color-ink-muted)]">
          {filter === 'all'
            ? `${orders.length} atendimento${orders.length === 1 ? '' : 's'}`
            : `${filtered.length} de ${orders.length}`}
          {filter !== 'all' ? (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="ml-2 font-medium text-[var(--color-accent)] hover:underline"
            >
              limpar filtro
            </button>
          ) : null}
        </p>

        <p className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-subtle)]">
          <RefreshCw className="size-3" aria-hidden />
          Atualizado {relativeTime(lastUpdate)}
        </p>
      </div>

      <Card className="mt-2.5 overflow-hidden">
        {filtered.length === 0 ? (
          orders.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Sem agendamentos para hoje."
              description="Que tal adicionar o primeiro?"
              action={
                can(role, 'orders:create') ? (
                  <Button variant="primary" onClick={() => setNewOrderOpen(true)}>
                    <Plus />
                    Novo agendamento
                  </Button>
                ) : null
              }
            />
          ) : (
            <EmptyState
              compact
              title="Nenhum atendimento neste filtro."
              description="Ajuste o filtro para ver os demais."
              action={
                <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                  Ver todos
                </Button>
              }
            />
          )
        ) : (
          <>
            <OrderRowHeader />
            <div className="divide-y divide-[var(--color-border)]">
              {filtered.map((order) => (
                <OrderRow key={order.id} order={order} onSelect={openOrder} />
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Resumo por aplicador — leitura rapida da capacidade do dia */}
      {employees.length > 0 && orders.length > 0 ? (
        <section className="mt-5">
          <h2 className="mb-2.5 text-[13px] font-semibold text-[var(--color-ink)]">
            Aplicadores agora
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employees
              .filter((e) => e.role === 'applicator' || e.role === 'manager')
              .map((employee) => {
                const own = orders.filter((o) =>
                  o.employees.some((e) => e.employee_id === employee.id),
                )
                const running = own.find((o) =>
                  ['preparation', 'application'].includes(o.current_status),
                )
                const next = own.find((o) => o.current_status === 'scheduled')
                const done = own.filter((o) =>
                  ['ready', 'delivered', 'inspection'].includes(o.current_status),
                ).length

                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => running && openOrder(running)}
                    disabled={!running}
                    className={cn(
                      'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-left transition-colors',
                      running && 'hover:bg-[var(--color-surface-hover)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: running
                            ? 'var(--color-accent)'
                            : 'var(--color-border-strong)',
                        }}
                      />
                      <span className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                        {employee.full_name}
                      </span>
                      <span className="tnum ml-auto shrink-0 text-[11.5px] text-[var(--color-ink-subtle)]">
                        {done}/{own.length}
                      </span>
                    </div>

                    <p className="mt-1.5 truncate text-[12px] text-[var(--color-ink-muted)]">
                      {running ? (
                        <>
                          {STATUS_CONFIG[running.current_status].label} ·{' '}
                          {running.vehicle
                            ? `${running.vehicle.brand} ${running.vehicle.model}`
                            : (running.customer?.name ?? '')}
                        </>
                      ) : next ? (
                        <>
                          Próximo: {formatTime(next.scheduled_start)} ·{' '}
                          {next.vehicle?.model ?? next.customer?.name}
                        </>
                      ) : own.length ? (
                        'Sem serviço em andamento'
                      ) : (
                        'Sem serviços hoje'
                      )}
                    </p>
                  </button>
                )
              })}
          </div>
        </section>
      ) : null}

      <OrderDrawer
        order={selected}
        role={role}
        employees={employees}
        open={Boolean(selected)}
        onOpenChange={closeOrder}
      />

      <NewOrderSheet
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        employees={employees}
      />
    </PageContainer>
  )
}
