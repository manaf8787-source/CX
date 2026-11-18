import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * Chart theme for every Recharts chart (docs/MEO_DESIGN_SYSTEM.md, section "Charts"; the skill's chart table). Pages compose Recharts as
 * before and spread these presets instead of inventing colours:
 *
 *   <ChartWell height={220} legend={<ChartLegend items={[{ label: 'Signals', color: chartColor(0) }]} />}>
 *     <AreaChart data={rows}>
 *       <CartesianGrid {...chartGrid} />
 *       <XAxis dataKey="day" {...chartAxis} />
 *       <YAxis {...chartAxis} width={32} />
 *       <Tooltip content={<ChartTooltip />} cursor={chartCursorLine} />
 *       <Area dataKey="count" type="monotone" {...chartArea} activeDot={chartActiveDot} {...useChartMotion()} />
 *     </AreaChart>
 *   </ChartWell>
 *
 * Rules: the chart lives in a well inside its card; the hero series is ink (a 2px line, or the dark gradient on bars); secondary
 * series are grey `#767676` (62% on bars); tracks are `#ececec`; gridlines horizontal only; no axis lines; 12px grey labels; the tooltip
 * is a dark pill; the legend uses 6px dots; an area fills with ink at 6%. Hue is categorical and capped at the skill's four (ink, grey,
 * blue, amber): with more categories use `RankedBars` or small multiples, never a fifth colour.
 */

/** The four categorical series colours the skill allows: ink (hero), grey, blue, amber. */
export const CHART_SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'] as const
export const CHART_MAX_CATEGORIES = CHART_SERIES.length

/** Series colour by position. Past the fourth it returns the light grey "rest" colour: that is the signal to switch to `RankedBars`. */
export function chartColor(index: number): string {
  return index >= 0 && index < CHART_SERIES.length ? CHART_SERIES[index] : 'var(--chart-5)'
}

/** Axis props: no tick lines, no axis lines, 12px grey labels (#6e6e6e on a well). */
export const chartAxis = {
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--ink-secondary)', fontSize: 12 },
} as const

/** Gridlines: 1px, horizontal only. */
export const chartGrid = { vertical: false, stroke: 'var(--line)' } as const

/** Hover cursors: a hairline for line and area charts, a soft pill column for bar charts. */
export const chartCursorLine = { stroke: 'var(--line)', strokeWidth: 1 } as const
export const chartCursorBar = { fill: 'var(--hover-tint)', radius: 8 } as const

/** The hovered point: a 6px ink dot with a 2px ring in the card colour. */
export const chartActiveDot = { r: 4, fill: 'var(--chart-1)', stroke: 'var(--surface-card)', strokeWidth: 2 } as const

/** Hero line (ink, 2px, round joins) and secondary line (grey, 1.5px, dashed 4 4 when it is a reference). */
export const chartLine = { stroke: 'var(--chart-1)', strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round', dot: false } as const
export const chartLineMuted = { stroke: 'var(--chart-2)', strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round', dot: false } as const
export const chartLineReference = { ...chartLineMuted, strokeDasharray: '4 4' } as const

/** Area: the ink line over a flat ink fill at 6% (no colour gradients). */
export const chartArea = { stroke: 'var(--chart-1)', strokeWidth: 2, fill: 'var(--chart-1)', fillOpacity: 0.06, dot: false } as const

/**
 * Bars: the hero bar uses the dark gradient (render `<HeroGradient />` inside the chart and pass `fill={HERO_FILL}`), the others grey
 * at 62%. Column charts round the top corners to 6, bars in lists are fully rounded (`RankedBars`).
 * Contrast note: grey at 62% on a well is about 2.2:1, so a series drawn this way must also print its values (label or tooltip).
 */
export const HERO_FILL = 'url(#cx-chart-hero)'
export const chartBar = { fill: HERO_FILL, radius: [6, 6, 0, 0], maxBarSize: 40 } as const
export const chartBarMuted = { fill: 'var(--chart-2)', fillOpacity: 0.62, radius: [6, 6, 0, 0], maxBarSize: 40 } as const

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
