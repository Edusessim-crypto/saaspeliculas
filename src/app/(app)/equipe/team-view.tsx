'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, UserPlus, ChevronRight } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmployeeSheet } from '@/components/team/employee-sheet'
import { STATUS_CONFIG } from '@/domain/status'
import { formatTime, formatDuration } from '@/lib/format'
import { ROLE_LABELS, can, type AppRole } from '@/domain/roles'
import type { Employee, ServiceOrderView } from '@/types/database'
import type { EmployeeStats } from '@/lib/data/metrics'
import { cn } from '@/lib/utils'

export function TeamView({
  employees,
  orders,
  stats,
  role,
}: {
  employees: Employee[]
  orders: ServiceOrderView[]
  stats: Record<string, EmployeeStats>
  role: AppRole
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)

  const active = employees.filter((e) => e.is_active)
  const inactive = employees.filter((e) => !e.is_active)

  return (
    <PageContainer>
      <PageHeader
        title="Equipe"
        subtitle={`${active.length} colaborador${active.length === 1 ? '' : 'es'} ativo${active.length === 1 ? '' : 's'}`}
        actions={
          can(role, 'team:manage') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setSheetOpen(true)
              }}
            >
              <Plus />
              <span className="hidden sm:inline">Novo colaborador</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          ) : null
        }
      />

      <div className="mt-4">
        {active.length === 0 ? (
          <Card>
            <EmptyState
              icon={UserPlus}
              title="Nenhum colaborador cadastrado."
              description="Cadastre sua equipe para começar a distribuir os serviços."
              action={
                can(role, 'team:manage') ? (
                  <Button variant="primary" onClick={() => setSheetOpen(true)}>
                    <Plus />
                    Novo colaborador
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                orders={orders}
                stats={stats[employee.id]}
              />
            ))}
          </div>
        )}

        {inactive.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Inativos
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {inactive.map((employee) => (
                <Card key={employee.id} className="flex items-center gap-2.5 p-3 opacity-70">
                  <EmployeeAvatar name={employee.full_name} color={employee.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                    {employee.full_name}
                  </span>
                  <Badge variant="outline">Inativo</Badge>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <EmployeeSheet open={sheetOpen} onOpenChange={setSheetOpen} employee={editing} />
    </PageContainer>
  )
}

function EmployeeCard({
  employee,
  orders,
  stats,
}: {
  employee: Employee
  orders: ServiceOrderView[]
  stats?: EmployeeStats
}) {
  const own = orders.filter((o) => o.employees.some((e) => e.employee_id === employee.id))
  const running = own.find((o) => ['preparation', 'application'].includes(o.current_status))
  const next = own.find((o) => ['scheduled', 'arrived', 'waiting'].includes(o.current_status))
  const completed = stats?.completed ?? 0

  return (
    <Card className="transition-colors hover:bg-[var(--color-surface-hover)]">
      <Link href={`/equipe/${employee.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <EmployeeAvatar
            name={employee.full_name}
            color={employee.color}
            avatarUrl={employee.avatar_url}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[var(--color-ink)]">
              {employee.full_name}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-ink-muted)]">
              {employee.job_title ?? ROLE_LABELS[employee.role]}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'size-2 shrink-0 rounded-full',
              running ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]',
            )}
          />
          <span className="truncate text-[12.5px] text-[var(--color-ink-muted)]">
            {running
              ? `${STATUS_CONFIG[running.current_status].label} · ${
                  running.vehicle?.model ?? running.customer?.name ?? ''
                }`
              : 'Disponível'}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 text-center">
          <div>
            <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Hoje
            </dt>
            <dd className="tnum mt-0.5 text-[15px] font-semibold text-[var(--color-ink)]">
              {own.length}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Concluídos
            </dt>
            <dd className="tnum mt-0.5 text-[15px] font-semibold text-[var(--color-success)]">
              {completed}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
              Média
            </dt>
            <dd className="tnum mt-0.5 text-[15px] font-semibold text-[var(--color-ink)]">
              {stats?.averageMinutes ? formatDuration(stats.averageMinutes) : '—'}
            </dd>
          </div>
        </dl>

        {next ? (
          <p className="mt-2.5 truncate text-[12px] text-[var(--color-ink-subtle)]">
            Próximo: {formatTime(next.scheduled_start)} ·{' '}
            {next.vehicle?.model ?? next.customer?.name ?? ''}
          </p>
        ) : null}
      </Link>
    </Card>
  )
}
