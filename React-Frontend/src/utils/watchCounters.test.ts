import { describe, expect, it } from 'vitest'
import { WATCH_EVENTS_BEYOND_SAMPLE, WATCH_HANDED_TO_PERSON, WATCH_SENT_BACK_BY_SUPERVISOR, watchCounters } from './watchCounters'

describe('"This week, by the same team" counters (v42 F31)', () => {
  const input = {
    interactions: 120,
    signals: 41,
    patterns: 6,
    fixes: [{ status: 'proposed' as const }, { status: 'proposed' as const }, { status: 'approved' as const }, { status: 'in_progress' as const }, { status: 'effective' as const }],
    briefs: 9,
  }

  it('returns the eight counters in the prototype order', () => {
    expect(watchCounters(input).map((c) => c.id)).toEqual(['events', 'signals', 'patterns', 'fixes', 'waiting', 'sentBack', 'handedOver', 'briefs'])
  })

  it('computes events as interactions plus 16, and counts signals, patterns, fixes and briefs from the data', () => {
    const byId = Object.fromEntries(watchCounters(input).map((c) => [c.id, c.value]))
    expect(byId.events).toBe(136)
    expect(byId.signals).toBe(41)
    expect(byId.patterns).toBe(6)
    expect(byId.fixes).toBe(5)
    expect(byId.briefs).toBe(9)
  })

  it('waiting for a yes is the fixes with status proposed', () => {
    expect(watchCounters(input).find((c) => c.id === 'waiting')?.value).toBe(2)
    expect(watchCounters({ ...input, fixes: [] }).find((c) => c.id === 'waiting')?.value).toBe(0)
  })

  it('keeps the two prototype constants: 3 sent back by the supervisor, 2 handed to a person', () => {
    expect(WATCH_SENT_BACK_BY_SUPERVISOR).toBe(3)
    expect(WATCH_HANDED_TO_PERSON).toBe(2)
    expect(WATCH_EVENTS_BEYOND_SAMPLE).toBe(16)
    const byId = Object.fromEntries(watchCounters({ ...input, fixes: [] }).map((c) => [c.id, c.value]))
    expect(byId.sentBack).toBe(3)
    expect(byId.handedOver).toBe(2)
  })

  it('an empty environment still reports the constants and zeros, never NaN', () => {
    const values = watchCounters({ interactions: 0, signals: 0, patterns: 0, fixes: [], briefs: 0 }).map((c) => c.value)
    expect(values).toEqual([16, 0, 0, 0, 0, 3, 2, 0])
  })
})
