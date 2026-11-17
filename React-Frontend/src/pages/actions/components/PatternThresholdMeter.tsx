import { useI18n } from '../../../i18n'
import type { Pattern } from '../../../types'

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
  const valueLabel = isPercent ? `${pattern.currentValue}%` : `${pattern.currentValue}`
  const targetLabel = isPercent ? `${pattern.thresholdTarget}%` : `${pattern.thresholdTarget}`
  const tone = pct >= 100 ? '--crit' : pct >= 70 ? '--warn' : '--brand'
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="row between" style={{ gap: 8 }}>
        <span className="chip accent">{L(KIND_LABEL[pattern.thresholdKind])}</span>
        <span className="text-sm mono muted">
          {valueLabel} / {targetLabel} {!isPercent && t('in', 'خلال')} {!isPercent ? `${pattern.windowDays}d` : ''}
        </span>
      </div>
      <div className="meter" style={{ '--c': `var(${tone})` } as React.CSSProperties}>
        <i style={{ width: `${pct}%` }} />
      </div>
      {!pattern.hasMinimumSample && (
        <span className="text-sm" style={{ color: 'var(--warn)' }}>
          {t(`Below minimum sample (10) — route to Investigations, not a guessed fix.`, 'دون الحد الأدنى للعينة (10) — يُحال إلى التحقيقات بدلاً من حل مخمَّن.')}
        </span>
      )}
    </div>
  )
}
