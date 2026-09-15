'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { saveBusinessHours } from '@/lib/actions/settings'
import { WEEKDAY_LABELS } from '@/domain/defaults'
import { can, type AppRole } from '@/domain/roles'
import { markLocalMutation } from '@/lib/local-mutation'

interface DayHours {
  weekday: number
  is_open: boolean
  opens_at: string | null
  closes_at: string | null
  break_start: string | null
  break_end: string | null
}

export function BusinessHoursSettings({
  initialHours,
  role,
}: {
  initialHours: DayHours[]
  role: AppRole
}) {
  const [hours, setHours] = useState(initialHours)
  const [pending, startTransition] = useTransition()
  const editable = can(role, 'org:settings')

  function update(weekday: number, patch: Partial<DayHours>) {
    setHours((prev) => prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)))
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
          Horário de funcionamento
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
          Usado para calcular a capacidade e a taxa de ocupação.
        </p>
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-[var(--color-border)]">
          {hours.map((day) => (
            <li key={day.weekday} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Switch
                    checked={day.is_open}
                    disabled={!editable}
                    aria-label={`${WEEKDAY_LABELS[day.weekday]} aberto`}
                    onCheckedChange={(value) => update(day.weekday, { is_open: value })}
                  />
                  <span className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                    {WEEKDAY_LABELS[day.weekday]}
                  </span>
                </div>

                {day.is_open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.opens_at ?? '08:00'}
                      disabled={!editable}
                      onChange={(e) => update(day.weekday, { opens_at: e.target.value })}
                      className="tnum h-10 w-[104px] px-2 text-center"
                      aria-label={`Abertura ${WEEKDAY_LABELS[day.weekday]}`}
                    />
                    <span className="text-[13px] text-[var(--color-ink-subtle)]">até</span>
                    <Input
                      type="time"
                      value={day.closes_at ?? '18:00'}
                      disabled={!editable}
                      onChange={(e) => update(day.weekday, { closes_at: e.target.value })}
                      className="tnum h-10 w-[104px] px-2 text-center"
                      aria-label={`Fechamento ${WEEKDAY_LABELS[day.weekday]}`}
                    />
                  </div>
                ) : (
                  <span className="text-[13px] text-[var(--color-ink-subtle)]">Fechado</span>
                )}
              </div>

              {day.is_open ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-[54px]">
                  <span className="text-[12px] text-[var(--color-ink-subtle)]">
                    Intervalo (opcional)
                  </span>
                  <Input
                    type="time"
                    value={day.break_start ?? ''}
                    disabled={!editable}
                    onChange={(e) =>
                      update(day.weekday, { break_start: e.target.value || null })
                    }
                    className="tnum h-9 w-[96px] px-2 text-center text-[13px]"
                    aria-label={`Início do intervalo ${WEEKDAY_LABELS[day.weekday]}`}
                  />
                  <span className="text-[12px] text-[var(--color-ink-subtle)]">até</span>
                  <Input
                    type="time"
                    value={day.break_end ?? ''}
                    disabled={!editable}
                    onChange={(e) => update(day.weekday, { break_end: e.target.value || null })}
                    className="tnum h-9 w-[96px] px-2 text-center text-[13px]"
                    aria-label={`Fim do intervalo ${WEEKDAY_LABELS[day.weekday]}`}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {editable ? (
        <Button
          variant="primary"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveBusinessHours({ hours })
              if (!result.ok) {
                toast.error(result.error ?? 'Não foi possível salvar.')
                return
              }
              toast.success('Horários salvos.')
              markLocalMutation()
            })
          }
        >
          Salvar horários
        </Button>
      ) : null}
    </div>
  )
}
