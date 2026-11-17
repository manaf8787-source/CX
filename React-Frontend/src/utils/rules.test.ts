import { describe, expect, it } from 'vitest'
import type { DetractorCallItem, Interaction, MsChecklist, MsChecklistItem } from '@/types'
import { CLOCK_LABEL, dueClockState, formatRemaining } from './clock'
import { CALLS_PER_HOUR, REASON_CODE_LABEL, computeMonthlyCapacity, isRecovered, sampleToCapacity, suggestReasonCode } from './closeTheLoop'
import { EFFECTIVENESS_LABEL, evaluateEffectiveness } from './effectiveness'
import { msSeverityFor, scoreChecklist } from './mysteryShopper'
import { daysAgoIso, intBetween, pick, seededRandom } from './random'

const H = 3_600_000
const NOW = Date.parse('2026-11-17T12:00:00Z')
const at = (ms: number) => new Date(ms).toISOString()

describe('due-date clocks (SLA)', () => {
  const window = 48 * H
  it('is on track with plenty of time left', () => {
    expect(dueClockState(at(NOW + 24 * H), NOW, window)).toBe('on_track')
  })
  it('is at risk in the last 20% of the window', () => {
    expect(dueClockState(at(NOW + 9 * H), NOW, window)).toBe('at_risk')
    expect(dueClockState(at(NOW + 10 * H), NOW, window)).toBe('on_track')
  })
  it('is breached at or after the due time', () => {
    expect(dueClockState(at(NOW), NOW, window)).toBe('breached')
    expect(dueClockState(at(NOW - H), NOW, window)).toBe('breached')
  })
  it('stops on a closed case: met if closed in time, breached if late, regardless of now', () => {
    const due = at(NOW - 5 * H)
    expect(dueClockState(due, NOW, window, at(NOW - 6 * H))).toBe('met')
    expect(dueClockState(due, NOW, window, at(NOW - 4 * H))).toBe('breached')
    // A stopped clock must not drift into "breached" as time passes.
    expect(dueClockState(due, NOW + 100 * H, window, at(NOW - 6 * H))).toBe('met')
  })
  it('formats remaining and overdue time in both languages', () => {
    expect(formatRemaining(at(NOW + 5 * H), NOW, 'en')).toBe('5 h left')
    expect(formatRemaining(at(NOW - 72 * H), NOW, 'en')).toBe('3 d overdue')
    expect(formatRemaining(at(NOW + 5 * H), NOW, 'ar')).toMatch(/[؀-ۿ]/)
    for (const l of Object.values(CLOCK_LABEL)) expect(l.ar).toMatch(/[؀-ۿ]/)
  })
})

describe('60-day effectiveness check', () => {
  it('is too early with fewer than 2 months after the start', () => {
    expect(evaluateEffectiveness([10, 10, 10, 6], 3).verdict).toBe('too_early')
  })
  it('a drop of 25% or more is effective', () => {
    const r = evaluateEffectiveness([10, 10, 10, 7, 8], 3)
    expect(r.changePct).toBeCloseTo(-0.25)
    expect(r.verdict).toBe('effective')
  })
  it('a drop under 10% or a rise has failed', () => {
    expect(evaluateEffectiveness([10, 10, 10, 10, 9.2], 3).verdict).toBe('failed')
    expect(evaluateEffectiveness([10, 10, 10, 12, 12], 3).verdict).toBe('failed')
  })
  it('between 10% and 25% is partial', () => {
    expect(evaluateEffectiveness([10, 10, 10, 8, 9], 3).verdict).toBe('partial')
  })
  it('compares against the 3 months before the start only', () => {
    expect(evaluateEffectiveness([100, 10, 10, 10, 5, 5], 4).before).toBe(10)
  })
  it('has bilingual labels', () => {
    for (const l of Object.values(EFFECTIVENESS_LABEL)) expect(l.ar).toMatch(/[؀-ۿ]/)
  })
})

function item(over: Partial<MsChecklistItem>): MsChecklistItem {
  return { id: 'x', text: { en: '', ar: '' }, section: 's', weight: 1, type: 'passfail', critical: false, evidence: 'none', ...over }
}
const checklist = (items: MsChecklistItem[]): MsChecklist => ({ id: 'c', name: { en: '', ar: '' }, product: 're', channel: 'phone', status: 'published', version: 1, items })

describe('mystery shopper scoring', () => {
  const list = checklist([
    item({ id: 'greet', weight: 2 }),
    item({ id: 'id', weight: 1, critical: true }),
    item({ id: 'tone', weight: 1, type: 'scale' }),
    item({ id: 'notes', weight: 1, type: 'text' }),
  ])

  it('computes a weighted score over answered items', () => {
    const r = scoreChecklist(list, { greet: 1, id: 1, tone: 5, notes: 1 })
    expect(r).toEqual({ score: 100, criticalFails: 0, passed: true })
  })
  it('skips "not applicable" and unanswered items', () => {
    expect(scoreChecklist(list, { greet: 1, id: 'na', tone: null, notes: null }).score).toBe(100)
    expect(scoreChecklist(list, {}).score).toBeNull()
  })
  it('a failed critical item fails the visit even with a high score', () => {
    const r = scoreChecklist(list, { greet: 1, id: 0, tone: 5, notes: 1 })
    expect(r.score).toBeGreaterThanOrEqual(80)
    expect(r.passed).toBe(false)
    expect(r.criticalFails).toBe(1)
    expect(msSeverityFor(r.score, r.criticalFails)).toBe('critical')
  })
  it('a scale answer of 2 or less on a critical item counts as a critical fail', () => {
    const scaleCritical = checklist([item({ id: 's', type: 'scale', critical: true })])
    expect(scoreChecklist(scaleCritical, { s: 2 }).criticalFails).toBe(1)
    expect(scoreChecklist(scaleCritical, { s: 3 }).criticalFails).toBe(0)
  })
  it('a visit under 60% is at least medium, 60% and above is low', () => {
    expect(msSeverityFor(59, 0)).toBe('medium')
    expect(msSeverityFor(60, 0)).toBe('low')
    expect(msSeverityFor(null, 0)).toBeNull()
  })
})

function det(id: string, severity: DetractorCallItem['severity'], product: DetractorCallItem['product'] = 're', environment = 'Dubai'): DetractorCallItem {
  return { id, personId: id, product, environment, severity, firstScore: 1, channel: 'human' }
}

describe('close the loop', () => {
  it('capacity = people x hours a day x 4 calls an hour x working days', () => {
    expect(CALLS_PER_HOUR).toBe(4)
    expect(computeMonthlyCapacity(3, 6, 22)).toBe(1584)
    // Rules and Definitions example: a team of 5 reserving 1 hour a day -> about 400 a month.
    expect(computeMonthlyCapacity(5, 1, 20)).toBe(400)
    expect(computeMonthlyCapacity(-1, 6, 22)).toBe(0)
  })
  it('calls everyone when the month is under capacity', () => {
    const items = [det('a', 'low'), det('b', 'medium')]
    expect(sampleToCapacity(items, 10)).toEqual({ selected: items, excluded: [] })
  })
  it('always calls critical items at 100%, even beyond capacity', () => {
    const items = [det('c1', 'critical'), det('c2', 'critical'), det('c3', 'critical'), det('l1', 'low')]
    const r = sampleToCapacity(items, 2)
    expect(r.selected.map((i) => i.id)).toEqual(['c1', 'c2', 'c3'])
    expect(r.excluded.map((i) => i.id)).toEqual(['l1'])
  })
  it('samples the rest across product/environment buckets, not list order', () => {
    const items = [det('d1', 'low', 're', 'Dubai'), det('d2', 'low', 're', 'Dubai'), det('d3', 'low', 're', 'Dubai'), det('a1', 'low', 'af', 'Abu Dhabi')]
    const r = sampleToCapacity(items, 2)
    expect(r.selected.map((i) => i.id).sort()).toEqual(['a1', 'd1'])
    expect(r.selected.length + r.excluded.length).toBe(items.length)
  })
  it('recovered = re-survey score of 4 or more (documented approximation)', () => {
    expect(isRecovered({ ...det('r', 'low'), secondScore: 4 })).toBe(true)
    expect(isRecovered({ ...det('r', 'low'), secondScore: 3 })).toBe(false)
    expect(isRecovered(det('r', 'low'))).toBe(false)
  })
  it('has the ten KB reason codes, and suggests the most frequent one from the timeline', () => {
    expect(Object.keys(REASON_CODE_LABEL)).toHaveLength(10)
    const i = (flags: Interaction['problemFlags']): Interaction => ({ id: 'i', personKey: 'p', sourceRef: 'r', channel: 'whatsapp', direction: 'inbound', occurredAt: '', product: 're', environment: 'Dubai', language: 'en', problemFlags: flags })
    expect(suggestReasonCode([i(['promise_not_kept']), i(['slow_reply', 'promise_not_kept'])])).toBe('promise_not_kept')
    expect(suggestReasonCode([])).toBe('other')
  })
})

describe('seeded sample generator', () => {
  it('is deterministic for a seed', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('helpers stay in range', () => {
    const r = seededRandom(7)
    for (let k = 0; k < 50; k++) {
      const n = intBetween(r, 3, 9)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(9)
      expect(['a', 'b']).toContain(pick(r, ['a', 'b']))
    }
    expect(Number.isNaN(Date.parse(daysAgoIso(r, 30)))).toBe(false)
  })
})
