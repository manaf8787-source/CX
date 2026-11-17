import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tile } from '../components/ui/Tile'
import { Chip } from '../components/ui/Chip'
import { Sparkline } from '../components/ui/Charts'
import { vocFor } from '../data/voc'
import { TREND, ALERTS } from '../data/voc'
import { aggregateCsat, aggregateNps, fmtSigned } from '../lib/metrics'
import { AGENTS_RE } from '../data/agentScores'
import { INCIDENTS } from '../data/incidents'
import { resolveState } from '../lib/sla'
import { CHANNELS } from '../data/channels'

export default function RealEstate() {
  const { L, t } = useI18n()
  const rows = vocFor('re')
  const nps = aggregateNps(rows)
  const csat = aggregateCsat(rows)
  const incidents = INCIDENTS.filter((i) => i.product === 're')
  const open = incidents.filter((i) => i.status !== 'closed')
  const alerts = ALERTS.filter((a) => a.product === 're')

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('PSI Real Estate', 'بي إس آي العقارية')} lede={t('Sales of units through digital, AI call center, branch gallery and app channels.', 'مبيعات الوحدات عبر القنوات الرقمية ومركز الاتصال الذكي والمعرض والتطبيق.')} />

      <div className="grid g4">
        <Tile label="NPS" value={fmtSigned(nps)} colorVar="--p-re" sub={<Sparkline values={TREND.re} color="var(--p-re)" />} />
        <Tile label="CSAT" value={csat != null ? `${csat}%` : '–'} colorVar="--p-re" />
        <Tile label={t('Open incidents', 'الحوادث المفتوحة')} value={open.length} colorVar="--p-re" />
        <Tile label={t('Shop score', 'نتيجة المعرض')} value="91%" colorVar="--p-re" sub={t('mystery shopper average', 'متوسط التسوق السري')} />
      </div>

      <div className="card">
        <div className="card-h"><h2>{t('By channel', 'حسب القناة')}</h2></div>
        <div className="tw">
          <table>
            <thead><tr><th>{t('Channel', 'القناة')}</th><th className="n">{t('Responses', 'الردود')}</th><th className="n">NPS</th><th className="n">CSAT</th></tr></thead>
            <tbody>
              {CHANNELS.map((c) => {
                const row = rows.find((r) => r.channel === c.id)
                return (
                  <tr key={c.id}>
                    <td>{L(c.name)}</td>
                    <td className="n">{row?.n ?? 0}</td>
                    <td className="n">{row && row.n > 0 ? fmtSigned(aggregateNps([row])) : <span className="muted">{t('no data yet', 'لا توجد بيانات بعد')}</span>}</td>
                    <td className="n">{row && row.n > 0 ? `${row.csat}%` : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g-21">
        <div className="card">
          <div className="card-h"><h2>{t('Agent scorecard', 'بطاقة أداء الوكلاء')}</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th>{t('Agent', 'الوكيل')}</th><th>{t('Scope', 'النطاق')}</th><th className="n">NPS</th><th className="n">CSAT</th><th className="n">{t('Shopper', 'المتسوق')}</th><th className="n">{t('Incidents', 'الحوادث')}</th></tr></thead>
              <tbody>
                {AGENTS_RE.map((a) => (
                  <tr key={a.name}>
                    <td>{a.name}</td>
                    <td className="sm muted">{a.scope}</td>
                    <td className="n">{fmtSigned(a.nps)}</td>
                    <td className="n">{a.csat}%</td>
                    <td className="n">{a.shopperScore}%</td>
                    <td className="n">{a.incidents > 0 ? <Chip kind="warn">{a.incidents}</Chip> : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2>{t('Alerts', 'التنبيهات')}</h2></div>
          <div className="list">
            {alerts.map((a, i) => (
              <div className="item" key={i}>
                <Chip kind={a.level === 'crit' ? 'crit' : a.level === 'warn' ? 'warn' : 'good'}>{a.level}</Chip>
                <p className="sm" style={{ marginTop: 4 }}>{L(a.text)}</p>
              </div>
            ))}
            {alerts.length === 0 && <div className="empty">{t('No alerts.', 'لا توجد تنبيهات.')}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h2>{t('Recent incidents', 'الحوادث الأخيرة')}</h2></div>
        <div className="tw">
          <table>
            <thead><tr><th>ID</th><th>{t('Title', 'العنوان')}</th><th>{t('Status', 'الحالة')}</th><th>{t('Resolve clock', 'ساعة الحل')}</th></tr></thead>
            <tbody>
              {incidents.map((inc) => {
                const r = resolveState(inc, Date.now())
                return (
                  <tr key={inc.id}>
                    <td className="mono sm">{inc.id}</td>
                    <td>{L(inc.title)}</td>
                    <td><Chip kind={inc.status === 'closed' ? 'good' : undefined}>{inc.status}</Chip></td>
                    <td><Chip kind={r.state === 'breached' ? 'crit' : r.state === 'at_risk' ? 'warn' : r.state === 'met' ? 'good' : undefined}>{r.state.replace('_', ' ')}</Chip></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
