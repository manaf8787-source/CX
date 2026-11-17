import type { Checklist, VocRow } from '../types'

/** NPS = (promoters - detractors) / total * 100, rounded. */
export function nps(promoters: number, detractors: number, total: number): number | null {
  return total ? Math.round(((promoters - detractors) / total) * 100) : null
}

/** Weighted-average CSAT across VoC rows (weighted by response count). */
export function aggregateCsat(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  return Math.round(rows.reduce((s, r) => s + r.csat * r.n, 0) / n)
}

export function aggregateNps(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  const p = rows.reduce((s, r) => s + r.promoters, 0)
  const d = rows.reduce((s, r) => s + r.detractors, 0)
  return nps(p, d, n)
}

export function fmtSigned(v: number | null): string {
  if (v == null) return '–'
  return (v > 0 ? '+' : '') + v
}

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x))
}

/** Red-to-green colour mix for an NPS value, used on tiles and heatmaps. */
export function npsColor(v: number): string {
  if (v <= 20) return `color-mix(in srgb, var(--warn) ${Math.round(clamp((v + 20) / 40, 0, 1) * 100)}%, var(--crit))`
  return `color-mix(in srgb, var(--good) ${Math.round(clamp((v - 20) / 50, 0, 1) * 100)}%, var(--warn))`
}

export interface ScoreResult {
  score: number | null // 0-100 weighted score, excluding critical items
  criticalFails: number
  passed: boolean // false whenever any critical item failed, regardless of score
}

/** Mystery-shopper checklist scoring: a weighted average over non-voided
 * items (pass/fail contributes its weight if passed; a 1–5 scale item
 * contributes weight * (value-1)/4; "n/a" answers are excluded). Any failed
 * critical item is counted separately and fails the submission outright,
 * independent of the numeric score — ported from the prototype's
 * scoreOf()/review-queue logic. */
export function scoreChecklist(checklist: Checklist, answers: Record<string, number | 'na' | null>): ScoreResult {
  let num = 0
  let denom = 0
  let criticalFails = 0

  for (const item of checklist.items) {
    const answer = answers[item.id]
    if (answer === 'na' || answer == null) continue
    denom += item.weight
    let contribution = 0
    if (item.type === 'passfail') contribution = answer === 1 ? item.weight : 0
    else if (item.type === 'scale') contribution = item.weight * clamp((answer - 1) / 4, 0, 1)
    else contribution = item.weight // free text: counted as answered, no pass/fail
    num += contribution
    const failed = (item.type === 'passfail' && answer !== 1) || (item.type === 'scale' && answer <= 2)
    if (item.critical && failed) criticalFails++
  }

  const score = denom ? Math.round((num / denom) * 100) : null
  return { score, criticalFails, passed: criticalFails === 0 }
}
