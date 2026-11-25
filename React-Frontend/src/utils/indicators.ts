import type { IndicatorSet, Product, ProductId, VocRow } from '../types'
import { INDICATOR_THRESHOLDS, type IndicatorKind } from '../data/indicators'

/**
 * The per-product indicators (NPS, CSAT, CES), extracted from the Overview page (v40 F03, F09).
 * One function feeds the Home tiles, the Overview table and the Daily brief, so the number
 * and the sentence about it can never disagree ("the brief and the tiles use one NPS source").
 * There is no group NPS: every figure is for one product.
 */

/** Signed NPS: promoters minus detractors over all answers, rounded; null with no answers. */
export function npsOf(rows: readonly VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  const p = rows.reduce((s, r) => s + r.promoters, 0)
  const d = rows.reduce((s, r) => s + r.detractors, 0)
  return Math.round(((p - d) / n) * 100)
}

/** Average satisfied %, weighted by answers; null with no answers. */
export function csatOf(rows: readonly VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  return Math.round(rows.reduce((s, r) => s + r.csat * r.n, 0) / n)
}

export function answersOf(rows: readonly VocRow[]): number {
  return rows.reduce((s, r) => s + r.n, 0)
}

/** "+32", "-5", "0" or "–" for no value. */
export function fmtSigned(v: number | null): string {
  if (v == null) return '–'
  return (v > 0 ? '+' : '') + v
}

/**
 * NPS points against last month, from the monthly series: the last point minus the one before.
 * [Proposed] the series is the sample's monthly history; the tile's NPS comes from the survey rows.
 * Null when the series has fewer than two points (PSI Wallet has none).
 */
export function deltaFromTrend(series: readonly number[] | undefined): number | null {
  if (!series || series.length < 2) return null
  return series[series.length - 1] - series[series.length - 2]
}

/** Products whose answers also count in another product's figures: PSI Real Estate includes After-Sales (completed transactions). */
export const INCLUDES: Partial<Record<ProductId, ProductId[]>> = { re: ['af'] }

/** The indicators of one product. `ces` is the sample table value (null = not asked yet). */
export function indicatorsFor(
  productId: ProductId,
  rows: readonly VocRow[],
  trend: Partial<Record<ProductId, number[]>>,
  cesSample: Partial<Record<ProductId, number | null>>,
): IndicatorSet {
  // 25 Nov (owner): After-Sales asks the same customers about the same service after the deal completes, so PSI Real Estate's
  // figures include the After-Sales answers; After-Sales still has its own card with only its answers.
  const mine = rows.filter((r) => r.product === productId || (INCLUDES[productId] ?? []).includes(r.product))
  return {
    productId,
    nps: npsOf(mine),
    csat: csatOf(mine),
    ces: cesSample[productId] ?? null,
    answers: answersOf(mine),
    deltaVsLastMonth: deltaFromTrend(trend[productId]),
  }
}

/** One indicator set per live product (hidden products and PSI Wallet never appear on Home). */
export function liveIndicators(
  products: readonly Product[],
  rows: readonly VocRow[],
  trend: Partial<Record<ProductId, number[]>>,
  cesSample: Partial<Record<ProductId, number | null>>,
): IndicatorSet[] {
  return products.filter((p) => p.live).map((p) => indicatorsFor(p.id, rows, trend, cesSample))
}

export type IndicatorTone = 'good' | 'warn' | 'crit' | 'none'

/** Colour of a tile value from the [Proposed] thresholds in `data/indicators.ts`. */
export function indicatorTone(kind: IndicatorKind, value: number | null): IndicatorTone {
  if (value == null) return 'none'
  const t = INDICATOR_THRESHOLDS[kind]
  return value >= t.good ? 'good' : value >= t.warn ? 'warn' : 'crit'
}
