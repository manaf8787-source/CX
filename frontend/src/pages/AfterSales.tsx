import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tile } from '../components/ui/Tile'
import { Chip } from '../components/ui/Chip'
import { Sparkline } from '../components/ui/Charts'
import { vocFor, TREND } from '../data/voc'
import { aggregateCsat, aggregateNps, fmtSigned } from '../lib/metrics'
import { AGENTS_AF, DEVELOPERS } from '../data/agentScores'
import { AFTER_SALES_QUEUE } from '../data/afterSales'
import { INCIDENTS } from '../data/incidents'
import type { UnitStatus } from '../types'

const UNIT_LABEL: Record<UnitStatus, { en: string; ar: string }> = {
  ready: { en: 'Ready (handed over)', ar: 'جاهزة (تم التسليم)' },
  offplan: { en: 'Under development', ar: 'قيد الإنشاء' },
  rental: { en: 'Rental', ar: 'إيجار' },
}

export default function AfterSales() {
  const { L, t } = useI18n()
  const rows = vocFor('af')
  const nps = aggregateNps(rows)
  const csat = aggregateCsat(rows)
  const incidents = INCIDENTS.filter((i) => i.product === 'af')

  const byStage = (['ready', 'offplan', 'rental'] as UnitStatus[]).map((s) => ({
    status: s,
    count: AFTER_SALES_QUEUE.filter((q) => q.unitStatus === s).length,
    done: AFTER_SALES_QUEUE.filter((q) => q.unitStatus === s && q.status === 'done').length,
  }))

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('After-Sales', 'ما بعد البيع')} lede={t('The team that calls customers after the transaction — agent and developer evaluation across three survey versions.', 'الفريق الذي يتواصل مع العملاء بعد إتمام الصفقة — تقييم الموظف والمطوّر عبر ثلاث نسخ من الاستبيان.')} />

      <div className="grid g4">
        <Tile label="NPS" value={fmtSigned(nps)} colorVar="--p-af" sub={<Sparkline values={TREND.af} color="var(--p-af)" />} />
        <Tile label="CSAT" value={csat != null ? `${csat}%` : '–'} colorVar="--p-af" />
        <Tile label={t('Open incidents', 'الحوادث المفتوحة')} value={incidents.filter((i) => i.status !== 'closed').length} colorVar="--p-af" />
        <Tile label={t('Queue today', 'طابور اليوم')} value={AFTER_SALES_QUEUE.length} colorVar="--p-af" sub={t('across both agents', 'عبر كلا الموظفين')} />
      </div>

      <div className="card">
        <div className="card-h"><h2>{t('Calls by journey stage', 'المكالمات حسب مرحلة الرحلة')}</h2></div>
        <div className="grid g3">
          {byStage.map((s) => (
            <div className="item" key={s.status}>
              <div className="row between"><b>{L(UNIT_LABEL[s.status])}</b><Chip>{s.count}</Chip></div>
              <p className="sm muted" style={{ marginTop: 4 }}>{s.done} / {s.count} {t('done today', 'تم اليوم')}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g-21">
        <div className="card">
          <div className="card-h"><h2>{t('Agent scorecard', 'بطاقة أداء الموظفين')}</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th>{t('Agent', 'الموظف')}</th><th>{t('Scope', 'النطاق')}</th><th className="n">NPS</th><th className="n">CSAT</th><th className="n">{t('Incidents', 'الحوادث')}</th></tr></thead>
              <tbody>
                {AGENTS_AF.map((a) => (
                  <tr key={a.name}>
                    <td>{a.name}</td>
                    <td className="sm muted">{a.scope}</td>
                    <td className="n">{fmtSigned(a.nps)}</td>
                    <td className="n">{a.csat}%</td>
                    <td className="n">{a.incidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2>{t('Developer scorecard', 'بطاقة أداء المطوّر')}</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th>{t('Developer', 'المطوّر')}</th><th className="n">{t('Units', 'الوحدات')}</th><th className="n">{t('Open', 'مفتوحة')}</th><th className="n">{t('Avg. resolve (days)', 'متوسط الحل (أيام)')}</th><th className="n">{t('Satisfaction', 'الرضا')}</th></tr></thead>
              <tbody>
                {DEVELOPERS.map((d) => (
                  <tr key={d.name}>
                    <td className="sm">{d.name}</td>
                    <td className="n">{d.units}</td>
                    <td className="n">{d.openIncidents}</td>
                    <td className="n">{d.avgResolveDays}</td>
                    <td className="n">{d.satisfaction}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
