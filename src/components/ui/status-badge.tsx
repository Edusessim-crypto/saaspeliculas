import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type OrderStatus, type StatusTone } from '@/domain/status'

/**
 * Nunca depende so da cor: sempre acompanha icone + texto (§11, §68).
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    'bg-[var(--color-neutral-subtle)] text-[var(--color-neutral)] border-[var(--color-neutral-border)]',
  info: 'bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[var(--color-info-border)]',
  progress:
    'bg-[var(--color-accent-subtle)] text-[var(--color-accent-hover)] border-[var(--color-info-border)]',
  warning:
    'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
  success:
    'bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success-border)]',
  danger:
    'bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
}

interface StatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
  short?: boolean
  className?: string
  showIcon?: boolean
}

export function StatusBadge({
  status,
  size = 'md',
  short = false,
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASSES[config.tone],
        className,
      )}
    >
      {showIcon ? (
        <Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} aria-hidden />
      ) : null}
      {short ? config.shortLabel : config.label}
    </span>
  )
}

/** Ponto colorido + rotulo, para listas muito densas. */
export function StatusDot({ status, className }: { status: OrderStatus; className?: string }) {
  const config = STATUS_CONFIG[status]
  const dotColor: Record<StatusTone, string> = {
    neutral: 'bg-[var(--color-neutral)]',
    info: 'bg-[var(--color-info)]',
    progress: 'bg-[var(--color-accent)]',
    warning: 'bg-[var(--color-warning)]',
    success: 'bg-[var(--color-success)]',
    danger: 'bg-[var(--color-danger)]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span className={cn('size-1.5 rounded-full', dotColor[config.tone])} aria-hidden />
      {config.label}
    </span>
  )
}
