'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { elapsedSeconds } from '@/domain/timing'
import { formatStopwatch } from '@/lib/format'

/**
 * Cronometro do servico ativo. Conta localmente para nao gerar
 * requisicoes a cada segundo (§83).
 */
export function Stopwatch({
  actualStart,
  actualEnd,
  className,
  live = true,
}: {
  actualStart: string | null
  actualEnd?: string | null
  className?: string
  live?: boolean
}) {
  // O contador so marca a passagem do tempo; o valor exibido e sempre
  // derivado das props, entao trocar de atendimento nao precisa
  // ressincronizar estado.
  const [, tick] = useState(0)
  const running = live && Boolean(actualStart) && !actualEnd

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [running])

  if (!actualStart) return null

  const seconds = elapsedSeconds({
    actual_start: actualStart,
    actual_end: actualEnd ?? null,
  })

  return (
    <span className={cn('tnum', className)}>
      <span className="sr-only">Tempo decorrido: </span>
      {formatStopwatch(seconds)}
    </span>
  )
}
