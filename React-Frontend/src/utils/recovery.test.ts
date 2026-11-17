import { describe, expect, it } from 'vitest'
import type { DetractorCallItem, RecoveryEvent } from '@/types'
import { RECOVERY_WINDOW_DAYS, isDetractorRating, isRecoveryRating, recoveryRate, recoveryStatus } from './closeTheLoop'
import { MOCK_DETRACTOR_CALL_ITEMS } from '@/services/mockData'

const DAY = 86_400_000
const NOW = Date.parse('2026-11-17T12:00:00Z')

/** An incident `daysAgo` days before NOW, with events `[days after incident, event]`. */
function item(daysAgo: number, events: [number, Omit<RecoveryEvent, 'at'>][] = [], extra: Partial<DetractorCallItem> = {}): DetractorCallItem {
  const start = NOW - daysAgo * DAY
  return {
    id: 'x',
    personId: 'p',
    product: 're',
    environment: 'Dubai',
    severity: 'low',
    firstScore: 3,
    channel: 'human',
    instrument: 'nps',
    incidentAt: new Date(start).toISOString(),
    followUps: events.map(([d, e]) => ({ ...e, at: new Date(start + d * DAY).toISOString() })),
    ...extra,
  }
}

describe('recovered (Rules and Definitions, Decision 3)', () => {
  it('uses a 60-day window', () => {
    expect(RECOVERY_WINDOW_DAYS).toBe(60)
  })

  it('ratings: CSAT or CES 4 or 5 recover; NPS promoter or passive (7 to 10) recovers', () => {
    expect(isRecoveryRating('csat', 4)).toBe(true)
    expect(isRecoveryRating('ces', 5)).toBe(true)
    expect(isRecoveryRating('csat', 3)).toBe(false)
    expect(isRecoveryRating('nps', 7)).toBe(true)
    expect(isRecoveryRating('nps', 6)).toBe(false)
  })

  it('detractor: NPS 0 to 6, CSAT or CES 1 or 2', () => {
    expect(isDetractorRating('nps', 6)).toBe(true)
    expect(isDetractorRating('nps', 7)).toBe(false)
    expect(isDetractorRating('csat', 2)).toBe(true)
    expect(isDetractorRating('ces', 3)).toBe(false)
  })

  it('says "too early" before 60 days, even after a recovery event', () => {
    const r = recoveryStatus(item(30, [[5, { kind: 'transaction' }]]), { now: NOW })
    expect(r.status).toBe('too_early')
    expect(r.provisional).toBe('recovered')
  })

  it.each([
    ['a CSAT of 4', [[10, { kind: 'rating', instrument: 'csat', score: 4 }]], 'good_rating'],
    ['an NPS passive', [[10, { kind: 'rating', instrument: 'nps', score: 8 }]], 'promoter_or_passive'],
    ['a completed transaction', [[10, { kind: 'transaction' }]], 'transaction'],
    ['a renewal', [[10, { kind: 'renewal' }]], 'renewal'],
    ['a new lead', [[10, { kind: 'new_lead' }]], 'new_lead'],
    ['a new contact without a complaint', [[10, { kind: 'contact', complaint: false }]], 'clean_contact'],
  ] as [string, [number, Omit<RecoveryEvent, 'at'>][], string][])('recovers on %s inside the window', (_label, events, reason) => {
    const r = recoveryStatus(item(90, events), { now: NOW })
    expect(r.status).toBe('recovered')
    expect(r.reason).toBe(reason)
  })

  it('does not recover on silence, a detractor rating, a cancel or a runaway', () => {
    expect(recoveryStatus(item(90), { now: NOW })).toMatchObject({ status: 'not_recovered', reason: 'silent' })
    expect(recoveryStatus(item(90, [[10, { kind: 'rating', instrument: 'nps', score: 2 }]]), { now: NOW })).toMatchObject({ status: 'not_recovered', reason: 'detractor_rating' })
    expect(recoveryStatus(item(90, [[10, { kind: 'cancel' }]]), { now: NOW })).toMatchObject({ status: 'not_recovered', reason: 'cancelled' })
    const runawayAt = new Date(NOW - 50 * DAY).toISOString()
    expect(recoveryStatus(item(90), { now: NOW, runawayAt })).toMatchObject({ status: 'not_recovered', reason: 'runaway' })
  })

  it('a contact that carries a complaint is not a recovery', () => {
    expect(recoveryStatus(item(90, [[10, { kind: 'contact', complaint: true }]]), { now: NOW })).toMatchObject({ status: 'not_recovered', reason: 'nothing_decisive' })
  })

  it('ignores events after the 60 days', () => {
    expect(recoveryStatus(item(90, [[70, { kind: 'transaction' }]]), { now: NOW }).status).toBe('not_recovered')
  })

  it('the latest decisive event inside the window wins [Proposed precedence]', () => {
    const r = recoveryStatus(item(90, [[10, { kind: 'rating', instrument: 'csat', score: 5 }], [40, { kind: 'rating', instrument: 'csat', score: 1 }]]), { now: NOW })
    expect(r).toMatchObject({ status: 'not_recovered', reason: 'detractor_rating' })
  })

  it('a re-survey that comes back higher counts as a rating, and gives the recovery delta', () => {
    const start = NOW - 90 * DAY
    const r = recoveryStatus(item(90, [], { firstScore: 3, secondScore: 9, resurveyedAt: new Date(start + 12 * DAY).toISOString() }), { now: NOW })
    expect(r).toMatchObject({ status: 'recovered', reason: 'promoter_or_passive', delta: 6 })
  })

  it('the rate counts only items whose window has closed', () => {
    const items = [item(90, [[5, { kind: 'renewal' }]]), item(90), item(10)]
    expect(recoveryRate(items, NOW)).toEqual({ recovered: 1, decided: 2, tooEarly: 1, pct: 50 })
  })
})

describe('sample detractor list exercises the rule', () => {
  it('has incidents inside and outside the window, on all three instruments', () => {
    const results = MOCK_DETRACTOR_CALL_ITEMS.map((i) => recoveryStatus(i))
    expect(results.filter((r) => r.status === 'too_early').length).toBe(6)
    expect(results.filter((r) => r.status === 'recovered').length).toBe(3)
    expect(results.filter((r) => r.status === 'not_recovered').length).toBe(3)
    expect(new Set(MOCK_DETRACTOR_CALL_ITEMS.map((i) => i.instrument))).toEqual(new Set(['nps', 'csat', 'ces']))
  })

  it('CSAT and CES detractors start at 1 or 2, NPS detractors at 0 to 6', () => {
    for (const i of MOCK_DETRACTOR_CALL_ITEMS) {
      if (i.instrument === 'nps') expect(i.firstScore).toBeLessThanOrEqual(6)
      else expect([1, 2]).toContain(i.firstScore)
    }
  })
})
