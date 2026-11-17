import { useI18n } from '../../i18n'
import { useNow } from '../../hooks/useNow'
import { Tile } from '../../components/common/Tile'
import { Chip } from '../../components/common/Chip'
import { useHrPool, useShopperCases } from '../../services/queries'

/** Ported from `frontend/src/pages/HrTeam.tsx` (APPLICATION_MODULES.md §C) —
 * "informed only: team numbers and a late alert, no access to individual
 * cases" (USER_ROLES_AND_PERMISSIONS.md). Reads conduct-flagged shopper
 * cases from the live Actions register rather than a separate incident
 * list, so this page and Actions never disagree on the same case. */
export default function HrTeamPerf() {
  const { t } = useI18n()
  const now = useNow()
  const { data: cases } = useShopperCases()
  const { data: hrPool } = useHrPool()

  const conductCases = (cases ?? []).filter((c) => c.isConductIssue)
  const open = conductCases.filter((c) => c.status !== 'closed')
  const late = open.filter((c) => new Date(c.resolveDueAt).getTime() < now)

  return (
    <div className="col">
      <p className="text-sm muted">{t('Informed only: team numbers and a late alert. No access to individual cases.', 'للعلم فقط: أرقام الفريق وتنبيه التأخير. لا صلاحية وصول للحالات الفردية.')}</p>

      <div className="grid grid-3">
        <Tile label={t('Open conduct cases', 'حالات السلوك المفتوحة')} value={open.length} />
        <Tile label={t('Late or at risk', 'متأخرة أو في خطر')} value={late.length} colorVar={late.length ? '--crit' : undefined} />
        <Tile label={t('Closed total', 'إجمالي المغلقة')} value={conductCases.filter((c) => c.status === 'closed').length} />
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('By specialist', 'حسب الأخصائي')}</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('Specialist', 'الأخصائي')}</th><th className="num">{t('Assigned cases', 'الحالات المسندة')}</th><th className="num">{t('Late', 'متأخرة')}</th></tr></thead>
            <tbody>
              {(hrPool ?? []).map((h) => (
                <tr key={h.title}>
                  <td>{h.title}</td>
                  <td className="num">{h.assignedCases}</td>
                  <td className="num">{h.lateCases > 0 ? <Chip tone="crit">{h.lateCases}</Chip> : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
