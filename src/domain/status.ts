import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  CarFront,
  Hourglass,
  Wrench,
  Layers,
  ClipboardCheck,
  PackageCheck,
  CircleCheckBig,
  Ban,
  UserX,
} from 'lucide-react'

export const ORDER_STATUSES = [
  'scheduled',
  'arrived',
  'waiting',
  'preparation',
  'application',
  'inspection',
  'ready',
  'delivered',
  'cancelled',
  'no_show',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type StatusTone = 'neutral' | 'info' | 'progress' | 'warning' | 'success' | 'danger'

export interface StatusDefinition {
  value: OrderStatus
  label: string
  shortLabel: string
  tone: StatusTone
  icon: LucideIcon
  /** Aparece nas colunas do Kanban operacional */
  kanban: boolean
  /** Conta como operacao ativa na loja */
  active: boolean
  description: string
}

export const STATUS_CONFIG: Record<OrderStatus, StatusDefinition> = {
  scheduled: {
    value: 'scheduled',
    label: 'Agendado',
    shortLabel: 'Agendado',
    tone: 'neutral',
    icon: CalendarClock,
    kanban: false,
    active: false,
    description: 'Aguardando a chegada do cliente',
  },
  arrived: {
    value: 'arrived',
    label: 'Cliente chegou',
    shortLabel: 'Chegou',
    tone: 'info',
    icon: CarFront,
    kanban: true,
    active: true,
    description: 'Veículo na loja, aguardando triagem',
  },
  waiting: {
    value: 'waiting',
    label: 'Aguardando início',
    shortLabel: 'Aguardando',
    tone: 'warning',
    icon: Hourglass,
    kanban: true,
    active: true,
    description: 'Pronto para entrar em produção',
  },
  preparation: {
    value: 'preparation',
    label: 'Em preparação',
    shortLabel: 'Preparação',
    tone: 'progress',
    icon: Wrench,
    kanban: true,
    active: true,
    description: 'Desmontagem e limpeza em andamento',
  },
  application: {
    value: 'application',
    label: 'Em aplicação',
    shortLabel: 'Aplicação',
    tone: 'progress',
    icon: Layers,
    kanban: true,
    active: true,
    description: 'Aplicação em execução',
  },
  inspection: {
    value: 'inspection',
    label: 'Em conferência',
    shortLabel: 'Conferência',
    tone: 'info',
    icon: ClipboardCheck,
    kanban: true,
    active: true,
    description: 'Aguardando aprovação da qualidade',
  },
  ready: {
    value: 'ready',
    label: 'Pronto para entrega',
    shortLabel: 'Pronto',
    tone: 'success',
    icon: PackageCheck,
    kanban: true,
    active: true,
    description: 'Veículo liberado para o cliente',
  },
  delivered: {
    value: 'delivered',
    label: 'Entregue',
    shortLabel: 'Entregue',
    tone: 'success',
    icon: CircleCheckBig,
    kanban: false,
    active: false,
    description: 'Atendimento finalizado',
  },
  cancelled: {
    value: 'cancelled',
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    tone: 'danger',
    icon: Ban,
    kanban: false,
    active: false,
    description: 'Atendimento cancelado',
  },
  no_show: {
    value: 'no_show',
    label: 'Não compareceu',
    shortLabel: 'Não veio',
    tone: 'danger',
    icon: UserX,
    kanban: false,
    active: false,
    description: 'Cliente não compareceu',
  },
}

export const KANBAN_COLUMNS: OrderStatus[] = [
  'waiting',
  'preparation',
  'application',
  'inspection',
  'ready',
]

export function statusOf(status: OrderStatus): StatusDefinition {
  return STATUS_CONFIG[status]
}
