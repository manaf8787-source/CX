import { useI18n } from '@/i18n'
import { InlineNote } from '@/components/common/InlineNote'

/** FR-4.11 — a first-class, always-available element (not a one-off
 * tooltip): how to read a recovery percentage, and why a small sample
 * carries a warning instead of a confident number. An inline notification
 * (a well with a neutral dot). */
export function PercentagesExplainer() {
  const { t } = useI18n()
  return (
    <InlineNote tone="neutral" title={t('How to read these percentages', 'كيف تُقرأ هذه النسب')}>
      {t(
        'Each figure compares similar closed cases: how many times this kind of action was tried, and how many of those recovered. A recovery rate below 10 cases is a small sample — read it as a direction, not a guarantee.',
        'تقارن كل نسبة حالات مشابهة مغلقة: عدد مرات تجربة هذا النوع من الإجراء، وعدد الحالات التي تعافت منها. معدل تعافٍ مبني على أقل من 10 حالات يُعد عينة صغيرة — اقرأه كاتجاه وليس كضمان.',
      )}
    </InlineNote>
  )
}
