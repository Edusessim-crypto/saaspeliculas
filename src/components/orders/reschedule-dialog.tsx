'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { differenceInMinutes } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { rescheduleOrder } from '@/lib/actions/orders'
import { timeSlots } from '@/domain/defaults'
import { toDateInput, toTimeInput, formatDateTime, formatDuration } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceOrderView } from '@/types/database'
import { markLocalMutation } from '@/lib/local-mutation'

export function RescheduleDialog({
  order,
  role,
  open,
  onOpenChange,
}: {
  order: ServiceOrderView
  role: AppRole
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Remontagem por key: o formulario ja nasce com o horario atual. */}
        {open ? (
          <RescheduleForm
            key={`${order.id}:${order.scheduled_start}`}
            order={order}
            role={role}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RescheduleForm({
  order,
  role,
  onOpenChange,
}: {
  order: ServiceOrderView
  role: AppRole
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(() => toDateInput(new Date(order.scheduled_start)))
  const [time, setTime] = useState(() => toTimeInput(new Date(order.scheduled_start)))
  const [conflict, setConflict] = useState(false)

  const duration = differenceInMinutes(
    new Date(order.scheduled_end),
    new Date(order.scheduled_start),
  )

  function submit(force = false) {
    startTransition(async () => {
      const result = await rescheduleOrder({
        order_id: order.id,
        date,
        start_time: time,
        duration_minutes: duration,
        force_conflict: force,
      })

      if (!result.ok) {
        if (result.error === 'CONFLICT') {
          if (can(role, 'orders:force_conflict')) {
            setConflict(true)
          } else {
            toast.error('Há conflito neste horário. Peça à gestão para confirmar.')
          }
          return
        }
        toast.error(result.error ?? 'Não foi possível reagendar.')
        return
      }

      toast.success('Atendimento reagendado.')
      onOpenChange(false)
      markLocalMutation()
    })
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>Reagendar atendimento</DialogTitle>
          <DialogDescription>
            Atual: {formatDateTime(order.scheduled_start)} · {formatDuration(duration)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 pb-2">
          <Field label="Nova data" htmlFor="reschedule-date" required>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setConflict(false)
              }}
            />
          </Field>

          <Field label="Novo horário" htmlFor="reschedule-time" required>
            <Select
              value={time}
              onValueChange={(v) => {
                setTime(v)
                setConflict(false)
              }}
            >
              <SelectTrigger id="reschedule-time">
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

          {conflict ? (
            <div className="rounded-[var(--radius-control)] border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] p-3 text-[12.5px] text-[var(--color-ink)]">
              Este horário tem conflito de aplicador ou box. Confirmar mesmo assim?
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant={conflict ? 'danger' : 'primary'}
            loading={pending}
            disabled={!date || !time}
            onClick={() => submit(conflict)}
          >
            {conflict ? 'Reagendar mesmo assim' : 'Reagendar'}
          </Button>
        </DialogFooter>
    </>
  )
}
