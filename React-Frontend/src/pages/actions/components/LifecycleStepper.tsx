import { useI18n } from '@/i18n'
import type { CorrectiveActionStatus } from '@/types'
import { StepPills, type OutcomeTone } from '@/components/common/StepPills'

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

/** Only an outcome that needs action is tinted (partial, failed); an effective fix is the dark "selected" pill. */
const TERMINAL_TONE: Record<'effective' | 'partial' | 'failed', OutcomeTone | undefined> = {
  effective: undefined,
  partial: 'warning',
  failed: 'danger',
}

/** FR-4.1 — Proposed → Approved and assigned → In progress → 60-day
 * verification → Effective/Partial/Failed (a failed check reopens the
 * signal, not a dead end). Drawn as the skill's stepper (`StepPills`). */
export function LifecycleStepper({ status }: { status: CorrectiveActionStatus }) {
  const { t, L } = useI18n()
  const isTerminal = status === 'effective' || status === 'partial' || status === 'failed'
  const activeIndex = isTerminal ? STEPS.length : STEPS.findIndex((s) => s.status === status)

  return (
    <StepPills
      label={t('Lifecycle', 'دورة الحياة')}
      steps={STEPS.map((s, i) => ({ key: s.status, label: L(s.label), state: i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo' }))}
      outcome={{
        label: isTerminal ? L(TERMINAL_LABEL[status]) : t('Outcome', 'النتيجة'),
        state: isTerminal ? 'current' : 'todo',
        tone: isTerminal ? TERMINAL_TONE[status] : undefined,
      }}
    />
  )
}
