import type { AuditEntry, Bi, CorrectiveAction, CorrectiveActionStatus, Investigation, RoleId } from '../types'
import { auditEntry, proposedStamp } from './audit'
import { caId, invId } from './trace'

/**
 * v40.1: closing the 60-day check (prototype block "v40.1 · partial verdict, second step, investigate from a fix, 60-day wording").
 * A person in CX records the verdict (effective, partial, failed); after a partial or failed one, decision 3: ask the owner for a
 * second step (a new fix on the same pattern), investigate first (five interviews), or accept the result as it is.
 * Everything here is pure: the mutations that write the sample store are in `services/fixVerdictQueries.ts`.
 */

export type VerdictOutcome = 'partial' | 'failed'

/** The statuses that ask for decision 3. */
export function isOpenVerdict(status: CorrectiveActionStatus): status is VerdictOutcome {
  return status === 'partial' || status === 'failed'
}

/** Strings of the verdict buttons, the decision bar and the audit lines. Prototype strings are verbatim; the rest is [Proposed] and marked. */
export const VERDICT_COPY = {
  // The three verdict buttons (prototype: the older caDetail for effective and failed, the v40.1 block for partial).
  buttons: {
    effective: { en: 'Signals dropped: effective', ar: 'انخفضت الإشارات: فعّال' } as Bi,
    partial: { en: 'Dropped under half: partial', ar: 'انخفضت أقل من النصف: جزئي' } as Bi,
    failed: { en: 'No drop: back to root cause', ar: 'لم تنخفض: العودة للسبب الجذري' } as Bi,
  },
  /** [Proposed] The line above the three buttons: the readout is evidence, a person decides. */
  recordTitle: { en: 'Record the verdict', ar: 'سجّل الحكم' } as Bi,
  recordHint: { en: 'You decide; the automatic readout is only the evidence.', ar: 'القرار لك؛ القراءة التلقائية دليل فقط.' } as Bi,
  /** [Proposed] Toasts after a verdict. */
  verdictToast: {
    effective: { en: 'Verdict recorded: effective', ar: 'سُجّل الحكم: فعّال' } as Bi,
    partial: { en: 'Verdict recorded: partial. Decide the second step.', ar: 'سُجّل الحكم: جزئي. قرّر الخطوة الثانية.' } as Bi,
    failed: { en: 'Verdict recorded: failed. The signal reopens for a person.', ar: 'سُجّل الحكم: فاشل. تُفتح الإشارة من جديد لشخص.' } as Bi,
  },
  // The bar after a partial or failed verdict (prototype, verbatim).
  barTitle: {
    partial: { en: 'Partial: the signals dropped by less than half.', ar: 'جزئي: انخفضت الإشارات أقل من النصف.' } as Bi,
    failed: { en: 'Failed: the signals did not drop, or came back.', ar: 'فشل: لم تنخفض الإشارات أو عادت.' } as Bi,
  },
  barText: { en: 'Decision 3: ask the owner for a second step, or investigate first if the cause is unclear.', ar: 'القرار 3: اطلب من المالك خطوة ثانية، أو حقّق أولاً إن كان السبب غير واضح.' } as Bi,
  second: { en: 'Ask for a second step', ar: 'اطلب خطوة ثانية' } as Bi,
  investigate: { en: 'Investigate first (5 interviews)', ar: 'حقّق أولاً (5 مقابلات)' } as Bi,
  accept: { en: 'Accept as is', ar: 'اقبله كما هو' } as Bi,
  /** [Proposed] The reason "Ask for a second step" is off: one is already open. */
  secondOpen: { en: 'A second step is already open on this fix.', ar: 'توجد خطوة ثانية مفتوحة على هذا الحل.' } as Bi,
  /** [Proposed] When a save fails (the sample store never does; a real API might). */
  saveFailed: { en: 'Could not save. Try again.', ar: 'تعذّر الحفظ. حاول مرة أخرى.' } as Bi,
  /** [Proposed] Link lines. */
  secondStepList: { en: 'Second step', ar: 'الخطوة الثانية' } as Bi,
  secondStepAfter: { en: 'Second step after', ar: 'خطوة ثانية بعد' } as Bi,
}

/** The outcome word in a sentence: "after a partial result". [Proposed] for failed (the prototype writes "partial" for both). */
const OUTCOME_WORD: Record<VerdictOutcome, Bi> = {
  partial: { en: 'partial', ar: 'جزئية' },
  failed: { en: 'failed', ar: 'فاشلة' },
}

/** Toast after "Ask for a second step" (prototype). */
export function secondStepToast(fixId: string): Bi {
  const ca = caId(fixId)
  return { en: `${ca} proposed on the same pattern; the owner has 5 working days.`, ar: `${ca} مقترح على النمط نفسه؛ أمام المالك 5 أيام عمل.` }
}

/** [Proposed] Toast after "Investigate first": the prototype names the tab "Investigate"; here it is "Investigations". */
export function investigateToast(): Bi {
  return { en: 'Investigation opened under Signals and fixes → Investigations.', ar: 'فُتح تحقيق تحت الإشارات والحلول ← التحقيقات.' }
}

/** [Proposed] Toast after "Accept as is". */
export function acceptToast(): Bi {
  return { en: 'Accepted as is; the fix is marked effective.', ar: 'قُبل كما هو؛ عُلّم الحل فعّالاً.' }
}

/** Audit line on the parent (prototype: "Second step requested: CA-2yy"). */
export function secondStepRequestedAudit(childId: string, byRole: RoleId | 'system', at?: string): AuditEntry {
  const ca = caId(childId)
  return auditEntry(byRole, { en: `Second step requested: ${ca}`, ar: `طُلبت خطوة ثانية: ${ca}` }, at)
}

/** Audit line on the investigation request (prototype: "Investigation requested: 5 interviews"; the INV id is added). */
export function investigationRequestedAudit(investigationId: string, byRole: RoleId | 'system', at?: string): AuditEntry {
  const inv = invId(investigationId)
  return auditEntry(byRole, { en: `Investigation requested: 5 interviews (${inv})`, ar: `طُلب تحقيق: 5 مقابلات (${inv})` }, at)
}

/** [Proposed] Audit line on "Accept as is": the check says partial or failed and a person accepts it. */
export function acceptedAsIsAudit(outcome: VerdictOutcome, byRole: RoleId | 'system', at?: string): AuditEntry {
  const word = OUTCOME_WORD[outcome]
  return auditEntry(byRole, { en: `Accepted as is after a ${word.en} result`, ar: `قُبل كما هو بعد نتيجة ${word.ar}` }, at)
}

/** The next number in the sample's own numbering: `ca-4` is the last, so `ca-5` (displayed `CA-205`). Robust to gaps, never reuses an id. */
export function nextNumberedId(prefix: 'ca' | 'inv', existing: readonly { id: string }[]): string {
  let max = 0
  for (const { id } of existing) {
    const n = Number(id.match(/(\d+)\s*$/)?.[1])
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}-${max + 1}`
}

/** The second steps requested on a fix, oldest first. */
export function secondStepsOf(fixes: readonly CorrectiveAction[], parentId: string): CorrectiveAction[] {
  return fixes.filter((f) => f.parentFixId === parentId)
}

/** A second step is "open" until it is rejected: while one is, a second request would only duplicate it. */
export function hasOpenSecondStep(fixes: readonly CorrectiveAction[], parentId: string): boolean {
  return secondStepsOf(fixes, parentId).some((f) => !(f.status === 'proposed' && f.decision === 'rejected'))
}

/** "CX manager, after a partial result" (prototype `by`), the CX role's own title, and the real outcome. */
function secondStepProposedBy(role: RoleId | 'system', outcome: VerdictOutcome): Bi {
  const who: Bi = role === 'cxteam' ? { en: 'CX team', ar: 'فريق تجربة العملاء' } : { en: 'CX manager', ar: 'مدير تجربة العملاء' }
  const word = OUTCOME_WORD[outcome]
  return { en: `${who.en}, after a ${word.en} result`, ar: `${who.ar}، بعد نتيجة ${word.ar}` }
}

/**
 * The second step (prototype `V27ACT.caSecond`): a NEW fix on the same pattern, status proposed, same kind, owner and product, proposed
 * now by the CX role, titled "Second step on CA-2xx: <title>" in both languages, with a parent link. Its 5-working-day approval window
 * starts with `proposedAt` (decision 3). `dueDate` is what approval today would give (the caller reads the matrix, as for any new fix);
 * the 60-day check date is the usual placeholder until it is done. No `source`, no `fromInsight`: it is not the AI's suggestion.
 */
export function buildSecondStep(
  parent: CorrectiveAction,
  { id, dueDate, byRole, at = new Date().toISOString() }: { id: string; dueDate: string; byRole: RoleId | 'system'; at?: string },
): CorrectiveAction {
  if (!isOpenVerdict(parent.status)) throw new Error('A second step follows a partial or failed check')
  const outcome = parent.status
  const ca = caId(parent.id)
  return {
    id,
    kind: parent.kind,
    ...(parent.patternId ? { patternId: parent.patternId } : {}),
    title: { en: `Second step on ${ca}: ${parent.title.en}`, ar: `خطوة ثانية على ${ca}: ${parent.title.ar}` },
    owner: parent.owner,
    dueDate,
    status: 'proposed',
    verificationDueAt: new Date(Date.parse(at) + 60 * 86_400_000).toISOString(),
    proposedBy: secondStepProposedBy(byRole, outcome),
    ...(parent.patternId || !parent.envId ? {} : { envId: parent.envId }),
    parentFixId: parent.id,
    parentOutcome: outcome,
    ...proposedStamp({
      product: parent.product,
      byRole,
      note: { en: `Second step requested after ${ca}`, ar: `طُلبت خطوة ثانية بعد ${ca}` },
      at,
    }),
  }
}

/**
 * The investigation opened from a fix (prototype `V27ACT.caInv`): interviews, five of them, running, with the note "Requested from
 * CA-2xx after a partial result." It hangs on the fix's pattern (the prototype's "first signal"); a fix with no pattern cannot open one.
 */
export function buildInvestigationFromFix(fix: CorrectiveAction, { id, environment }: { id: string; environment?: string }): Investigation {
  if (!isOpenVerdict(fix.status)) throw new Error('An investigation from a fix follows a partial or failed check')
  if (!fix.patternId) throw new Error('This fix has no pattern to investigate')
  const ca = caId(fix.id)
  const word = OUTCOME_WORD[fix.status]
  return {
    id,
    patternId: fix.patternId,
    kind: 'customer_interviews',
    requestedCount: 5,
    doneCount: 0,
    environment,
    status: 'in_progress',
    note: { en: `Requested from ${ca} after a ${word.en} result.`, ar: `طُلب من ${ca} بعد نتيجة ${word.ar}.` },
  }
}
