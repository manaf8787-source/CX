import type { Bi } from '../types'
import type { CallResult, CallSurveyRule } from '../data/callSurveyRule'

/** One "call ended" event from the call center, as the survey engine reads it. */
export interface CallEndedEvent {
  callId: string
  endedAt: string
  direction: 'inbound' | 'outbound'
  handledBy: 'ai' | 'human'
  /** The AI call script or campaign (outbound), or the IVR line (inbound). */
  script: string
  result: CallResult
  talkSeconds: number
  /** The CRM contact the number matched; unset when it matched none. */
  contactId?: string
  onDncr: boolean
  /** Days since this contact last received a CSAT + CES survey; unset when never. */
  daysSinceLastCsat?: number
  /** Set when the AI quality team evaluated this call (a sample only). */
  qa?: { score: number; critical: boolean }
}

/** Why a call got no survey, in the order the engine checks. */
export type SkipReason = 'rule_off' | 'not_completed' | 'too_short' | 'direction' | 'agent' | 'not_in_crm' | 'dncr' | 'cap' | 'critical'

export const SKIP_LABEL: Record<SkipReason, Bi> = {
  rule_off: { en: 'Rule switched off', ar: 'القاعدة متوقفة' },
  not_completed: { en: 'Call result not on the list', ar: 'نتيجة المكالمة ليست في القائمة' },
  too_short: { en: 'Conversation too short', ar: 'المحادثة قصيرة جداً' },
  direction: { en: 'Call direction not included', ar: 'اتجاه المكالمة غير مشمول' },
  agent: { en: 'AI or human calls not included', ar: 'مكالمات الذكاء الاصطناعي أو الموظفين غير مشمولة' },
  not_in_crm: { en: 'Number not matched to a CRM contact', ar: 'الرقم غير مطابق لعميل في CRM' },
  dncr: { en: 'On the Do Not Call Registry', ar: 'مسجّل في سجل عدم الاتصال' },
  cap: { en: 'Surveyed in the last 30 days', ar: 'تم استبيانه خلال آخر 30 يوماً' },
  critical: { en: 'Critical failure: sent to Close the loop', ar: 'إخفاق حرج: أُرسل إلى إغلاق الحلقة' },
}

export type CallSurveyDecision = { send: true; sendAt: string } | { send: false; reason: SkipReason }

/** Same hour arithmetic as the backend: Gulf time is UTC+4 all year. */
const GULF_OFFSET_MIN = 240

/**
 * The decision for one call (the backend runs the same checks in the same order). `capDays` is the CSAT + CES cap from How often we ask.
 * A survey due outside the sending hours moves to the next opening hour, Gulf time.
 */
export function decideCallSurvey(call: CallEndedEvent, rule: CallSurveyRule, capDays: number): CallSurveyDecision {
  if (!rule.enabled) return { send: false, reason: 'rule_off' }
  if (!rule.sendOn.includes(call.result)) return { send: false, reason: 'not_completed' }
  if (call.talkSeconds < rule.minTalkSeconds) return { send: false, reason: 'too_short' }
  if (call.direction === 'inbound' ? !rule.inbound : !rule.outbound) return { send: false, reason: 'direction' }
  if (call.handledBy === 'ai' ? !rule.ai : !rule.human) return { send: false, reason: 'agent' }
  if (!call.contactId) return { send: false, reason: 'not_in_crm' }
  if (call.onDncr) return { send: false, reason: 'dncr' }
  if (call.daysSinceLastCsat !== undefined && call.daysSinceLastCsat < capDays) return { send: false, reason: 'cap' }
  if (rule.criticalStops && call.qa?.critical) return { send: false, reason: 'critical' }
  return { send: true, sendAt: sendTime(call.endedAt, rule) }
}

/** The earliest send time inside the window: `sendAfterMin` after the call, moved into the sending hours if needed. */
export function sendTime(endedAt: string, rule: CallSurveyRule): string {
  const t = new Date(Date.parse(endedAt) + rule.sendAfterMin * 60_000)
  const local = new Date(t.getTime() + GULF_OFFSET_MIN * 60_000)
  const h = local.getUTCHours() + local.getUTCMinutes() / 60
  if (h >= rule.fromHour && h < rule.toHour) return t.toISOString()
  const next = new Date(local)
  if (h >= rule.toHour) next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCHours(rule.fromHour, 0, 0, 0)
  return new Date(next.getTime() - GULF_OFFSET_MIN * 60_000).toISOString()
}
