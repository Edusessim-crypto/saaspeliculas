import { format, formatDistanceStrict, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? 'America/Sao_Paulo'

export function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/** 03/09/2026 */
export function formatDate(value: string | Date): string {
  return format(toDate(value), 'dd/MM/yyyy', { locale: ptBR })
}

/** 14:30 — sempre 24h */
export function formatTime(value: string | Date): string {
  return format(toDate(value), 'HH:mm', { locale: ptBR })
}

/** 03/09/2026 14:30 */
export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/** Quinta-feira, 03 de setembro */
export function formatLongDate(value: string | Date): string {
  const text = format(toDate(value), "EEEE, dd 'de' MMMM", { locale: ptBR })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Qui, 03 set */
export function formatShortDate(value: string | Date): string {
  const text = format(toDate(value), 'EEE, dd MMM', { locale: ptBR })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** 08:00 — 09:30 */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} — ${formatTime(end)}`
}

/**
 * Duracao legivel no formato que a loja usa: 1h30, 45min, 2h.
 * Evita "90 minutos" (§133).
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h${String(mins).padStart(2, '0')}`
}

/** Cronometro de servico em execucao: 01:12:38 */
export function formatStopwatch(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** R$ 1.250,00 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** (51) 99999-9999 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return value
}

/** ABC1D23 */
export function formatPlate(value: string | null | undefined): string {
  if (!value) return '—'
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function formatVehicle(
  vehicle: { brand: string; model: string; year?: number | null } | null | undefined,
): string {
  if (!vehicle) return 'Sem veículo'
  return [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')
}

/** CM — iniciais para avatar sem foto (§125) */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

/** "há 12 minutos" */
export function relativeTime(value: string | Date, base: Date = new Date()): string {
  return formatDistanceStrict(toDate(value), base, { locale: ptBR, addSuffix: true })
}

export function isToday(value: string | Date, now: Date = new Date()): boolean {
  return isSameDay(toDate(value), now)
}

export function toDateInput(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

export function toTimeInput(value: Date): string {
  return format(value, 'HH:mm')
}
