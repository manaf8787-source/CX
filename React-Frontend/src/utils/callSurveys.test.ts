import { describe, expect, it } from 'vitest'
import { CALL_SURVEY_DEFAULTS } from '../data/callSurveyRule'
import { decideCallSurvey, sendTime, type CallEndedEvent } from './callSurveys'

const call = (over: Partial<CallEndedEvent> = {}): CallEndedEvent => ({
  callId: 'CALL-1',
  endedAt: '2026-11-26T08:00:00Z', // 12:00 Gulf time
  direction: 'outbound',
  handledBy: 'ai',
  script: 'Viewing follow-up',
  result: 'appointment',
  talkSeconds: 90,
  contactId: 'C-1',
  onDncr: false,
  ...over,
})
const R = CALL_SURVEY_DEFAULTS

describe('decideCallSurvey', () => {
  it('sends after a completed call with an approved result', () => {
    expect(decideCallSurvey(call(), R, 30)).toEqual({ send: true, sendAt: '2026-11-26T09:00:00.000Z' })
  })
  it('never sends after a call dropped at the AI greeting, or not interested', () => {
    expect(decideCallSurvey(call({ result: 'dropped_after_greeting', talkSeconds: 5 }), R, 30)).toEqual({ send: false, reason: 'not_completed' })
    expect(decideCallSurvey(call({ result: 'not_interested' }), R, 30)).toEqual({ send: false, reason: 'not_completed' })
  })
  it('checks in order: length, CRM match, DNCR, cap, critical QA', () => {
    expect(decideCallSurvey(call({ talkSeconds: 10 }), R, 30)).toMatchObject({ reason: 'too_short' })
    expect(decideCallSurvey(call({ contactId: undefined }), R, 30)).toMatchObject({ reason: 'not_in_crm' })
    expect(decideCallSurvey(call({ onDncr: true }), R, 30)).toMatchObject({ reason: 'dncr' })
    expect(decideCallSurvey(call({ daysSinceLastCsat: 12 }), R, 30)).toMatchObject({ reason: 'cap' })
    expect(decideCallSurvey(call({ daysSinceLastCsat: 30 }), R, 30)).toMatchObject({ send: true })
    expect(decideCallSurvey(call({ qa: { score: 50, critical: true } }), R, 30)).toMatchObject({ reason: 'critical' })
    expect(decideCallSurvey(call({ qa: { score: 50, critical: true } }), { ...R, criticalStops: false }, 30)).toMatchObject({ send: true })
  })
  it('respects the direction and AI / person switches', () => {
    expect(decideCallSurvey(call(), { ...R, outbound: false }, 30)).toMatchObject({ reason: 'direction' })
    expect(decideCallSurvey(call(), { ...R, ai: false }, 30)).toMatchObject({ reason: 'agent' })
    expect(decideCallSurvey(call(), { ...R, enabled: false }, 30)).toMatchObject({ reason: 'rule_off' })
  })
})

describe('sendTime', () => {
  it('moves a late-evening call to 09:00 Gulf time the next day', () => {
    // 20:30 Gulf + 60 min = 21:30, outside 09-21
    expect(sendTime('2026-11-26T16:30:00Z', R)).toBe('2026-11-27T05:00:00.000Z')
  })
  it('moves an early-morning call to 09:00 Gulf time the same day', () => {
    expect(sendTime('2026-11-26T02:00:00Z', R)).toBe('2026-11-26T05:00:00.000Z')
  })
})
