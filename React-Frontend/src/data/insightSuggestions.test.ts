import { describe, expect, it } from 'vitest'
import { DEFAULT_OWNER_BY_KIND, INSIGHT_CATEGORIES, suggestionPercent, suggestionSentence } from './insightSuggestions'
import { isTopManagementTitle } from '@/auth/permissions'
import { MOCK_AI_INSIGHTS } from '@/services/mockData'
import { sortByThresholdCloseness } from '@/utils/patterns'

describe('AI Insights suggested actions (KB §6, prototype SIM)', () => {
  it('covers the six AI Insights categories', () => {
    expect(Object.keys(INSIGHT_CATEGORIES).sort()).toEqual(['app', 'attitude', 'communication', 'knowledge', 'process', 'speed'])
  })

  it('derives "recovered" exactly as the prototype: round(pct × tried / 100)', () => {
    const first = INSIGHT_CATEGORIES.communication.suggestions[0]
    expect(first.tried).toBe(31)
    expect(first.recovered).toBe(24)
    expect(suggestionPercent(first)).toBe(77)
    expect(suggestionSentence(first).en).toBe('Tried in 31 similar closed cases, the customer recovered in 24, 24 of 31 is 77%.')
  })

  it('every suggestion has a figure no larger than its sample', () => {
    for (const c of Object.values(INSIGHT_CATEGORIES)) {
      for (const s of c.suggestions) {
        expect(s.recovered).toBeGreaterThan(0)
        expect(s.recovered).toBeLessThanOrEqual(s.tried)
      }
    }
  })

  it('default receivers are titles, never top management', () => {
    for (const owner of Object.values(DEFAULT_OWNER_BY_KIND)) expect(isTopManagementTitle(owner.en)).toBe(false)
  })

  it('the sample has one insight per category, each with a known category', () => {
    expect(MOCK_AI_INSIGHTS.map((e) => e.payload.category).sort()).toEqual(Object.keys(INSIGHT_CATEGORIES).sort())
  })
})

describe('top management is never the receiver', () => {
  it.each(['Head of Sales', 'Chief Executive Officer', 'CEO', 'General Manager', 'رئيس المبيعات'])('refuses "%s"', (t) => {
    expect(isTopManagementTitle(t)).toBe(true)
  })
  it.each(['Environment manager', 'L&D', 'Process owner', "Agent's direct manager", 'App product owner'])('accepts "%s"', (t) => {
    expect(isTopManagementTitle(t)).toBe(false)
  })
})

describe('Signals pattern order', () => {
  it('puts patterns furthest past their threshold first, thin samples after full ones', () => {
    const p = (id: string, currentValue: number, thresholdTarget: number, hasMinimumSample = true) => ({ id, currentValue, thresholdTarget, hasMinimumSample })
    const sorted = sortByThresholdCloseness([p('a', 3, 5), p('b', 9, 5), p('c', 60, 50), p('d', 9, 5, false), p('e', 1, 3)])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'd', 'c', 'a', 'e'])
  })
})
