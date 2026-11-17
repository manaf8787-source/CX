import type { Bi, DetractorCallItem, FeedbackInstrument, Interaction, InterviewOutcome, ProblemFlag, RecoveryEvent, ReasonCode, Severity } from '../types'

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
 * Rules and Definitions, Decision 3 — "recovered". A customer who had an
 * incident counts as recovered if, within 60 days, any one of these happens:
 * a CSAT or CES rating of 4 or 5; an NPS answer as promoter or passive; a
 * completed transaction, renewal or new lead; or a new contact without a
 * complaint. They count as not recovered if within those 60 days they go
 * silent, rate as a detractor, cancel, or fall into any runaway type. Before
 * 60 days the portal says "too early". A re-survey that comes back higher
 * counts under the same rule (it is a rating event).
 *
 * When both kinds happen inside the window the source does not say which
 * wins; here the latest decisive event wins (the customer's state at the end
 * of the window). [Proposed]
 */
export const RECOVERY_WINDOW_DAYS = 60
const DAY_MS = 86_400_000

export type RecoveryStatus = 'recovered' | 'not_recovered' | 'too_early'
export type RecoveryReason =
  | 'good_rating'
  | 'promoter_or_passive'
  | 'transaction'
  | 'renewal'
  | 'new_lead'
  | 'clean_contact'
  | 'detractor_rating'
  | 'cancelled'
  | 'runaway'
  | 'silent'
  | 'nothing_decisive'
  | 'window_open'

export interface RecoveryResult {
  status: RecoveryStatus
  reason: RecoveryReason
  /** While the window is open: what the latest decisive event points to so far. */
  provisional?: 'recovered' | 'not_recovered'
  /** Re-survey score minus first score, when both exist (the recovery delta). */
  delta?: number
  windowEndsAt?: string
}

export function isRecoveryRating(instrument: FeedbackInstrument, score: number): boolean {
  return instrument === 'nps' ? score >= 7 : score >= 4
}

/** Detractor: NPS 0 to 6, CSAT 1 or 2, CES at the worst end (1 or 2). */
export function isDetractorRating(instrument: FeedbackInstrument, score: number): boolean {
  return instrument === 'nps' ? score <= 6 : score <= 2
}

function decisive(e: RecoveryEvent, fallback: FeedbackInstrument): { positive: boolean; reason: RecoveryReason } | null {
  switch (e.kind) {
    case 'rating': {
      if (e.score === undefined) return null
      const ins = e.instrument ?? fallback
      if (isRecoveryRating(ins, e.score)) return { positive: true, reason: ins === 'nps' ? 'promoter_or_passive' : 'good_rating' }
      if (isDetractorRating(ins, e.score)) return { positive: false, reason: 'detractor_rating' }
      return null
    }
    case 'transaction':
      return { positive: true, reason: 'transaction' }
    case 'renewal':
      return { positive: true, reason: 'renewal' }
    case 'new_lead':
      return { positive: true, reason: 'new_lead' }
    case 'contact':
      return e.complaint ? null : { positive: true, reason: 'clean_contact' }
    case 'cancel':
      return { positive: false, reason: 'cancelled' }
  }
}

export function recoveryStatus(item: DetractorCallItem, options: { now?: number; runawayAt?: string } = {}): RecoveryResult {
  const now = options.now ?? Date.now()
  const instrument = item.instrument ?? 'nps'
  const delta = item.secondScore !== undefined ? item.secondScore - item.firstScore : undefined
  if (!item.incidentAt) return { status: 'too_early', reason: 'window_open', delta }
  const start = new Date(item.incidentAt).getTime()
  const end = start + RECOVERY_WINDOW_DAYS * DAY_MS
  const windowEndsAt = new Date(end).toISOString()

  type Timed = { t: number; d: { positive: boolean; reason: RecoveryReason } | null }
  const timed: Timed[] = (item.followUps ?? []).map((e) => ({ t: new Date(e.at).getTime(), d: decisive(e, instrument) }))
  if (item.secondScore !== undefined && item.resurveyedAt) {
    timed.push({ t: new Date(item.resurveyedAt).getTime(), d: decisive({ at: item.resurveyedAt, kind: 'rating', instrument, score: item.secondScore }, instrument) })
  }
  if (options.runawayAt) timed.push({ t: new Date(options.runawayAt).getTime(), d: { positive: false, reason: 'runaway' } })

  const inWindow = timed.filter((x) => x.t > start && x.t <= end && x.t <= now).sort((a, b) => a.t - b.t)
  let last: Timed['d'] = null
  for (const x of inWindow) if (x.d) last = x.d

  if (now < end) {
    return { status: 'too_early', reason: 'window_open', provisional: last ? (last.positive ? 'recovered' : 'not_recovered') : undefined, delta, windowEndsAt }
  }
  if (last) return { status: last.positive ? 'recovered' : 'not_recovered', reason: last.reason, delta, windowEndsAt }
  return { status: 'not_recovered', reason: inWindow.length === 0 ? 'silent' : 'nothing_decisive', delta, windowEndsAt }
}

/** True once the 60-day window has closed with a recovery (the rate's numerator). */
export function isRecovered(item: DetractorCallItem, now?: number): boolean {
  return recoveryStatus(item, { now }).status === 'recovered'
}

/** "71% recovered": of the items whose window has closed, the share recovered. */
export function recoveryRate(items: DetractorCallItem[], now?: number): { recovered: number; decided: number; tooEarly: number; pct: number | null } {
  let recovered = 0
  let decided = 0
  let tooEarly = 0
  for (const i of items) {
    const r = recoveryStatus(i, { now })
    if (r.status === 'too_early') tooEarly += 1
    else {
      decided += 1
      if (r.status === 'recovered') recovered += 1
    }
  }
  return { recovered, decided, tooEarly, pct: decided ? Math.round((recovered / decided) * 100) : null }
}

export const RECOVERY_REASON_LABEL: Record<RecoveryReason, Bi> = {
  good_rating: { en: 'Rated 4 or 5', ar: 'قيّم 4 أو 5' },
  promoter_or_passive: { en: 'Promoter or passive', ar: 'مروّج أو محايد' },
  transaction: { en: 'Completed a transaction', ar: 'أتمّ معاملة' },
  renewal: { en: 'Renewed', ar: 'جدّد' },
  new_lead: { en: 'New lead', ar: 'عميل محتمل جديد' },
  clean_contact: { en: 'New contact without a complaint', ar: 'تواصل جديد دون شكوى' },
  detractor_rating: { en: 'Rated as a detractor again', ar: 'قيّم كمنتقد مجدداً' },
  cancelled: { en: 'Cancelled', ar: 'ألغى' },
  runaway: { en: 'Became a runaway customer', ar: 'أصبح عميلاً هارباً' },
  silent: { en: 'Went silent', ar: 'صمت' },
  nothing_decisive: { en: 'None of the four recovery events', ar: 'لم يحدث أي من أحداث التعافي الأربعة' },
  window_open: { en: 'Too early: the 60 days are not over', ar: 'مبكر: لم تنقضِ الستون يوماً' },
}

export const INSTRUMENT_LABEL: Record<FeedbackInstrument, Bi> = {
  nps: { en: 'NPS (0 to 10)', ar: 'NPS (0 إلى 10)' },
  csat: { en: 'CSAT (1 to 5)', ar: 'CSAT (1 إلى 5)' },
  ces: { en: 'CES (1 to 5)', ar: 'CES (1 إلى 5)' },
}

export function instrumentRange(instrument: FeedbackInstrument): { min: number; max: number } {
  return instrument === 'nps' ? { min: 0, max: 10 } : { min: 1, max: 5 }
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
