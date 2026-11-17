import { AlertTriangle } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { Pattern } from '@/types'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<Pattern['thresholdKind'], { en: string; ar: string }> = {
  same_agent: { en: 'Same agent', ar: 'نفس الوكيل' },
  same_issue: { en: 'Same issue', ar: 'نفس المشكلة' },
  environment_concentration: { en: 'One environment', ar: 'بيئة واحدة' },
}

/** FR-4.6 — the counting/threshold mechanism made visible, not a flat list:
 * how close (or past) this group of signals is to the rule that turns it
 * into a pattern. */
export function PatternThresholdMeter({ pattern }: { pattern: Pattern }) {
  const { t, L } = useI18n()
  const isPercent = pattern.thresholdKind === 'environment_concentration'
  const pct = Math.min(100, Math.round((pattern.currentValue / pattern.thresholdTarget) * 100))
  const unit = isPercent ? '%' : ''
  const indicator =
    pct >= 100
      ? '[&>[data-slot=progress-indicator]]:bg-destructive'
      : pct >= 70
        ? '[&>[data-slot=progress-indicator]]:bg-warning'
        : '[&>[data-slot=progress-indicator]]:bg-primary'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone="info">{L(KIND_LABEL[pattern.thresholdKind])}</StatusBadge>
        <span className="text-xs text-muted-foreground">
          <bdi dir="ltr" className="font-medium text-foreground tabular-nums">
            {pattern.currentValue}
            {unit} / {pattern.thresholdTarget}
            {unit}
          </bdi>
          {!isPercent && (
            <>
              {' '}
              {t('in', 'خلال')} <bdi dir="ltr" className="tabular-nums">{pattern.windowDays}</bdi> {t('days', 'يوماً')}
            </>
          )}
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${L(KIND_LABEL[pattern.thresholdKind])} ${pct}%`}
        className={cn('h-2 bg-muted', indicator)}
      />
      {!pattern.hasMinimumSample && (
        <p className="flex items-start gap-1.5 text-xs text-warning-text">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {t('Below minimum sample (10) — route to Investigations, not a guessed fix.', 'دون الحد الأدنى للعينة (10) — يُحال إلى التحقيقات بدلاً من حل مخمَّن.')}
        </p>
      )}
    </div>
  )
}
