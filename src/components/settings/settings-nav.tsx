'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Layers, Box, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/configuracoes', label: 'Empresa', icon: Building2, exact: true },
  { href: '/equipe', label: 'Equipe', icon: Users, exact: false },
  { href: '/configuracoes/servicos', label: 'Serviços', icon: Layers, exact: false },
  { href: '/configuracoes/boxes', label: 'Boxes', icon: Box, exact: false },
  { href: '/configuracoes/horarios', label: 'Horários', icon: Clock, exact: false },
]

/** Categorias separadas — nunca uma página única gigantesca (§123). */
export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Configurações"
      className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
    >
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-3 text-[13px] font-medium transition-colors md:h-9',
              active
                ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
