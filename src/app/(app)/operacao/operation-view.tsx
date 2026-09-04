'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { KanbanBoard, KanbanEmpty } from '@/components/orders/kanban-board'
import { KanbanMobile } from '@/components/orders/kanban-mobile'
import { OrderDrawer } from '@/components/orders/order-drawer'
import { NewOrderSheet } from '@/components/schedule/new-order-sheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtimeOrders } from '@/hooks/use-realtime-orders'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { relativeTime } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceOrderView, Employee, Workstation } from '@/types/database'

export function OperationView({
  orders,
  employees,
  workstations,
  role,
  organizationId,
}: {
  orders: ServiceOrderView[]
  employees: Employee[]
  workstations: Workstation[]
  role: AppRole
  organizationId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lastUpdate } = useRealtimeOrders(organizationId)

  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [workstationFilter, setWorkstationFilter] = useState('all')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [checklistOrder, setChecklistOrder] = useState<ServiceOrderView | null>(null)

  const selectedId = searchParams.get('atendimento')
  const selected = orders.find((o) => o.id === selectedId) ?? checklistOrder

  useKeyboardShortcut('n', () => setNewOrderOpen(true), can(role, 'orders:create'))

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        if (
          employeeFilter !== 'all' &&
          !order.employees.some((e) => e.employee_id === employeeFilter)
        ) {
          return false
        }
        if (workstationFilter !== 'all' && order.workstation_id !== workstationFilter) {
          return false
        }
        return true
      }),
    [orders, employeeFilter, workstationFilter],
  )

  function openOrder(order: ServiceOrderView) {
    setChecklistOrder(null)
    const params = new URLSearchParams(searchParams.toString())
    params.set('atendimento', order.id)
    router.replace(`/operacao?${params}`, { scroll: false })
  }

  function closeOrder(open: boolean) {
    if (open) return
    setChecklistOrder(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('atendimento')
    router.replace(params.size ? `/operacao?${params}` : '/operacao', { scroll: false })
  }

  const applicators = employees.filter(
    (e) => e.is_active && (e.role === 'applicator' || e.role === 'manager'),
  )

  return (
    <PageContainer>
      <PageHeader
        title="Operação"
        subtitle="Quadro em tempo real da produção."
        actions={
          can(role, 'orders:create') ? (
            <Button variant="primary" onClick={() => setNewOrderOpen(true)}>
              <Plus />
              <span className="hidden sm:inline">Novo agendamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="h-11 md:h-9 w-auto min-w-[148px] text-[13px]">
              <SelectValue placeholder="Aplicador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os aplicadores</SelectItem>
              {applicators.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {workstations.length > 0 ? (
            <Select value={workstationFilter} onValueChange={setWorkstationFilter}>
              <SelectTrigger className="h-11 md:h-9 w-auto min-w-[120px] text-[13px]">
                <SelectValue placeholder="Box" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os boxes</SelectItem>
                {workstations.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <p className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-subtle)]">
            <RefreshCw className="size-3" aria-hidden />
            Atualizado {relativeTime(lastUpdate)}
          </p>
        </div>
      </PageHeader>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <KanbanEmpty
            action={
              can(role, 'orders:create') ? (
                <Button variant="primary" onClick={() => setNewOrderOpen(true)}>
                  <Plus />
                  Novo agendamento
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="hidden min-w-0 md:block">
              <KanbanBoard
                orders={filtered}
                role={role}
                onSelect={openOrder}
                onChecklistRequired={setChecklistOrder}
              />
            </div>
            <div className="md:hidden">
              <KanbanMobile
                orders={filtered}
                role={role}
                onSelect={openOrder}
                onChecklistRequired={setChecklistOrder}
              />
            </div>
          </>
        )}
      </div>

      <OrderDrawer
        order={selected ?? null}
        role={role}
        employees={employees}
        open={Boolean(selected)}
        onOpenChange={closeOrder}
      />

      <NewOrderSheet open={newOrderOpen} onOpenChange={setNewOrderOpen} employees={employees} />
    </PageContainer>
  )
}
