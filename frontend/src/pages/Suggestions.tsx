import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip } from '../components/ui/Chip'
import { SUGGESTIONS, type Suggestion, type SuggestionStatus } from '../data/suggestions'

const STATUS_KIND: Record<SuggestionStatus, 'good' | 'warn' | 'crit' | undefined> = { new: undefined, under_review: 'warn', adopted: 'good', not_now: 'crit' }

export default function Suggestions() {
  const { L, t } = useI18n()
  const [items, setItems] = useState<Suggestion[]>(SUGGESTIONS)

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Suggestions log', 'سجل الاقتراحات')} lede={t('Ideas from the IVR, surveys and staff that are not complaints. Reviewed once a month — nothing here has an SLA clock.', 'أفكار من الرد الصوتي والاستبيانات والموظفين وليست شكاوى. تُراجع شهرياً — لا توجد ساعة اتفاقية مستوى خدمة هنا.')} />
      <div className="card tw">
        <table>
          <thead><tr><th>{t('Suggestion', 'الاقتراح')}</th><th>{t('Source', 'المصدر')}</th><th>{t('Status', 'الحالة')}</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td className="sm">{L(s.text)}</td>
                <td className="sm muted">{s.source}</td>
                <td>
                  <select value={s.status} onChange={(e) => setItems((list) => list.map((x) => (x.id === s.id ? { ...x, status: e.target.value as SuggestionStatus } : x)))}>
                    <option value="new">{t('New', 'جديد')}</option>
                    <option value="under_review">{t('Under review', 'قيد المراجعة')}</option>
                    <option value="adopted">{t('Adopted', 'تم التبني')}</option>
                    <option value="not_now">{t('Not now', 'ليس الآن')}</option>
                  </select>
                  {' '}<Chip kind={STATUS_KIND[s.status]}>{s.status.replace('_', ' ')}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
