import type { Metadata } from 'next'
import { requireSession } from '@/lib/data/session'
import { getBusinessHours } from '@/lib/data/catalog'
import { BusinessHoursSettings } from './business-hours-settings'
import { DEFAULT_HOURS } from '@/domain/defaults'

export const metadata: Metadata = { title: 'Horários' }
export const dynamic = 'force-dynamic'

export default async function BusinessHoursPage() {
  const session = await requireSession()
  const stored = await getBusinessHours(session.organization.id)

  // Garante os sete dias na tela mesmo que o banco tenha menos.
  const hours = DEFAULT_HOURS.map((fallback) => {
    const found = stored.find((h) => h.weekday === fallback.weekday)
    return {
      weekday: fallback.weekday,
      is_open: found?.is_open ?? fallback.is_open,
      opens_at: found?.opens_at?.slice(0, 5) ?? fallback.opens_at,
      closes_at: found?.closes_at?.slice(0, 5) ?? fallback.closes_at,
      break_start: found?.break_start?.slice(0, 5) ?? null,
      break_end: found?.break_end?.slice(0, 5) ?? null,
    }
  })

  return <BusinessHoursSettings initialHours={hours} role={session.role} />
}
