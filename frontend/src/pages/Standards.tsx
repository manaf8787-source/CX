import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip } from '../components/ui/Chip'
import { STANDARDS } from '../data/standards'
import type { StandardStatus } from '../types'

const STATUS_KIND: Record<StandardStatus, 'crit' | 'warn' | 'good'> = { awaiting: 'crit', legal: 'warn', drafted: 'good' }
const STATUS_LABEL: Record<StandardStatus, { en: string; ar: string }> = {
  awaiting: { en: 'Awaiting document', ar: 'بانتظار المستند' },
  legal: { en: 'Confirm with Legal', ar: 'تأكيد مع القانونية' },
  drafted: { en: 'Drafted by CX', ar: 'مسودة من فريق تجربة العملاء' },
}

export default function Standards() {
  const { L, t } = useI18n()
  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Standards Library', 'مكتبة المعايير')} lede={t('Every checklist item and rule points to a numbered standard, so there is one source of truth.', 'كل عنصر في القوائم وكل قاعدة يشير إلى معيار مرقّم، بحيث يكون هناك مصدر واحد للحقيقة.')} />
      <div className="card">
        <div className="tw">
          <table>
            <thead><tr><th>#</th><th>{t('Standard', 'المعيار')}</th><th>{t('Owner', 'المالك')}</th><th className="n">{t('Linked items', 'العناصر المرتبطة')}</th><th>{t('Status', 'الحالة')}</th></tr></thead>
            <tbody>
              {STANDARDS.map((s, i) => (
                <tr key={s.id}>
                  <td className="mono sm muted">{i + 1}</td>
                  <td>{L(s.name)}</td>
                  <td className="sm">{s.owner}</td>
                  <td className="n">{s.linkedItems || '–'}</td>
                  <td><Chip kind={STATUS_KIND[s.status]}>{L(STATUS_LABEL[s.status])}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
