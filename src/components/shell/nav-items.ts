import {
  LayoutDashboard,
  CalendarDays,
  KanbanSquare,
  Users,
  Contact,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '@/domain/roles'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  permission?: Permission
  /** Aparece na bottom navigation do mobile */
  primary?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/hoje', label: 'Hoje', icon: LayoutDashboard, primary: true },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays, primary: true },
  { href: '/operacao', label: 'Operação', icon: KanbanSquare, permission: 'operation:view', primary: true },
  { href: '/equipe', label: 'Equipe', icon: Users, permission: 'team:view', primary: true },
  { href: '/clientes', label: 'Clientes', icon: Contact, permission: 'customers:manage' },
  { href: '/indicadores', label: 'Indicadores', icon: BarChart3, permission: 'metrics:view' },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, permission: 'org:settings' },
]
