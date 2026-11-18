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
  /** Decided 18 Nov: Monday to Friday. JS weekdays that count (0 = Sunday); still a setting. */
  workingDays: 'rule_working_days',
  /** The working day (KB: 09:00 to 18:00): the clock behind "working hours" in the matrix (9 = one working day). */
  workStart: 'rule_work_start',
  workEnd: 'rule_work_end',
  /** Decided 18 Nov: a fix's due date is the matrix "Resolve (h)" from approval; this many calendar days when that cell is empty (Agent 5's 14). */
  fixFallbackDays: 'rule_fix_fallback_days',
  /** Decided 18 Nov: hour of day calls may start, UAE time (09:00). Legal confirmation of the hours is pending (a note, not a [Proposed] badge). */
  callFrom: 'rule_call_from',
  /** Decided 18 Nov: hour of day calls must end (18:00). */
  callTo: 'rule_call_to',
  /** Decided 18 Nov: attempts on the CX team's list before "needs a human" (3). */
  callTries: 'rule_call_tries',
  /** Decided 18 Nov: no-answers before an AI campaign hands over to a person (2). */
  aiNoAnswers: 'rule_ai_no_answers',
} as const

/** The configuration read as plain values: what hooks and utilities pass around. */
export interface RulesBag {
  patterns: PatternRules
  approveDays: number
  verifyDays: number
  publicReplyHours: number
  workingDays: number[]
  /** Working day, hour of day: 9 and 18. */
  workStart: number
  workEnd: number
  /** Calendar days when the matrix "Resolve (h)" cell is empty. */
  fixFallbackDays: number
  callFrom: number
  callTo: number
  callTries: number
  /** No-answers before an AI campaign hands over. */
  aiNoAnswers: number
}

export const DEFAULT_RULES_BAG: RulesBag = {
  patterns: { ...PATTERN_RULES },
  approveDays: 5,
  verifyDays: 60,
  publicReplyHours: 48,
  workingDays: [...MON_FRI],
  workStart: 9,
  workEnd: 18,
  fixFallbackDays: 14,
  callFrom: 9,
  callTo: 18,
  callTries: 3,
  aiNoAnswers: 2,
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
    workStart: num(RULE_IDS.workStart, d.workStart),
    workEnd: num(RULE_IDS.workEnd, d.workEnd),
    fixFallbackDays: num(RULE_IDS.fixFallbackDays, d.fixFallbackDays),
    callFrom: num(RULE_IDS.callFrom, d.callFrom),
    callTo: num(RULE_IDS.callTo, d.callTo),
    callTries: num(RULE_IDS.callTries, d.callTries),
    aiNoAnswers: num(RULE_IDS.aiNoAnswers, d.aiNoAnswers),
  }
}

/** A short string that changes whenever any rule value changes (used in query keys and memo keys). */
export function rulesSignature(bag: RulesBag): string {
  const p = bag.patterns
  return [p.sameIssueMin, p.sameAgentMin, p.environmentConcentrationPct, p.minimumSample, p.windowDays, bag.approveDays, bag.verifyDays, bag.publicReplyHours, bag.workingDays.join(''), bag.workStart, bag.workEnd, bag.fixFallbackDays, bag.callFrom, bag.callTo, bag.callTries, bag.aiNoAnswers].join('.')
}

export function calendarFromRules(bag: RulesBag): WorkCalendar {
  return { days: bag.workingDays, holidays: [], startHour: bag.workStart, endHour: bag.workEnd }
}

/** "09:00" from an hour of day. */
export function hourLabel(hour: number): string {
  return `${String(Math.trunc(hour)).padStart(2, '0')}:00`
}
