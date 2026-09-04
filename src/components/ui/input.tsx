import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // h-11 no mobile evita o zoom automatico do iOS e da alvo confortavel (§58)
        'flex h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 text-[15px] text-[var(--color-ink)] transition-colors duration-150 sm:h-10 sm:text-sm',
        'placeholder:text-[var(--color-ink-subtle)]',
        'focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15',
        'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-sunken)] disabled:opacity-70',
        'aria-[invalid=true]:border-[var(--color-danger)] aria-[invalid=true]:ring-[var(--color-danger)]/15',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[84px] w-full rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-[15px] text-[var(--color-ink)] transition-colors duration-150 sm:text-sm',
      'placeholder:text-[var(--color-ink-subtle)]',
      'focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15',
      'disabled:cursor-not-allowed disabled:opacity-70',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
