import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

interface EmployeeAvatarProps {
  name: string
  color?: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-14 text-base',
} as const

/** Sem foto, usa iniciais sobre a cor de identificacao do colaborador (§125). */
export function EmployeeAvatar({
  name,
  color = '#2563EB',
  avatarUrl,
  size = 'md',
  className,
}: EmployeeAvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-[var(--color-surface-raised)]',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}

interface AvatarGroupProps {
  people: { employee_id: string; full_name: string; color: string; avatar_url?: string | null }[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function AvatarGroup({ people, max = 3, size = 'sm', className }: AvatarGroupProps) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className={cn('inline-flex items-center -space-x-1.5', className)}>
      {shown.map((p) => (
        <EmployeeAvatar
          key={p.employee_id}
          name={p.full_name}
          color={p.color}
          avatarUrl={p.avatar_url}
          size={size}
        />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-[var(--color-surface-sunken)] font-semibold text-[var(--color-ink-muted)] ring-2 ring-[var(--color-surface-raised)]',
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  )
}
