'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Phone, MessageCircle, Box, MapPin, Loader2, Users } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Timeline } from './timeline'
import { OrderActions } from './order-actions'
import { Checklist } from './checklist'
import { Stopwatch } from './stopwatch'
import { DelayIndicator } from './delay-indicator'
import { PriorityBadge } from './priority-badge'
import { AssignEmployeesDialog } from './assign-employees-dialog'
import { RescheduleDialog } from './reschedule-dialog'
import { getOrderExtras, type OrderDetailExtras } from '@/lib/actions/order-detail'
import { updateOrderNotes } from '@/lib/actions/orders'
import {
  formatTime,
  formatDate,
  formatDuration,
  formatPhone,
  formatPlate,
  formatVehicle,
  formatCurrency,
} from '@/lib/format'
import { totalDuration } from '@/domain/timing'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceOrderView, Employee } from '@/types/database'
import { markLocalMutation } from '@/lib/local-mutation'

interface OrderDrawerProps {
  order: ServiceOrderView | null
  role: AppRole
  employees: Employee[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDrawer({ order, role, employees, open, onOpenChange }: OrderDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="sm:w-[min(560px,100vw)]">
        {/* A key remonta o conteudo ao trocar de atendimento: o estado
            local nasce limpo, sem efeito de reset. */}
        {open && order ? (
          <OrderDrawerContent
            key={order.id}
            order={order}
            role={role}
            employees={employees}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function OrderDrawerContent({
  order,
  role,
  employees,
  onOpenChange,
}: {
  order: ServiceOrderView
  role: AppRole
  employees: Employee[]
  onOpenChange: (open: boolean) => void
}) {
  const [extras, setExtras] = useState<OrderDetailExtras | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChecklist, setShowChecklist] = useState(false)
  const [noteDraft, setNoteDraft] = useState(order.internal_notes ?? '')
  const [editingNote, setEditingNote] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [savingNote, startNoteTransition] = useTransition()

  // Busca de dados externos — uso legitimo de efeito.
  useEffect(() => {
    let cancelled = false
    void getOrderExtras(order.id).then((data) => {
      if (cancelled) return
      setExtras(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [order.id])

  const planned = totalDuration(order.items)
  const totalPrice = order.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)
  const vehicleLabel = order.vehicle ? formatVehicle(order.vehicle) : null

  return (
    <>
          <SheetHeader
            title={vehicleLabel ?? order.customer?.name ?? 'Atendimento'}
            description={`#${order.code} · ${formatDate(order.scheduled_start)} · ${formatTime(order.scheduled_start)}`}
          />

          <SheetBody>
            <div className="space-y-5 p-4 sm:p-5">
              {/* Status e tempo — a informacao mais consultada */}
              <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.current_status} />
                  <PriorityBadge priority={order.priority} />
                  <DelayIndicator order={order} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px] sm:grid-cols-4">
                  <Stat label="Agendado" value={formatTime(order.scheduled_start)} />
                  <Stat
                    label="Iniciado"
                    value={order.actual_start ? formatTime(order.actual_start) : '—'}
                  />
                  <Stat label="Previsão" value={formatTime(order.scheduled_end)} />
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                      {order.actual_end ? 'Duração' : 'Decorrido'}
                    </dt>
                    <dd className="tnum mt-0.5 font-semibold text-[var(--color-ink)]">
                      {order.actual_start ? (
                        <Stopwatch
                          actualStart={order.actual_start}
                          actualEnd={order.actual_end}
                          live={!order.actual_end}
                        />
                      ) : (
                        formatDuration(planned)
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Cliente */}
              <Section title="Cliente">
                <p className="text-[14px] font-medium text-[var(--color-ink)]">
                  {order.customer?.name ?? '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {order.customer?.phone ? (
                    <Button variant="secondary" size="sm" asChild>
                      <a href={`tel:${order.customer.phone}`}>
                        <Phone />
                        {formatPhone(order.customer.phone)}
                      </a>
                    </Button>
                  ) : null}
                  {order.customer?.whatsapp ? (
                    <Button variant="secondary" size="sm" asChild>
                      <a
                        href={`https://wa.me/55${order.customer.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle />
                        WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              </Section>

              {/* Veiculo ou endereco */}
              <Section title={order.vehicle ? 'Veículo' : 'Local do serviço'}>
                {order.vehicle ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                    <Stat label="Modelo" value={formatVehicle(order.vehicle)} />
                    <Stat
                      label="Placa"
                      value={order.vehicle.plate ? formatPlate(order.vehicle.plate) : '—'}
                    />
                    <Stat label="Ano" value={order.vehicle.year?.toString() ?? '—'} />
                    <Stat label="Cor" value={order.vehicle.color ?? '—'} />
                  </dl>
                ) : (
                  <p className="flex items-start gap-1.5 text-[13.5px] text-[var(--color-ink)]">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
                    {order.service_address ?? 'Não informado'}
                  </p>
                )}
              </Section>

              {/* Servicos */}
              <Section title="Serviços">
                <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-control)] border border-[var(--color-border)]">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                        {item.name_snapshot}
                        {item.quantity > 1 ? (
                          <span className="ml-1 text-[var(--color-ink-subtle)]">×{item.quantity}</span>
                        ) : null}
                      </span>
                      <span className="tnum shrink-0 text-[12.5px] text-[var(--color-ink-muted)]">
                        {formatDuration(item.duration_minutes * item.quantity)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3 bg-[var(--color-surface)] px-3 py-2.5">
                    <span className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                      Total
                    </span>
                    <span className="tnum text-[13px] font-semibold text-[var(--color-ink)]">
                      {formatDuration(planned)}
                      {totalPrice > 0 ? (
                        <span className="ml-2 font-normal text-[var(--color-ink-muted)]">
                          {formatCurrency(totalPrice)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                </ul>
              </Section>

              {/* Aplicadores e box */}
              <Section
                title="Aplicadores"
                action={
                  can(role, 'orders:assign') ? (
                    <Button variant="ghost" size="sm" onClick={() => setAssignOpen(true)}>
                      <Users />
                      Alterar
                    </Button>
                  ) : null
                }
              >
                {order.employees.length ? (
                  <ul className="space-y-1.5">
                    {order.employees.map((e) => (
                      <li key={e.employee_id} className="flex items-center gap-2.5">
                        <EmployeeAvatar
                          name={e.full_name}
                          color={e.color}
                          avatarUrl={e.avatar_url}
                          size="sm"
                        />
                        <span className="text-[13.5px] text-[var(--color-ink)]">{e.full_name}</span>
                        {e.is_lead && order.employees.length > 1 ? (
                          <span className="text-[11px] text-[var(--color-ink-subtle)]">
                            Responsável
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[var(--color-ink-subtle)]">
                    Nenhum aplicador definido.
                  </p>
                )}

                {order.workstation ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)]">
                    <Box className="size-4" aria-hidden />
                    {order.workstation.name}
                  </p>
                ) : null}
              </Section>

              {/* Observacoes */}
              <Section
                title="Observações internas"
                action={
                  !editingNote ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingNote(true)}>
                      {order.internal_notes ? 'Editar' : 'Adicionar'}
                    </Button>
                  ) : null
                }
              >
                {editingNote ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Detalhes que a equipe precisa saber"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNoteDraft(order.internal_notes ?? '')
                          setEditingNote(false)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingNote}
                        onClick={() =>
                          startNoteTransition(async () => {
                            const result = await updateOrderNotes(order.id, noteDraft)
                            if (!result.ok) {
                              toast.error(result.error ?? 'Não foi possível salvar.')
                              return
                            }
                            setEditingNote(false)
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
                  <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-ink)]">
                    {order.internal_notes || (
                      <span className="text-[var(--color-ink-subtle)]">Nenhuma observação.</span>
                    )}
                  </p>
                )}
              </Section>

              {/* Checklist */}
              {extras?.checklist.template?.items.length ? (
                <Section title="Checklist">
                  {showChecklist ||
                  ['application', 'inspection', 'ready', 'delivered'].includes(
                    order.current_status,
                  ) ? (
                    <Checklist
                      orderId={order.id}
                      items={extras.checklist.template.items}
                      responses={extras.checklist.responses}
                      readOnly={['ready', 'delivered'].includes(order.current_status)}
                      onDone={() => setShowChecklist(false)}
                    />
                  ) : (
                    <p className="text-[13px] text-[var(--color-ink-subtle)]">
                      Disponível quando o serviço estiver em aplicação.
                    </p>
                  )}
                </Section>
              ) : null}

              <Separator />

              {/* Historico */}
              <Section title="Histórico">
                {loading ? (
                  <div className="flex items-center gap-2 text-[13px] text-[var(--color-ink-subtle)]">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Carregando…
                  </div>
                ) : (
                  <Timeline entries={extras?.history ?? []} />
                )}
              </Section>
            </div>
          </SheetBody>

          <SheetFooter className="sm:flex-row sm:justify-stretch">
            <OrderActions
              order={order}
              role={role}
              onChecklistRequired={() => setShowChecklist(true)}
              onReschedule={() => setRescheduleOpen(true)}
              onAddNote={() => setEditingNote(true)}
            />
          </SheetFooter>

      <AssignEmployeesDialog
        order={order}
        employees={employees}
        role={role}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

      <RescheduleDialog
        order={order}
        role={role}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />
    </>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="tnum mt-0.5 truncate font-semibold text-[var(--color-ink)]">{value}</dd>
    </div>
  )
}
