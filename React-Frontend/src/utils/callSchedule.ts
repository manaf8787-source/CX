import type { Bi, CallStatus, DetractorCallItem } from '../types'
import { hourLabel, type RulesBag } from './ruleValues'
import { isWorkingDay, nextWorkingDay, toDayKey, type WorkCalendar } from './workingDays'

/**
 * Close the loop calling rules (v40 F27): calls only inside calling hours, up to N attempts,
 * the next one on the following working day; after the last attempt a WhatsApp message goes out
 * and the person is marked "needs a human" for the CX manager (still open).
 * Decided 18 Nov: calling 09:00 to 18:00 UAE time, 3 attempts for the CX team's list, the next attempt the
 * following working day, a WhatsApp message after the last; 2 no-answers for an AI campaign before hand-off.
 * Hours, tries, the AI no-answers (`callFrom`, `callTo`, `callTries`, `aiNoAnswers`) and the working week
 * (`workingDays`) are configuration. Legal's confirmation of the hours is still pending: show the small
 * `CALL_COPY.hoursNote`, not a [Proposed] badge.
 */

export interface CallRules {
  /** Hour of day calls may start (9 = 09:00). */
  from: number
  /** Hour of day calls must end (18 = 18:00). */
  to: number
  /** Attempts before "needs a human" (the CX team's list). */
  tries: number
  /** No-answers before an AI campaign hands over to a person (2). */
  aiNoAnswers: number
  calendar: WorkCalendar
}

export function callRulesFrom(bag: RulesBag): CallRules {
  return { from: bag.callFrom, to: bag.callTo, tries: bag.callTries, aiNoAnswers: bag.aiNoAnswers, calendar: { days: bag.workingDays } }
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
  /** True on the last attempt of the CX team's list: a WhatsApp message goes out (an AI campaign hands over instead). */
  whatsappSent: boolean
  needsHuman: boolean
  /** True when an AI campaign's no-answers reached the limit and the call passes to a person. */
  handedOver: boolean
}

type CallRow = Pick<DetractorCallItem, 'attempts'> & Partial<Pick<DetractorCallItem, 'channel'>>

/** Attempts a row gets: an AI campaign hands over after `aiNoAnswers` (2), the CX team's own list after `tries` (3). */
export function attemptsAllowed(item: Partial<Pick<DetractorCallItem, 'channel'>>, rules: Pick<CallRules, 'tries' | 'aiNoAnswers'>): number {
  return item.channel === 'ai_campaign' ? rules.aiNoAnswers : rules.tries
}

/**
 * "No answer": attempts + 1; the next attempt is the following working day; on the last attempt the status becomes
 * "needs a human". The last attempt is the 2nd for an AI campaign row (hand-off, no WhatsApp from the campaign) and the
 * 3rd for the CX team's list (a WhatsApp message goes out).
 */
export function recordNoAnswer(item: CallRow, now: Date, rules: CallRules): NoAnswerResult {
  const attempts = item.attempts + 1
  if (attempts >= attemptsAllowed(item, rules)) {
    const ai = item.channel === 'ai_campaign'
    return { attempts, status: 'needs_human', whatsappSent: !ai, needsHuman: true, handedOver: ai }
  }
  return { attempts, status: 'no_answer', nextAttemptOn: toDayKey(nextWorkingDay(now, rules.calendar)), whatsappSent: false, needsHuman: false, handedOver: false }
}

/** The row suffix "attempt {n+1} of {allowed} · next {date}" is shown for a row with at least one attempt that still has one to go. */
export function attemptLine(
  item: Pick<DetractorCallItem, 'attempts' | 'status' | 'nextAttemptOn'> & Partial<Pick<DetractorCallItem, 'channel'>>,
  rules: Pick<CallRules, 'tries'> & Partial<Pick<CallRules, 'aiNoAnswers'>>,
): { attempt: number; of: number; next?: string } | null {
  if (item.attempts < 1 || item.status === 'done' || item.status === 'needs_human') return null
  const of = item.channel === 'ai_campaign' ? (rules.aiNoAnswers ?? rules.tries) : rules.tries
  return { attempt: item.attempts + 1, of, next: item.nextAttemptOn }
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
  /** An AI campaign's last no-answer: the call passes to a person (decided 18 Nov: 2 no-answers). */
  noAnswerHandOff: (n: number): Bi => ({
    en: `No answer ${n} times: the campaign hands this call to a person, flagged "needs a human".`,
    ar: `لم يرد ${n} مرات: تسلّم الحملة المكالمة لشخص وعُلّم "يحتاج إنساناً".`,
  }),
  /** The small line under "Needs a human" on an AI campaign row. */
  handedOverNote: { en: 'Handed over by the AI campaign after its no-answers', ar: 'سلّمتها حملة AI بعد عدم الرد' } as Bi,
  noAnswerMore: (date: string): Bi => ({
    en: `No answer. Next attempt ${date} within calling hours.`,
    ar: `لم يرد. المحاولة التالية ${date} ضمن ساعات الاتصال.`,
  }),
  noAnswerButton: { en: 'No answer', ar: 'لم يرد' } as Bi,
  needsHuman: { en: 'Needs a human', ar: 'يحتاج إنساناً' } as Bi,
  /** A small note beside the hours (not a [Proposed] badge): decided, but Legal's confirmation of the hours is pending. */
  hoursNote: { en: 'Legal to confirm the hours', ar: 'القانونية تؤكد الساعات' } as Bi,
  /** An AI campaign hands over to a person after this many no-answers (CampaignDialog's "twice"). */
  aiHandOff: (n: number): Bi => ({ en: `A campaign hands over to a person after ${n} no-answers.`, ar: `تسلّم الحملة لشخص بعد ${n} مرات عدم رد.` }),
  dncrNever: { en: 'DNCR: no calls, no surveys by call.', ar: 'DNCR: لا مكالمات ولا استبيانات بالهاتف.' } as Bi,
}
