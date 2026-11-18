import type { AuditEntry, Bi, CorrectiveActionStatus, Pattern, ProductId, RoleId, Signal } from '../types'

/**
 * Audit trail of a fix (v40 F21): every change, when, what, by which role. Nothing is deleted.
 * Entries are stored oldest first; the card shows newest first. `byRole` is a role title, never a person.
 */

/** Audit trail card copy (v40 S8). */
export const AUDIT_COPY = {
  title: { en: 'Audit trail', ar: 'سجل التدقيق' } as Bi,
  hint: { en: 'Every change on this fix: when, what, by which role. Nothing is deleted.', ar: 'كل تغيير على هذا الحل: متى، ماذا، وبأي دور. لا يُحذف شيء.' } as Bi,
  columns: { when: { en: 'When', ar: 'متى' } as Bi, what: { en: 'What', ar: 'ماذا' } as Bi, by: { en: 'By', ar: 'بواسطة' } as Bi },
  empty: { en: 'No change yet.', ar: 'لا تغيير بعد.' } as Bi,
  system: { en: 'System', ar: 'النظام' } as Bi,
}

export function auditEntry(byRole: RoleId | 'system', what: Bi, at: string = new Date().toISOString()): AuditEntry {
  return { at, what, byRole }
}

/** Newest first, as the card shows it. Does not mutate. */
export function newestFirst(log: readonly AuditEntry[]): AuditEntry[] {
  return [...log].sort((a, b) => b.at.localeCompare(a.at))
}

/** The audit line written when a fix changes status. */
export function statusAudit(status: CorrectiveActionStatus, byRole: RoleId | 'system', at?: string): AuditEntry {
  const label: Record<CorrectiveActionStatus, Bi> = {
    proposed: { en: 'Status set to Proposed', ar: 'الحالة: مقترح' },
    approved: { en: 'Status set to Approved', ar: 'الحالة: معتمد' },
    in_progress: { en: 'Status set to In progress', ar: 'الحالة: قيد التنفيذ' },
    verification: { en: 'Marked done; the 60-day check is scheduled', ar: 'عُلّم منجزاً؛ جُدول فحص الـ60 يوماً' },
    effective: { en: 'Verdict: effective', ar: 'الحكم: فعّال' },
    partial: { en: 'Verdict: partial', ar: 'الحكم: جزئي' },
    failed: { en: 'Verdict: failed', ar: 'الحكم: فاشل' },
  }
  return auditEntry(byRole, label[status], at)
}

/** The audit line written when a manager decides on a proposed fix. */
export function decisionAudit(decision: 'approved' | 'modified' | 'rejected', reason: string | undefined, byRole: RoleId | 'system', at?: string): AuditEntry {
  const what: Record<typeof decision, Bi> = {
    approved: { en: 'Approved', ar: 'اعتُمد' },
    modified: { en: 'Changed', ar: 'عُدّل' },
    rejected: { en: 'Rejected', ar: 'رُفض' },
  }
  const base = what[decision]
  return auditEntry(byRole, reason?.trim() ? { en: `${base.en}: ${reason.trim()}`, ar: `${base.ar}: ${reason.trim()}` } : base, at)
}

/** The fields every new fix carries (v40): proposal date, product, and the first audit line. */
export function proposedStamp(opts: { product: ProductId; byRole?: RoleId | 'system'; note?: Bi; at?: string }) {
  const at = opts.at ?? new Date().toISOString()
  return {
    proposedAt: at,
    product: opts.product,
    auditLog: [auditEntry(opts.byRole ?? 'system', opts.note ?? { en: 'Proposed', ar: 'اقتُرح' }, at)] as AuditEntry[],
  }
}

/** The product whose matrix applies to a pattern: the product of its first signal, else Real Estate (F22). */
export function productOfPattern(pattern: Pick<Pattern, 'signalIds'> | undefined, signals: readonly Signal[]): ProductId {
  const first = pattern?.signalIds.map((id) => signals.find((s) => s.id === id)).find((s): s is Signal => !!s)
  return first?.product ?? 're'
}
