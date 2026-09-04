'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { can, type AppRole } from '@/domain/roles'
import { NAV_ITEMS } from './nav-items'

/**
 * Bottom navigation: quatro destinos + "Mais". Respeita a safe area
 * do iPhone e mantem alvos de toque de 56px (§55, §60).
 */
export function MobileNav({ role, onMore }: { role: AppRole; onMore: () => void }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter(
    (item) => item.primary && (!item.permission || can(role, item.permission)),
  ).slice(0, 4)

  const secondaryActive = NAV_ITEMS.some(
    (item) => !item.primary && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )

  return (
    <nav
      aria-label="Navegação principal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] lg:hidden"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors',
                active ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink-subtle)]',
              )}
            >
              <Icon className="size-[19px]" aria-hidden />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onMore}
          className={cn(
            'flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors',
            secondaryActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink-subtle)]',
          )}
        >
          <MoreHorizontal className="size-[19px]" aria-hidden />
          Mais
        </button>
      </div>
    </nav>
  )
}
