import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tile } from '../components/ui/Tile'
import { INCIDENTS } from '../data/incidents'
import { complaintType } from '../data/complaintTypes'
import { resolveState } from '../lib/sla'
import { EFFECTIVENESS } from '../data/effectiveness'
import { evaluateEffectiveness, VERDICT_LABEL } from '../lib/effectiveness'
import { downloadCsv } from '../lib/csv'
import { Chip } from '../components/ui/Chip'

export default function Report() {
  const { L, t } = useI18n()
  const now = Date.now()
  const open = INCIDENTS.filter((i) => i.status !== 'closed')
  const late = open.filter((i) => resolveState(i, now).state === 'breached' || resolveState(i, now).state === 'at_risk')
  const awaitingCheck = INCIDENTS.filter((i) => i.status === 'resolved')

  const byEnvironment = new Map<string, number>()
  late.forEach((i) => byEnvironment.set(i.environment ?? 'Other', (byEnvironment.get(i.environment ?? 'Other') ?? 0) + 1))

  const byType = new Map<string, number>()
  INCIDENTS.forEach((i) => { const name = L(complaintType(i.typeId)?.name ?? { en: i.typeId, ar: i.typeId }); byType.set(name, (byType.get(name) ?? 0) + 1) })
  const topTypes = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  function exportCsv() {
    downloadCsv('monthly-cx-pack.csv', INCIDENTS.map((i) => ({
      id: i.id, type: complaintType(i.typeId)?.name.en ?? i.typeId, product: i.product, status: i.status,
      opened_at: i.openedAt, environment: i.environment ?? '', resolve_state: resolveState(i, now).state,
    })))
  }

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader
        title={t('Monthly CX pack', 'الحزمة الشهرية لتجربة العملاء')}
        lede={t('One page for the management meeting.', 'صفحة واحدة لاجتماع الإدارة.')}
        actions={<button className="btn primary" onClick={exportCsv}>{t('Download CSV', 'تنزيل CSV')}</button>}
      />

      <div className="grid g4">
        <Tile label={t('Open cases', 'الحالات المفتوحة')} value={open.length} />
        <Tile label={t('Late / at risk', 'متأخرة / في خطر')} value={late.length} trend={late.length ? 'down' : undefined} />
        <Tile label={t('Awaiting CX check', 'بانتظار تحقق فريق تجربة العملاء')} value={awaitingCheck.length} />
        <Tile label={t('Closed total', 'إجمالي المغلقة')} value={INCIDENTS.filter((i) => i.status === 'closed').length} />
      </div>

      <div className="grid g-21">
        <div className="card">
          <div className="card-h"><h2>{t('Late cases by environment', 'الحالات المتأخرة حسب البيئة')}</h2></div>
          <div className="list">
            {[...byEnvironment.entries()].map(([env, count]) => (
              <div className="brow" key={env}><span className="sm">{env}</span><div className="track"><i style={{ width: `${(count / Math.max(1, late.length)) * 100}%` }} /></div><span className="sm mono">{count}</span></div>
            ))}
            {late.length === 0 && <div className="empty">{t('Nothing late.', 'لا يوجد تأخير.')}</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2>{t('Most common complaint types', 'أكثر أنواع الشكاوى شيوعاً')}</h2></div>
          <div className="list">
            {topTypes.map(([name, count]) => (
              <div className="brow" key={name}><span className="sm">{name}</span><div className="track"><i style={{ width: `${(count / Math.max(1, topTypes[0][1])) * 100}%` }} /></div><span className="sm mono">{count}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h2>{t('Did past preventive actions work?', 'هل نجحت الإجراءات الوقائية السابقة؟')}</h2></div>
        <div className="tw">
          <table>
            <thead><tr><th>{t('Type', 'النوع')}</th><th>{t('Action', 'الإجراء')}</th><th className="n">{t('Before', 'قبل')}</th><th className="n">{t('After', 'بعد')}</th><th className="n">{t('Change', 'التغيّر')}</th><th>{t('Verdict', 'الحكم')}</th></tr></thead>
            <tbody>
              {EFFECTIVENESS.map((e) => {
                const res = evaluateEffectiveness(e)
                const typeName = complaintType(e.typeId)?.name
                return (
                  <tr key={e.typeId}>
                    <td className="sm">{typeName ? L(typeName) : e.typeId}</td>
                    <td className="sm muted">{e.action}</td>
                    <td className="n">{res.before.toFixed(1)}</td>
                    <td className="n">{res.after.toFixed(1)}</td>
                    <td className="n">{(res.changePct * 100).toFixed(0)}%</td>
                    <td><Chip kind={res.verdict === 'working' ? 'good' : res.verdict === 'not_working' ? 'crit' : res.verdict === 'unclear' ? 'warn' : undefined}>{L(VERDICT_LABEL[res.verdict])}</Chip></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>{t('A before/after comparison is a signal, not proof. Real analysis needs two to three months of closed cases.', 'المقارنة بين قبل وبعد مؤشر وليست دليلاً قاطعاً. التحليل الحقيقي يحتاج شهرين إلى ثلاثة من الحالات المغلقة.')}</p>
      </div>
    </div>
  )
}
