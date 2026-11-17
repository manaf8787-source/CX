import type { EffectivenessRecord } from '../types'

export type EffectivenessVerdict = 'too_early' | 'working' | 'not_working' | 'unclear'

export interface EffectivenessResult {
  before: number
  after: number
  changePct: number
  verdict: EffectivenessVerdict
}

/** Ported from the prototype's effCalc(): splits the monthly series at the
 * action's start month, compares the 3-months-before average to the
 * from-start-onward average. Thresholds are the ones stated in the docs
 * (Modules KB section 9): <2 months after is too early; a drop of 25% or
 * more is working; a rise or a drop under 10% is not working; otherwise
 * unclear. This is a signal, not proof. */
export function evaluateEffectiveness(rec: EffectivenessRecord): EffectivenessResult {
  const before = avg(rec.series.slice(Math.max(0, rec.startedMonth - 3), rec.startedMonth))
  const after = avg(rec.series.slice(rec.startedMonth))
  const changePct = before ? (after - before) / before : 0
  const monthsAfter = rec.series.length - rec.startedMonth

  let verdict: EffectivenessVerdict
  if (monthsAfter < 2) verdict = 'too_early'
  else if (changePct <= -0.25) verdict = 'working'
  else if (changePct > -0.10) verdict = 'not_working'
  else verdict = 'unclear'

  return { before, after, changePct, verdict }
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

export const VERDICT_LABEL: Record<EffectivenessVerdict, { en: string; ar: string }> = {
  too_early: { en: 'Too early', ar: 'مبكر جداً' },
  working: { en: 'Working', ar: 'فعّال' },
  not_working: { en: 'Not working', ar: 'غير فعّال' },
  unclear: { en: 'Unclear', ar: 'غير واضح' },
}
