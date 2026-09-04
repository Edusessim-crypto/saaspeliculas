'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { relativeTime } from '@/lib/format'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications'
import type { AppNotification } from '@/types/database'
import { cn } from '@/lib/utils'

export function NotificationPopover({
  organizationId,
  initial,
}: {
  organizationId: string
  initial: AppNotification[]
}) {
  const router = useRouter()
  // `initial` vem do servidor a cada refresh; `live` acumula o que
  // chegou por realtime desde entao. Derivar a uniao dispensa o efeito
  // de sincronizacao.
  const [live, setLive] = useState<AppNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const items = useMemo(() => {
    const seen = new Set(initial.map((n) => n.id))
    const merged = [...live.filter((n) => !seen.has(n.id)), ...initial]
    return merged
      .map((n) =>
        n.read_at || !readIds.has(n.id) ? n : { ...n, read_at: new Date().toISOString() },
      )
      .slice(0, 30)
  }, [initial, live, readIds])

  // Assina apenas as notificacoes desta organizacao (§136).
  useEffect(() => {
    const supabase = getSupabaseBrowser()
    const channel = supabase
      .channel(`notifications:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          setLive((prev) => [payload.new as AppNotification, ...prev].slice(0, 30))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [organizationId])

  const unread = items.filter((n) => !n.read_at)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unread.length ? `Notificações, ${unread.length} não lidas` : 'Notificações'
          }
          className="relative inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
        >
          <Bell className="size-[18px]" aria-hidden />
          {unread.length > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-[15px] items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold leading-[15px] text-white">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(360px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3.5 py-2.5">
          <p className="text-[13px] font-semibold">Notificações</p>
          {unread.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px]"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead()
                  setReadIds(new Set(items.map((n) => n.id)))
                })
              }
            >
              <CheckCheck className="size-3.5" />
              Marcar lidas
            </Button>
          ) : null}
        </div>

        <div className="max-h-[min(400px,60vh)] overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState
              compact
              title="Nada por aqui"
              description="As movimentações da operação aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)]',
                      !n.read_at && 'bg-[var(--color-accent-subtle)]/40',
                    )}
                    onClick={() => {
                      startTransition(async () => {
                        if (!n.read_at) await markNotificationRead(n.id)
                        setReadIds((prev) => new Set(prev).add(n.id))
                      })
                      setOpen(false)
                      if (n.service_order_id) router.push(`/operacao?atendimento=${n.service_order_id}`)
                    }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1.5 size-1.5 shrink-0 rounded-full',
                        n.read_at ? 'bg-transparent' : 'bg-[var(--color-accent)]',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[var(--color-ink)]">
                        {n.title}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 block truncate text-[12px] text-[var(--color-ink-muted)]">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-[var(--color-ink-subtle)]">
                        {relativeTime(n.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
