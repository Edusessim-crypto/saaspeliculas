import type { ServiceCategory } from '@/types/database'

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  automotive_film: 'Película automotiva',
  architectural_film: 'Película arquitetônica',
  ppf: 'PPF',
  wrap: 'Envelopamento',
  other: 'Outros',
}

export const CATEGORY_SHORT: Record<ServiceCategory, string> = {
  automotive_film: 'Automotiva',
  architectural_film: 'Arquitetônica',
  ppf: 'PPF',
  wrap: 'Envelopamento',
  other: 'Outros',
}

export const SPECIALTIES = [
  'Película automotiva',
  'Película arquitetônica',
  'PPF',
  'Envelopamento',
  'Desmontagem',
  'Acabamento',
] as const

export interface DefaultServiceType {
  key: string
  name: string
  category: ServiceCategory
  duration: number
  employees: number
  requiresWorkstation: boolean
  color: string
}

/** Catálogo inicial. Cobre o que uma loja de películas realmente vende. */
export const DEFAULT_SERVICE_TYPES: DefaultServiceType[] = [
  { key: 'film-full', name: 'Película completa', category: 'automotive_film', duration: 90, employees: 1, requiresWorkstation: true, color: '#2563EB' },
  { key: 'film-windshield', name: 'Para-brisa', category: 'automotive_film', duration: 60, employees: 1, requiresWorkstation: true, color: '#3B82F6' },
  { key: 'film-sides', name: 'Laterais', category: 'automotive_film', duration: 45, employees: 1, requiresWorkstation: true, color: '#60A5FA' },
  { key: 'film-rear', name: 'Vidro traseiro', category: 'automotive_film', duration: 45, employees: 1, requiresWorkstation: true, color: '#93C5FD' },
  { key: 'film-sunroof', name: 'Teto solar', category: 'automotive_film', duration: 30, employees: 1, requiresWorkstation: true, color: '#BFDBFE' },

  { key: 'ppf-front', name: 'PPF frontal', category: 'ppf', duration: 240, employees: 2, requiresWorkstation: true, color: '#7C3AED' },
  { key: 'ppf-partial', name: 'PPF parcial', category: 'ppf', duration: 180, employees: 1, requiresWorkstation: true, color: '#8B5CF6' },
  { key: 'ppf-full', name: 'PPF completo', category: 'ppf', duration: 480, employees: 2, requiresWorkstation: true, color: '#6D28D9' },
  { key: 'ppf-piece', name: 'PPF peça individual', category: 'ppf', duration: 90, employees: 1, requiresWorkstation: true, color: '#A78BFA' },

  { key: 'arch-residential', name: 'Película residencial', category: 'architectural_film', duration: 180, employees: 2, requiresWorkstation: false, color: '#0D9488' },
  { key: 'arch-commercial', name: 'Película comercial', category: 'architectural_film', duration: 240, employees: 2, requiresWorkstation: false, color: '#14B8A6' },
  { key: 'arch-security', name: 'Película de segurança', category: 'architectural_film', duration: 180, employees: 2, requiresWorkstation: false, color: '#2DD4BF' },
  { key: 'arch-solar', name: 'Controle solar', category: 'architectural_film', duration: 150, employees: 1, requiresWorkstation: false, color: '#5EEAD4' },

  { key: 'wrap', name: 'Envelopamento', category: 'wrap', duration: 480, employees: 2, requiresWorkstation: true, color: '#DB2777' },
  { key: 'removal', name: 'Remoção de película', category: 'other', duration: 60, employees: 1, requiresWorkstation: true, color: '#64748B' },
  { key: 'rework', name: 'Retrabalho', category: 'other', duration: 60, employees: 1, requiresWorkstation: true, color: '#B45309' },
]

export const DEFAULT_CHECKLIST = {
  name: 'Conferência de aplicação',
  items: [
    { label: 'Película aplicada conforme a OS', required: true },
    { label: 'Bordas e acabamento conferidos', required: true },
    { label: 'Ausência de sujeira relevante', required: true },
    { label: 'Vidros limpos', required: true },
    { label: 'Interior conferido', required: true },
    { label: 'Veículo sem danos aparentes', required: true },
    { label: 'Serviço pronto para conferência', required: true },
  ],
}

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export interface DayHoursTemplate {
  weekday: number
  is_open: boolean
  opens_at: string | null
  closes_at: string | null
}

export const DEFAULT_HOURS: DayHoursTemplate[] = [
  { weekday: 0, is_open: false, opens_at: null, closes_at: null },
  { weekday: 1, is_open: true, opens_at: '08:00', closes_at: '18:00' },
  { weekday: 2, is_open: true, opens_at: '08:00', closes_at: '18:00' },
  { weekday: 3, is_open: true, opens_at: '08:00', closes_at: '18:00' },
  { weekday: 4, is_open: true, opens_at: '08:00', closes_at: '18:00' },
  { weekday: 5, is_open: true, opens_at: '08:00', closes_at: '18:00' },
  { weekday: 6, is_open: true, opens_at: '08:00', closes_at: '12:00' },
]

/** Paleta para identificar colaboradores e serviços na agenda. */
export const IDENTITY_COLORS = [
  '#2563EB', '#7C3AED', '#0D9488', '#DB2777', '#EA580C',
  '#0891B2', '#65A30D', '#C026D3', '#4F46E5', '#B45309',
] as const

export const CANCELLATION_REASONS = [
  'Cliente desistiu',
  'Cliente reagendou',
  'Erro de cadastro',
  'Outro',
] as const

/** Horários de agendamento, de 30 em 30 minutos. */
export function timeSlots(from = '07:00', to = '19:00', stepMinutes = 30): string[] {
  const slots: string[] = []
  const [fh = 7, fm = 0] = from.split(':').map(Number)
  const [th = 19, tm = 0] = to.split(':').map(Number)
  let current = fh * 60 + fm
  const end = th * 60 + tm
  while (current <= end) {
    slots.push(
      `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`,
    )
    current += stepMinutes
  }
  return slots
}
