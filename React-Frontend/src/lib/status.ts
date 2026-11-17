import type { Bi, CorrectiveActionStatus, Severity, ShopperCaseStatus, StatusLevel } from '@/types'

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
  verification: { en: '60-day check', ar: 'تحقق 60 يوماً' },
  effective: { en: 'Effective', ar: 'فعّال' },
  partial: { en: 'Partial', ar: 'جزئي' },
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

/** Legacy `StatusLevel` / Chip tones → semantic tones. */
export const LEVEL_TONE: Record<StatusLevel | 'accent', Tone> = {
  good: 'success',
  warn: 'warning',
  crit: 'danger',
  neutral: 'neutral',
  accent: 'info',
}
