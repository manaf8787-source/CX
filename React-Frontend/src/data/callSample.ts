import { seededRandom, intBetween, pick } from '../utils/random'
import type { CallEndedEvent } from '../utils/callSurveys'
import type { CallResult } from './callSurveyRule'

/**
 * Sample "call ended" events for the last 30 days (prototype only), with the answers the sent surveys got. The real ones come from the
 * AI call center (call and IVR logs, the result code, the matched CRM contact, and the QA evaluation for the calls in the QA sample).
 */
export interface SampleCall extends CallEndedEvent {
  /** What the customer answered, when a survey was sent and answered (CSAT 1-5, CES 1-7). */
  answer?: { csat: number; ces: number }
}

export const OUTBOUND_SCRIPTS = ['Viewing follow-up', 'Renewal reminder', 'Maintenance check', 'New launch invitation'] as const
export const INBOUND_LINES = ['Sales line', 'Leasing line', 'After-Sales line'] as const

const NOW = Date.parse('2026-11-26T06:40:00Z')
const RESULT_MIX: Record<'in' | 'out', [CallResult, number][]> = {
  in: [
    ['successful', 46],
    ['appointment', 14],
    ['follow_up', 18],
    ['not_interested', 4],
    ['dropped_after_greeting', 12],
    ['wrong_number', 6],
  ],
  out: [
    ['appointment', 10],
    ['follow_up', 12],
    ['successful', 8],
    ['not_interested', 12],
    ['dropped_after_greeting', 18],
    ['no_answer', 24],
    ['busy', 7],
    ['voicemail', 6],
    ['wrong_number', 3],
  ],
}

function weighted<T>(rng: () => number, mix: [T, number][]): T {
  let x = rng() * mix.reduce((s, [, w]) => s + w, 0)
  return mix.find(([, w]) => (x -= w) < 0)?.[0] ?? mix[0][0]
}

function build(): SampleCall[] {
  const rng = seededRandom(26_1126)
  const out: SampleCall[] = []
  for (let i = 0; i < 900; i++) {
    const inbound = rng() < 0.4
    const ai = inbound ? rng() < 0.55 : rng() < 0.85
    const result = weighted(rng, RESULT_MIX[inbound ? 'in' : 'out'])
    const talked = !['no_answer', 'busy', 'voicemail'].includes(result)
    const talkSeconds = !talked ? 0 : result === 'dropped_after_greeting' ? intBetween(rng, 2, 12) : intBetween(rng, 18, 420)
    const inQa = talked && result !== 'dropped_after_greeting' && rng() < 0.2
    const qaScore = inQa ? intBetween(rng, ai ? 62 : 55, 98) : 0
    const critical = inQa && qaScore < 66 && rng() < 0.5
    const endedAt = new Date(NOW - intBetween(rng, 0, 29) * 86_400_000 - intBetween(rng, 0, 13) * 3_600_000).toISOString()
    const call: SampleCall = {
      callId: `CALL-${String(70_000 + i)}`,
      endedAt,
      direction: inbound ? 'inbound' : 'outbound',
      handledBy: ai ? 'ai' : 'human',
      script: inbound ? pick(rng, INBOUND_LINES) : pick(rng, OUTBOUND_SCRIPTS),
      result,
      talkSeconds,
      contactId: rng() < (inbound ? 0.82 : 0.95) ? `C-${200_000 + i}` : undefined,
      onDncr: rng() < 0.04,
      daysSinceLastCsat: rng() < 0.12 ? intBetween(rng, 1, 29) : undefined,
      qa: inQa ? { score: qaScore, critical } : undefined,
    }
    // about a third of the sent surveys are answered; the answer leans on the QA score when there is one
    if (rng() < 0.34) {
      const base = inQa ? 1 + (qaScore - 50) / 10 : 3.3 + rng() * 1.8
      const csat = Math.max(1, Math.min(5, Math.round(base + (rng() - 0.5) * 1.6 + (ai ? -0.1 : 0.1))))
      const ces = Math.max(1, Math.min(7, Math.round(csat * 1.3 + (rng() - 0.5) * 2)))
      call.answer = { csat, ces }
    }
    out.push(call)
  }
  return out.sort((a, z) => z.endedAt.localeCompare(a.endedAt))
}

export const SAMPLE_CALLS: SampleCall[] = build()
