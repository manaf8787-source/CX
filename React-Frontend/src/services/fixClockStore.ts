import { mock } from './mockStore'
import { MATRIX_KEY_BY_FIX_KIND } from '../data/escalationDefaults'
import { fixDue, verificationDue } from '../utils/fixClock'
import { rulesFromConfig } from '../utils/ruleValues'
import type { CorrectiveAction } from '../types'

/** The matrix "Resolve (h)" for a fix's product and kind; null when the cell is empty. */
export function resolveHoursFor(fix: Pick<CorrectiveAction, 'product' | 'kind'>): number | null {
  const row = mock.MOCK_MATRIX[fix.product]?.find((r) => r.kind === MATRIX_KEY_BY_FIX_KIND[fix.kind])
  return row?.cells.resolveH ?? null
}

/**
 * Approval starts the due-date clock (decided 18 Nov): the matrix "Resolve (h)" in working hours from approval, Agent 5's
 * 14 days when the cell is empty. Writes `dueDate` and `dueSource` on the fix (the mock store).
 */
export function applyApprovalClock(fix: CorrectiveAction, approvedAt: Date = new Date()): void {
  const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
  const due = fixDue(approvedAt, resolveHoursFor(fix), rules)
  fix.dueDate = due.dueAt
  fix.dueSource = due.source
}

/** Marking a fix done starts the 60-day check (decided 18 Nov: from "done", not from approval). */
export function applyDoneClock(fix: CorrectiveAction, doneAt: Date = new Date()): void {
  fix.verificationDueAt = verificationDue(doneAt, rulesFromConfig(mock.MOCK_RULES_CONFIG)).toISOString()
}
