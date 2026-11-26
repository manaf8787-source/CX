import type { DetractorCallItem, EnvId, VocRow } from '../types'
import type { Gift } from '../data/gifts'
import { isDetractorRating } from './closeTheLoop'

/**
 * The re-survey replaces the first rating (26 Nov, owner). A detractor who was called, understood and surveyed again counts in the
 * indicators with the second rating only; the first one stops counting. Pure: the same rows go in, adjusted copies come out.
 *
 * The rows are counts per product, channel, environment and milestone, so a person is moved between the promoter / passive / detractor
 * counts (NPS) or in or out of the satisfied share (CSAT) of one matching row. The number of answers (n) never changes: it is the same
 * person answering again, not a new answer. CES comes from the sample table, so it is not adjusted here.
 */

type Group = 'promoters' | 'passives' | 'detractors'

const npsGroup = (score: number): Group => (score >= 9 ? 'promoters' : score >= 7 ? 'passives' : 'detractors')
const satisfied = (score: number) => score >= 4

/** The first row that holds the person: same product, same environment (a row without one fits any), and still has someone to move. */
type Row = VocRow & { envId?: EnvId }

function pick(rows: Row[], item: DetractorCallItem, has: (r: Row) => boolean): number {
  const fits = (r: Row) => r.product === item.product && has(r)
  const exact = rows.findIndex((r) => fits(r) && r.envId === item.envId)
  return exact >= 0 ? exact : rows.findIndex((r) => fits(r) && r.envId === undefined)
}

export function applyResurveys<R extends Row>(rows: readonly R[], items: readonly DetractorCallItem[]): R[] {
  const out = rows.map((r) => ({ ...r }))
  for (const item of items) {
    if (item.secondScore === undefined) continue
    const instrument = item.instrument ?? 'nps'
    if (instrument === 'nps') {
      const from = npsGroup(item.firstScore)
      const to = npsGroup(item.secondScore)
      if (from === to) continue
      const i = pick(out, item, (r) => r[from] > 0)
      if (i < 0) continue
      out[i][from] -= 1
      out[i][to] += 1
    } else if (instrument === 'csat') {
      const was = satisfied(item.firstScore)
      const now = satisfied(item.secondScore)
      if (was === now) continue
      // csat is a percentage of the row's answers: moving one person is ±100/n percentage points
      const i = pick(out, item, (r) => r.n > 0)
      if (i < 0) continue
      const sat = (out[i].csat * out[i].n) / 100 + (now ? 1 : -1)
      out[i].csat = Math.min(100, Math.max(0, (sat / out[i].n) * 100))
    }
  }
  return out
}

// --- The recovery results page ---------------------------------------------------------------------------

export type ReachedVia = 'call' | 'gift' | 'call_and_gift' | 'none'
export const REACHED_VIA: ReachedVia[] = ['call', 'gift', 'call_and_gift', 'none']

/** A recovery gift that was emailed to Administration (sent or delivered) for this person. */
export function hasRecoveryGift(personId: string, gifts: readonly Gift[]): boolean {
  return gifts.some((g) => g.personId === personId && g.reason === 'recovery' && (g.status === 'sent' || g.status === 'delivered'))
}

/** A call happened when an attempt was made or the interview left an outcome or notes. */
export function wasCalled(item: DetractorCallItem): boolean {
  return item.attempts > 0 || item.outcome !== undefined || Boolean(item.notes?.trim())
}

export function reachedVia(item: DetractorCallItem, gifts: readonly Gift[]): ReachedVia {
  const call = wasCalled(item)
  const gift = hasRecoveryGift(item.personId, gifts)
  return call && gift ? 'call_and_gift' : call ? 'call' : gift ? 'gift' : 'none'
}

export interface RecoveryRow {
  item: DetractorCallItem
  via: ReachedVia
  delta: number
  /** No longer a detractor on the second rating. */
  recovered: boolean
}

export interface RecoveryFilters {
  product?: string
  /** A product page's own products (PSI Real Estate includes After-Sales). */
  products?: readonly string[]
  /** The environment in scope; unset or 'all' for every environment. */
  env?: string
  instrument?: string
  via?: ReachedVia
}

export interface RecoverySummary {
  /** Detractors on record in scope (first rating a detractor). */
  before: number
  /** Of those, re-surveyed. */
  reSurveyed: number
  /** Detractors left after the second ratings replace the first (not yet re-surveyed ones stay). */
  after: number
  recovered: number
  notYet: number
  averageDelta: number | null
  movement: { noLongerDetractor: number; betterStill: number; same: number; worse: number }
  rows: RecoveryRow[]
}

export function recoverySummary(items: readonly DetractorCallItem[], gifts: readonly Gift[], f: RecoveryFilters = {}): RecoverySummary {
  const detractors = items.filter(
    (i) =>
      isDetractorRating(i.instrument ?? 'nps', i.firstScore) &&
      (!f.product || i.product === f.product) &&
      (!f.products || f.products.includes(i.product)) &&
      (!f.env || f.env === 'all' || i.envId === f.env) &&
      (!f.instrument || (i.instrument ?? 'nps') === f.instrument),
  )
  const rows: RecoveryRow[] = detractors
    .filter((i) => i.secondScore !== undefined)
    .map((item) => ({
      item,
      via: reachedVia(item, gifts),
      delta: item.secondScore! - item.firstScore,
      recovered: !isDetractorRating(item.instrument ?? 'nps', item.secondScore!),
    }))
    .filter((r) => !f.via || r.via === f.via)
  // with a "how reached" filter only the people reached that way count, so the headline matches the table
  const before = f.via ? rows.length : detractors.length
  const recovered = rows.filter((r) => r.recovered).length
  return {
    before,
    reSurveyed: rows.length,
    after: before - recovered,
    recovered,
    notYet: before - rows.length,
    averageDelta: rows.length ? Math.round((rows.reduce((s, r) => s + r.delta, 0) / rows.length) * 10) / 10 : null,
    movement: {
      noLongerDetractor: recovered,
      betterStill: rows.filter((r) => !r.recovered && r.delta > 0).length,
      same: rows.filter((r) => r.delta === 0).length,
      worse: rows.filter((r) => r.delta < 0).length,
    },
    rows: rows.sort((a, b) => (b.item.resurveyedAt ?? '').localeCompare(a.item.resurveyedAt ?? '')),
  }
}
