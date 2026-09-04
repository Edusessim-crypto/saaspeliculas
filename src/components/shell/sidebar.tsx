'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { can, type AppRole } from '@/domain/roles'
import { NAV_ITEMS } from './nav-items'
import { Logo } from './logo'
import { Tooltip } from '@/components/ui/tooltip'

interface SidebarProps {
  role: AppRole
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ role, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.permission || can(role, item.permission))

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-raised)] transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[68px]' : 'w-[228px]',
      )}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-[var(--color-border)]',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <Link href="/hoje" className="rounded-[8px]" aria-label="FilmFlow — ir para Hoje">
          <Logo showWordmark={!collapsed} />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Navegação principal">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-[13.5px] font-medium transition-colors duration-150',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          )
          return collapsed ? (
            <Tooltip key={item.href} content={item.label} side="right">
              {link}
            </Tooltip>
          ) : (
            link
          )
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'flex h-9 w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-[13px] font-medium text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="size-[18px]" aria-hidden />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
