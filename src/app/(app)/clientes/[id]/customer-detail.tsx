'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Phone, MessageCircle, Car, Plus } from 'lucide-react'
import { PageContainer } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { CustomerSheet } from '@/components/customers/customer-sheet'
import { OrderDrawer } from '@/components/orders/order-drawer'
import { NewOrderSheet } from '@/components/schedule/new-order-sheet'
import { formatPhone, formatDate, formatPlate, formatVehicle, formatTime } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { Customer, Vehicle, Employee, ServiceOrderView } from '@/types/database'

export function CustomerDetail({
  customer,
  vehicles,
  orders,
  employees,
  role,
}: {
  customer: Customer
  vehicles: Vehicle[]
  orders: ServiceOrderView[]
  employees: Employee[]
  role: AppRole
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [selected, setSelected] = useState<ServiceOrderView | null>(null)

  return (
    <PageContainer>
      <Link
        href="/clientes"
        className="inline-flex h-9 items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-[21px]">
            {customer.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {customer.phone ? (
              <Button variant="secondary" size="sm" asChild>
                <a href={`tel:${customer.phone}`}>
                  <Phone />
                  {formatPhone(customer.phone)}
                </a>
              </Button>
            ) : null}
            {customer.whatsapp ? (
              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  WhatsApp
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {can(role, 'customers:manage') ? (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar
            </Button>
          ) : null}
          {can(role, 'orders:create') ? (
            <Button variant="primary" onClick={() => setNewOrderOpen(true)}>
              <Plus />
              <span className="hidden sm:inline">Agendar</span>
            </Button>
          ) : null}
        </div>
      </div>

      {customer.notes ? (
        <Card className="mt-4 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Observações
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-ink)]">
            {customer.notes}
          </p>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
        <section>
          <h2 className="mb-2.5 text-[13px] font-semibold text-[var(--color-ink)]">
            Veículos ({vehicles.length})
          </h2>
          <Card className="overflow-hidden">
            {vehicles.length === 0 ? (
              <EmptyState compact icon={Car} title="Nenhum veículo cadastrado." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {vehicles.map((vehicle) => (
                  <li key={vehicle.id} className="px-3.5 py-3">
                    <p className="text-[13.5px] font-medium text-[var(--color-ink)]">
                      {formatVehicle(vehicle)}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--color-ink-muted)]">
                      {vehicle.plate ? (
                        <span className="tnum rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-1 font-medium tracking-wide">
                          {formatPlate(vehicle.plate)}
                        </span>
                      ) : null}
                      {vehicle.color ? <span>{vehicle.color}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2.5 text-[13px] font-semibold text-[var(--color-ink)]">
            Histórico de atendimentos ({orders.length})
          </h2>
          <Card className="overflow-hidden">
            {orders.length === 0 ? (
              <EmptyState
                compact
                title="Nenhum atendimento registrado."
                description="Este cliente ainda não passou pela loja."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                      <div className="w-[76px] shrink-0">
                        <p className="tnum text-[12.5px] font-semibold text-[var(--color-ink)]">
                          {formatDate(order.scheduled_start)}
                        </p>
                        <p className="tnum mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                          {formatTime(order.scheduled_start)}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-[var(--color-ink)]">
                          {order.items.map((i) => i.name_snapshot).join(' · ')}
                        </p>
                        {order.vehicle ? (
                          <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
                            {formatVehicle(order.vehicle)}
                          </p>
                        ) : null}
                      </div>

                      <StatusBadge status={order.current_status} size="sm" short />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <CustomerSheet open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <NewOrderSheet
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        employees={employees}
      />
      <OrderDrawer
        order={selected}
        role={role}
        employees={employees}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </PageContainer>
  )
}
