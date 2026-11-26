import { useSyncExternalStore } from 'react'
import type { Bi, EnvId } from '../types'
import type { CallResult } from './callSurveyRule'
import { seededRandom, intBetween } from '../utils/random'

/**
 * The AI call center (BrightCall, 26 Nov, owner). The portal reads **daily totals only**: per day, environment, campaign and outcome,
 * the number of contacts, calls and cost, plus the drop buckets and the sentiment split. No call records, recordings or transcripts are
 * copied (BrightCall keeps them). The only per-call events are the few calls that can send a survey or raise a complaint signal.
 *
 * Every BrightCall outcome code maps to one of the portal's call results (the survey rule reads these), and to a group for the call split.
 * The mapping below is the agreed default; the CX manager can change a code's result (kept in this browser in the prototype).
 */
export type CallGroup = 'answered' | 'no_answer' | 'dropped' | 'not_called' | 'excluded'

/** What the portal does with a BrightCall outcome: the call result it counts as, or not a call at all. */
export type MappedResult = CallResult | 'not_called' | 'excluded'

export interface BrightcallOutcome {
  /** BrightCall's own outcome label, exactly as it arrives. */
  code: string
  group: CallGroup
  result: MappedResult
  /** Counts as a lead in BrightCall's "Leads generated". */
  lead?: boolean
  /** Raised to the CX portal as a complaint signal (angry customer). */
  complaint?: boolean
}

export const BRIGHTCALL_OUTCOMES: BrightcallOutcome[] = [
  // completed with a good result: these can send the CSAT + CES survey
  { code: 'Scheduled Meeting', group: 'answered', result: 'appointment', lead: true },
  { code: 'Interested to attend', group: 'answered', result: 'appointment', lead: true },
  { code: 'Interested, Follow Up Later', group: 'answered', result: 'follow_up', lead: true },
  { code: 'Interested, Later', group: 'answered', result: 'follow_up', lead: true },
  { code: 'Considering', group: 'answered', result: 'follow_up', lead: true },
  { code: 'Interested', group: 'answered', result: 'successful', lead: true },
  { code: 'Interested in other project', group: 'answered', result: 'successful', lead: true },
  { code: 'Interested Seller', group: 'answered', result: 'successful', lead: true },
  { code: 'Interested to rent', group: 'answered', result: 'successful', lead: true },
  { code: 'Qualified Transfer', group: 'answered', result: 'successful', lead: true },
  { code: 'Transferred', group: 'answered', result: 'successful', lead: true },
  { code: 'Unit Sold', group: 'answered', result: 'successful', lead: true },
  // answered, no survey
  { code: 'Not Interested', group: 'answered', result: 'not_interested' },
  { code: 'Not interested now', group: 'answered', result: 'not_interested' },
  { code: 'Not Interested Now', group: 'answered', result: 'not_interested' },
  { code: 'Angry Bird', group: 'answered', result: 'not_interested', complaint: true },
  { code: 'Call Back Later', group: 'answered', result: 'call_back' },
  { code: 'Call back later', group: 'answered', result: 'call_back' },
  { code: 'Not Qualified', group: 'answered', result: 'other' },
  { code: 'Not Qualified Transfer', group: 'answered', result: 'other' },
  { code: 'Low Budget', group: 'answered', result: 'other' },
  { code: 'Price Concern', group: 'answered', result: 'other' },
  { code: 'Hesitated', group: 'answered', result: 'other' },
  { code: 'Broker', group: 'answered', result: 'other' },
  { code: 'Gatekeeper', group: 'answered', result: 'other' },
  { code: 'Language Barrier', group: 'answered', result: 'other' },
  { code: 'No Dialogue', group: 'answered', result: 'other' },
  { code: 'WhatsApp', group: 'answered', result: 'other' },
  { code: 'Whats app', group: 'answered', result: 'other' },
  { code: 'Receive Marketing', group: 'answered', result: 'other' },
  // dropped
  { code: 'Dropped Calls', group: 'dropped', result: 'dropped_after_greeting' },
  { code: 'Dropped Transfer', group: 'dropped', result: 'other' },
  // not answered
  { code: 'No Answer', group: 'no_answer', result: 'no_answer' },
  { code: 'Voicemail', group: 'no_answer', result: 'voicemail' },
  { code: 'Busy', group: 'no_answer', result: 'busy' },
  { code: 'Wrong Number', group: 'no_answer', result: 'wrong_number' },
  { code: 'Invalid Numbers', group: 'no_answer', result: 'wrong_number' },
  // never dialled: blocked before the call
  { code: 'DNCR UAE Blocked', group: 'not_called', result: 'not_called' },
  { code: 'No DNCR Status on CRM', group: 'not_called', result: 'not_called' },
  { code: 'DNCR Check Unavailable', group: 'not_called', result: 'not_called' },
  { code: 'Not Existing Contact on CRM', group: 'not_called', result: 'not_called' },
  // test and unknown: left out of every number
  { code: 'Test Call', group: 'excluded', result: 'excluded' },
  { code: 'Unknown', group: 'excluded', result: 'excluded' },
  { code: 'Pending', group: 'excluded', result: 'excluded' },
]

export const GROUP_LABEL: Record<CallGroup, Bi> = {
  answered: { en: 'Answered', ar: 'تم الرد' },
  no_answer: { en: 'Not answered', ar: 'لم يتم الرد' },
  dropped: { en: 'Dropped', ar: 'أُغلقت' },
  not_called: { en: 'Blocked before the call', ar: 'مُنعت قبل الاتصال' },
  excluded: { en: 'Left out (test, unknown)', ar: 'مستبعدة (اختبار، غير معروف)' },
}

export const NOT_CALLED_LABEL: Bi = { en: 'Not a call (blocked)', ar: 'ليست مكالمة (ممنوعة)' }
export const EXCLUDED_LABEL: Bi = { en: 'Left out', ar: 'مستبعدة' }

/** BrightCall's three drop buckets. "Within 20 s" is the drop at the AI greeting. */
export type DropBucket = 'within_20s' | 'after_1min' | 'positive_then_dropped'
export const DROP_LABEL: Record<DropBucket, Bi> = {
  within_20s: { en: 'Within 20 seconds (at the AI greeting)', ar: 'خلال 20 ثانية (عند تحية الذكاء الاصطناعي)' },
  after_1min: { en: 'After 1 minute', ar: 'بعد دقيقة' },
  positive_then_dropped: { en: 'Interested and positive, then dropped', ar: 'مهتم وإيجابي ثم أُغلقت' },
}

// --- Mapping overrides (CX manager) ------------------------------------------------------------------------------

const KEY = 'psicx.brightcallMapping'
type Overrides = Record<string, MappedResult>
function read(): Overrides {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Overrides
  } catch {
    /* storage unavailable */
  }
  return {}
}
let overrides = read()
let merged = build()
const listeners = new Set<() => void>()
function build(): (BrightcallOutcome & { edited: boolean })[] {
  return BRIGHTCALL_OUTCOMES.map((o) => (overrides[o.code] ? { ...o, result: overrides[o.code], edited: true } : { ...o, edited: false }))
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function useBrightcallMapping() {
  return useSyncExternalStore(
    subscribe,
    () => merged,
    () => merged,
  )
}
export function setOutcomeResult(code: string, result: MappedResult | null) {
  const next = { ...overrides }
  if (result === null) delete next[code]
  else next[code] = result
  overrides = next
  merged = build()
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

// --- Daily totals (sample) ---------------------------------------------------------------------------------------

/** One row the backend stores per day, environment, campaign and outcome (the only call data the portal keeps). */
export interface AiCallDailyRow {
  date: string
  envId: EnvId
  campaign: string
  outcome: string
  contacts: number
  calls: number
  /** AED. */
  cost: number
}
/** Per day, environment and campaign: the drop buckets and the sentiment of the answered calls. */
export interface AiCallDailyExtra {
  date: string
  envId: EnvId
  campaign: string
  drops: Record<DropBucket, number>
  sentiment: { positive: number; neutral: number; negative: number }
}
/** Per campaign: how many customers it targets (its list) and how many were tried at least once. */
export interface AiCampaignTotals {
  campaign: string
  envId: EnvId
  targeted: number
  attempted: number
  startedOn: string
}

const CAMPAIGNS: { name: string; env: EnvId; size: number }[] = [
  { name: 'Saadiyat Lagoons', env: 'auh', size: 1.4 },
  { name: 'Ohana Project', env: 'auh', size: 1.2 },
  { name: 'Yas Island Listing', env: 'auh', size: 0.8 },
  { name: 'Reem Island New Projects', env: 'auh', size: 0.9 },
  { name: 'Hudayriyat General', env: 'auh', size: 0.7 },
  { name: 'Hilton Residences JLT', env: 'dub', size: 1.1 },
  { name: 'Damac Lagoons Listing', env: 'dub', size: 0.9 },
  { name: 'Binghatti Projects', env: 'dub', size: 0.6 },
  { name: 'Sustainable City', env: 'dub', size: 0.5 },
  { name: 'Tenant renewals', env: 'ast', size: 0.4 },
  { name: 'Leasing listings', env: 'ast', size: 0.5 },
  { name: 'Loyalty Program', env: 'auh', size: 0.3 },
]

// share of calls per outcome, from the overview screen's proportions (rounded); cost per call in AED
const MIX: [string, number, number][] = [
  ['No Answer', 620, 0.025],
  ['Voicemail', 73, 0.1],
  ['Dropped Calls', 69, 0.23],
  ['Invalid Numbers', 51, 0.007],
  ['Busy', 50, 0.006],
  ['No Dialogue', 42, 0.26],
  ['Not Interested', 39, 0.57],
  ['DNCR UAE Blocked', 21, 0.065],
  ['Wrong Number', 12, 0.33],
  ['Call Back Later', 9, 0.66],
  ['WhatsApp', 4, 1.17],
  ['Language Barrier', 3.5, 0.81],
  ['Angry Bird', 2.4, 0.47],
  ['Gatekeeper', 1.2, 0.56],
  ['Interested, Follow Up Later', 0.9, 1.16],
  ['Interested', 0.8, 1.18],
  ['Not Qualified', 0.7, 0.65],
  ['Broker', 0.5, 0.76],
  ['Interested in other project', 0.4, 1.26],
  ['Interested Seller', 0.4, 1.18],
  ['Call back later', 0.4, 0.63],
  ['Interested, Later', 0.16, 1.46],
  ['Considering', 0.1, 1.55],
  ['Interested to rent', 0.1, 1.26],
  ['Transferred', 0.06, 1.1],
  ['Interested to attend', 0.05, 1.15],
  ['Dropped Transfer', 0.05, 0.81],
  ['Not Qualified Transfer', 0.05, 0.77],
  ['Price Concern', 0.03, 1.67],
  ['Unit Sold', 0.03, 0.06],
  ['Qualified Transfer', 0.01, 1.45],
  ['Scheduled Meeting', 0.01, 1.4],
  ['No DNCR Status on CRM', 1.4, 0],
  ['Not Existing Contact on CRM', 0.7, 0],
  ['Test Call', 0.02, 1.6],
]

const NOW = Date.parse('2026-11-26T06:40:00Z')
export const AI_CALLS_DAYS = 90

function build90() {
  const rng = seededRandom(1_138_248)
  const rows: AiCallDailyRow[] = []
  const extras: AiCallDailyExtra[] = []
  const totals: AiCampaignTotals[] = []
  const mixSum = MIX.reduce((s, [, w]) => s + w, 0)
  for (const c of CAMPAIGNS) {
    const start = intBetween(rng, 20, AI_CALLS_DAYS - 1)
    let calls = 0
    for (let d = start; d >= 0; d--) {
      const date = new Date(NOW - d * 86_400_000).toISOString().slice(0, 10)
      const weekday = new Date(date).getUTCDay()
      const dayCalls = Math.round((weekday === 0 || weekday === 6 ? 300 : 1100) * c.size * (0.6 + rng() * 0.8))
      calls += dayCalls
      let dropped = 0
      let answered = 0
      for (const [code, w, cpc] of MIX) {
        const n = Math.round((dayCalls * w) / mixSum + (rng() < ((dayCalls * w) / mixSum) % 1 ? 1 : 0))
        if (!n) continue
        const contacts = Math.max(1, Math.round(n / (code === 'No Answer' || code === 'Busy' ? 3 : code === 'DNCR UAE Blocked' ? 1.3 : 2.2)))
        rows.push({ date, envId: c.env, campaign: c.name, outcome: code, contacts, calls: n, cost: Math.round(n * cpc * 10) / 10 })
        if (code === 'Dropped Calls') dropped += n
        if (BRIGHTCALL_OUTCOMES.find((o) => o.code === code)?.group === 'answered') answered += n
      }
      const w20 = Math.round(dropped * (0.62 + rng() * 0.1))
      const pos = Math.round(dropped * 0.06)
      const neg = Math.round(answered * (0.42 + rng() * 0.1))
      const posS = Math.round(answered * (0.08 + rng() * 0.04))
      extras.push({
        date,
        envId: c.env,
        campaign: c.name,
        drops: { within_20s: w20, positive_then_dropped: pos, after_1min: Math.max(0, dropped - w20 - pos) },
        sentiment: { positive: posS, negative: neg, neutral: Math.max(0, answered - neg - posS) },
      })
    }
    const targeted = Math.round((calls / 2.6) * (1.1 + rng() * 0.8))
    totals.push({
      campaign: c.name,
      envId: c.env,
      targeted,
      attempted: Math.min(targeted, Math.round(calls / 2.6)),
      startedOn: new Date(NOW - start * 86_400_000).toISOString().slice(0, 10),
    })
  }
  return { rows, extras, totals }
}

const SAMPLE = build90()
export const AI_CALL_DAILY: AiCallDailyRow[] = SAMPLE.rows
export const AI_CALL_EXTRA: AiCallDailyExtra[] = SAMPLE.extras
export const AI_CAMPAIGNS: AiCampaignTotals[] = SAMPLE.totals
export const AI_CALLS_UPDATED_AT = new Date(NOW - 35 * 60_000).toISOString()
