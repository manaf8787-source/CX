import type { Bi, CallStatus, DetractorCallItem } from '../types'
import { hourLabel, type RulesBag } from './ruleValues'
import { isWorkingDay, nextWorkingDay, toDayKey, type WorkCalendar } from './workingDays'

/**
 * Close the loop calling rules (v40 F27): calls only inside calling hours, up to N attempts,
 * the next one on the following working day; after the last attempt a WhatsApp message goes out
 * and the person is marked "needs a human" for the CX manager (still open).
 * Hours, tries and the working week are configuration (`callFrom`, `callTo`, `callTries`,
 * `workingDays`), all [Proposed]: the prototype says 09:00 to 18:00 and 3, the KB's After-Sales
 * placeholder says 09:00 to 20:00, and Legal confirms (Programme KB 43.9).
 * The AI campaign hand-off rule is a different number (a campaign gives up after two no-answers).
 */

export interface CallRules {
  /** Hour of day calls may start (9 = 09:00). */
  from: number
  /** Hour of day calls must end (18 = 18:00). */
  to: number
  /** Attempts before "needs a human". */
  tries: number
  calendar: WorkCalendar
}

export function callRulesFrom(bag: RulesBag): CallRules {
  return { from: bag.callFrom, to: bag.callTo, tries: bag.callTries, calendar: { days: bag.workingDays } }
}

/** True on a working day between `from` (inclusive) and `to` (exclusive) local time. */
export function isInsideCallingHours(now: Date, rules: CallRules): boolean {
  const h = now.getHours() + now.getMinutes() / 60
  return isWorkingDay(now, rules.calendar) && h >= rules.from && h < rules.to
}

export interface NoAnswerResult {
  attempts: number
  status: CallStatus
  /** 'YYYY-MM-DD' of the next attempt (the following working day); absent once the last attempt is spent. */
  nextAttemptOn?: string
  /** True on the last attempt: a WhatsApp message goes out. */
  whatsappSent: boolean
  needsHuman: boolean
}

/** "No answer": attempts + 1; the next attempt is the following working day; on the last attempt the status becomes "needs a human". */
export function recordNoAnswer(item: Pick<DetractorCallItem, 'attempts'>, now: Date, rules: CallRules): NoAnswerResult {
  const attempts = item.attempts + 1
  if (attempts >= rules.tries) return { attempts, status: 'needs_human', whatsappSent: true, needsHuman: true }
  return { attempts, status: 'no_answer', nextAttemptOn: toDayKey(nextWorkingDay(now, rules.calendar)), whatsappSent: false, needsHuman: false }
}

/** The row suffix "attempt {n+1} of {tries} · next {date}" is shown for a row with at least one attempt that still has one to go. */
export function attemptLine(item: Pick<DetractorCallItem, 'attempts' | 'status' | 'nextAttemptOn'>, rules: Pick<CallRules, 'tries'>): { attempt: number; of: number; next?: string } | null {
  if (item.attempts < 1 || item.status === 'done' || item.status === 'needs_human') return null
  return { attempt: item.attempts + 1, of: rules.tries, next: item.nextAttemptOn }
}

/** True while the row still counts as open (to do, no answer, needs a human). */
export function isOpenCall(item: Pick<DetractorCallItem, 'status'>): boolean {
  return item.status !== 'done'
}

/** Copy for the Close the loop page (v40 S11). Functions take the configured values so a rules edit shows up. */
export const CALL_COPY = {
  /** The hint at the top of the call list. */
  hint: (rules: Pick<CallRules, 'from' | 'to' | 'tries'>): Bi => ({
    en: `Calls only between ${hourLabel(rules.from)} and ${hourLabel(rules.to)} UAE time, up to ${rules.tries} attempts, the next one the following working day. After the last attempt a WhatsApp message goes out and the person is marked "needs a human" for the CX manager.`,
    ar: `المكالمات فقط بين ${hourLabel(rules.from)} و${hourLabel(rules.to)} بتوقيت الإمارات، حتى ${rules.tries} محاولات، التالية في يوم العمل التالي. بعد آخر محاولة تُرسل رسالة واتساب ويُعلَّم الشخص "يحتاج إنساناً" لمدير CX.`,
  }),
  /** The row suffix "attempt {n+1} of {tries} · next {date}". */
  rowSuffix: (attempt: number, of: number, next?: string): Bi => ({
    en: `attempt ${attempt} of ${of}${next ? ` · next ${next}` : ''}`,
    ar: `المحاولة ${attempt} من ${of}${next ? ` · التالية ${next}` : ''}`,
  }),
  noAnswerLast: (n: number): Bi => ({
    en: `No answer after ${n} attempts: WhatsApp sent, flagged "needs a human".`,
    ar: `لم يرد بعد ${n} محاولات: أُرسل واتساب وعُلّم "يحتاج إنساناً".`,
  }),
  noAnswerMore: (date: string): Bi => ({
    en: `No answer. Next attempt ${date} within calling hours.`,
    ar: `لم يرد. المحاولة التالية ${date} ضمن ساعات الاتصال.`,
  }),
  noAnswerButton: { en: 'No answer', ar: 'لم يرد' } as Bi,
  needsHuman: { en: 'Needs a human', ar: 'يحتاج إنساناً' } as Bi,
  /** Hours and tries are placeholders until Legal confirms (open question 43.9): show with [Proposed]. */
  dncrNever: { en: 'DNCR: no calls, no surveys by call.', ar: 'DNCR: لا مكالمات ولا استبيانات بالهاتف.' } as Bi,
}
