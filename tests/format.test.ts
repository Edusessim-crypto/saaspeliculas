import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatStopwatch,
  formatPhone,
  formatPlate,
  formatCurrency,
  initials,
  formatDate,
  formatTime,
} from '@/lib/format'

describe('formatação pt-BR', () => {
  it('exibe duração como a loja fala: 1h30, não 90 minutos', () => {
    expect(formatDuration(90)).toBe('1h30')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(45)).toBe('45min')
    expect(formatDuration(125)).toBe('2h05')
    expect(formatDuration(480)).toBe('8h')
    expect(formatDuration(0)).toBe('0min')
  })

  it('cronômetro sempre com dois dígitos', () => {
    expect(formatStopwatch(4358)).toBe('01:12:38')
    expect(formatStopwatch(59)).toBe('00:00:59')
    expect(formatStopwatch(0)).toBe('00:00:00')
    expect(formatStopwatch(-5)).toBe('00:00:00')
  })

  it('formata telefone brasileiro', () => {
    expect(formatPhone('51999999999')).toBe('(51) 99999-9999')
    expect(formatPhone('5133334444')).toBe('(51) 3333-4444')
    expect(formatPhone(null)).toBe('—')
  })

  it('normaliza placa para maiúsculas sem separador', () => {
    expect(formatPlate('abc1d23')).toBe('ABC1D23')
    expect(formatPlate('ABC-1234')).toBe('ABC1234')
    expect(formatPlate(null)).toBe('—')
  })

  it('formata moeda em real', () => {
    expect(formatCurrency(1250).replace(/ /g, ' ')).toBe('R$ 1.250,00')
    expect(formatCurrency(null)).toBe('—')
  })

  it('gera iniciais para o avatar', () => {
    expect(initials('Carlos Mendes')).toBe('CM')
    expect(initials('Ana')).toBe('AN')
    expect(initials('Maria da Silva Souza')).toBe('MS')
    expect(initials('')).toBe('?')
  })

  it('usa data brasileira e hora em 24h', () => {
    const date = new Date('2026-09-03T14:30:00')
    expect(formatDate(date)).toBe('03/09/2026')
    expect(formatTime(date)).toBe('14:30')
  })
})
