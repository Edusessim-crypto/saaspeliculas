import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-[21px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

/** Container padrao das paginas: largura maxima e respiro consistentes (§102). */
export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6', className)}>
      {children}
    </div>
  )
}
