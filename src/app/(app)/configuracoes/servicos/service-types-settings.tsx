'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Layers } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { ServiceTypeSheet } from '@/components/settings/service-type-sheet'
import { setServiceTypeActive } from '@/lib/actions/settings'
import { CATEGORY_LABELS } from '@/domain/defaults'
import { formatDuration, formatCurrency } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceType, ServiceCategory } from '@/types/database'
import { markLocalMutation } from '@/lib/local-mutation'

export function ServiceTypesSettings({
  serviceTypes,
  role,
}: {
  serviceTypes: ServiceType[]
  role: AppRole
}) {
  const [, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const editable = can(role, 'service_types:manage')

  const grouped = useMemo(() => {
    const map = new Map<ServiceCategory, ServiceType[]>()
    for (const service of serviceTypes) {
      const list = map.get(service.category) ?? []
      list.push(service)
      map.set(service.category, list)
    }
    return [...map.entries()]
  }, [serviceTypes])

  function toggle(service: ServiceType, isActive: boolean) {
    startTransition(async () => {
      const result = await setServiceTypeActive(service.id, isActive)
      if (!result.ok) {
        toast.error(result.error ?? 'Não foi possível alterar.')
        return
      }
      toast.success(isActive ? 'Serviço ativado.' : 'Serviço desativado.')
      markLocalMutation()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Catálogo de serviços</h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
            A duração define quanto tempo o horário fica reservado.
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
            <span className="hidden sm:inline">Novo serviço</span>
          </Button>
        ) : null}
      </div>

      {serviceTypes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="Nenhum serviço cadastrado."
            description="Cadastre os serviços que a loja executa."
            action={
              editable ? (
                <Button variant="primary" onClick={() => setSheetOpen(true)}>
                  <Plus />
                  Novo serviço
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        grouped.map(([category, services]) => (
          <Card key={category} className="overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                {CATEGORY_LABELS[category]}
              </p>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {services.map((service) => (
                <li key={service.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">
                      {service.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                      {formatDuration(service.default_duration_minutes)}
                      {service.default_price
                        ? ` · ${formatCurrency(service.default_price)}`
                        : ''}
                      {service.default_employee_count > 1
                        ? ` · ${service.default_employee_count} aplicadores`
                        : ''}
                      {service.requires_workstation ? ' · Requer box' : ''}
                    </p>
                  </div>

                  {editable ? (
                    <>
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={(value) => toggle(service, value)}
                        aria-label={`${service.is_active ? 'Desativar' : 'Ativar'} ${service.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${service.name}`}
                        onClick={() => {
                          setEditing(service)
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
          </Card>
        ))
      )}

      <ServiceTypeSheet open={sheetOpen} onOpenChange={setSheetOpen} serviceType={editing} />
    </div>
  )
}
