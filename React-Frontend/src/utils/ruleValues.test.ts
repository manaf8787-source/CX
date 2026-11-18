import { describe, expect, it } from 'vitest'
import type { RuleConfigItem } from '@/types'
import { MOCK_RULES_CONFIG } from '@/services/mockData'
import { DEFAULT_RULES_BAG, RULE_IDS, calendarFromRules, hourLabel, rulesFromConfig, rulesSignature } from './ruleValues'
import { PATTERN_RULES } from './patterns'

describe('rules read as values', () => {
  it('the seeded configuration carries every key the code reads, with the documented defaults', () => {
    for (const id of Object.values(RULE_IDS)) expect(MOCK_RULES_CONFIG.some((r) => r.id === id), id).toBe(true)
    expect(rulesFromConfig(MOCK_RULES_CONFIG)).toEqual(DEFAULT_RULES_BAG)
    expect(DEFAULT_RULES_BAG.patterns).toEqual({ ...PATTERN_RULES })
  })

  it('the v40 keys (working week, calling hours, tries) are configuration items marked [Proposed]', () => {
    for (const id of [RULE_IDS.workingDays, RULE_IDS.callFrom, RULE_IDS.callTo, RULE_IDS.callTries]) {
      expect(MOCK_RULES_CONFIG.find((r) => r.id === id)?.proposed, id).toBe(true)
    }
    const week = MOCK_RULES_CONFIG.find((r) => r.id === RULE_IDS.workingDays)!
    expect(week.days).toEqual([1, 2, 3, 4, 5])
    expect(week.value).toBe(week.days!.length)
  })

  it('follows an edit and falls back to defaults for a missing item', () => {
    const edited: RuleConfigItem[] = MOCK_RULES_CONFIG.map((r) => (r.id === RULE_IDS.sameIssue ? { ...r, value: 3 } : r.id === RULE_IDS.workingDays ? { ...r, days: [0, 1, 2, 3, 4], value: 5 } : r))
    const bag = rulesFromConfig(edited)
    expect(bag.patterns.sameIssueMin).toBe(3)
    expect(bag.workingDays).toEqual([0, 1, 2, 3, 4])
    expect(rulesFromConfig([])).toEqual(DEFAULT_RULES_BAG)
  })

  it('has a signature that changes with any rule', () => {
    const base = rulesSignature(DEFAULT_RULES_BAG)
    expect(rulesSignature({ ...DEFAULT_RULES_BAG, callTries: 4 })).not.toBe(base)
    expect(rulesSignature({ ...DEFAULT_RULES_BAG, patterns: { ...DEFAULT_RULES_BAG.patterns, windowDays: 45 } })).not.toBe(base)
    expect(rulesSignature({ ...DEFAULT_RULES_BAG })).toBe(base)
  })

  it('builds the calendar and the hour label', () => {
    expect(calendarFromRules(DEFAULT_RULES_BAG).days).toEqual([1, 2, 3, 4, 5])
    expect(hourLabel(9)).toBe('09:00')
    expect(hourLabel(18)).toBe('18:00')
  })
})
