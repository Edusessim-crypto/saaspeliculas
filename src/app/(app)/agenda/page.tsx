import type { Metadata } from 'next'
import { startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO, isValid } from 'date-fns'
import { requireSession } from '@/lib/data/session'
import { getOrdersInRange } from '@/lib/data/orders'
import { getEmployees, getWorkstations } from '@/lib/data/catalog'
import { ScheduleView } from './schedule-view'

export const metadata: Metadata = { title: 'Agenda' }
export const dynamic = 'force-dynamic'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; employee?: string }>
}) {
  const session = await requireSession()
  const params = await searchParams

  const parsed = params.date ? parseISO(params.date) : new Date()
  const date = isValid(parsed) ? parsed : new Date()
  const view = params.view === 'day' ? 'day' : 'week'

  // Carrega a semana inteira mesmo na visao diaria: o custo e baixo e
  // evita um round-trip ao alternar de visualizacao.
  const from = startOfWeek(date, { weekStartsOn: 1 })
  const to = endOfWeek(date, { weekStartsOn: 1 })

  const [orders, employees, workstations] = await Promise.all([
    getOrdersInRange({
      organizationId: session.organization.id,
      from: startOfDay(from),
      to: endOfDay(to),
    }),
    getEmployees(session.organization.id),
    getWorkstations(session.organization.id),
  ])

  return (
    <ScheduleView
      orders={orders}
      employees={employees}
      workstations={workstations}
      role={session.role}
      organizationId={session.organization.id}
      initialDate={date.toISOString()}
      initialView={view}
      initialEmployee={params.employee ?? 'all'}
    />
  )
}
