'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { SearchCommand } from './search-command'
import { NotificationPopover } from './notification-popover'
import { AccountMenu } from './account-menu'
import { Logo } from './logo'
import { NAV_ITEMS } from './nav-items'
import { Sheet, SheetContent, SheetHeader, SheetBody } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { can, type AppRole } from '@/domain/roles'
import type { AppNotification } from '@/types/database'

const SIDEBAR_KEY = 'filmflow:sidebar-collapsed'

interface AppShellProps {
  role: AppRole
  userName: string
  userEmail: string | null
  organizationId: string
  organizationName: string
  locationName: string
  notifications: AppNotification[]
  children: React.ReactNode
}

export function AppShell({
  role,
  userName,
  userEmail,
  organizationId,
  organizationName,
  locationName,
  notifications,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  // Lido no primeiro render: evita o flash da sidebar expandida e
  // dispensa um efeito que so faria setState (react-hooks).
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      // localStorage indisponivel (modo privado): mantem o padrao.
      return false
    }
  })
  const [moreOpen, setMoreOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        /* ignora */
      }
      return next
    })
  }, [])

  // Fecha o sheet "Mais" ao navegar. Padrao oficial de ajuste de estado
  // durante o render (React: "adjusting state when props change").
  const [pathAtOpen, setPathAtOpen] = useState(pathname)
  if (pathAtOpen !== pathname) {
    setPathAtOpen(pathname)
    setMoreOpen(false)
  }

  const secondaryItems = NAV_ITEMS.filter(
    (item) => !item.primary && (!item.permission || can(role, item.permission)),
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh overflow-hidden bg-[var(--color-surface)]">
        <Sidebar role={role} collapsed={collapsed} onToggle={toggleSidebar} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 sm:px-4">
            <Link
              href="/hoje"
              className="inline-flex size-11 items-center justify-center -ml-1.5 lg:hidden"
              aria-label="FilmFlow"
            >
              <Logo showWordmark={false} />
            </Link>

            <p className="hidden min-w-0 truncate text-[13px] font-medium text-[var(--color-ink-muted)] sm:block">
              {locationName}
            </p>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <SearchCommand />
              <NotificationPopover organizationId={organizationId} initial={notifications} />
              <AccountMenu
                name={userName}
                email={userEmail}
                role={role}
                organizationName={organizationName}
              />
            </div>
          </header>

          <main
            className={cn(
              'flex-1 overflow-y-auto overscroll-contain',
              // Espaco para a bottom navigation no mobile
              'pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0',
            )}
          >
            {children}
          </main>
        </div>

        <MobileNav role={role} onMore={() => setMoreOpen(true)} />

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent className="sm:max-w-sm">
            <SheetHeader title="Mais" />
            <SheetBody className="p-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex h-12 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[14px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    <Icon className="size-[18px] text-[var(--color-ink-subtle)]" aria-hidden />
                    {item.label}
                  </Link>
                )
              })}
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
