import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * The survey after a call-center call (26 Nov, owner): one survey, CSAT + CES on one screen, sent only when the call was completed and
 * ended with an approved result (appointment, follow-up or a successful call). No NPS after a call (NPS stays with a completed
 * transaction). Calls dropped after the AI greeting get no survey; they are counted as an indicator per call script.
 *
 * The CX manager edits the rule (Settings, Surveys, When we ask). Prototype: kept in this browser's localStorage over the defaults
 * below; in the real platform this is the rule the survey engine reads when the call center sends a "call ended" event.
 */
export type CallResult =
  'appointment' | 'follow_up' | 'successful' | 'no_answer' | 'busy' | 'dropped_after_greeting' | 'wrong_number' | 'not_interested' | 'voicemail'

export const CALL_RESULTS: { id: CallResult; label: Bi; hint: Bi; completed: boolean }[] = [
  {
    id: 'appointment',
    label: { en: 'Appointment booked', ar: 'تم حجز موعد' },
    hint: { en: 'A viewing, meeting or visit was booked', ar: 'حُجزت معاينة أو اجتماع أو زيارة' },
    completed: true,
  },
  {
    id: 'follow_up',
    label: { en: 'Follow-up agreed', ar: 'تم الاتفاق على متابعة' },
    hint: { en: 'The customer agreed to a next step', ar: 'وافق العميل على خطوة تالية' },
    completed: true,
  },
  {
    id: 'successful',
    label: { en: 'Successful call', ar: 'مكالمة ناجحة' },
    hint: { en: 'The request was answered or resolved', ar: 'تمت الإجابة على الطلب أو حلّه' },
    completed: true,
  },
  { id: 'not_interested', label: { en: 'Not interested', ar: 'غير مهتم' }, hint: { en: 'Talked, but declined', ar: 'تحدث لكنه رفض' }, completed: false },
  {
    id: 'dropped_after_greeting',
    label: { en: 'Dropped after the AI greeting', ar: 'أغلق الخط بعد تحية الذكاء الاصطناعي' },
    hint: { en: 'Hung up on hearing the AI', ar: 'أغلق الخط عند سماع الذكاء الاصطناعي' },
    completed: false,
  },
  { id: 'no_answer', label: { en: 'No answer', ar: 'لا رد' }, hint: { en: 'Did not pick up', ar: 'لم يرد' }, completed: false },
  { id: 'busy', label: { en: 'Busy', ar: 'مشغول' }, hint: { en: 'Line busy or rejected', ar: 'الخط مشغول أو رُفضت المكالمة' }, completed: false },
  { id: 'voicemail', label: { en: 'Voicemail', ar: 'بريد صوتي' }, hint: { en: 'Reached voicemail', ar: 'وصل إلى البريد الصوتي' }, completed: false },
  { id: 'wrong_number', label: { en: 'Wrong number', ar: 'رقم خاطئ' }, hint: { en: 'Not the person we called', ar: 'ليس الشخص المطلوب' }, completed: false },
]
export const callResultInfo = (id: CallResult) => CALL_RESULTS.find((r) => r.id === id)!

export interface CallSurveyRule {
  enabled: boolean
  /** Call results that send the survey. Only completed results may be chosen. */
  sendOn: CallResult[]
  inbound: boolean
  outbound: boolean
  /** Calls handled by the AI agent, and by a person. */
  ai: boolean
  human: boolean
  /** Shorter conversations are not a real conversation. */
  minTalkSeconds: number
  /** Sent this many minutes after the call ends, at the earliest and at the latest. */
  sendAfterMin: number
  sendBeforeMin: number
  /** Only between these hours (Gulf time); a survey due outside them waits for the next morning. */
  fromHour: number
  toHour: number
  /** A critical failure flagged on the call (conduct, wrong information, promise not kept) stops the survey and opens a Close the loop item. */
  criticalStops: boolean
}

export const CALL_SURVEY_DEFAULTS: CallSurveyRule = {
  enabled: true,
  sendOn: ['appointment', 'follow_up', 'successful'],
  inbound: true,
  outbound: true,
  ai: true,
  human: true,
  minTalkSeconds: 30,
  sendAfterMin: 60,
  sendBeforeMin: 120,
  fromHour: 9,
  toHour: 21,
  criticalStops: true,
}

const KEY = 'psicx.callSurveyRule'

function read(): CallSurveyRule {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...CALL_SURVEY_DEFAULTS, ...(JSON.parse(raw) as Partial<CallSurveyRule>) }
  } catch {
    /* storage unavailable */
  }
  return CALL_SURVEY_DEFAULTS
}

let rule = read()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useCallSurveyRule(): CallSurveyRule {
  return useSyncExternalStore(
    subscribe,
    () => rule,
    () => rule,
  )
}

export function saveCallSurveyRule(next: CallSurveyRule) {
  // only completed results can send a survey, whatever was stored
  rule = { ...next, sendOn: next.sendOn.filter((r) => callResultInfo(r)?.completed) }
  try {
    localStorage.setItem(KEY, JSON.stringify(rule))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
