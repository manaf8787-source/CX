import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * Chart components. The presets (colours, axis, grid, line and bar styles) are in `chartTheme.ts`; see its header for the rules and an
 * example. This file holds the pieces that render: the well, the dark tooltip, the legend, the hero gradient and the ranked bars.
 */

/** SVG `<defs>` with the hero gradient (#3a3a3a to #0a0a0a; inverted in the dark theme through the ink tokens). Place it inside the chart. */
export function HeroGradient() {
  return (
    <defs>
      <linearGradient id="cx-chart-hero" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--ink-charcoal)' }} />
        <stop offset="1" style={{ stopColor: 'var(--ink)' }} />
      </linearGradient>
    </defs>
  )
}

interface ChartWellProps {
  /** One Recharts chart element. It is sized by a ResponsiveContainer. */
  children: ReactElement
  /** Plot height in px (default 220). The well adds its own padding. */
  height?: number
  /** Where the legend goes: under the plot, inside the well. */
  legend?: ReactNode
  /** Names the chart for assistive technology when the page does not describe it in text. */
  label?: string
  className?: string
}

/** The signature container: the chart sits in a #f2f2f2 well (radius 14, padding 22; 12 and 16 in dense), inside its card. */
export function ChartWell({ children, height = 220, legend, label, className }: ChartWellProps) {
  return (
    <div role={label ? 'group' : undefined} aria-label={label} data-slot="chart-well" className={cn('well flex min-w-0 flex-col gap-3', className)}>
      <div className="w-full min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {legend}
    </div>
  )
}

interface TooltipRow {
  name?: string | number
  value?: unknown
  color?: string
  hide?: boolean
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<TooltipRow>
  label?: ReactNode
  /** Format a value (default: as given; numbers get thousands separators). */
  valueFormatter?: (value: unknown, row: TooltipRow) => ReactNode
  labelFormatter?: (label: ReactNode) => ReactNode
}

function formatValue(value: unknown): ReactNode {
  if (typeof value === 'number') return value.toLocaleString('en-US')
  if (Array.isArray(value)) return value.join(' – ')
  return value as ReactNode
}

/**
 * The dark pill tooltip: the dark material (light in the dark theme), radius 10, padding 8/10, 12/500, values tabular. Pass it as
 * `<Tooltip content={<ChartTooltip />} />`. A row shows a 6px dot in the series colour, the name and the value.
 */
export function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => !p.hide)
  return (
    <div data-slot="chart-tooltip" className="material-dark flex min-w-28 flex-col gap-1.5 rounded-[10px] px-2.5 py-2 text-xs font-medium">
      {label !== undefined && label !== '' && <span className="text-(--on-dark-muted)">{labelFormatter ? labelFormatter(label) : label}</span>}
      <ul className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <li key={`${row.name ?? i}`} className="flex items-center gap-2">
            {/* an ink series would vanish on the dark pill: its dot takes the pill's own text colour */}
            <span aria-hidden className="dot" style={{ backgroundColor: !row.color || row.color === 'var(--chart-1)' ? 'var(--on-dark)' : row.color }} />
            {row.name !== undefined && <span className="flex-1">{row.name}</span>}
            <span className="tabular ms-auto ps-2">{valueFormatter ? valueFormatter(row.value, row) : formatValue(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface LegendRow {
  label: ReactNode
  color: string
}

interface ChartLegendProps {
  /** Explicit items. Without them, the legend reads Recharts' own `payload` (use as `<Legend content={<ChartLegend />} />`). */
  items?: LegendRow[]
  payload?: ReadonlyArray<{ value?: string; color?: string }>
  className?: string
}

/** Legend: 6px dots and 13/400 grey text, 6px between dot and text, 14px between items. */
export function ChartLegend({ items, payload, className }: ChartLegendProps) {
  const rows: LegendRow[] = items ?? (payload ?? []).map((p) => ({ label: p.value, color: p.color ?? 'var(--chart-1)' }))
  if (rows.length === 0) return null
  return (
    <ul data-slot="chart-legend" className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted-foreground', className)}>
      {rows.map((row, i) => (
        <li key={i} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="dot" style={{ backgroundColor: row.color }} />
          {row.label}
        </li>
      ))}
    </ul>
  )
}

export interface RankedBarItem {
  key?: string
  label: ReactNode
  value: number
  /** What is printed at the end of the row (default: the value). Print it: the grey bars alone are low contrast. */
  display?: ReactNode
  /** Emphasise this row (dark fill, ink label). Default: the first row. */
  hero?: boolean
}

interface RankedBarsProps {
  items: RankedBarItem[]
  /** The value that fills a track (default: the largest). */
  max?: number
  /** Names the list. */
  label: string
  className?: string
}

/**
 * The skill's bar comparison, and the answer to "more than four categories": label, a 12px pill track (#ececec, inset), the fill, the
 * value at the end. The hero row has the dark material and an ink 500 label; the rest are the grey gradient at 62% with grey labels.
 * Rows are a real list; the tracks are decoration (`aria-hidden`), the printed value is the data.
 */
export function RankedBars({ items, max, label, className }: RankedBarsProps) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul aria-label={label} data-slot="ranked-bars" className={cn('flex flex-col gap-4', className)}>
      {items.map((item, i) => {
        const hero = item.hero ?? i === 0
        return (
          <li key={item.key ?? i} className="grid grid-cols-[minmax(4.5rem,9rem)_minmax(0,1fr)_auto] items-center gap-3.5">
            <span className={cn('truncate', hero ? 't-small-strong' : 't-body-s')}>{item.label}</span>
            <span aria-hidden className="h-3 overflow-hidden rounded-full bg-line shadow-inset-track">
              <span
                className={cn('block h-full rounded-full', hero ? 'material-dark' : 'bg-grad-muted-fill opacity-[0.62]')}
                style={{ width: `${Math.max(0, Math.min(100, (item.value / top) * 100))}%` }}
              />
            </span>
            <span className={cn('tabular text-end', hero ? 't-small-strong' : 't-body-s')}>{item.display ?? item.value.toLocaleString('en-US')}</span>
          </li>
        )
      })}
    </ul>
  )
}
