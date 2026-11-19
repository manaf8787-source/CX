import { describe, expect, it } from 'vitest'
import type { Pattern } from '@/types'
import { briefSaw, countSaw, fixSaw, journeySaw, signalSaw, signalSeverity, signalSummary } from './sampleEvidence'

const pattern = (over: Partial<Pattern> = {}): Pattern =>
  ({
    id: 'same_issue:slow_response',
    key: 'same_issue:slow_response',
    traceId: 'PT-101',
    signalIds: ['sig-1', 'sig-2', 'sig-3', 'sig-4', 'sig-5', 'sig-6'],
    team: 'Real Estate',
    category: 'slow_response',
    windowDays: 30,
    sampleSize: 14,
    aiSuggestion: { en: 'x', ar: 'س' },
    recoveryFigure: { en: 'Tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%.', ar: 'جُرّب في 14 حالة.' },
    thresholdKind: 'same_issue',
    thresholdTarget: 5,
    currentValue: 6,
    hasMinimumSample: true,
    ...over,
  }) as Pattern

describe('what the agent saw (v41.1 F29)', () => {
  it('Agent 2: the source, the date and the signal text, with no customer text or name', () => {
    const saw = signalSaw({ kind: 'complaint', category: 'promise_not_kept', occurredAt: '2026-10-21T09:30:00Z' }, [{ channel: 'call' }])
    expect(saw.en).toBe('Call · 2026-10-21 · "A promised callback did not happen"')
    expect(saw.ar).toMatch(/^اتصال · 2026-10-21 · ".+"$/)
  })

  it('a public mention has no event, so its source is the public mention itself', () => {
    const saw = signalSaw({ kind: 'public_mention', category: 'slow_response', occurredAt: '2026-10-22T08:00:00Z' }, [])
    expect(saw.en.startsWith('Public mention · 2026-10-22')).toBe(true)
  })

  it('an unknown category falls back to its label, not to a blank', () => {
    expect(signalSummary('something_new').en).toBe('Something new')
  })

  it('severity [Proposed]: legal, privacy or safety is critical; a breach or two different problems is medium; the rest is low', () => {
    expect(signalSeverity({ kind: 'legal_privacy_safety' }, [])).toBe('critical')
    expect(signalSeverity({ kind: 'breach' }, [])).toBe('medium')
    expect(signalSeverity({ kind: 'complaint' }, [{ problemFlags: ['slow_reply'] }, { problemFlags: ['promise_not_kept'] }])).toBe('medium')
    expect(signalSeverity({ kind: 'complaint' }, [{ problemFlags: ['slow_reply'] }, { problemFlags: ['slow_reply'] }])).toBe('low')
    expect(signalSeverity({ kind: 'public_mention' }, [])).toBe('low')
  })

  it('Agent 5: the pattern, the signal count and the recovery figure', () => {
    const saw = fixSaw({}, pattern())
    expect(saw.en).toBe('Same issue: Slow response · 6 signals in 30 days · Tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%.')
    expect(saw.ar).toContain('6 إشارة خلال 30 يوماً')
  })

  it('a same-agent pattern never names the agent; a concentration pattern gives the share', () => {
    expect(fixSaw({}, pattern({ thresholdKind: 'same_agent', agentRef: 'agent-7' })).en.startsWith('Same agent · ')).toBe(true)
    expect(fixSaw({}, pattern({ thresholdKind: 'same_agent', agentRef: 'agent-7' })).en).not.toContain('agent-7')
    expect(fixSaw({}, pattern({ thresholdKind: 'environment_concentration', currentValue: 62 })).en.startsWith('62% in one environment: Slow response')).toBe(true)
  })

  it('a fix with no pattern says where it came from', () => {
    expect(fixSaw({ fromInsight: { subjectId: 's', suggestionId: 'x', recovery: { en: 'Tried in 31, recovered in 24.', ar: 'جُرّب في 31.' } } }, undefined).en).toBe('AI Insights suggestion · Tried in 31, recovered in 24.')
    expect(fixSaw({ source: { investigationId: 'inv-3' } }, undefined).en).toBe('Returned investigation INV-3')
    expect(fixSaw({}, undefined).en).toBe('No pattern: proposed from the form')
  })

  it('Agent 3: the signals, the window and the sample', () => {
    expect(countSaw(pattern()).en).toBe('6 signals in 30 days · sample 14')
  })

  it('Agent 8: the first score, the events on the timeline and the problems found', () => {
    const events = [{ problemFlags: ['slow_reply' as const] }, { problemFlags: [] }, { problemFlags: ['detractor' as const] }]
    expect(briefSaw({ instrument: 'csat', firstScore: 2 }, events).en).toBe('CSAT 2 · 3 events on the timeline · 2 problems found')
    expect(briefSaw({ firstScore: 4 }, []).en).toBe('NPS 4 · 0 events on the timeline · 0 problems found')
  })

  it('Agent 7: events, problems and the last contact date, whatever the order of the events', () => {
    const events = [
      { problemFlags: [], occurredAt: '2026-09-03T10:00:00Z' },
      { problemFlags: ['slow_reply' as const], occurredAt: '2026-10-12T10:00:00Z' },
      { problemFlags: [], occurredAt: '2026-08-01T10:00:00Z' },
    ]
    expect(journeySaw(events).en).toBe('3 events · 1 problem · last contact 2026-10-12')
    expect(journeySaw([]).en).toBe('0 events · 0 problems · last contact –')
  })
})
