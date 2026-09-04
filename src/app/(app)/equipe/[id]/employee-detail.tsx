'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PageContainer } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { OrderRow, OrderRowHeader } from '@/components/orders/order-row'
import { OrderDrawer } from '@/components/orders/order-drawer'
import { EmployeeSheet } from '@/components/team/employee-sheet'
import { MetricCard } from '@/components/metrics/metric-card'
import { formatDuration } from '@/lib/format'
import { ROLE_LABELS, can, type AppRole } from '@/domain/roles'
import type { Employee, ServiceOrderView } from '@/types/database'
import type { EmployeeStats } from '@/lib/data/metrics'

export function EmployeeDetail({
  employee,
  specialties,
  orders,
  todayStats,
  weekStats,
  role,
}: {
  employee: Employee
  specialties: string[]
  orders: ServiceOrderView[]
  todayStats: EmployeeStats | null
  weekStats: EmployeeStats | null
  role: AppRole
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<ServiceOrderView | null>(null)

  return (
    <PageContainer>
      <Link
        href="/equipe"
        className="inline-flex h-9 items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Equipe
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <EmployeeAvatar
            name={employee.full_name}
            color={employee.color}
            avatarUrl={employee.avatar_url}
            size="lg"
          />
          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-[21px]">
              {employee.full_name}
            </h1>
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
              {employee.job_title ?? ROLE_LABELS[employee.role]}
              {!employee.is_active ? ' · Inativo' : ''}
            </p>
            {specialties.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {specialties.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {can(role, 'team:manage') ? (
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <MetricCard label="Serviços hoje" value={todayStats?.total ?? 0} />
        <MetricCard
          label="Concluídos hoje"
          value={todayStats?.completed ?? 0}
          tone="success"
        />
        <MetricCard
          label="Tempo médio (7d)"
          value={weekStats?.averageMinutes ? formatDuration(weekStats.averageMinutes) : '—'}
          hint="Por serviço executado"
        />
        <MetricCard
          label="Atrasos (7d)"
          value={weekStats?.delayed ?? 0}
          tone={(weekStats?.delayed ?? 0) > 0 ? 'warning' : 'default'}
        />
      </div>

      <section className="mt-5">
        <h2 className="mb-2.5 text-[13px] font-semibold text-[var(--color-ink)]">Agenda de hoje</h2>
        <Card className="overflow-hidden">
          {orders.length === 0 ? (
            <EmptyState
              compact
              title="Sem serviços hoje."
              description="Este colaborador não tem atendimentos atribuídos para hoje."
            />
          ) : (
            <>
              <OrderRowHeader />
              <div className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} onSelect={setSelected} />
                ))}
              </div>
            </>
          )}
        </Card>
      </section>

      <EmployeeSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={employee}
        specialties={specialties}
      />

      <OrderDrawer
        order={selected}
        role={role}
        employees={[employee]}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </PageContainer>
  )
}
