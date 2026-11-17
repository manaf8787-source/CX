import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { CorrectiveActionStatus } from '@/types'
import { cn } from '@/lib/utils'

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

const TERMINAL_CLASS: Record<'effective' | 'partial' | 'failed', string> = {
  effective: 'border-success/30 bg-success/12 text-success-text',
  partial: 'border-warning/30 bg-warning/12 text-warning-text',
  failed: 'border-destructive/30 bg-destructive/12 text-danger-text',
}

/** FR-4.1 — Proposed → Approved and assigned → In progress → 60-day
 * verification → Effective/Partial/Failed (a failed check reopens the
 * signal, not a dead end). */
export function LifecycleStepper({ status }: { status: CorrectiveActionStatus }) {
  const { t, L } = useI18n()
  const isTerminal = status === 'effective' || status === 'partial' || status === 'failed'
  const activeIndex = isTerminal ? STEPS.length : STEPS.findIndex((s) => s.status === status)

  return (
    <ol aria-label={t('Lifecycle', 'دورة الحياة')} className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((s, i) => {
        const done = i < activeIndex
        const current = i === activeIndex
        return (
          <li key={s.status} className="flex items-center gap-1.5" aria-current={current ? 'step' : undefined}>
            <span
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
                done && 'border-success/25 bg-success/10 text-success-text',
                current && 'border-primary bg-primary text-primary-foreground',
                !done && !current && 'border-border bg-card text-muted-foreground',
              )}
            >
              {done && <Check aria-hidden className="size-3.5" />}
              {L(s.label)}
            </span>
            <span aria-hidden className={cn('hidden h-px w-3 bg-border sm:block', done && 'bg-success/50')} />
          </li>
        )
      })}
      <li aria-current={isTerminal ? 'step' : undefined}>
        <span
          className={cn(
            'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
            isTerminal ? TERMINAL_CLASS[status] : 'border-dashed border-border text-muted-foreground',
          )}
        >
          {isTerminal ? L(TERMINAL_LABEL[status]) : t('Outcome', 'النتيجة')}
        </span>
      </li>
    </ol>
  )
}
