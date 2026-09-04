'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Box } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet'
import { saveWorkstation, setWorkstationActive } from '@/lib/actions/settings'
import { can, type AppRole } from '@/domain/roles'
import type { Workstation } from '@/types/database'

export function WorkstationsSettings({
  workstations,
  role,
}: {
  workstations: Workstation[]
  role: AppRole
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Workstation | null>(null)
  const editable = can(role, 'workstations:manage')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Boxes e estações</h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
            Usados para detectar conflitos de espaço na agenda.
          </p>
        </div>
        {editable ? (
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
          >
            <Plus />
            <span className="hidden sm:inline">Novo box</span>
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {workstations.length === 0 ? (
          <EmptyState
            icon={Box}
            title="Nenhum box cadastrado."
            description="Cadastre os boxes da loja para controlar a capacidade."
            action={
              editable ? (
                <Button variant="primary" onClick={() => setSheetOpen(true)}>
                  <Plus />
                  Novo box
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {workstations.map((workstation) => (
              <li key={workstation.id} className="flex items-center gap-3 px-4 py-3">
                <Box className="size-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                    {workstation.name}
                  </p>
                  {workstation.description ? (
                    <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
                      {workstation.description}
                    </p>
                  ) : null}
                </div>

                {editable ? (
                  <>
                    <Switch
                      checked={workstation.is_active}
                      aria-label={`${workstation.is_active ? 'Desativar' : 'Ativar'} ${workstation.name}`}
                      onCheckedChange={(value) =>
                        startTransition(async () => {
                          const result = await setWorkstationActive(workstation.id, value)
                          if (!result.ok) {
                            toast.error(result.error ?? 'Não foi possível alterar.')
                            return
                          }
                          toast.success(value ? 'Box ativado.' : 'Box desativado.')
                          router.refresh()
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${workstation.name}`}
                      onClick={() => {
                        setEditing(workstation)
                        setSheetOpen(true)
                      }}
                    >
                      <Pencil />
                    </Button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <WorkstationSheet open={sheetOpen} onOpenChange={setSheetOpen} workstation={editing} />
    </div>
  )
}

function WorkstationSheet({
  open,
  onOpenChange,
  workstation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workstation: Workstation | null
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Remontagem por key a cada abertura, no lugar do reset por efeito. */}
        {open ? (
          <WorkstationForm
            key={workstation?.id ?? 'novo'}
            workstation={workstation}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function WorkstationForm({
  workstation,
  onOpenChange,
}: {
  workstation: Workstation | null
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: workstation?.name ?? '',
    description: workstation?.description ?? '',
    isActive: workstation?.is_active ?? true,
  })

  return (
    <>
        <SheetHeader title={workstation ? 'Editar box' : 'Novo box'} />

        <SheetBody>
          <div className="space-y-4 p-4 sm:p-5">
            <Field label="Nome" htmlFor="ws-name" required>
              <Input
                id="ws-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Box 01"
              />
            </Field>

            <Field label="Descrição" htmlFor="ws-desc" hint="Opcional">
              <Textarea
                id="ws-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Box coberto, com elevador"
                rows={2}
              />
            </Field>

            {workstation ? (
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                <Label htmlFor="ws-active">Box ativo</Label>
                <Switch
                  id="ws-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
            ) : null}
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            loading={pending}
            disabled={form.name.trim().length < 1}
            onClick={() =>
              startTransition(async () => {
                const result = await saveWorkstation(workstation?.id ?? null, {
                  name: form.name,
                  description: form.description,
                  allowed_categories: null,
                  is_active: form.isActive,
                })
                if (!result.ok) {
                  toast.error(result.error ?? 'Não foi possível salvar.')
                  return
                }
                toast.success(workstation ? 'Box atualizado.' : 'Box cadastrado.')
                onOpenChange(false)
                router.refresh()
              })
            }
          >
            Salvar
          </Button>
        </SheetFooter>
    </>
  )
}
