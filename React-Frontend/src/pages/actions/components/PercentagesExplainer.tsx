import { useI18n } from '../../../i18n'

/** FR-4.11 — a first-class, always-available element (not a one-off
 * tooltip): how to read a recovery percentage, and why a small sample
 * carries a warning instead of a confident number. */
export function PercentagesExplainer() {
  const { t } = useI18n()
  return (
    <div className="card">
      <span className="chip" style={{ marginBottom: 6 }}>{t('How to read these percentages', 'كيف تُقرأ هذه النسب')}</span>
      <p className="text-sm" style={{ marginTop: 6, maxWidth: '68ch' }}>
        {t(
          'Each figure compares similar closed cases: how many times this kind of action was tried, and how many of those recovered. A recovery rate below 10 cases is a small sample — read it as a direction, not a guarantee.',
          'تقارن كل نسبة حالات مشابهة مغلقة: عدد مرات تجربة هذا النوع من الإجراء، وعدد الحالات التي تعافت منها. معدل تعافٍ مبني على أقل من 10 حالات يُعد عينة صغيرة — اقرأه كاتجاه وليس كضمان.',
        )}
      </p>
    </div>
  )
}
