'use client'

import { useRouter } from 'next/navigation'
import {
  CircleCheckBig,
  Timer,
  Gauge,
  AlertTriangle,
} from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { MetricCard } from '@/components/metrics/metric-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { OrdersChart, ProductionChart } from '@/components/metrics/charts'
import { formatDuration } from '@/lib/format'
import type { DashboardMetrics, EmployeeStats } from '@/lib/data/metrics'
import type { Employee } from '@/types/database'

export function MetricsView({
  metrics,
  employees,
  employeeStats,
  range,
}: {
  metrics: DashboardMetrics
  employees: Employee[]
  employeeStats: Record<string, EmployeeStats>
  range: string
}) {
  const router = useRouter()

  const ranked = employees
    .filter((e) => employeeStats[e.id]?.total)
    .map((e) => ({ employee: e, stats: employeeStats[e.id]! }))
    .sort((a, b) => b.stats.productiveMinutes - a.stats.productiveMinutes)

  const hasData = metrics.byDay.length > 0

  return (
    <PageContainer>
      <PageHeader
        title="Indicadores"
        subtitle="Como a operação se comportou no período."
        actions={
          <Tabs
            value={range}
            onValueChange={(value) => router.push(`/indicadores?periodo=${value}`)}
          >
            <TabsList>
              <TabsTrigger value="hoje">Hoje</TabsTrigger>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <MetricCard
          label="Serviços concluídos"
          value={metrics.completed}
          icon={CircleCheckBig}
          tone="success"
        />
        <MetricCard
          label="Tempo médio"
          value={
            metrics.averageExecutionMinutes
              ? formatDuration(metrics.averageExecutionMinutes)
              : '—'
          }
          icon={Timer}
          hint="Da execução real"
        />
        <MetricCard
          label="Taxa de ocupação"
          value={`${metrics.occupancyRate}%`}
          icon={Gauge}
          tone="accent"
          hint="Da capacidade dos boxes"
        />
        <MetricCard
          label="Atrasados"
          value={metrics.delayed}
          icon={AlertTriangle}
          tone={metrics.delayed > 0 ? 'warning' : 'default'}
          hint={`${metrics.cancelled} cancelados`}
        />
      </div>

      {!hasData ? (
        <Card className="mt-4">
          <EmptyState
            title="Sem dados no período."
            description="Assim que houver atendimentos, os indicadores aparecem aqui."
          />
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Serviços por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersChart data={metrics.byDay} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tempo por tipo de serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductionChart data={metrics.byCategory} />
            </CardContent>
          </Card>
        </div>
      )}

      <section className="mt-5">
        <h2 className="mb-2.5 text-[13px] font-semibold text-[var(--color-ink)]">
          Produção por aplicador
        </h2>
        <Card className="overflow-hidden">
          {ranked.length === 0 ? (
            <EmptyState compact title="Nenhum serviço atribuído no período." />
          ) : (
            <>
              <div className="hidden items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] sm:flex">
                <span className="flex-1">Aplicador</span>
                <span className="w-[88px] shrink-0 text-right">Serviços</span>
                <span className="w-[110px] shrink-0 text-right">Horas produtivas</span>
                <span className="w-[96px] shrink-0 text-right">Tempo médio</span>
                <span className="w-[72px] shrink-0 text-right">Atrasos</span>
              </div>

              <ul className="divide-y divide-[var(--color-border)]">
                {ranked.map(({ employee, stats }) => (
                  <li
                    key={employee.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <EmployeeAvatar
                        name={employee.full_name}
                        color={employee.color}
                        size="sm"
                      />
                      <span className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                        {employee.full_name}
                      </span>
                    </div>

                    <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                      <Stat label="Serviços" value={`${stats.completed}/${stats.total}`} width="w-[88px]" />
                      <Stat
                        label="Produtivas"
                        value={formatDuration(stats.productiveMinutes)}
                        width="w-[110px]"
                      />
                      <Stat
                        label="Média"
                        value={stats.averageMinutes ? formatDuration(stats.averageMinutes) : '—'}
                        width="w-[96px]"
                      />
                      <Stat
                        label="Atrasos"
                        value={stats.delayed.toString()}
                        width="w-[72px]"
                        tone={stats.delayed > 0 ? 'warning' : undefined}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </section>
    </PageContainer>
  )
}

function Stat({
  label,
  value,
  width,
  tone,
}: {
  label: string
  value: string
  width: string
  tone?: 'warning'
}) {
  return (
    <div className={`shrink-0 text-right ${width}`}>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)] sm:hidden">
        {label}
      </p>
      <p
        className={`tnum text-[13px] font-medium ${
          tone === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink)]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
