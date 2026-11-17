import { describe, expect, it } from 'vitest'
import type { Signal } from '@/types'
import { PATTERN_RULES, detectPatterns } from './patterns'

const NOW = Date.parse('2026-11-17T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

let seq = 0
function sig(over: Partial<Signal> = {}): Signal {
  seq += 1
  return {
    id: `s${seq}`,
    kind: 'complaint',
    product: 're',
    environment: 'Dubai',
    category: 'slow_response',
    occurredAt: daysAgo(1),
    isPublic: false,
    ...over,
  }
}
const many = (n: number, over: Partial<Signal> = {}) => Array.from({ length: n }, () => sig(over))
const kinds = (signals: Signal[], opts = {}) => detectPatterns(signals, opts).map((p) => p.thresholdKind)

describe('pattern thresholds (Rules and Definitions, Decision 1)', () => {
  it('uses the documented rule values', () => {
    expect(PATTERN_RULES).toMatchObject({ sameIssueMin: 5, sameAgentMin: 3, environmentConcentrationPct: 50, minimumSample: 10, windowDays: 30 })
  })

  it('same issue: 4 is not a pattern, 5 is', () => {
    expect(kinds(many(4, { category: 'repeat_contact' }))).not.toContain('same_issue')
    const p = detectPatterns(many(5, { category: 'repeat_contact' }))
    expect(p.filter((x) => x.thresholdKind === 'same_issue')).toHaveLength(1)
    expect(p[0]).toMatchObject({ currentValue: 5, thresholdTarget: 5, hasMinimumSample: false })
  })

  it('same agent: 2 incidents is below threshold, 3 is a pattern (spec example: 2 of 7 -> no note)', () => {
    const two = [...many(2, { agentRef: 'ag-1', category: 'a' }), ...many(5, { category: 'b' })]
    expect(kinds(two)).not.toContain('same_agent')
    const three = many(3, { agentRef: 'ag-1', category: 'x' })
    const p = detectPatterns(three).find((x) => x.thresholdKind === 'same_agent')
    expect(p).toMatchObject({ agentRef: 'ag-1', currentValue: 3, thresholdTarget: 3 })
  })

  it('signals without an agent never form a same-agent pattern', () => {
    expect(kinds(many(6, { category: 'c' }))).not.toContain('same_agent')
  })

  it('environment concentration needs the minimum sample of 10', () => {
    const nine = many(9, { category: 'cat', environment: 'Abu Dhabi' })
    expect(kinds(nine)).not.toContain('environment_concentration')
    const ten = many(10, { category: 'cat', environment: 'Abu Dhabi' })
    const p = detectPatterns(ten).find((x) => x.thresholdKind === 'environment_concentration')
    expect(p).toMatchObject({ currentValue: 100, sampleSize: 10, hasMinimumSample: true })
  })

  it('environment concentration: exactly 50% qualifies, under 50% does not', () => {
    const half = [...many(5, { category: 'k', environment: 'Dubai' }), ...many(5, { category: 'k', environment: 'Sharjah' })]
    const envs = detectPatterns(half).filter((p) => p.thresholdKind === 'environment_concentration').map((p) => p.team)
    expect(envs).toEqual(['Dubai team', 'Sharjah team'])
    const under = [...many(4, { category: 'k', environment: 'Dubai' }), ...many(3, { category: 'k', environment: 'Sharjah' }), ...many(3, { category: 'k', environment: 'Ajman' })]
    expect(kinds(under)).not.toContain('environment_concentration')
  })

  it('reproduces the spec example: 7 "nobody called back", 5 from one office, 2 by one agent', () => {
    const signals = [
      ...many(5, { category: 'no_callback', environment: 'Office A' }),
      ...many(2, { category: 'no_callback', environment: 'Office B', agentRef: 'ag-9' }),
    ]
    const p = detectPatterns(signals)
    expect(p.find((x) => x.thresholdKind === 'same_issue')?.currentValue).toBe(7)
    expect(p.some((x) => x.thresholdKind === 'same_agent')).toBe(false)
    // 7 is below the minimum sample of 10, so no concentration pattern is published yet.
    expect(p.some((x) => x.thresholdKind === 'environment_concentration')).toBe(false)
  })

  it('a pattern below the minimum sample is flagged for investigation, not a guessed fix', () => {
    const p = detectPatterns(many(6, { category: 'z' }))[0]
    expect(p.hasMinimumSample).toBe(false)
    const big = detectPatterns(many(10, { category: 'z' }))[0]
    expect(big.hasMinimumSample).toBe(true)
  })

  it('rolling 30-day window, when applied, ignores older signals', () => {
    const signals = [...many(3, { category: 'w', occurredAt: daysAgo(10) }), ...many(3, { category: 'w', occurredAt: daysAgo(45) })]
    expect(kinds(signals)).toContain('same_issue')
    expect(kinds(signals, { windowDays: 30, now: NOW })).not.toContain('same_issue')
    const edge = many(5, { category: 'e', occurredAt: daysAgo(30) })
    expect(kinds(edge, { windowDays: 30, now: NOW })).toContain('same_issue')
  })

  it('gives every pattern a unique id and the signals that formed it', () => {
    const p = detectPatterns([...many(5, { category: 'q', agentRef: 'ag-2' }), ...many(5, { category: 'r', environment: 'Ajman' })])
    expect(new Set(p.map((x) => x.id)).size).toBe(p.length)
    for (const x of p) expect(x.signalIds.length).toBeGreaterThan(0)
  })
})

describe('sample data follows the rolling 30-day window', () => {
  it('counts only signals from the last 30 days, and still reaches the minimum sample', async () => {
    const mock = await import('@/services/mockData')
    const windowMs = PATTERN_RULES.windowDays * 86_400_000
    const byId = new Map(mock.MOCK_SIGNALS.map((s) => [s.id, s]))
    expect(mock.MOCK_SIGNALS.some((s) => Date.now() - Date.parse(s.occurredAt) > windowMs)).toBe(true)
    expect(mock.MOCK_PATTERNS.length).toBeGreaterThan(0)
    for (const p of mock.MOCK_PATTERNS) {
      expect(p.windowDays).toBe(30)
      for (const id of p.signalIds) expect(Date.now() - Date.parse(byId.get(id)!.occurredAt)).toBeLessThanOrEqual(windowMs)
    }
    expect(mock.MOCK_PATTERNS.some((p) => p.hasMinimumSample)).toBe(true)
  })

  it('produces a realistic handful of corrective actions across lifecycle states', async () => {
    const mock = await import('@/services/mockData')
    const actions = mock.MOCK_CORRECTIVE_ACTIONS
    expect(actions.length).toBeGreaterThanOrEqual(4)
    expect(actions.length).toBeLessThanOrEqual(6)
    expect(new Set(actions.map((a) => a.status)).size).toBeGreaterThanOrEqual(3)
    for (const a of actions) {
      const p = mock.MOCK_PATTERNS.find((x) => x.id === a.patternId)
      expect(p?.hasMinimumSample).toBe(true)
    }
  })

  it('keeps older history outside the window for timelines', async () => {
    const mock = await import('@/services/mockData')
    const old = mock.MOCK_INTERACTIONS.filter((i) => Date.now() - Date.parse(i.occurredAt) > 30 * 86_400_000)
    expect(mock.MOCK_INTERACTIONS).toHaveLength(120)
    expect(old.length).toBeGreaterThan(40)
  })
})
