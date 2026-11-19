import { mock } from './mockStore'
import { MATRIX_KEY_BY_FIX_KIND, VIP_FACTOR } from '../data/escalationDefaults'
import { fixDue, verificationDue } from '../utils/fixClock'
import { detectPatternsCached } from '../utils/patterns'
import { rulesFromConfig } from '../utils/ruleValues'
import { dueHours, patternHasVip } from '../utils/vipClock'
import type { CorrectiveAction, FixDue, MatrixRow } from '../types'

type FixRef = Pick<CorrectiveAction, 'product' | 'kind'> & Partial<Pick<CorrectiveAction, 'patternId'>>

/** The matrix rows of a fix's product. */
function rowsOf(fix: Pick<CorrectiveAction, 'product'>): MatrixRow[] {
  return mock.MOCK_MATRIX[fix.product] ?? []
}

/**
 * True when the fix's pattern includes a person tagged VIP in the CRM (v42 F30: its clocks are halved). A fix with no pattern is not.
 * The pattern is read as the Patterns page reads it (recomputed from the rules), falling back to the seeded one.
 */
export function isVipFix(fix: Partial<Pick<CorrectiveAction, 'patternId'>>): boolean {
  if (!fix.patternId) return false
  const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
  const pattern = detectPatternsCached('all', mock.MOCK_SIGNALS, rules.patterns).find((p) => p.id === fix.patternId) ?? mock.MOCK_PATTERNS.find((p) => p.id === fix.patternId)
  return patternHasVip(pattern, mock.MOCK_SIGNALS, mock.MOCK_PERSONS)
}

/**
 * The working hours a fix's due date counts from approval: the matrix "Resolve (h)" for its product and kind, halved when the fix is
 * VIP-related (its pattern is known: `patternId`). Null when the cell is empty (the employee row by design, or a cell someone emptied).
 */
export function resolveHoursFor(fix: FixRef): number | null {
  const row = rowsOf(fix).find((r) => r.kind === MATRIX_KEY_BY_FIX_KIND[fix.kind])
  if (!row || row.kind === 'vip') return null
  const rule = rowsOf(fix).find((r) => r.kind === 'vip')
  const factor = rule && rule.kind === 'vip' ? rule.rule.factor : VIP_FACTOR
  return dueHours(row.cells.resolveH, { factor }, isVipFix(fix))
}

/**
 * What approval at `from` would give for a fix of this product and kind: the matrix "Resolve (h)" in working hours (halved for a
 * VIP-related fix), or Agent 5's 14 days when the cell is empty. A new fix is stamped with this date when it is proposed (approval
 * overwrites it).
 */
export function dueFromMatrix(fix: FixRef, from: Date = new Date()): FixDue {
  return fixDue(from, resolveHoursFor(fix), rulesFromConfig(mock.MOCK_RULES_CONFIG))
}

/**
 * Approval starts the due-date clock (decided 18 Nov): the matrix "Resolve (h)" in working hours from approval (halved for a
 * VIP-related fix, v42), Agent 5's 14 days when the cell is empty. Writes `dueDate` and `dueSource` on the fix (the mock store).
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
