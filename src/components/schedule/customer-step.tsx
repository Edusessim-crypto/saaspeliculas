'use client'

import { useEffect, useState, useTransition } from 'react'
import { Search, UserPlus, Loader2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { searchCustomers, createCustomer } from '@/lib/actions/customers'
import { formatPhone } from '@/lib/format'
import { toast } from 'sonner'
import type { Customer } from '@/types/database'
import { cn } from '@/lib/utils'

interface SearchResult extends Customer {
  vehicles?: { id: string; brand: string; model: string; year: number | null; plate: string | null }[]
}

/** Passo 1: encontrar o cliente rápido, ou criar em três campos. */
export function CustomerStep({
  selected,
  onSelect,
}: {
  selected: Customer | null
  onSelect: (customer: Customer | null) => void
}) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, startSearch] = useTransition()
  const [creating, startCreate] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState({ name: '', phone: '' })

  const tooShort = term.trim().length < 2

  useEffect(() => {
    if (tooShort) return
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await searchCustomers(term)
        setResults(res.data as SearchResult[])
      })
    }, 220)
    return () => clearTimeout(timer)
  }, [term, tooShort])

  // Abaixo do minimo de caracteres nao ha resultado a exibir; derivar
  // dispensa limpar o estado por efeito.
  const visibleResults = tooShort ? [] : results

  function submitNew() {
    startCreate(async () => {
      const result = await createCustomer({
        name: draft.name,
        phone: draft.phone,
        whatsapp: draft.phone,
      })
      if (!result.ok || !result.data) {
        toast.error(result.error ?? 'Não foi possível salvar o cliente.')
        return
      }
      toast.success('Cliente cadastrado.')
      onSelect(result.data)
      setShowForm(false)
    })
  }

  if (selected) {
    return (
      <div className="rounded-[var(--radius-control)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-ink)]">
              <Check className="size-4 text-[var(--color-accent)]" aria-hidden />
              {selected.name}
            </p>
            {selected.phone ? (
              <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-muted)]">
                {formatPhone(selected.phone)}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTerm('')
              setResults([])
              onSelect(null)
            }}
          >
            Trocar
          </Button>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-3">
        <Field label="Nome do cliente" htmlFor="new-customer-name" required>
          <Input
            id="new-customer-name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Nome completo"
            autoFocus
            autoCapitalize="words"
          />
        </Field>

        <Field label="Telefone / WhatsApp" htmlFor="new-customer-phone">
          <Input
            id="new-customer-phone"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            placeholder="(51) 99999-9999"
            inputMode="tel"
            type="tel"
            autoComplete="tel"
          />
        </Field>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
            Voltar
          </Button>
          <Button
            variant="primary"
            onClick={submitNew}
            loading={creating}
            disabled={draft.name.trim().length < 2}
            className="flex-1"
          >
            Cadastrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-subtle)]"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nome ou telefone"
          className="pl-9"
          autoFocus
          aria-label="Buscar cliente"
        />
        {searching ? (
          <Loader2
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[var(--color-ink-subtle)]"
            aria-hidden
          />
        ) : null}
      </div>

      {visibleResults.length > 0 ? (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {visibleResults.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                  {customer.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
                  {customer.phone ? formatPhone(customer.phone) : 'Sem telefone'}
                  {customer.vehicles?.length
                    ? ` · ${customer.vehicles.length} veículo${customer.vehicles.length > 1 ? 's' : ''}`
                    : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : term.trim().length >= 2 && !searching ? (
        <p className="py-2 text-center text-[13px] text-[var(--color-ink-subtle)]">
          Nenhum cliente encontrado.
        </p>
      ) : null}

      <Button
        variant="secondary"
        block
        onClick={() => {
          setDraft({ name: term.replace(/\d/g, '').trim(), phone: /\d/.test(term) ? term : '' })
          setShowForm(true)
        }}
      >
        <UserPlus />
        Novo cliente
      </Button>
    </div>
  )
}

/** Botão de etapa reutilizado pelos passos do agendamento. */
export function StepChoice({
  active,
  title,
  subtitle,
  onClick,
  trailing,
}: {
  active?: boolean
  title: string
  subtitle?: string
  onClick: () => void
  trailing?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-ink-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing}
    </button>
  )
}
