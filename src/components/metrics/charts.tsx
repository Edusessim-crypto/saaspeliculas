'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDuration } from '@/lib/format'

const AXIS = {
  stroke: 'var(--color-ink-subtle)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
}

const TOOLTIP_STYLE = {
  borderRadius: 'var(--radius-card)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface-raised)',
  boxShadow: 'var(--shadow-overlay)',
  fontSize: 12,
  padding: '8px 10px',
}

export function OrdersChart({
  data,
}: {
  data: { date: string; completed: number; scheduled: number }[]
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'dd/MM', { locale: ptBR }),
  }))

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} width={34} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'var(--color-surface-hover)' }}
            labelStyle={{ fontWeight: 600, color: 'var(--color-ink)' }}
            formatter={(value, name) => [
              Number(value ?? 0),
              name === 'completed' ? 'Concluídos' : 'Agendados',
            ]}
          />
          <Bar
            dataKey="scheduled"
            fill="var(--color-border-strong)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="completed"
            fill="var(--color-accent)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-center gap-4 text-[11.5px] text-[var(--color-ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[2px] bg-[var(--color-border-strong)]"
          />
          Agendados
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[2px] bg-[var(--color-accent)]" />
          Concluídos
        </span>
      </div>
    </div>
  )
}

const BAR_COLORS = [
  '#172554',
  '#1E3A8A',
  '#1D4ED8',
  '#2563EB',
  '#3B82F6',
  '#60A5FA',
  '#93C5FD',
  '#BFDBFE',
]

export function ProductionChart({ data }: { data: { name: string; minutes: number; count: number }[] }) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--color-ink-subtle)]">
        Sem serviços registrados.
      </p>
    )
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" {...AXIS} tickFormatter={(v: number) => formatDuration(v)} />
          <YAxis
            type="category"
            dataKey="name"
            {...AXIS}
            width={104}
            tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'var(--color-surface-hover)' }}
            labelStyle={{ fontWeight: 600, color: 'var(--color-ink)' }}
            formatter={(value, _name, item) => [
              `${formatDuration(Number(value ?? 0))} · ${
                (item?.payload as { count?: number } | undefined)?.count ?? 0
              } serviços`,
              'Tempo total',
            ]}
          />
          <Bar dataKey="minutes" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {data.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
