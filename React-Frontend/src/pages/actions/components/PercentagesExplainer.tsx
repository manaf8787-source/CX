import { Percent } from 'lucide-react'
import { useI18n } from '@/i18n'

/** FR-4.11 — a first-class, always-available element (not a one-off
 * tooltip): how to read a recovery percentage, and why a small sample
 * carries a warning instead of a confident number. */
export function PercentagesExplainer() {
  const { t } = useI18n()
  return (
    <aside className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Percent className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-sm font-semibold">{t('How to read these percentages', 'كيف تُقرأ هذه النسب')}</h2>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          {t(
            'Each figure compares similar closed cases: how many times this kind of action was tried, and how many of those recovered. A recovery rate below 10 cases is a small sample — read it as a direction, not a guarantee.',
            'تقارن كل نسبة حالات مشابهة مغلقة: عدد مرات تجربة هذا النوع من الإجراء، وعدد الحالات التي تعافت منها. معدل تعافٍ مبني على أقل من 10 حالات يُعد عينة صغيرة — اقرأه كاتجاه وليس كضمان.',
          )}
        </p>
      </div>
    </aside>
  )
}
