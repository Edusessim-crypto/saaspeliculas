'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Car, ClipboardList, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { globalSearch, type SearchResults } from '@/lib/actions/search'
import { formatDate, formatPlate } from '@/lib/format'
import { STATUS_CONFIG } from '@/domain/status'
import type { OrderStatus } from '@/domain/status'

const EMPTY: SearchResults = { customers: [], vehicles: [], orders: [] }

export function SearchCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Atalho "/" — ignorado quando o foco esta em um campo de texto (§81).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.key === '/' && !typing) {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tooShort = term.trim().length < 2

  useEffect(() => {
    if (tooShort) return
    const timer = setTimeout(() => {
      startTransition(async () => setResults(await globalSearch(term)))
    }, 220)
    return () => clearTimeout(timer)
  }, [term, tooShort])

  // Abaixo do minimo de caracteres nao ha resultado a exibir; derivar
  // dispensa limpar o estado por efeito.
  const visible = tooShort ? EMPTY : results

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setTerm('')
      router.push(href)
    },
    [router],
  )

  const hasResults =
    visible.customers.length + visible.vehicles.length + visible.orders.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[13px] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-hover)] md:h-9 md:w-56 md:justify-start md:px-2.5 lg:w-64"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden md:inline">Buscar cliente, placa…</span>
        <kbd className="ml-auto hidden rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-sans text-[10px] font-medium md:inline">
          /
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          className="sm:top-[15%] sm:w-[min(560px,calc(100vw-2rem))] sm:translate-y-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4">
            <Search className="size-[18px] shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Cliente, telefone, placa ou modelo"
              aria-label="Buscar"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--color-ink-subtle)]"
            />
            {pending ? (
              <Loader2 className="size-4 animate-spin text-[var(--color-ink-subtle)]" aria-hidden />
            ) : null}
          </div>

          <div className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
            {term.trim().length < 2 ? (
              <p className="px-2 py-6 text-center text-[13px] text-[var(--color-ink-subtle)]">
                Digite ao menos 2 caracteres.
              </p>
            ) : !hasResults && !pending ? (
              <p className="px-2 py-6 text-center text-[13px] text-[var(--color-ink-subtle)]">
                Nada encontrado para “{term}”.
              </p>
            ) : (
              <div className="space-y-3">
                {visible.customers.length > 0 ? (
                  <Group title="Clientes">
                    {visible.customers.map((c) => (
                      <Row
                        key={c.id}
                        icon={<User className="size-4" />}
                        title={c.name}
                        subtitle={c.phone ?? undefined}
                        onSelect={() => go(`/clientes/${c.id}`)}
                      />
                    ))}
                  </Group>
                ) : null}

                {visible.vehicles.length > 0 ? (
                  <Group title="Veículos">
                    {visible.vehicles.map((v) => (
                      <Row
                        key={v.id}
                        icon={<Car className="size-4" />}
                        title={`${v.brand} ${v.model}${v.year ? ` ${v.year}` : ''}`}
                        subtitle={`${v.plate ? formatPlate(v.plate) : 'Sem placa'} · ${v.customer_name}`}
                        onSelect={() => go(`/clientes/${v.customer_id}`)}
                      />
                    ))}
                  </Group>
                ) : null}

                {visible.orders.length > 0 ? (
                  <Group title="Atendimentos">
                    {visible.orders.map((o) => (
                      <Row
                        key={o.id}
                        icon={<ClipboardList className="size-4" />}
                        title={`${o.vehicle_label ?? o.customer_name}`}
                        subtitle={`${formatDate(o.scheduled_start)} · ${
                          STATUS_CONFIG[o.current_status as OrderStatus]?.label ?? ''
                        }`}
                        onSelect={() => go(`/operacao?atendimento=${o.id}`)}
                      />
                    ))}
                  </Group>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function Row({
  icon,
  title,
  subtitle,
  onSelect,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
    >
      <span className="shrink-0 text-[var(--color-ink-subtle)]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  )
}
