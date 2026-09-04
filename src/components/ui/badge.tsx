import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[11px] font-medium',
  {
    variants: {
      variant: {
        neutral:
          'border-[var(--color-neutral-border)] bg-[var(--color-neutral-subtle)] text-[var(--color-neutral)]',
        accent:
          'border-[var(--color-info-border)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-hover)]',
        success:
          'border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]',
        warning:
          'border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] text-[var(--color-warning)]',
        danger:
          'border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] text-[var(--color-danger)]',
        outline: 'border-[var(--color-border-strong)] bg-transparent text-[var(--color-ink-muted)]',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
