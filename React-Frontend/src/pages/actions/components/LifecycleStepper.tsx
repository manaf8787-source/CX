import { useI18n } from '../../../i18n'
import type { CorrectiveActionStatus } from '../../../types'

const STEPS: { status: CorrectiveActionStatus; label: { en: string; ar: string } }[] = [
  { status: 'proposed', label: { en: 'Proposed', ar: 'مقترح' } },
  { status: 'approved', label: { en: 'Approved', ar: 'معتمد' } },
  { status: 'in_progress', label: { en: 'In progress', ar: 'قيد التنفيذ' } },
  { status: 'verification', label: { en: '60-day check', ar: 'تحقق 60 يوماً' } },
]

const TERMINAL_LABEL: Record<'effective' | 'partial' | 'failed', { en: string; ar: string }> = {
  effective: { en: 'Effective', ar: 'فعّال' },
  partial: { en: 'Partial', ar: 'جزئي' },
  failed: { en: 'Failed — signal reopens', ar: 'فاشل — تُعاد الإشارة' },
}

/** FR-4.1 — Proposed → Approved and assigned → In progress → 60-day
 * verification → Effective/Partial/Failed (a failed check reopens the
 * signal, not a dead end). */
export function LifecycleStepper({ status }: { status: CorrectiveActionStatus }) {
  const { L } = useI18n()
  const isTerminal = status === 'effective' || status === 'partial' || status === 'failed'
  const activeIndex = isTerminal ? STEPS.length : STEPS.findIndex((s) => s.status === status)

  return (
    <div className="row" style={{ flexWrap: 'nowrap', gap: 4, overflowX: 'auto' }}>
      {STEPS.map((s, i) => (
        <span key={s.status} className={`chip ${i < activeIndex ? 'good' : i === activeIndex ? 'accent' : ''}`}>
          {L(s.label)}
        </span>
      ))}
      <span className={`chip ${isTerminal ? (status === 'effective' ? 'good' : status === 'failed' ? 'crit' : 'warn') : ''}`}>
        {isTerminal ? L(TERMINAL_LABEL[status]) : '…'}
      </span>
    </div>
  )
}
