import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent'
  hint?: string
  onClick?: () => void
  active?: boolean
}

const TONE: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-[var(--color-ink)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
  accent: 'text-[var(--color-accent)]',
}

/**
 * Compacto de proposito: densidade acima de decoracao (§20, §53).
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  onClick,
  active,
}: MetricCardProps) {
  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'rounded-[var(--radius-card)] border bg-[var(--color-surface-raised)] px-3.5 py-3 text-left transition-colors',
        active
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20'
          : 'border-[var(--color-border)]',
        onClick && 'hover:bg-[var(--color-surface-hover)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11.5px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
          {label}
        </p>
        {Icon ? (
          <Icon className={cn('size-4 shrink-0', TONE[tone])} aria-hidden />
        ) : null}
      </div>
      <p className={cn('tnum mt-1.5 text-[24px] font-semibold leading-none', TONE[tone])}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 truncate text-[11.5px] text-[var(--color-ink-subtle)]">{hint}</p>
      ) : null}
    </Comp>
  )
}
