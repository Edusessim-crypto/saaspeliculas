'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { saveEmployee } from '@/lib/actions/settings'
import { SPECIALTIES, IDENTITY_COLORS } from '@/domain/defaults'
import { ROLE_LABELS } from '@/domain/roles'
import type { AppRole } from '@/domain/roles'
import type { Employee } from '@/types/database'
import { cn } from '@/lib/utils'

const ASSIGNABLE_ROLES: AppRole[] = ['manager', 'reception', 'applicator']

export function EmployeeSheet({
  open,
  onOpenChange,
  employee,
  specialties: initialSpecialties = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  specialties?: string[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Remontagem por key a cada abertura, no lugar do reset por efeito. */}
        {open ? (
          <EmployeeForm
            key={employee?.id ?? 'novo'}
            employee={employee}
            initialSpecialties={initialSpecialties}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function EmployeeForm({
  employee,
  initialSpecialties,
  onOpenChange,
}: {
  employee: Employee | null
  initialSpecialties: string[]
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    full_name: employee?.full_name ?? '',
    role: (employee?.role ?? 'applicator') as AppRole,
    job_title: employee?.job_title ?? '',
    phone: employee?.phone ?? '',
    color: employee?.color ?? (IDENTITY_COLORS[0] as string),
    weekly_hours: employee?.weekly_hours?.toString() ?? '',
    is_active: employee?.is_active ?? true,
  })
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties)

  function submit() {
    startTransition(async () => {
      const result = await saveEmployee(employee?.id ?? null, {
        full_name: form.full_name,
        role: form.role,
        job_title: form.job_title,
        phone: form.phone,
        color: form.color,
        weekly_hours: form.weekly_hours ? Number(form.weekly_hours) : null,
        specialties,
        is_active: form.is_active,
      })

      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível salvar.')
        return
      }

      toast.success(employee ? 'Colaborador atualizado.' : 'Colaborador cadastrado.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <>
        <SheetHeader
          title={employee ? 'Editar colaborador' : 'Novo colaborador'}
          description={employee?.full_name}
        />

        <SheetBody>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <EmployeeAvatar
                name={form.full_name || 'Novo colaborador'}
                color={form.color}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                  Cor de identificação
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {IDENTITY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Cor ${color}`}
                      aria-pressed={form.color === color}
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={cn(
                        'size-6 rounded-full transition-transform',
                        form.color === color &&
                          'ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-surface-raised)]',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Field label="Nome completo" htmlFor="emp-name" required>
              <Input
                id="emp-name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Carlos Mendes"
                autoCapitalize="words"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <Field label="Função" htmlFor="emp-role" required>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}
                >
                  <SelectTrigger id="emp-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Cargo" htmlFor="emp-title" hint="Opcional">
                <Input
                  id="emp-title"
                  value={form.job_title}
                  onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                  placeholder="Aplicador PPF"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <Field label="Telefone" htmlFor="emp-phone">
                <Input
                  id="emp-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(51) 99999-9999"
                  inputMode="tel"
                  type="tel"
                />
              </Field>

              <Field label="Carga semanal" htmlFor="emp-hours" hint="Horas">
                <Input
                  id="emp-hours"
                  value={form.weekly_hours}
                  onChange={(e) => setForm((f) => ({ ...f, weekly_hours: e.target.value }))}
                  placeholder="44"
                  inputMode="numeric"
                  className="tnum"
                />
              </Field>
            </div>

            <Field label="Especialidades">
              <div className="space-y-1">
                {SPECIALTIES.map((specialty) => {
                  const checked = specialties.includes(specialty)
                  return (
                    <label
                      key={specialty}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition-colors',
                        checked
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSpecialties((prev) =>
                            value === true
                              ? [...prev, specialty]
                              : prev.filter((s) => s !== specialty),
                          )
                        }
                      />
                      <span className="text-[13.5px] text-[var(--color-ink)]">{specialty}</span>
                    </label>
                  )
                })}
              </div>
            </Field>

            {employee ? (
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                <div className="min-w-0">
                  <Label htmlFor="emp-active">Colaborador ativo</Label>
                  <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                    Inativos não aparecem na agenda, mas o histórico é preservado.
                  </p>
                </div>
                <Switch
                  id="emp-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
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
            disabled={form.full_name.trim().length < 2}
            onClick={submit}
          >
            Salvar
          </Button>
        </SheetFooter>
    </>
  )
}
