/**
 * Chart theme for every Recharts chart (docs/MEO_DESIGN_SYSTEM.md, section "Charts"; the skill's chart table). Pages compose Recharts as
 * before and spread these presets instead of inventing colours (presets from here, components from `./charts`):
 *
 *   import { chartArea, chartAxis, chartColor, chartCursorLine, chartGrid, chartActiveDot } from '@/components/common/chartTheme'
 *   import { ChartLegend, ChartTooltip, ChartWell } from '@/components/common/charts'
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
