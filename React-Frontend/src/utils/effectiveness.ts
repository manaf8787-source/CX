/**
 * The automatic readout beside the 60-day check: splits a monthly series at the fix's start month and compares the
 * 3-months-before average with the from-start-onward average. It follows the rule (Rules and Definitions, Decision 3,
 * `rule_effective_drop`): a drop of 50% or more reads effective; a smaller drop reads partial ("dropped under half");
 * no drop, or a rise, reads failed ("no drop: back to root cause"); under 2 months since the start is too early to call.
 * [Proposed] the line between partial and failed is "any drop": the rules define only the 50% line.
 * Evidence, not the verdict: a person records the verdict on the fix (v40.1), and "did not return for 90 days" is theirs to judge.
 */

/** Decision 3: effective when the same signals drop by this share or more. The rules configuration can change it. */
export const EFFECTIVE_DROP_PCT = 50

export type EffectivenessVerdict = 'too_early' | 'effective' | 'failed' | 'partial'

export interface EffectivenessResult {
  before: number
  after: number
  changePct: number
  verdict: EffectivenessVerdict
}

export function evaluateEffectiveness(series: number[], startedMonthIndex: number, dropPct: number = EFFECTIVE_DROP_PCT): EffectivenessResult {
  const before = avg(series.slice(Math.max(0, startedMonthIndex - 3), startedMonthIndex))
  const after = avg(series.slice(startedMonthIndex))
  const changePct = before ? (after - before) / before : 0
  const monthsAfter = series.length - startedMonthIndex

  let verdict: EffectivenessVerdict
  if (monthsAfter < 2) verdict = 'too_early'
  else if (changePct <= -dropPct / 100) verdict = 'effective'
  else if (changePct < 0) verdict = 'partial'
  else verdict = 'failed'

  return { before, after, changePct, verdict }
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

export const EFFECTIVENESS_LABEL: Record<EffectivenessVerdict, { en: string; ar: string }> = {
  too_early: { en: 'Too early to tell', ar: 'مبكر جداً للحكم' },
  effective: { en: 'Effective', ar: 'فعّال' },
  failed: { en: 'Failed', ar: 'فاشل' },
  partial: { en: 'Partial', ar: 'جزئي' },
}
