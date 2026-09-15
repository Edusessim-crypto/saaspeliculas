'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveServiceType } from '@/lib/actions/settings'
import { CATEGORY_LABELS, IDENTITY_COLORS } from '@/domain/defaults'
import type { ServiceType, ServiceCategory } from '@/types/database'
import { cn } from '@/lib/utils'
import { markLocalMutation } from '@/lib/local-mutation'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ServiceCategory[]

export function ServiceTypeSheet({
  open,
  onOpenChange,
  serviceType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceType: ServiceType | null
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Remontagem por key a cada abertura, no lugar do reset por efeito. */}
        {open ? (
          <ServiceTypeForm
            key={serviceType?.id ?? 'novo'}
            serviceType={serviceType}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ServiceTypeForm({
  serviceType,
  onOpenChange,
}: {
  serviceType: ServiceType | null
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: serviceType?.name ?? '',
    category: serviceType?.category ?? ('automotive_film' as ServiceCategory),
    duration: serviceType?.default_duration_minutes?.toString() ?? '60',
    price: serviceType?.default_price?.toString() ?? '',
    employees: serviceType?.default_employee_count?.toString() ?? '1',
    requiresWorkstation: serviceType?.requires_workstation ?? true,
    color: serviceType?.color ?? (IDENTITY_COLORS[0] as string),
    isActive: serviceType?.is_active ?? true,
  })

  function submit() {
    startTransition(async () => {
      const result = await saveServiceType(serviceType?.id ?? null, {
        name: form.name,
        category: form.category,
        default_duration_minutes: Number(form.duration) || 60,
        default_price: form.price ? Number(form.price.replace(',', '.')) : null,
        default_employee_count: Number(form.employees) || 1,
        requires_workstation: form.requiresWorkstation,
        color: form.color,
        is_active: form.isActive,
      })

      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível salvar.')
        return
      }

      toast.success(serviceType ? 'Serviço atualizado.' : 'Serviço cadastrado.')
      onOpenChange(false)
      markLocalMutation()
    })
  }

  return (
    <>
        <SheetHeader title={serviceType ? 'Editar serviço' : 'Novo serviço'} />

        <SheetBody>
          <div className="space-y-4 p-4 sm:p-5">
            <Field label="Nome do serviço" htmlFor="st-name" required>
              <Input
                id="st-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Película completa"
              />
            </Field>

            <Field label="Categoria" htmlFor="st-category" required>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as ServiceCategory }))}
              >
                <SelectTrigger id="st-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <Field
                label="Duração"
                htmlFor="st-duration"
                required
                hint="Em minutos"
              >
                <Input
                  id="st-duration"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  inputMode="numeric"
                  className="tnum"
                />
              </Field>

              <Field label="Preço" htmlFor="st-price" hint="Opcional">
                <Input
                  id="st-price"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="1250,00"
                  inputMode="decimal"
                  className="tnum"
                />
              </Field>
            </div>

            <Field
              label="Aplicadores recomendados"
              htmlFor="st-employees"
              hint="Quantas pessoas o serviço costuma exigir"
            >
              <Input
                id="st-employees"
                value={form.employees}
                onChange={(e) => setForm((f) => ({ ...f, employees: e.target.value }))}
                inputMode="numeric"
                className="tnum"
              />
            </Field>

            <Field label="Cor de identificação">
              <div className="flex flex-wrap gap-1.5">
                {IDENTITY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Cor ${color}`}
                    aria-pressed={form.color === color}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className={cn(
                      'size-7 rounded-full transition-transform',
                      form.color === color &&
                        'ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-surface-raised)]',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
              <div className="min-w-0">
                <Label htmlFor="st-box">Requer box</Label>
                <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                  Serviços externos, como obras, não precisam.
                </p>
              </div>
              <Switch
                id="st-box"
                checked={form.requiresWorkstation}
                onCheckedChange={(v) => setForm((f) => ({ ...f, requiresWorkstation: v }))}
              />
            </div>

            {serviceType ? (
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                <Label htmlFor="st-active">Serviço ativo</Label>
                <Switch
                  id="st-active"
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
            disabled={form.name.trim().length < 2}
            onClick={submit}
          >
            Salvar
          </Button>
        </SheetFooter>
    </>
  )
}
