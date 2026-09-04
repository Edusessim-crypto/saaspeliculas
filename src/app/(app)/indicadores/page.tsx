import type { Metadata } from 'next'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { requireSession } from '@/lib/data/session'
import { getDashboardMetrics, getEmployeeStats } from '@/lib/data/metrics'
import { getEmployees, getWorkstations, getBusinessHours } from '@/lib/data/catalog'
import { MetricsView } from './metrics-view'

export const metadata: Metadata = { title: 'Indicadores' }
export const dynamic = 'force-dynamic'

const RANGES = { hoje: 0, '7d': 6, '30d': 29 } as const
type RangeKey = keyof typeof RANGES

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const session = await requireSession()
  const params = await searchParams
  const range: RangeKey = params.periodo === '30d' ? '30d' : params.periodo === 'hoje' ? 'hoje' : '7d'

  const now = new Date()
  const from = startOfDay(subDays(now, RANGES[range]))
  const to = endOfDay(now)

  const [workstations, hours, employees] = await Promise.all([
    getWorkstations(session.organization.id),
    getBusinessHours(session.organization.id),
    getEmployees(session.organization.id),
  ])

  // Capacidade = horas de funcionamento × número de boxes. É uma
  // aproximação honesta: sem isso a taxa de ocupação não significa nada.
  const openDays = hours.filter((h) => h.is_open)
  const averageDailyMinutes = openDays.length
    ? openDays.reduce((sum, h) => {
        if (!h.opens_at || !h.closes_at) return sum
        const [oh = 0, om = 0] = h.opens_at.split(':').map(Number)
        const [ch = 0, cm = 0] = h.closes_at.split(':').map(Number)
        return sum + (ch * 60 + cm - (oh * 60 + om))
      }, 0) / openDays.length
    : 8 * 60

  const capacityPerDay = averageDailyMinutes * Math.max(1, workstations.length)

  const [metrics, employeeStats] = await Promise.all([
    getDashboardMetrics(session.organization.id, from, to, capacityPerDay),
    getEmployeeStats(session.organization.id, from, to),
  ])

  return (
    <MetricsView
      metrics={metrics}
      employees={employees}
      employeeStats={Object.fromEntries(employeeStats)}
      range={range}
    />
  )
}
