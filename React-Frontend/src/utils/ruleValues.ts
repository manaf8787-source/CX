import type { RuleConfigItem } from '../types'
import { PATTERN_RULES, type PatternRules } from './patterns'
import { MON_FRI, type WorkCalendar } from './workingDays'

/** Ids of the rules the foundation reads. The Rules page lists every item in `MOCK_RULES_CONFIG`; this maps the ones code depends on. */
export const RULE_IDS = {
  sameAgent: 'rule_pattern_same_agent',
  sameIssue: 'rule_pattern_same_issue',
  envConcentration: 'rule_pattern_env_concentration',
  window: 'rule_pattern_window',
  minSample: 'rule_pattern_min_sample',
  verifyDays: 'rule_verification_days',
  approveDays: 'rule_approval_days',
  publicReply: 'rule_public_reply',
  /** v40, [Proposed]: JS weekdays that count (0 = Sunday); default Monday to Friday (KB), the prototype counts Friday and Saturday off. */
  workingDays: 'rule_working_days',
  /** v40, [Proposed]: hour of day (0 to 23) calls may start; prototype 09:00, the KB's After-Sales placeholder says 09:00. */
  callFrom: 'rule_call_from',
  /** v40, [Proposed]: hour of day calls must end; prototype 18:00, the KB's placeholder says 20:00 (open question 43.9). */
  callTo: 'rule_call_to',
  /** v40, [Proposed]: attempts before "needs a human"; prototype 3, Legal to confirm. */
  callTries: 'rule_call_tries',
} as const

/** The configuration read as plain values: what hooks and utilities pass around. */
export interface RulesBag {
  patterns: PatternRules
  approveDays: number
  verifyDays: number
  publicReplyHours: number
  workingDays: number[]
  callFrom: number
  callTo: number
  callTries: number
}

export const DEFAULT_RULES_BAG: RulesBag = {
  patterns: { ...PATTERN_RULES },
  approveDays: 5,
  verifyDays: 60,
  publicReplyHours: 48,
  workingDays: [...MON_FRI],
  callFrom: 9,
  callTo: 18,
  callTries: 3,
}

/** Reads the rules configuration into a `RulesBag`; missing items fall back to the documented defaults. */
export function rulesFromConfig(items: readonly RuleConfigItem[]): RulesBag {
  const by = new Map(items.map((i) => [i.id, i]))
  const num = (id: string, fallback: number) => by.get(id)?.value ?? fallback
  const d = DEFAULT_RULES_BAG
  const days = by.get(RULE_IDS.workingDays)?.days
  return {
    patterns: {
      sameAgentMin: num(RULE_IDS.sameAgent, d.patterns.sameAgentMin),
      sameIssueMin: num(RULE_IDS.sameIssue, d.patterns.sameIssueMin),
      environmentConcentrationPct: num(RULE_IDS.envConcentration, d.patterns.environmentConcentrationPct),
      windowDays: num(RULE_IDS.window, d.patterns.windowDays),
      minimumSample: num(RULE_IDS.minSample, d.patterns.minimumSample),
    },
    approveDays: num(RULE_IDS.approveDays, d.approveDays),
    verifyDays: num(RULE_IDS.verifyDays, d.verifyDays),
    publicReplyHours: num(RULE_IDS.publicReply, d.publicReplyHours),
    workingDays: days && days.length ? [...days] : [...d.workingDays],
    callFrom: num(RULE_IDS.callFrom, d.callFrom),
    callTo: num(RULE_IDS.callTo, d.callTo),
    callTries: num(RULE_IDS.callTries, d.callTries),
  }
}

/** A short string that changes whenever any rule value changes (used in query keys and memo keys). */
export function rulesSignature(bag: RulesBag): string {
  const p = bag.patterns
  return [p.sameIssueMin, p.sameAgentMin, p.environmentConcentrationPct, p.minimumSample, p.windowDays, bag.approveDays, bag.verifyDays, bag.publicReplyHours, bag.workingDays.join(''), bag.callFrom, bag.callTo, bag.callTries].join('.')
}

export function calendarFromRules(bag: RulesBag): WorkCalendar {
  return { days: bag.workingDays, holidays: [] }
}

/** "09:00" from an hour of day. */
export function hourLabel(hour: number): string {
  return `${String(Math.trunc(hour)).padStart(2, '0')}:00`
}
