import { describe, it, expect } from 'vitest'
import {
  calculateDelay,
  totalDuration,
  elapsedSeconds,
  executionMinutes,
  overlaps,
  addMinutes,
} from '@/domain/timing'
import type { OrderStatus } from '@/domain/status'

const at = (hhmm: string) => new Date(`2026-09-03T${hhmm}:00`)

function order(
  status: OrderStatus,
  start: string,
  end: string,
  actualStart: string | null = null,
  actualEnd: string | null = null,
) {
  return {
    current_status: status,
    scheduled_start: at(start).toISOString(),
    scheduled_end: at(end).toISOString(),
    actual_start: actualStart ? at(actualStart).toISOString() : null,
    actual_end: actualEnd ? at(actualEnd).toISOString() : null,
  }
}

describe('detecção de atraso', () => {
  it('marca atraso quando passou do horário e não iniciou', () => {
    const delay = calculateDelay(order('scheduled', '08:00', '09:30'), at('08:12'))
    expect(delay.isDelayed).toBe(true)
    expect(delay.minutes).toBe(12)
    expect(delay.kind).toBe('start')
  })

  it('não marca atraso antes do horário agendado', () => {
    expect(calculateDelay(order('scheduled', '08:00', '09:30'), at('07:45')).isDelayed).toBe(false)
  })

  it('marca atraso quando a execução passou da previsão de término', () => {
    const delay = calculateDelay(
      order('application', '08:00', '09:30', '08:05'),
      at('09:50'),
    )
    expect(delay.isDelayed).toBe(true)
    expect(delay.minutes).toBe(20)
    expect(delay.kind).toBe('finish')
  })

  it('em execução dentro do prazo não está atrasado', () => {
    expect(
      calculateDelay(order('application', '08:00', '09:30', '08:05'), at('09:00')).isDelayed,
    ).toBe(false)
  })

  it('atendimentos terminais nunca aparecem como atrasados', () => {
    for (const status of ['delivered', 'cancelled', 'no_show'] as OrderStatus[]) {
      expect(
        calculateDelay(order(status, '08:00', '09:30'), at('23:00')).isDelayed,
        status,
      ).toBe(false)
    }
  })

  it('cliente já chegou mas serviço não começou também conta como atraso', () => {
    const delay = calculateDelay(order('waiting', '08:00', '09:30'), at('08:30'))
    expect(delay.isDelayed).toBe(true)
    expect(delay.kind).toBe('start')
  })
})

describe('cálculo de duração', () => {
  it('soma a duração dos itens respeitando a quantidade', () => {
    expect(
      totalDuration([
        { duration_minutes: 90 },
        { duration_minutes: 30 },
      ]),
    ).toBe(120)

    expect(totalDuration([{ duration_minutes: 45, quantity: 3 }])).toBe(135)
  })

  it('lista vazia resulta em zero', () => {
    expect(totalDuration([])).toBe(0)
  })

  it('mede tempo decorrido a partir do início real', () => {
    const seconds = elapsedSeconds(
      { actual_start: at('08:00').toISOString(), actual_end: null },
      at('09:12'),
    )
    expect(seconds).toBe(72 * 60)
  })

  it('sem início real, o tempo decorrido é zero', () => {
    expect(elapsedSeconds({ actual_start: null, actual_end: null }, at('10:00'))).toBe(0)
  })

  it('tempo de execução só existe com início e fim', () => {
    expect(
      executionMinutes({
        actual_start: at('08:00').toISOString(),
        actual_end: at('09:30').toISOString(),
      }),
    ).toBe(90)

    expect(
      executionMinutes({ actual_start: at('08:00').toISOString(), actual_end: null }),
    ).toBeNull()
  })

  it('addMinutes avança o instante corretamente', () => {
    expect(addMinutes(at('08:00'), 90).getTime()).toBe(at('09:30').getTime())
  })
})

describe('sobreposição de intervalos — base da detecção de conflito', () => {
  it('detecta sobreposição parcial', () => {
    expect(overlaps(at('08:00'), at('10:00'), at('09:00'), at('11:00'))).toBe(true)
  })

  it('detecta contenção completa', () => {
    expect(overlaps(at('08:00'), at('12:00'), at('09:00'), at('10:00'))).toBe(true)
  })

  it('intervalos encostados não se sobrepõem', () => {
    // 08:00–10:00 e 10:00–12:00: o box vaga exatamente às 10h.
    expect(overlaps(at('08:00'), at('10:00'), at('10:00'), at('12:00'))).toBe(false)
  })

  it('intervalos separados não se sobrepõem', () => {
    expect(overlaps(at('08:00'), at('09:00'), at('14:00'), at('16:00'))).toBe(false)
  })
})
