'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetTitle = DialogPrimitive.Title
export const SheetDescription = DialogPrimitive.Description

const Overlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-[#0d1424]/35 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
))
Overlay.displayName = 'SheetOverlay'

/**
 * Desktop: drawer lateral direito.
 * Mobile: sheet que ocupa quase toda a tela (§57, §106).
 * Nunca um modal central pequeno para muita informacao (§25).
 */
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'md' | 'lg'
  }
>(({ className, children, size = 'md', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col bg-[var(--color-surface-raised)] shadow-[var(--shadow-overlay)]',
        // Mobile: sobe de baixo, quase full screen
        'inset-x-0 bottom-0 top-[max(0px,env(safe-area-inset-top))] rounded-t-2xl',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
        // Desktop: drawer lateral
        'sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:rounded-none sm:border-l sm:border-[var(--color-border)]',
        'sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right',
        size === 'lg' ? 'sm:w-[min(640px,100vw)]' : 'sm:w-[min(480px,100vw)]',
        'duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = 'SheetContent'

export function SheetHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <SheetTitle className="truncate text-[15px] font-semibold text-[var(--color-ink)]">
          {title}
        </SheetTitle>
        {description ? (
          <SheetDescription className="mt-0.5 truncate text-[13px] text-[var(--color-ink-muted)]">
            {description}
          </SheetDescription>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <SheetClose
          className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </SheetClose>
      </div>
    </div>
  )
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto overscroll-contain', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'safe-bottom flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 sm:flex-row sm:justify-end sm:px-5',
        className,
      )}
      {...props}
    />
  )
}
