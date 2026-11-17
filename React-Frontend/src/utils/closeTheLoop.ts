import type { Bi, DetractorCallItem, Interaction, InterviewOutcome, ProblemFlag, ReasonCode, Severity } from '../types'

/** FR-5.2 — monthly capacity = people x hours/day x 4 calls/hour x working
 * days. Defaults are a reasonable small-CX-team assumption for the demo and
 * are editable live on the page; eventually a Settings -> Rules value
 * (NFR-4), not a hardcoded constant in a real build. */
export const CLOSE_LOOP_DEFAULTS = { people: 3, hoursPerDay: 6, workingDaysPerMonth: 22 }
export const CALLS_PER_HOUR = 4

export function computeMonthlyCapacity(people: number, hoursPerDay: number, workingDays: number): number {
  return Math.max(0, Math.round(people * hoursPerDay * CALLS_PER_HOUR * workingDays))
}

/** FR-5.2 — critical is always called at 100%; when the rest exceed the
 * remaining capacity, sample down to capacity, spread across
 * product/environment buckets rather than taking them in list order. */
export function sampleToCapacity(
  items: DetractorCallItem[],
  capacity: number,
): { selected: DetractorCallItem[]; excluded: DetractorCallItem[] } {
  const critical = items.filter((i) => i.severity === 'critical')
  const rest = items.filter((i) => i.severity !== 'critical')
  const remaining = Math.max(0, capacity - critical.length)
  if (rest.length <= remaining) return { selected: items, excluded: [] }

  const byBucket = new Map<string, DetractorCallItem[]>()
  for (const i of rest) {
    const key = `${i.product}:${i.environment}`
    const list = byBucket.get(key) ?? []
    list.push(i)
    byBucket.set(key, list)
  }
  const buckets = [...byBucket.values()]
  const selectedRest: DetractorCallItem[] = []
  const taken = new Set<string>()
  let idx = 0
  let guard = 0
  while (selectedRest.length < remaining && guard < rest.length * buckets.length + buckets.length) {
    const bucket = buckets[idx % buckets.length]
    const next = bucket.find((i) => !taken.has(i.id))
    if (next) {
      selectedRest.push(next)
      taken.add(next.id)
    }
    idx += 1
    guard += 1
  }
  return { selected: [...critical, ...selectedRest], excluded: rest.filter((i) => !taken.has(i.id)) }
}

/**
 * FR-5.5 — "recovered" within 60 days: rating 4/5, NPS promoter/passive, a
 * transaction/renewal/new lead, or a new contact without a complaint. The
 * mock schema only carries a single 0–6 first/second score pair (no
 * separate NPS vs. CSAT scale, no transaction feed here), so this
 * approximates the rule as `secondScore >= 4` — a simplification, not the
 * full compound definition a real feed would support.
 */
export function isRecovered(item: DetractorCallItem): boolean {
  return item.secondScore !== undefined && item.secondScore >= 4
}

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, medium: 1, low: 2 }

/** The ten reason codes in Modules KB §7's own order and wording. */
export const REASON_CODE_LABEL: Record<ReasonCode, Bi> = {
  slow_or_no_reply: { en: 'Slow or no reply', ar: 'رد بطيء أو لا رد' },
  promise_not_kept: { en: 'Promise not kept', ar: 'وعد لم يُنفَّذ' },
  wrong_information: { en: 'Wrong or missing information', ar: 'معلومات خاطئة أو ناقصة' },
  attitude: { en: 'Attitude', ar: 'السلوك' },
  paperwork_handoff: { en: 'Paperwork or hand-off', ar: 'الأوراق أو التسليم بين الفرق' },
  app_website: { en: 'App or website', ar: 'التطبيق أو الموقع' },
  price_payment: { en: 'Price or payment plan', ar: 'السعر أو خطة الدفع' },
  nothing_suitable: { en: 'Nothing suitable', ar: 'لا شيء مناسب' },
  switched_channels: { en: 'Had to switch channels', ar: 'اضطر لتبديل القناة' },
  other: { en: 'Other', ar: 'أخرى' },
}

/** KB §7: the reason code is "suggested from the timeline, chosen by the
 * caller" — the most frequent journey-rule flag on the person's record. */
const FLAG_TO_REASON: Partial<Record<ProblemFlag, ReasonCode>> = {
  slow_reply: 'slow_or_no_reply',
  silence: 'slow_or_no_reply',
  promise_not_kept: 'promise_not_kept',
  hand_off: 'paperwork_handoff',
  forced_channel_switch: 'switched_channels',
  unapproved_discount: 'price_payment',
  ivr_complaint_not_logged: 'slow_or_no_reply',
}

export function suggestReasonCode(interactions: Interaction[]): ReasonCode {
  const counts = new Map<ReasonCode, number>()
  for (const i of interactions) for (const f of i.problemFlags) {
    const code = FLAG_TO_REASON[f]
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other'
}

export const INTERVIEW_OUTCOME_LABEL: Record<InterviewOutcome, Bi> = {
  reached: { en: 'Reached', ar: 'تم التواصل' },
  resolved_on_call: { en: 'Resolved on call', ar: 'حُلّت أثناء المكالمة' },
  declined: { en: 'Declined — no retry', ar: 'رفض — دون إعادة محاولة' },
  callback_requested: { en: 'Asked for a callback', ar: 'طلب معاودة الاتصال' },
}
