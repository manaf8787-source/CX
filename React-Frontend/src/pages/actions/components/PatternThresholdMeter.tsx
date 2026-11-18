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
 * into a pattern. The bar is always the ink fill (colour is not a state);
 * how near the line it is shows as the 6px status dot beside the figures,
 * and the figures themselves are printed. */
export function PatternThresholdMeter({ pattern }: { pattern: Pattern }) {
  const { t, L } = useI18n()
  const isPercent = pattern.thresholdKind === 'environment_concentration'
  const pct = Math.min(100, Math.round((pattern.currentValue / pattern.thresholdTarget) * 100))
  const unit = isPercent ? '%' : ''
  const dot = pct >= 100 ? 'dot-error' : pct >= 70 ? 'dot-warning' : null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone="neutral">{L(KIND_LABEL[pattern.thresholdKind])}</StatusBadge>
        <span className="t-body-s inline-flex items-center gap-2">
          {dot && <span aria-hidden className={cn('dot', dot)} />}
          <span>
            <bdi dir="ltr" className="t-small-strong tabular">
              {pattern.currentValue}
              {unit} / {pattern.thresholdTarget}
              {unit}
            </bdi>
            {!isPercent && (
              <>
                {' '}
                {t('in', 'خلال')} <bdi dir="ltr" className="tabular">{pattern.windowDays}</bdi> {t('days', 'يوماً')}
              </>
            )}
          </span>
        </span>
      </div>
      <Progress value={pct} aria-label={`${L(KIND_LABEL[pattern.thresholdKind])} ${pct}%`} className="h-1.5" />
      {!pattern.hasMinimumSample && (
        <p className="t-body-s flex items-start gap-2">
          <span aria-hidden className="dot dot-warning mt-1.5" />
          {t('Below minimum sample (10) — route to Investigations, not a guessed fix.', 'دون الحد الأدنى للعينة (10) — يُحال إلى التحقيقات بدلاً من حل مخمَّن.')}
        </p>
      )}
    </div>
  )
}
