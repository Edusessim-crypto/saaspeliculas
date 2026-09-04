'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateDelay, type OrderTiming } from '@/domain/timing'
import { formatDuration } from '@/lib/format'

/**
 * Atraso comunicado com icone + texto, sem pintar a tela de vermelho (§22).
 * Recalcula a cada minuto — nao precisa de precisao de segundos aqui.
 */
export function DelayIndicator({
  order,
  className,
  compact,
}: {
  order: OrderTiming
  className?: string
  compact?: boolean
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const delay = calculateDelay(order, now)
  if (!delay.isDelayed) return null

  const label = `${formatDuration(delay.minutes)} de atraso`

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-warning)]',
        className,
      )}
      title={delay.kind === 'start' ? 'Ainda não iniciou' : 'Passou da previsão de término'}
    >
      <AlertTriangle className="size-3" aria-hidden />
      {compact ? formatDuration(delay.minutes) : label}
    </span>
  )
}
