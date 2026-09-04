'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { saveChecklist } from '@/lib/actions/checklist'
import { changeOrderStatus } from '@/lib/actions/orders'
import { cn } from '@/lib/utils'
import type { ChecklistItem, ChecklistResponse } from '@/types/database'

interface ChecklistProps {
  orderId: string
  items: ChecklistItem[]
  responses: ChecklistResponse[]
  /** Ao concluir, avanca para conferencia (fluxo do aplicador) */
  advanceOnComplete?: boolean
  onDone?: () => void
  readOnly?: boolean
}

/** Não permite concluir sem os itens obrigatórios (§39). */
export function Checklist({
  orderId,
  items,
  responses,
  advanceOnComplete,
  onDone,
  readOnly,
}: ChecklistProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const item of items) {
      initial[item.id] = responses.find((r) => r.checklist_item_id === item.id)?.checked ?? false
    }
    return initial
  })

  const requiredPending = items.filter((i) => i.is_required && !checked[i.id])
  const complete = requiredPending.length === 0
  const doneCount = items.filter((i) => checked[i.id]).length

  function submit() {
    startTransition(async () => {
      const payload = {
        order_id: orderId,
        responses: items.map((item) => ({
          item_id: item.id,
          label: item.label,
          checked: checked[item.id] ?? false,
        })),
      }

      const saved = await saveChecklist(payload)
      if (!saved.ok) {
        toast.error(saved.error ?? 'Não foi possível salvar o checklist.')
        return
      }

      if (advanceOnComplete) {
        const advanced = await changeOrderStatus({ order_id: orderId, to: 'inspection' })
        if (!advanced.ok) {
          toast.error(advanced.error ?? 'Não foi possível concluir o serviço.')
          return
        }
        toast.success('Serviço concluído. A recepção já foi avisada.')
      } else {
        toast.success('Checklist salvo.')
      }

      onDone?.()
      router.refresh()
    })
  }

  if (!items.length) {
    return (
      <p className="text-[13px] text-[var(--color-ink-subtle)]">
        Nenhum checklist configurado para esta organização.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] text-[var(--color-ink-muted)]">
        <span>
          {doneCount} de {items.length} conferidos
        </span>
        {!complete ? (
          <span className="font-medium text-[var(--color-warning)]">
            {requiredPending.length} obrigatório{requiredPending.length > 1 ? 's' : ''} pendente
            {requiredPending.length > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border border-transparent p-3 transition-colors',
                checked[item.id]
                  ? 'bg-[var(--color-success-subtle)]'
                  : 'hover:bg-[var(--color-surface-hover)]',
                readOnly && 'cursor-default',
              )}
            >
              <Checkbox
                checked={checked[item.id] ?? false}
                disabled={readOnly || pending}
                onCheckedChange={(value) =>
                  setChecked((prev) => ({ ...prev, [item.id]: value === true }))
                }
                className="mt-0.5"
              />
              <span className="flex-1 text-[14px] leading-snug text-[var(--color-ink)]">
                {item.label}
                {item.is_required ? (
                  <span className="ml-1 text-[var(--color-danger)]" aria-label="obrigatório">
                    *
                  </span>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {!readOnly ? (
        <Button
          variant="primary"
          size="xl"
          block
          loading={pending}
          disabled={!complete}
          onClick={submit}
        >
          {advanceOnComplete ? 'Concluir serviço' : 'Salvar checklist'}
        </Button>
      ) : null}

      {!complete && !readOnly ? (
        <p className="text-center text-[12px] text-[var(--color-ink-subtle)]">
          Marque todos os itens obrigatórios para concluir.
        </p>
      ) : null}
    </div>
  )
}
