'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { formatLongDate, formatShortDate, toDateInput } from '@/lib/format'

/** ‹ Hoje › — a navegação de data é a mesma em todas as telas (§131). */
export function DateNavigator({
  date,
  view,
  onChange,
}: {
  date: Date
  view: 'day' | 'week'
  onChange: (date: Date) => void
}) {
  const step = view === 'week' ? 7 : 1
  const today = new Date()
  const isToday = isSameDay(date, today)

  const label =
    view === 'week'
      ? `${formatShortDate(startOfWeek(date, { weekStartsOn: 1 }))} — ${formatShortDate(
          endOfWeek(date, { weekStartsOn: 1 }),
        )}`
      : formatLongDate(date)

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="secondary"
        size="icon"
        aria-label={view === 'week' ? 'Semana anterior' : 'Dia anterior'}
        onClick={() => onChange(addDays(date, -step))}
      >
        <ChevronLeft />
      </Button>

      <Button
        variant={isToday ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange(today)}
        disabled={isToday && view === 'day'}
      >
        Hoje
      </Button>

      <Button
        variant="secondary"
        size="icon"
        aria-label={view === 'week' ? 'Próxima semana' : 'Próximo dia'}
        onClick={() => onChange(addDays(date, step))}
      >
        <ChevronRight />
      </Button>

      <p className="ml-1.5 min-w-0 truncate text-[13.5px] font-medium text-[var(--color-ink)]">
        {label}
      </p>
    </div>
  )
}

export { toDateInput }
