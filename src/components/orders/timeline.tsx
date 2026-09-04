import { STATUS_CONFIG, type OrderStatus } from '@/domain/status'
import { formatTime, formatDate, isToday } from '@/lib/format'
import type { StatusHistoryEntry } from '@/types/database'

/** Timeline vertical simples do atendimento (§113). */
export function Timeline({ entries }: { entries: StatusHistoryEntry[] }) {
  if (!entries.length) {
    return (
      <p className="text-[13px] text-[var(--color-ink-subtle)]">
        Nenhuma movimentação registrada.
      </p>
    )
  }

  return (
    <ol className="relative space-y-3 pl-5">
      <span
        aria-hidden
        className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--color-border)]"
      />
      {entries.map((entry) => {
        const config = STATUS_CONFIG[entry.new_status as OrderStatus]
        return (
          <li key={entry.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-5 top-1.5 size-[11px] rounded-full border-2 border-[var(--color-surface-raised)] bg-[var(--color-border-strong)]"
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="tnum text-[12.5px] font-semibold text-[var(--color-ink)]">
                {formatTime(entry.changed_at)}
              </span>
              {!isToday(entry.changed_at) ? (
                <span className="text-[11px] text-[var(--color-ink-subtle)]">
                  {formatDate(entry.changed_at)}
                </span>
              ) : null}
              <span className="text-[13px] text-[var(--color-ink)]">
                {entry.note ?? config?.label ?? entry.new_status}
              </span>
            </div>
            {entry.changed_by_name ? (
              <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                {entry.changed_by_name}
              </p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
