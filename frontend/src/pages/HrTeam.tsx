import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tile } from '../components/ui/Tile'
import { Chip } from '../components/ui/Chip'
import { INCIDENTS } from '../data/incidents'
import { resolveState } from '../lib/sla'

const HR_POOL = [
  { title: 'HR specialist 1', cases: 4, late: 0 },
  { title: 'HR specialist 2', cases: 2, late: 1 },
]

export default function HrTeam() {
  const { t } = useI18n()
  const hrCases = INCIDENTS.filter((i) => i.typeId === 'hr_attitude')
  const late = hrCases.filter((i) => resolveState(i, Date.now()).state === 'at_risk' || resolveState(i, Date.now()).state === 'breached')

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('HR team performance', 'أداء فريق الموارد البشرية')} lede={t('Informed only: team numbers and a late alert. No access to individual cases.', 'للعلم فقط: أرقام الفريق وتنبيه التأخير. لا صلاحية وصول للحالات الفردية.')} />
      <div className="grid g3">
        <Tile label={t('Open conduct cases', 'حالات السلوك المفتوحة')} value={hrCases.filter((i) => i.status !== 'closed').length} />
        <Tile label={t('Late or at risk', 'متأخرة أو في خطر')} value={late.length} trend={late.length ? 'down' : undefined} />
        <Tile label={t('Closed this month', 'أُغلقت هذا الشهر')} value={hrCases.filter((i) => i.status === 'closed').length} />
      </div>
      <div className="card">
        <div className="card-h"><h2>{t('By specialist', 'حسب الأخصائي')}</h2></div>
        <div className="tw">
          <table>
            <thead><tr><th>{t('Specialist', 'الأخصائي')}</th><th className="n">{t('Assigned cases', 'الحالات المسندة')}</th><th className="n">{t('Late', 'متأخرة')}</th></tr></thead>
            <tbody>
              {HR_POOL.map((h) => (
                <tr key={h.title}>
                  <td>{h.title}</td>
                  <td className="n">{h.cases}</td>
                  <td className="n">{h.late > 0 ? <Chip kind="crit">{h.late}</Chip> : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
