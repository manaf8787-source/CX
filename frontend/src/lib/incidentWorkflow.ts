import type { Bi, Incident } from '../types'

/** Reasons the "submit fix" action (step 4 → stops the resolve clock) is
 * blocked — root cause category/explanation/corrective action are always
 * required; a preventive action is required for high-priority cases (the
 * real rule also triggers on 3 repeats in 30 days — Phase 2, needs the
 * historical case volume a backend would provide), and every proposed
 * action must be decided first. */
export function submitFixBlockers(incident: Incident, isHighPriority: boolean): Bi[] {
  const blockers: Bi[] = []
  if (!incident.rootCauseCategory) blockers.push({ en: 'Root cause category is required', ar: 'فئة السبب الجذري مطلوبة' })
  if (!incident.rootCauseExplanation) blockers.push({ en: 'Root cause explanation is required', ar: 'شرح السبب الجذري مطلوب' })
  if (!incident.correctiveAction) blockers.push({ en: 'Corrective action is required', ar: 'الإجراء التصحيحي مطلوب' })
  if (incident.proposedActions.some((a) => a.decision === 'pending')) {
    blockers.push({ en: 'Every proposed action must be confirmed, modified or rejected', ar: 'يجب البت في كل إجراء مقترح: تأكيد أو تعديل أو رفض' })
  }
  const needsPreventive = isHighPriority || incident.preventiveActionRequired
  if (needsPreventive && !incident.preventiveAction) {
    blockers.push({ en: 'A preventive action (or a written reason it is not needed) is required', ar: 'الإجراء الوقائي مطلوب (أو سبب خطي لعدم الحاجة إليه)' })
  }
  return blockers
}

/** Reasons the "verify and close" action (step 6) is blocked. */
export function closeBlockers(incident: Incident, verified: { rootCauseClear: boolean; actionDone: boolean; customerSatisfied: boolean }): Bi[] {
  const blockers: Bi[] = []
  if (incident.status !== 'resolved') blockers.push({ en: 'The fix must be submitted before closing', ar: 'يجب تقديم الإصلاح قبل الإغلاق' })
  if (incident.proposedActions.some((a) => a.decision === 'modified' || a.decision === 'rejected')) {
    if (incident.managerReviewState !== 'approved') blockers.push({ en: 'The CX manager must approve the modified/rejected actions first', ar: 'يجب أن يعتمد مدير تجربة العملاء الإجراءات المعدّلة أو المرفوضة أولاً' })
  }
  if (!verified.rootCauseClear) blockers.push({ en: 'Confirm the root cause is clear', ar: 'تأكيد وضوح السبب الجذري' })
  if (!verified.actionDone) blockers.push({ en: 'Confirm the action was really done', ar: 'تأكيد أن الإجراء تم فعلاً' })
  if (!verified.customerSatisfied) blockers.push({ en: 'Confirm the customer was told and is satisfied', ar: 'تأكيد إبلاغ العميل ورضاه' })
  return blockers
}
