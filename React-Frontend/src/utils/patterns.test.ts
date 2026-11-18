import { describe, expect, it } from 'vitest'
import type { Signal } from '@/types'
import { PATTERN_RULES, detectPatterns, detectPatternsCached, whatIf } from './patterns'

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
    envId: 'dub',
    category: 'slow_response',
    occurredAt: daysAgo(1),
    isPublic: false,
    eventIds: [],
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
    const half = [...many(5, { category: 'k', environment: 'Dubai' }), ...many(5, { category: 'k', environment: 'PSI Assets' })]
    const envs = detectPatterns(half).filter((p) => p.thresholdKind === 'environment_concentration').map((p) => p.team)
    expect(envs).toEqual(['Dubai team', 'PSI Assets team'])
    const under = [...many(4, { category: 'k', environment: 'Dubai' }), ...many(3, { category: 'k', environment: 'PSI Assets' }), ...many(3, { category: 'k', environment: 'Abu Dhabi' })]
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
    const p = detectPatterns([...many(5, { category: 'q', agentRef: 'ag-2' }), ...many(5, { category: 'r', environment: 'Abu Dhabi' })])
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

describe('patterns follow the rules (v40 B17, F16, F32)', () => {
  const three = () => many(3, { category: 'repeat_contact' })

  it('a threshold override changes what counts: same issue at 3 turns three signals into a pattern', () => {
    expect(kinds(three())).not.toContain('same_issue')
    const p = detectPatterns(three(), { rules: { sameIssueMin: 3 } }).find((x) => x.thresholdKind === 'same_issue')
    expect(p).toMatchObject({ currentValue: 3, thresholdTarget: 3 })
  })

  it('the other rules are overridable too: same agent, concentration, minimum sample, window length', () => {
    const agent = many(2, { agentRef: 'ag-7', category: 'a' })
    expect(kinds(agent)).not.toContain('same_agent')
    expect(kinds(agent, { rules: { sameAgentMin: 2 } })).toContain('same_agent')
    const small = many(6, { category: 'z' })
    expect(detectPatterns(small, { rules: { minimumSample: 5 } })[0].hasMinimumSample).toBe(true)
    expect(detectPatterns(small, { rules: { windowDays: 45 } })[0].windowDays).toBe(45)
    const mixed = [...many(6, { category: 'c', environment: 'Dubai' }), ...many(4, { category: 'c', environment: 'PSI Assets' })]
    expect(detectPatterns(mixed, { rules: { environmentConcentrationPct: 60 } }).filter((p) => p.thresholdKind === 'environment_concentration').map((p) => p.team)).toEqual(['Dubai team'])
  })

  it('a pattern keeps its id and key when other signals change, so a fix stays attached to it', () => {
    const base = many(5, { category: 'slow_response' })
    const before = detectPatterns(base).find((p) => p.thresholdKind === 'same_issue')!
    const after = detectPatterns([...base, ...many(6, { category: 'wrong_language' }), sig({ category: 'slow_response' })]).find((p) => p.thresholdKind === 'same_issue' && p.category === 'slow_response')!
    expect(after.id).toBe(before.id)
    expect(after.id).toBe(before.key)
    expect(before.id).toBe('same_issue:slow_response')
    expect(after.traceId).toMatch(/^PT-\d{3}$/)
  })

  it('names keys by kind: same issue by category, same agent by agent, concentration by category and environment', () => {
    const p = detectPatterns([...many(5, { category: 'q', agentRef: 'Agent 3' }), ...many(10, { category: 'r', environment: 'Abu Dhabi' })])
    const keys = p.map((x) => x.key)
    expect(keys).toContain('same_issue:q')
    expect(keys).toContain('same_agent:agent_3')
    expect(keys).toContain('environment_concentration:r:abu_dhabi')
    expect(new Set(p.map((x) => x.traceId)).size).toBe(p.length)
  })

  it('caches by scope, rules and day, and recomputes when a rule changes', () => {
    const signals = [...three(), ...many(2, { category: 'wrong_language' })]
    const rules = { ...PATTERN_RULES }
    const a = detectPatternsCached('t-all', signals, rules, NOW)
    expect(detectPatternsCached('t-all', signals, rules, NOW)).toBe(a)
    expect(a.some((p) => p.thresholdKind === 'same_issue')).toBe(false)
    const b = detectPatternsCached('t-all', signals, { ...rules, sameIssueMin: 3 }, NOW)
    expect(b).not.toBe(a)
    expect(b.some((p) => p.thresholdKind === 'same_issue')).toBe(true)
    expect(detectPatternsCached('t-other', signals, rules, NOW)).not.toBe(a)
  })

  it('"What if" counts the patterns with one threshold changed and the current one flagged', () => {
    const signals = [...many(4, { category: 'a', occurredAt: daysAgo(5) }), ...many(6, { category: 'b', occurredAt: daysAgo(40) }), ...many(3, { category: 'c', agentRef: 'ag-1', occurredAt: daysAgo(2) })]
    const out = whatIf(signals, { ...PATTERN_RULES }, { sameIssueMin: [3, 4, 5, 6], sameAgentMin: [2, 3, 4], windowDays: [14, 30, 45, 60] }, NOW)
    // Today (5 same issue, 3 same agent, 30 days): b is outside the window, a has 4, c has 3: only the agent pattern.
    expect(out.total).toBe(1)
    const row = (rule: string) => out.rows.find((r) => r.rule === rule)!
    expect(row('sameIssueMin').cells.map((c) => c.patterns)).toEqual([3, 2, 1, 1]) // each count includes the agent pattern; same issue at 3: a and c; at 4: a; at 5 and 6: none
    expect(row('sameIssueMin').cells.find((c) => c.isCurrent)?.value).toBe(5)
    expect(row('sameAgentMin').cells.map((c) => c.patterns)).toEqual([1, 1, 0])
    expect(row('windowDays').cells.map((c) => c.patterns)).toEqual([1, 1, 2, 2]) // 45 days brings b (6 signals) in
    expect(row('windowDays').current).toBe(30)
  })

  it('the sample patterns equal the pattern detection under the default rules, as the read-time computation does', async () => {
    const mock = await import('@/services/mockData')
    const { rulesFromConfig } = await import('./ruleValues')
    const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
    const now = Date.now()
    const live = detectPatternsCached('t-sample', mock.MOCK_SIGNALS, rules.patterns, now)
    expect(live.map((p) => p.id)).toEqual(mock.MOCK_PATTERNS.map((p) => p.id))
    expect(live.map((p) => p.traceId)).toEqual(mock.MOCK_PATTERNS.map((p) => p.traceId))
  })
})
