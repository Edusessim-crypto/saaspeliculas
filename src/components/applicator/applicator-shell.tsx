'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { LogOut, LayoutDashboard } from 'lucide-react'
import { Logo } from '@/components/shell/logo'
import { TooltipProvider } from '@/components/ui/tooltip'
import { signOut } from '@/lib/actions/auth'
import { useRealtimeOrders } from '@/hooks/use-realtime-orders'

/**
 * Casca do aplicador: sem sidebar, sem dashboards, sem configuracoes.
 * Header minimo e conteudo em coluna unica (§35).
 */
export function ApplicatorShell({
  userName,
  organizationId,
  canReturnToAdmin,
  children,
}: {
  userName: string
  organizationId: string
  canReturnToAdmin: boolean
  children: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()
  useRealtimeOrders(organizationId)

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col bg-[var(--color-surface)]">
        <header className="safe-top sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4">
          <Link href="/app" aria-label="Início">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-1">
            {canReturnToAdmin ? (
              <Link
                href="/hoje"
                aria-label="Ir para o painel"
                className="inline-flex size-10 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <LayoutDashboard className="size-[18px]" />
              </Link>
            ) : null}

            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => void signOut())}
              aria-label="Sair"
              className="inline-flex size-10 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>

          <span className="sr-only">Sessão de {userName}</span>
        </header>

        <main className="safe-bottom flex-1">{children}</main>
      </div>
    </TooltipProvider>
  )
}
