import { AlertTriangle } from 'lucide-react'
import { formatTimeRange } from '@/lib/format'
import type { ScheduleConflict } from '@/types/database'

/**
 * Conflito informa, não bloqueia (§31). Quem tem permissão decide
 * seguir mesmo assim.
 */
export function ConflictWarning({ conflicts }: { conflicts: ScheduleConflict[] }) {
  if (!conflicts.length) return null

  return (
    <div
      role="alert"
      className="rounded-[var(--radius-control)] border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] p-3"
    >
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-warning)]">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Este horário possui conflito.
      </p>
      <ul className="mt-1.5 space-y-1 text-[12.5px] text-[var(--color-ink)]">
        {conflicts.map((c) => (
          <li key={`${c.conflict_type}-${c.resource_id}-${c.order_id}`}>
            <span className="font-medium">{c.resource_name}</span>{' '}
            {c.conflict_type === 'employee' ? 'já está em um serviço' : 'já está ocupado'} das{' '}
            <span className="tnum">
              {formatTimeRange(c.conflict_start, c.conflict_end)}
            </span>
            .
          </li>
        ))}
      </ul>
    </div>
  )
}
