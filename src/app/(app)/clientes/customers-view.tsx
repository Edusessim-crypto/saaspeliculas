'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Contact, ChevronRight } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CustomerSheet } from '@/components/customers/customer-sheet'
import { formatPhone, formatDate, formatVehicle } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { Customer, Vehicle } from '@/types/database'

export interface CustomerWithStats extends Customer {
  vehicles: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'plate'>[]
  lastVehicle: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'plate'> | null
  totalOrders: number
  lastOrderAt: string | null
}

export function CustomersView({
  customers,
  role,
}: {
  customers: CustomerWithStats[]
  role: AppRole
}) {
  const [term, setTerm] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase()
    if (!q) return customers
    const digits = q.replace(/\D/g, '')
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (digits && c.phone?.includes(digits)) ||
        c.vehicles.some(
          (v) =>
            v.plate?.toLowerCase().includes(q) ||
            `${v.brand} ${v.model}`.toLowerCase().includes(q),
        ),
    )
  }, [customers, term])

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} cliente${customers.length === 1 ? '' : 's'} cadastrado${customers.length === 1 ? '' : 's'}`}
        actions={
          can(role, 'customers:manage') ? (
            <Button variant="primary" onClick={() => setSheetOpen(true)}>
              <Plus />
              <span className="hidden sm:inline">Novo cliente</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          ) : null
        }
      >
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-subtle)]"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nome, telefone, placa ou modelo"
            className="pl-9"
            aria-label="Buscar cliente"
          />
        </div>
      </PageHeader>

      <Card className="mt-4 overflow-hidden">
        {filtered.length === 0 ? (
          customers.length === 0 ? (
            <EmptyState
              icon={Contact}
              title="Nenhum cliente cadastrado."
              description="Os clientes também podem ser criados durante o agendamento."
              action={
                can(role, 'customers:manage') ? (
                  <Button variant="primary" onClick={() => setSheetOpen(true)}>
                    <Plus />
                    Novo cliente
                  </Button>
                ) : null
              }
            />
          ) : (
            <EmptyState compact title={`Nada encontrado para “${term}”.`} />
          )
        ) : (
          <>
            {/* Cabeçalho de tabela apenas no desktop; mobile vira lista (§56) */}
            <div className="hidden items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] md:flex">
              <span className="flex-1">Cliente</span>
              <span className="w-[132px] shrink-0">Telefone</span>
              <span className="w-[180px] shrink-0">Último veículo</span>
              <span className="w-[110px] shrink-0">Último atendimento</span>
              <span className="w-[64px] shrink-0 text-right">Serviços</span>
            </div>

            <ul className="divide-y divide-[var(--color-border)]">
              {filtered.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={`/clientes/${customer.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)] md:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                        {customer.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)] md:hidden">
                        {customer.phone ? formatPhone(customer.phone) : 'Sem telefone'}
                        {customer.lastVehicle
                          ? ` · ${formatVehicle(customer.lastVehicle)}`
                          : ''}
                      </p>
                    </div>

                    <span className="hidden w-[132px] shrink-0 truncate text-[13px] text-[var(--color-ink-muted)] md:block">
                      {customer.phone ? formatPhone(customer.phone) : '—'}
                    </span>
                    <span className="hidden w-[180px] shrink-0 truncate text-[13px] text-[var(--color-ink-muted)] md:block">
                      {customer.lastVehicle ? formatVehicle(customer.lastVehicle) : '—'}
                    </span>
                    <span className="tnum hidden w-[110px] shrink-0 text-[13px] text-[var(--color-ink-muted)] md:block">
                      {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                    </span>
                    <span className="tnum hidden w-[64px] shrink-0 text-right text-[13px] font-medium text-[var(--color-ink)] md:block">
                      {customer.totalOrders}
                    </span>

                    <ChevronRight
                      className="size-4 shrink-0 text-[var(--color-ink-subtle)] md:hidden"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <CustomerSheet open={sheetOpen} onOpenChange={setSheetOpen} customer={null} />
    </PageContainer>
  )
}
