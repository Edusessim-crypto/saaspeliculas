'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmployeeAvatar } from '@/components/ui/avatar'
import { assignEmployees } from '@/lib/actions/orders'
import { can, type AppRole } from '@/domain/roles'
import type { Employee, ServiceOrderView } from '@/types/database'
import { cn } from '@/lib/utils'
import { markLocalMutation } from '@/lib/local-mutation'

export function AssignEmployeesDialog({
  order,
  employees,
  role,
  open,
  onOpenChange,
}: {
  order: ServiceOrderView
  employees: Employee[]
  role: AppRole
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(420px,calc(100vw-2rem))]">
        {/* A key remonta o conteudo a cada abertura: o estado inicial
            vem das props, sem efeito de sincronizacao. */}
        {open ? (
          <AssignEmployeesForm
            key={order.id}
            order={order}
            employees={employees}
            role={role}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AssignEmployeesForm({
  order,
  employees,
  role,
  onOpenChange,
}: {
  order: ServiceOrderView
  employees: Employee[]
  role: AppRole
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<string[]>(() =>
    order.employees.map((e) => e.employee_id),
  )
  const [conflictWarning, setConflictWarning] = useState(false)

  const applicators = employees.filter(
    (e) => e.is_active && (e.role === 'applicator' || e.role === 'manager'),
  )

  function submit(force = false) {
    startTransition(async () => {
      const result = await assignEmployees(order.id, selected, force)
      if (!result.ok) {
        if (result.error === 'CONFLICT') {
          if (can(role, 'orders:force_conflict')) {
            setConflictWarning(true)
          } else {
            toast.error('Há conflito de horário. Peça à gestão para confirmar.')
          }
          return
        }
        toast.error(result.error ?? 'Não foi possível atribuir.')
        return
      }
      toast.success('Aplicador atualizado.')
      onOpenChange(false)
      markLocalMutation()
    })
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>Aplicadores do atendimento</DialogTitle>
          <DialogDescription>
            O primeiro selecionado fica como responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto px-5 pb-2">
          <ul className="space-y-0.5">
            {applicators.map((employee) => {
              const isSelected = selected.includes(employee.id)
              return (
                <li key={employee.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] p-2.5 transition-colors',
                      isSelected
                        ? 'bg-[var(--color-accent-subtle)]'
                        : 'hover:bg-[var(--color-surface-hover)]',
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(value) => {
                        setConflictWarning(false)
                        setSelected((prev) =>
                          value === true
                            ? [...prev, employee.id]
                            : prev.filter((id) => id !== employee.id),
                        )
                      }}
                    />
                    <EmployeeAvatar
                      name={employee.full_name}
                      color={employee.color}
                      avatarUrl={employee.avatar_url}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                        {employee.full_name}
                      </span>
                      {employee.job_title ? (
                        <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                          {employee.job_title}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        {conflictWarning ? (
          <div className="mx-5 mb-2 rounded-[var(--radius-control)] border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] p-3 text-[12.5px] text-[var(--color-ink)]">
            Um dos aplicadores já tem serviço neste horário. Confirmar mesmo assim?
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant={conflictWarning ? 'danger' : 'primary'}
            loading={pending}
            onClick={() => submit(conflictWarning)}
          >
            {conflictWarning ? 'Confirmar mesmo assim' : 'Salvar'}
          </Button>
        </DialogFooter>
    </>
  )
}
