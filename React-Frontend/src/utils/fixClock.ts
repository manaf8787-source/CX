import type { FixDue } from '../types'
import { calendarFromRules, type RulesBag } from './ruleValues'
import { addWorkingDays, addWorkingHours, workingDaysBetween } from './workingDays'

/**
 * The three clocks of a fix (decided 18 Nov, Programme KB section 41 "Decisions confirmed on 18 November"):
 *
 * 1. Approval: the manager approves, changes, rejects or asks for an investigation within 5 working days of the
 *    proposal (`approveDays`).
 * 2. Due date: from approval, the matrix "Resolve (h)" for the fix's product and kind, counted in WORKING hours
 *    (09:00 to 18:00, Monday to Friday, so 9 = one working day, 45 = five). An empty cell falls back to
 *    Agent 5's 14 days (`fixFallbackDays`, calendar days).
 * 3. Verification: the 60-day check (`verifyDays`) runs from "done", not from approval.
 *
 * Seeded sample fixes keep their sample due dates; the clock applies from the next approval.
 */

const DAY_MS = 86_400_000

/** The due date of a fix approved at `approvedAt`: matrix hours in working time, or the fallback days when the cell is empty. */
export function fixDue(approvedAt: Date | string | number, resolveH: number | null | undefined, rules: RulesBag): FixDue {
  if (resolveH == null || !(resolveH > 0)) {
    const at = new Date(new Date(approvedAt).getTime() + rules.fixFallbackDays * DAY_MS)
    return { dueAt: at.toISOString(), source: 'fallback' }
  }
  return { dueAt: addWorkingHours(approvedAt, resolveH, calendarFromRules(rules)).toISOString(), source: 'matrix', hours: resolveH }
}

/** The last day to decide on a proposed fix: the proposal plus the approval window in working days. */
export function approvalDeadline(proposedAt: Date | string | number, rules: RulesBag): Date {
  return addWorkingDays(proposedAt, rules.approveDays, calendarFromRules(rules))
}

/** Working days left in the approval window (negative = late); the inbox counter. */
export function approvalDaysLeft(proposedAt: Date | string | number, today: Date | string | number, rules: RulesBag): number {
  return rules.approveDays - workingDaysBetween(proposedAt, today, calendarFromRules(rules))
}

/** When the 60-day check runs: `verifyDays` calendar days after the fix was marked done. */
export function verificationDue(doneAt: Date | string | number, rules: RulesBag): Date {
  return new Date(new Date(doneAt).getTime() + rules.verifyDays * DAY_MS)
}
