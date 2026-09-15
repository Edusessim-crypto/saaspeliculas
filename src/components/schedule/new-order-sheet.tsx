'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { addMinutes as addMins, format } from 'date-fns'
import { Check, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { CustomerStep } from './customer-step'
import { VehicleStep } from './vehicle-step'
import { ConflictWarning } from '@/components/orders/conflict-warning'
import { getBookingCatalog, type BookingCatalog } from '@/lib/actions/booking-data'
import { createOrder, checkConflicts } from '@/lib/actions/orders'
import { CATEGORY_LABELS, timeSlots } from '@/domain/defaults'
import { formatDuration, formatPlate, formatVehicle, toDateInput } from '@/lib/format'
import type {
  Customer,
  Vehicle,
  Employee,
  ScheduleConflict,
  ServiceType,
} from '@/types/database'
import { cn } from '@/lib/utils'
import { markLocalMutation } from '@/lib/local-mutation'

interface NewOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
  defaultDate?: string
  defaultTime?: string
  defaultEmployeeId?: string
}

type Step = 'customer' | 'vehicle' | 'service' | 'schedule' | 'review'

const STEP_TITLES: Record<Step, string> = {
  customer: 'Cliente',
  vehicle: 'Veículo',
  service: 'Serviços',
  schedule: 'Data e horário',
  review: 'Revisão',
}

const STEP_ORDER: Step[] = ['customer', 'vehicle', 'service', 'schedule', 'review']

export function NewOrderSheet({
  open,
  onOpenChange,
  employees,
  defaultDate,
  defaultTime,
  defaultEmployeeId,
}: NewOrderSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        {/* A key remonta o fluxo a cada abertura, entao cada agendamento
            comeca do zero sem efeito de reset. */}
        {open ? (
          <NewOrderFlow
            key={`${defaultDate ?? ''}|${defaultTime ?? ''}|${defaultEmployeeId ?? ''}`}
            onOpenChange={onOpenChange}
            employees={employees}
            defaultDate={defaultDate}
            defaultTime={defaultTime}
            defaultEmployeeId={defaultEmployeeId}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function NewOrderFlow({
  onOpenChange,
  employees,
  defaultDate,
  defaultTime,
  defaultEmployeeId,
}: Omit<NewOrderSheetProps, 'open'>) {
  const [step, setStep] = useState<Step>('customer')
  const [catalog, setCatalog] = useState<BookingCatalog>({ serviceTypes: [], workstations: [] })
  const [submitting, startSubmit] = useTransition()
  const [checking, startCheck] = useTransition()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [address, setAddress] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [date, setDate] = useState(defaultDate ?? toDateInput(new Date()))
  const [time, setTime] = useState(defaultTime ?? '08:00')
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    defaultEmployeeId ? [defaultEmployeeId] : [],
  )
  const [workstationId, setWorkstationId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [forceConflict, setForceConflict] = useState(false)

  // Busca do catalogo — uso legitimo de efeito.
  useEffect(() => {
    void getBookingCatalog().then(setCatalog)
  }, [])

  const selectedServices = useMemo(
    () => catalog.serviceTypes.filter((s) => serviceIds.includes(s.id)),
    [catalog.serviceTypes, serviceIds],
  )

  const duration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.default_duration_minutes, 0),
    [selectedServices],
  )

  const applicators = employees.filter(
    (e) => e.is_active && (e.role === 'applicator' || e.role === 'manager'),
  )

  const endTime = useMemo(() => {
    if (!duration) return null
    const start = new Date(`${date}T${time}:00`)
    return format(addMins(start, duration), 'HH:mm')
  }, [date, time, duration])

  const shouldCheckConflicts =
    (step === 'schedule' || step === 'review') &&
    duration > 0 &&
    (employeeIds.length > 0 || Boolean(workstationId))

  // Verifica conflitos assim que o horário, aplicador ou box mudam.
  useEffect(() => {
    if (!shouldCheckConflicts) return
    const timer = setTimeout(() => {
      startCheck(async () => {
        const result = await checkConflicts({
          date,
          start_time: time,
          duration_minutes: duration,
          employee_ids: employeeIds,
          workstation_id: workstationId,
        })
        setConflicts(result.data ?? [])
        setForceConflict(false)
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [shouldCheckConflicts, date, time, duration, employeeIds, workstationId])

  // Sem recurso a checar, nao ha conflito a exibir — derivado, nao estado.
  const activeConflicts = shouldCheckConflicts ? conflicts : []

  const canAdvance: Record<Step, boolean> = {
    customer: Boolean(customer),
    vehicle: Boolean(vehicle) || address.trim().length > 2,
    service: serviceIds.length > 0,
    schedule: Boolean(date && time),
    review: true,
  }

  const stepIndex = STEP_ORDER.indexOf(step)

  function next() {
    const nextStep = STEP_ORDER[stepIndex + 1]
    if (nextStep) setStep(nextStep)
  }

  function back() {
    const prev = STEP_ORDER[stepIndex - 1]
    if (prev) setStep(prev)
  }

  function submit() {
    startSubmit(async () => {
      const result = await createOrder({
        customer_id: customer?.id,
        vehicle_id: vehicle?.id ?? null,
        service_address: vehicle ? null : address,
        date,
        start_time: time,
        duration_minutes: duration,
        service_type_ids: serviceIds,
        employee_ids: employeeIds,
        workstation_id: workstationId,
        priority: 'normal',
        internal_notes: notes,
        force_conflict: forceConflict,
      })

      if (!result.ok) {
        if (result.error === 'CONFLICT') {
          setStep('schedule')
          toast.error('Este horário possui conflito. Revise ou confirme mesmo assim.')
          return
        }
        toast.error(result.error ?? 'Não foi possível criar o agendamento.')
        return
      }

      toast.success('Agendamento criado.')
      onOpenChange(false)
      markLocalMutation()
    })
  }

  return (
    <>
        <SheetHeader
          title="Novo agendamento"
          description={`Passo ${stepIndex + 1} de ${STEP_ORDER.length} · ${STEP_TITLES[step]}`}
        />

        {/* Trilha de progresso */}
        <div className="flex gap-1 border-b border-[var(--color-border)] px-4 py-2.5 sm:px-5">
          {STEP_ORDER.map((s, index) => (
            <button
              key={s}
              type="button"
              disabled={index > stepIndex}
              onClick={() => setStep(s)}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                index <= stepIndex ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                index < stepIndex && 'cursor-pointer',
              )}
              aria-label={STEP_TITLES[s]}
            />
          ))}
        </div>

        <SheetBody>
          <div className="space-y-4 p-4 sm:p-5">
            {step === 'customer' ? (
              <CustomerStep selected={customer} onSelect={setCustomer} />
            ) : null}

            {step === 'vehicle' && customer ? (
              <VehicleStep
                customerId={customer.id}
                selected={vehicle}
                address={address}
                onSelect={setVehicle}
                onAddressChange={setAddress}
              />
            ) : null}

            {step === 'service' ? (
              <ServicePicker
                catalog={catalog}
                selected={serviceIds}
                onChange={setServiceIds}
                duration={duration}
              />
            ) : null}

            {step === 'schedule' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                  <Field label="Data" htmlFor="order-date" required>
                    <Input
                      id="order-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Horário" htmlFor="order-time" required>
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger id="order-time">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots().map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {endTime ? (
                  <p className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)]">
                    <Clock className="size-4" aria-hidden />
                    <span className="tnum">
                      {time} — {endTime}
                    </span>
                    <span>· {formatDuration(duration)}</span>
                  </p>
                ) : null}

                <Field label="Aplicador" hint="Pode ser definido depois.">
                  <div className="space-y-1">
                    {applicators.map((employee) => {
                      const checked = employeeIds.includes(employee.id)
                      return (
                        <label
                          key={employee.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition-colors',
                            checked
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                              : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              setEmployeeIds((prev) =>
                                value === true
                                  ? [...prev, employee.id]
                                  : prev.filter((id) => id !== employee.id),
                              )
                            }
                          />
                          <EmployeeAvatar
                            name={employee.full_name}
                            color={employee.color}
                            size="sm"
                          />
                          <span className="truncate text-[13.5px] text-[var(--color-ink)]">
                            {employee.full_name}
                          </span>
                        </label>
                      )
                    })}
                    {applicators.length === 0 ? (
                      <p className="text-[13px] text-[var(--color-ink-subtle)]">
                        Nenhum aplicador cadastrado.
                      </p>
                    ) : null}
                  </div>
                </Field>

                {catalog.workstations.length > 0 ? (
                  <Field label="Box" htmlFor="order-box" hint="Opcional.">
                    <Select
                      value={workstationId ?? 'none'}
                      onValueChange={(v) => setWorkstationId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger id="order-box">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem box definido</SelectItem>
                        {catalog.workstations.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                {activeConflicts.length > 0 ? (
                  <div className="space-y-2">
                    <ConflictWarning conflicts={activeConflicts} />
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                      <Checkbox
                        checked={forceConflict}
                        onCheckedChange={(v) => setForceConflict(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-[13px] text-[var(--color-ink)]">
                        Agendar mesmo assim
                      </span>
                    </label>
                  </div>
                ) : null}

                <Field label="Observações internas" htmlFor="order-notes">
                  <Textarea
                    id="order-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes que a equipe precisa saber"
                    rows={2}
                  />
                </Field>
              </div>
            ) : null}

            {step === 'review' ? (
              <div className="space-y-3">
                <ReviewRow label="Cliente" value={customer?.name ?? '—'} />
                <ReviewRow
                  label={vehicle ? 'Veículo' : 'Local'}
                  value={
                    vehicle
                      ? `${formatVehicle(vehicle)}${vehicle.plate ? ` · ${formatPlate(vehicle.plate)}` : ''}`
                      : address
                  }
                />
                <ReviewRow
                  label="Serviços"
                  value={selectedServices.map((s) => s.name).join(', ')}
                />
                <ReviewRow
                  label="Data e horário"
                  value={`${date.split('-').reverse().join('/')} · ${time}${endTime ? ` — ${endTime}` : ''}`}
                />
                <ReviewRow
                  label="Aplicador"
                  value={
                    employeeIds.length
                      ? applicators
                          .filter((e) => employeeIds.includes(e.id))
                          .map((e) => e.full_name)
                          .join(', ')
                      : 'A definir'
                  }
                />
                <ReviewRow
                  label="Box"
                  value={
                    catalog.workstations.find((w) => w.id === workstationId)?.name ?? 'A definir'
                  }
                />
                <ReviewRow label="Duração" value={formatDuration(duration)} />

                {activeConflicts.length > 0 && !forceConflict ? (
                  <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] p-3 text-[12.5px]">
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]"
                      aria-hidden
                    />
                    <span>
                      Há conflito neste horário. Volte ao passo anterior para revisar ou confirmar.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </SheetBody>

        <SheetFooter className="sm:justify-between">
          <Button
            variant="ghost"
            size="lg"
            onClick={stepIndex === 0 ? () => onOpenChange(false) : back}
            disabled={submitting}
          >
            {stepIndex === 0 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step === 'review' ? (
            <Button
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={activeConflicts.length > 0 && !forceConflict}
              onClick={submit}
            >
              <Check />
              Confirmar agendamento
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              disabled={!canAdvance[step] || checking}
              onClick={next}
            >
              Continuar
              <ChevronRight />
            </Button>
          )}
        </SheetFooter>
    </>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-2.5 last:border-0">
      <span className="shrink-0 text-[12.5px] font-medium text-[var(--color-ink-subtle)]">
        {label}
      </span>
      <span className="text-right text-[13.5px] font-medium text-[var(--color-ink)]">
        {value || '—'}
      </span>
    </div>
  )
}

function ServicePicker({
  catalog,
  selected,
  onChange,
  duration,
}: {
  catalog: BookingCatalog
  selected: string[]
  onChange: (ids: string[]) => void
  duration: number
}) {
  const services = catalog.serviceTypes
  const grouped = useMemo(() => {
    const map = new Map<string, ServiceType[]>()
    for (const service of services) {
      const list = map.get(service.category) ?? []
      list.push(service)
      map.set(service.category, list)
    }
    return [...map.entries()]
  }, [services])

  return (
    <div className="space-y-4">
      {grouped.map(([category, services]) => (
        <div key={category}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}
          </p>
          <div className="space-y-1">
            {services.map((service) => {
              const checked = selected.includes(service.id)
              return (
                <label
                  key={service.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition-colors',
                    checked
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      onChange(
                        value === true
                          ? [...selected, service.id]
                          : selected.filter((id) => id !== service.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-ink)]">
                    {service.name}
                  </span>
                  <span className="tnum shrink-0 text-[12px] text-[var(--color-ink-muted)]">
                    {formatDuration(service.default_duration_minutes)}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}

      {duration > 0 ? (
        <div className="sticky bottom-0 flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <span className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Total
          </span>
          <span className="tnum text-[14px] font-semibold text-[var(--color-ink)]">
            {formatDuration(duration)}
          </span>
        </div>
      ) : null}

      {catalog.serviceTypes.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[var(--color-ink-subtle)]">
          Nenhum serviço cadastrado. Configure em Configurações → Serviços.
        </p>
      ) : null}
    </div>
  )
}
