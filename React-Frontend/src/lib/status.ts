import type {
  Bi,
  CorrectiveActionStatus,
  LdRequestStatus,
  MsAssignmentStatus,
  Severity,
  ShopperCaseStatus,
  StandardStatus,
  StatusLevel,
} from '@/types'

/** The five semantic tones every status badge maps onto (docs/DESIGN_SYSTEM.md §5). */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: 'danger',
  medium: 'warning',
  low: 'neutral',
}

export const CORRECTIVE_STATUS_TONE: Record<CorrectiveActionStatus, Tone> = {
  proposed: 'info',
  approved: 'info',
  in_progress: 'warning',
  verification: 'warning',
  effective: 'success',
  partial: 'warning',
  failed: 'danger',
}

/** Same wording as the Actions lifecycle stepper. */
export const CORRECTIVE_STATUS_LABEL: Record<CorrectiveActionStatus, Bi> = {
  proposed: { en: 'Proposed', ar: 'مقترح' },
  approved: { en: 'Approved', ar: 'معتمد' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ' },
  verification: { en: '60-day check', ar: 'فحص 60 يوماً' },
  effective: { en: 'Effective', ar: 'فعّال' },
  // v40.1 (prototype CA_ST.partial and CA_ST.verify): the status says what is wanted next.
  partial: { en: 'Partial: second step needed', ar: 'جزئي: خطوة ثانية مطلوبة' },
  failed: { en: 'Failed', ar: 'فاشل' },
}

export const SHOPPER_CASE_STATUS_TONE: Record<ShopperCaseStatus, Tone> = {
  open: 'danger',
  triaged: 'warning',
  owner_decision: 'warning',
  hr_review: 'info',
  closed: 'neutral',
}

export const INVESTIGATION_STATUS_TONE: Record<'requested' | 'in_progress' | 'returned', Tone> = {
  requested: 'info',
  in_progress: 'warning',
  returned: 'success',
}

export const AGENT_VERDICT_TONE: Record<'approved' | 'returned' | 'escalated', Tone> = {
  approved: 'success',
  returned: 'warning',
  escalated: 'danger',
}

export const STANDARD_STATUS_TONE: Record<StandardStatus, Tone> = {
  not_started: 'danger',
  legal_review: 'warning',
  drafted: 'info',
  approved_scored: 'success',
}

export const STANDARD_STATUS_LABEL: Record<StandardStatus, Bi> = {
  not_started: { en: 'Not started', ar: 'لم يبدأ' },
  legal_review: { en: 'Confirm with Legal', ar: 'تأكيد مع القانونية' },
  drafted: { en: 'Drafted', ar: 'مسودة' },
  approved_scored: { en: 'Approved and scored', ar: 'معتمد ومُقيَّم' },
}

export const LD_REQUEST_STATUS_TONE: Record<LdRequestStatus, Tone> = {
  requested: 'neutral',
  scheduled: 'info',
  delivered: 'success',
}

export const LD_REQUEST_STATUS_LABEL: Record<LdRequestStatus, Bi> = {
  requested: { en: 'Requested', ar: 'مطلوب' },
  scheduled: { en: 'Scheduled', ar: 'مجدول' },
  delivered: { en: 'Delivered', ar: 'تم التقديم' },
}

export const MS_ASSIGNMENT_STATUS_TONE: Record<MsAssignmentStatus, Tone> = {
  sent: 'neutral',
  opened: 'neutral',
  progress: 'info',
  submitted: 'warning',
  review: 'warning',
  approved: 'success',
  returned: 'danger',
  overdue: 'danger',
}

export const MS_ASSIGNMENT_STATUS_LABEL: Record<MsAssignmentStatus, Bi> = {
  sent: { en: 'Sent', ar: 'مُرسَل' },
  opened: { en: 'Opened', ar: 'مفتوح' },
  progress: { en: 'In progress', ar: 'قيد التنفيذ' },
  submitted: { en: 'Submitted', ar: 'مُقدَّم' },
  review: { en: 'In review', ar: 'قيد المراجعة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  returned: { en: 'Returned', ar: 'مُعاد' },
  overdue: { en: 'Overdue', ar: 'متأخر' },
}

export const CHECKLIST_STATUS_LABEL: Record<'draft' | 'published', Bi> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  published: { en: 'Published', ar: 'منشور' },
}

/** Legacy `StatusLevel` / Chip tones → semantic tones. */
export const LEVEL_TONE: Record<StatusLevel | 'accent', Tone> = {
  good: 'success',
  warn: 'warning',
  crit: 'danger',
  neutral: 'neutral',
  accent: 'info',
}
