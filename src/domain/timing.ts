import { differenceInMinutes, differenceInSeconds } from 'date-fns'
import type { OrderStatus } from './status'
import { isTerminal } from './state-machine'

export interface OrderTiming {
  scheduled_start: string | Date
  scheduled_end: string | Date
  actual_start: string | null | Date
  actual_end: string | null | Date
  current_status: OrderStatus
}

export interface DelayInfo {
  isDelayed: boolean
  minutes: number
  /** 'start' = deveria ter comecado; 'finish' = passou da previsao de termino */
  kind: 'start' | 'finish' | null
}

const asDate = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v)

/**
 * Um atendimento esta atrasado quando (§22):
 *  - passou do horario de inicio e ainda nao entrou em producao; ou
 *  - passou da previsao de termino e ainda nao foi finalizado.
 *
 * Atendimentos terminais nunca aparecem como atrasados — ja acabaram.
 */
export function calculateDelay(order: OrderTiming, now: Date = new Date()): DelayInfo {
  if (isTerminal(order.current_status)) {
    return { isDelayed: false, minutes: 0, kind: null }
  }

  const notStarted: OrderStatus[] = ['scheduled', 'arrived', 'waiting']
  const start = asDate(order.scheduled_start)
  const end = asDate(order.scheduled_end)

  if (notStarted.includes(order.current_status)) {
    const minutes = differenceInMinutes(now, start)
    if (minutes > 0) return { isDelayed: true, minutes, kind: 'start' }
    return { isDelayed: false, minutes: 0, kind: null }
  }

  if (!order.actual_end) {
    const minutes = differenceInMinutes(now, end)
    if (minutes > 0) return { isDelayed: true, minutes, kind: 'finish' }
  }

  return { isDelayed: false, minutes: 0, kind: null }
}

/** Duracao prevista, em minutos, a partir dos itens do atendimento (§86). */
export function totalDuration(
  items: { duration_minutes: number; quantity?: number }[],
): number {
  return items.reduce(
    (sum, item) => sum + item.duration_minutes * (item.quantity ?? 1),
    0,
  )
}

/** Tempo decorrido em segundos desde o inicio real. Base do cronometro. */
export function elapsedSeconds(
  order: Pick<OrderTiming, 'actual_start' | 'actual_end'>,
  now: Date = new Date(),
): number {
  if (!order.actual_start) return 0
  const end = order.actual_end ? asDate(order.actual_end) : now
  return Math.max(0, differenceInSeconds(end, asDate(order.actual_start)))
}

/** Tempo total de execucao, para os indicadores. */
export function executionMinutes(
  order: Pick<OrderTiming, 'actual_start' | 'actual_end'>,
): number | null {
  if (!order.actual_start || !order.actual_end) return null
  return differenceInMinutes(asDate(order.actual_end), asDate(order.actual_start))
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** Dois intervalos [start, end) se sobrepoem? Base da deteccao de conflito. */
export function overlaps(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
): boolean {
  return asDate(aStart) < asDate(bEnd) && asDate(bStart) < asDate(aEnd)
}
