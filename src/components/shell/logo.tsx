import { cn } from '@/lib/utils'

/**
 * Marca isolada em um componente: trocar o nome do produto depois
 * significa editar apenas este arquivo (§4).
 */
export const BRAND_NAME = 'FilmFlow'

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-brand)]"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M5 6.5C5 5.67 5.67 5 6.5 5h11c.83 0 1.5.67 1.5 1.5v2.2c0 .5-.25.97-.67 1.25L14 12.6v5.15c0 .6-.63 1-1.17.73l-2.5-1.25a.83.83 0 0 1-.46-.74V12.6L5.67 9.95A1.5 1.5 0 0 1 5 8.7V6.5Z"
            fill="#fff"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {BRAND_NAME}
        </span>
      ) : null}
    </span>
  )
}
