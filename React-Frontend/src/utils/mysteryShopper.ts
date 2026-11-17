import type { MsChecklist } from '../types'

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x))
}

export interface MsScoreResult {
  score: number | null // 0-100 weighted score, excluding critical items
  criticalFails: number
  passed: boolean // false whenever any critical item failed, regardless of score
}

/** Ported from `frontend/src/lib/metrics.ts`'s `scoreChecklist()` — a
 * weighted average over non-voided items; any failed critical item counts
 * separately and fails the submission outright, independent of the numeric
 * score. FR-4.14's "under 60% is at least medium" reads this score. */
export function scoreChecklist(checklist: MsChecklist, answers: Record<string, number | 'na' | null>): MsScoreResult {
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

/** FR-4.14 — a visit scoring under 60% is at least medium severity,
 * regardless of individual item results. */
export function msSeverityFor(score: number | null, criticalFails: number): 'critical' | 'medium' | 'low' | null {
  if (score == null) return null
  if (criticalFails > 0) return 'critical'
  if (score < 60) return 'medium'
  return 'low'
}
