import { useI18n } from '../../../i18n'

/** FR-4.13 — a stated anti-confusion requirement, not incidental copy: AI
 * Insights reads scores/ratings; Signals counts complaints/breaches/public
 * mentions. A low score only becomes a signal when it is also a complaint,
 * breach, critical shopper item, or public mention. Shared by both tabs so
 * the wording never drifts between them. */
export function ScoresVsSignalsNotice({ register }: { register: 'signals' | 'ai-insights' }) {
  const { t } = useI18n()
  return (
    <div className="card tint">
      <span className="chip accent" style={{ marginBottom: 6 }}>{t('Two separate registers', 'سجلّان منفصلان')}</span>
      <p className="text-sm" style={{ marginTop: 6 }}>
        {register === 'signals'
          ? t(
              'This tab counts complaints, breaches and public mentions — not scores. A low score only becomes a signal here when it is also a complaint, a breach, a critical shopper item, or a public mention.',
              'يعُدّ هذا التبويب الشكاوى والخروقات والإشارات العامة — وليس التقييمات. يصبح التقييم المنخفض إشارةً هنا فقط إذا كان أيضاً شكوى أو خرقاً أو بنداً حرجاً في التسوق السري أو إشارة عامة.',
            )
          : t(
              'This tab reads scored records — surveys, shopper scores, app ratings, call reviews. It never counts complaints or breaches; that register is Signals & patterns.',
              'يقرأ هذا التبويب السجلات المُقيَّمة — الاستبيانات، درجات التسوق السري، تقييمات التطبيق، مراجعات المكالمات. لا يَعُدّ الشكاوى أو الخروقات، فذلك سجل الإشارات والأنماط.',
            )}
      </p>
    </div>
  )
}
