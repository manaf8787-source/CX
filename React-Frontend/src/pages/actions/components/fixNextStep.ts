import { actionsNext, fixNext, REJECTED_FIX_NEXT } from '@/data/steps'
import type { Bi, CorrectiveAction, NextStep } from '@/types'

/** Short calendar date for a due phrase. */
function dateLabel(iso: string, lang: 'en' | 'ar'): string {
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The "where you are, what happens next" step for one fix (v40 F07, S2): step `ca` while it is proposed, approved or in progress,
 * step `vr` from the check on. Text and due phrase are the prototype's, with the date added after the due phrase once there is one
 * ("by the due date, 24 Nov 2026"; "at 60 days, 12 Jan 2027"). A fix sent to investigation first reads the Investigations sentence;
 * a rejected fix reads "Closed with a reason; nothing further" on step `ca`. A partial fix reads "The owner proposes a second step; the CX
 * manager approves it as a new fix on the same pattern, within 5 working days" (v40.1).
 */
export function fixNextStep(
  fix: Pick<CorrectiveAction, 'status' | 'decision' | 'sentToInvestigation' | 'dueDate' | 'verificationDueAt'>,
  rules: { approveDays: number; verifyDays: number },
): NextStep {
  if (fix.status === 'proposed' && fix.sentToInvestigation) return { ...actionsNext('investigations'), step: 'ca' }
  if (fix.status === 'proposed' && fix.decision === 'rejected') return REJECTED_FIX_NEXT
  const base = fixNext(fix.status, rules)
  const withDate = (due: Bi | undefined, iso: string): Bi | undefined =>
    due ? { en: `${due.en}, ${dateLabel(iso, 'en')}`, ar: `${due.ar}، ${dateLabel(iso, 'ar')}` } : due
  if (fix.status === 'approved' || fix.status === 'in_progress') return { ...base, due: withDate(base.due, fix.dueDate) }
  if (fix.status === 'verification') return { ...base, due: withDate(base.due, fix.verificationDueAt) }
  return base
}

/**
 * True when the AI made the fix: proposed by Agent 5, from an AI Insights suggestion, or the first audit line is the system's.
 * A second step (v40.1) is a person's decision (`proposedBy` names the CX role), so it never carries the Agent 5 chip.
 */
export function isAiMadeFix(fix: Pick<CorrectiveAction, 'proposedBy' | 'fromInsight' | 'auditLog' | 'parentFixId'>): boolean {
  if (fix.parentFixId) return false
  return !!fix.proposedBy || !!fix.fromInsight || fix.auditLog[0]?.byRole === 'system'
}
