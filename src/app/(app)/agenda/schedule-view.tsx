'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isSameDay } from 'date-fns'
import { Plus, CalendarPlus, Users, Clock } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { DateNavigator } from '@/components/schedule/date-navigator'
import { ScheduleByEmployee } from '@/components/schedule/schedule-grid'
import { WeekView } from '@/components/schedule/week-view'
import { OrderRow, OrderRowHeader } from '@/components/orders/order-row'
import { OrderDrawer } from '@/components/orders/order-drawer'
import { NewOrderSheet } from '@/components/schedule/new-order-sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtimeOrders } from '@/hooks/use-realtime-orders'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { toDateInput } from '@/lib/format'
import { can, type AppRole } from '@/domain/roles'
import type { ServiceOrderView, Employee, Workstation } from '@/types/database'

type View = 'day' | 'week'
type DayMode = 'time' | 'employee'

export function ScheduleView({
  orders,
  employees,
  role,
  organizationId,
  initialDate,
  initialView,
  initialEmployee,
}: {
  orders: ServiceOrderView[]
  employees: Employee[]
  workstations: Workstation[]
  role: AppRole
  organizationId: string
  initialDate: string
  initialView: View
  initialEmployee: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  useRealtimeOrders(organizationId)

  const [date, setDate] = useState(() => new Date(initialDate))
  // Mobile abre no dia; desktop, na semana (§27). Decidido no primeiro
  // render para nao trocar de visualizacao depois de pintar a tela.
  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && initialView === 'week') {
      return 'day'
    }
    return initialView
  })
  const [dayMode, setDayMode] = useState<DayMode>('employee')
  const [employeeFilter, setEmployeeFilter] = useState(initialEmployee)
  const [newOrder, setNewOrder] = useState<{
    open: boolean
    date?: string
    time?: string
    employeeId?: string
  }>({ open: false })

  // Filtros na URL para permitir compartilhar e recarregar (§130).
  const syncUrl = useCallback(
    (next: { date?: Date; view?: View; employee?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('date', toDateInput(next.date ?? date))
      params.set('view', next.view ?? view)
      const employee = next.employee ?? employeeFilter
      if (employee === 'all') params.delete('employee')
      else params.set('employee', employee)
      router.replace(`/agenda?${params}`, { scroll: false })
    },
    [router, searchParams, date, view, employeeFilter],
  )

  const selectedId = searchParams.get('atendimento')
  const selected = orders.find((o) => o.id === selectedId) ?? null

  useKeyboardShortcut('n', () => setNewOrder({ open: true }), can(role, 'orders:create'))

  const visibleEmployees = useMemo(() => {
    const applicators = employees.filter(
      (e) => e.is_active && (e.role === 'applicator' || e.role === 'manager'),
    )
    return employeeFilter === 'all'
      ? applicators
      : applicators.filter((e) => e.id === employeeFilter)
  }, [employees, employeeFilter])

  const filteredOrders = useMemo(
    () =>
      employeeFilter === 'all'
        ? orders
        : orders.filter((o) => o.employees.some((e) => e.employee_id === employeeFilter)),
    [orders, employeeFilter],
  )

  const dayOrders = useMemo(
    () => filteredOrders.filter((o) => isSameDay(new Date(o.scheduled_start), date)),
    [filteredOrders, date],
  )

  function openOrder(order: ServiceOrderView) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('atendimento', order.id)
    router.replace(`/agenda?${params}`, { scroll: false })
  }

  function closeOrder(open: boolean) {
    if (open) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('atendimento')
    router.replace(`/agenda?${params}`, { scroll: false })
  }

  function changeDate(next: Date) {
    setDate(next)
    syncUrl({ date: next })
  }

  function changeView(next: View) {
    setView(next)
    syncUrl({ view: next })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Agenda"
        actions={
          can(role, 'orders:create') ? (
            <Button variant="primary" onClick={() => setNewOrder({ open: true })}>
              <Plus />
              <span className="hidden sm:inline">Novo agendamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <DateNavigator date={date} view={view} onChange={changeDate} />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={employeeFilter}
              onValueChange={(value) => {
                setEmployeeFilter(value)
                syncUrl({ employee: value })
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-[150px] text-[13px]">
                <SelectValue placeholder="Aplicador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os aplicadores</SelectItem>
                {employees
                  .filter((e) => e.is_active && (e.role === 'applicator' || e.role === 'manager'))
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Tabs value={view} onValueChange={(v) => changeView(v as View)}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </PageHeader>

      <div className="mt-4">
        {view === 'week' ? (
          <Card className="p-3 sm:p-4">
            <WeekView
              date={date}
              orders={filteredOrders}
              onSelect={openOrder}
              onDayClick={(day) => {
                setDate(day)
                setView('day')
                syncUrl({ date: day, view: 'day' })
              }}
            />
          </Card>
        ) : (
          <>
            {/* Desktop: alterna entre horario e aplicador (§28) */}
            <div className="mb-3 hidden md:block">
              <Tabs value={dayMode} onValueChange={(v) => setDayMode(v as DayMode)}>
                <TabsList>
                  <TabsTrigger value="time">
                    <Clock className="size-3.5" />
                    Por horário
                  </TabsTrigger>
                  <TabsTrigger value="employee">
                    <Users className="size-3.5" />
                    Por aplicador
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {dayOrders.length === 0 ? (
              <Card>
                <EmptyState
                  icon={CalendarPlus}
                  title="Sem agendamentos para este dia."
                  description="Que tal adicionar o primeiro?"
                  action={
                    can(role, 'orders:create') ? (
                      <Button
                        variant="primary"
                        onClick={() => setNewOrder({ open: true, date: toDateInput(date) })}
                      >
                        <Plus />
                        Novo agendamento
                      </Button>
                    ) : null
                  }
                />
              </Card>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  {dayMode === 'employee' ? (
                    <Card className="p-3">
                      <ScheduleByEmployee
                        date={date}
                        orders={filteredOrders}
                        employees={visibleEmployees}
                        onSelect={openOrder}
                        onSlotClick={
                          can(role, 'orders:create')
                            ? (employeeId, time) =>
                                setNewOrder({
                                  open: true,
                                  date: toDateInput(date),
                                  time,
                                  employeeId,
                                })
                            : undefined
                        }
                      />
                    </Card>
                  ) : (
                    <Card className="overflow-hidden">
                      <OrderRowHeader />
                      <div className="divide-y divide-[var(--color-border)]">
                        {dayOrders.map((order) => (
                          <OrderRow key={order.id} order={order} onSelect={openOrder} />
                        ))}
                      </div>
                    </Card>
                  )}
                </div>

                {/* Mobile: lista cronológica simples (§104) */}
                <Card className="overflow-hidden md:hidden">
                  <div className="divide-y divide-[var(--color-border)]">
                    {dayOrders.map((order) => (
                      <OrderRow key={order.id} order={order} onSelect={openOrder} />
                    ))}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>

      <OrderDrawer
        order={selected}
        role={role}
        employees={employees}
        open={Boolean(selected)}
        onOpenChange={closeOrder}
      />

      <NewOrderSheet
        open={newOrder.open}
        onOpenChange={(open) => setNewOrder((prev) => ({ ...prev, open }))}
        employees={employees}
        defaultDate={newOrder.date}
        defaultTime={newOrder.time}
        defaultEmployeeId={newOrder.employeeId}
      />
    </PageContainer>
  )
}
