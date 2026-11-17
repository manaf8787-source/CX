/** Ported from `frontend/src/lib/effectiveness.ts` (effCalc): splits a
 * monthly series at the action's start month, compares the 3-months-before
 * average to the from-start-onward average. A drop of 25%+ is working, a
 * rise or a drop under 10% is not working, otherwise unclear; under 2
 * months since start is too early to call. A signal, not proof — feeds
 * CorrectiveAction.verificationResult (FR-4.1's 60-day check). */
export type EffectivenessVerdict = 'too_early' | 'effective' | 'failed' | 'partial'

export interface EffectivenessResult {
  before: number
  after: number
  changePct: number
  verdict: EffectivenessVerdict
}

export function evaluateEffectiveness(series: number[], startedMonthIndex: number): EffectivenessResult {
  const before = avg(series.slice(Math.max(0, startedMonthIndex - 3), startedMonthIndex))
  const after = avg(series.slice(startedMonthIndex))
  const changePct = before ? (after - before) / before : 0
  const monthsAfter = series.length - startedMonthIndex

  let verdict: EffectivenessVerdict
  if (monthsAfter < 2) verdict = 'too_early'
  else if (changePct <= -0.25) verdict = 'effective'
  else if (changePct > -0.1) verdict = 'failed'
  else verdict = 'partial'

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
