import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-brand)] text-[var(--color-brand-foreground)] hover:bg-[var(--color-brand-hover)] shadow-[var(--shadow-subtle)]',
        accent:
          'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-subtle)]',
        secondary:
          'bg-[var(--color-surface-raised)] text-[var(--color-ink)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]',
        ghost:
          'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
        danger:
          'bg-[var(--color-danger)] text-white hover:brightness-110 shadow-[var(--shadow-subtle)]',
        'danger-outline':
          'border border-[var(--color-danger-border)] bg-[var(--color-surface-raised)] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)]',
        link: 'text-[var(--color-accent)] underline-offset-4 hover:underline',
      },
      size: {
        // Alvo de toque de 44px no mobile, densidade de 36px no desktop (§59, §53)
        sm: 'h-11 px-3 text-[13px] md:h-9 [&_svg]:size-4',
        md: 'h-11 px-4 md:h-10 [&_svg]:size-4',
        lg: 'h-11 px-5 [&_svg]:size-[18px]',
        xl: 'h-14 px-6 text-base font-semibold [&_svg]:size-5',
        icon: 'size-11 md:size-9 [&_svg]:size-4',
        'icon-lg': 'size-11 [&_svg]:size-5',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', block: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, loading, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, block, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
