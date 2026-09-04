export const APP_ROLES = ['owner', 'manager', 'reception', 'applicator'] as const
export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  reception: 'Recepção',
  applicator: 'Aplicador',
}

/**
 * Permissoes do produto. Espelham as policies de RLS — o frontend usa isso
 * para esconder controles, o banco e quem realmente decide (§91).
 */
export const PERMISSIONS = [
  'org:manage',
  'org:settings',
  'team:manage',
  'team:view',
  'service_types:manage',
  'workstations:manage',
  'customers:manage',
  'orders:create',
  'orders:edit',
  'orders:cancel',
  'orders:assign',
  'orders:force_conflict',
  'orders:reopen',
  'orders:advance_all',
  'orders:advance_own',
  'metrics:view',
  'operation:view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const OWNER: Permission[] = [...PERMISSIONS]

const MANAGER: Permission[] = [
  'org:settings',
  'team:manage',
  'team:view',
  'service_types:manage',
  'workstations:manage',
  'customers:manage',
  'orders:create',
  'orders:edit',
  'orders:cancel',
  'orders:assign',
  'orders:force_conflict',
  'orders:reopen',
  'orders:advance_all',
  'orders:advance_own',
  'metrics:view',
  'operation:view',
]

const RECEPTION: Permission[] = [
  'team:view',
  'customers:manage',
  'orders:create',
  'orders:edit',
  'orders:cancel',
  'orders:assign',
  'orders:advance_all',
  'orders:advance_own',
  'operation:view',
]

const APPLICATOR: Permission[] = ['orders:advance_own']

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: OWNER,
  manager: MANAGER,
  reception: RECEPTION,
  applicator: APPLICATOR,
}

export function can(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canAny(role: AppRole, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p))
}

/** Aplicador entra direto na interface mobile simplificada (§35). */
export function defaultRouteFor(role: AppRole): string {
  return role === 'applicator' ? '/app' : '/hoje'
}
