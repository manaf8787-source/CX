import type { Bi, DetractorCallItem, InterviewOutcome, ReasonCode, Severity } from '../types'

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

/** The 10 values are `ReasonCode` as already defined in `types/domain.ts`
 * (foundation pass) — close to, but not verbatim, Modules KB §7's own
 * 10-item phrasing. Both are fixed 10-value lists serving FR-5.3; labels
 * below are written to match each key's actual meaning rather than force-
 * fitting the KB's informal wording onto a differently-named key. */
export const REASON_CODE_LABEL: Record<ReasonCode, Bi> = {
  price: { en: 'Price or payment plan', ar: 'السعر أو خطة الدفع' },
  process_delay: { en: 'Slow or no reply / process delay', ar: 'بطء أو انعدام الرد / تأخر العملية' },
  staff_attitude: { en: 'Attitude', ar: 'السلوك' },
  product_mismatch: { en: 'Nothing suitable for them', ar: 'لا يوجد ما يناسبهم' },
  communication: { en: 'Wrong or missing information', ar: 'معلومات خاطئة أو ناقصة' },
  competitor_offer: { en: 'Went with a competitor offer', ar: 'اختار عرض منافس' },
  unit_availability: { en: 'Unit or paperwork availability', ar: 'توفر الوحدة أو الأوراق' },
  after_sales_issue: { en: 'After-sales issue', ar: 'مشكلة ما بعد البيع' },
  language_barrier: { en: 'Language barrier', ar: 'حاجز اللغة' },
  other: { en: 'Other', ar: 'أخرى' },
}

export const INTERVIEW_OUTCOME_LABEL: Record<InterviewOutcome, Bi> = {
  reached: { en: 'Reached', ar: 'تم التواصل' },
  resolved_on_call: { en: 'Resolved on call', ar: 'حُلّت أثناء المكالمة' },
  declined: { en: 'Declined — no retry', ar: 'رفض — دون إعادة محاولة' },
  callback_requested: { en: 'Asked for a callback', ar: 'طلب معاودة الاتصال' },
}
