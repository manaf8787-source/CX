import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tile } from '../components/ui/Tile'
import { Chip, ProductTag } from '../components/ui/Chip'
import { LineChart, Sparkline } from '../components/ui/Charts'
import { PRODUCTS } from '../data/products'
import { useSettings } from '../settings/SettingsContext'
import { CHANNELS } from '../data/channels'
import { VOC, TREND, ALERTS, vocFor } from '../data/voc'
import { aggregateCsat, aggregateNps, fmtSigned, npsColor } from '../lib/metrics'
import { INCIDENTS } from '../data/incidents'
import { resolveState } from '../lib/sla'
import { ASSIGNMENTS } from '../data/shoppers'
import { useRole } from '../auth/RoleContext'

export default function Overview() {
  const { L, t } = useI18n()
  const { role } = useRole()
  const { isLaunched } = useSettings()
  const now = Date.now()

  const scopedProducts = role?.product ? PRODUCTS.filter((p) => p.id === role.product) : PRODUCTS.filter((p) => isLaunched(p.id))
  const scopedVoc = VOC.filter((r) => scopedProducts.some((p) => p.id === r.product))

  const overallNps = aggregateNps(scopedVoc)
  const overallCsat = aggregateCsat(scopedVoc)
  const totalResponses = scopedVoc.reduce((s, r) => s + r.n, 0)
  const openIncidents = INCIDENTS.filter((i) => scopedProducts.some((p) => p.id === i.product) && i.status !== 'closed')
  const breached = openIncidents.filter((i) => resolveState(i, now).state === 'breached')
  const shopperScores = ASSIGNMENTS.filter((a) => a.score != null).map((a) => a.score as number)
  const avgShopperScore = shopperScores.length ? Math.round(shopperScores.reduce((a, b) => a + b, 0) / shopperScores.length) : null

  const trendSeries = scopedProducts.map((p) => ({
    label: L(p.name),
    color: `var(${p.colorVar})`,
    values: TREND[p.id],
  }))

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader
        title={t('Overview', 'نظرة عامة')}
        lede={t('Headline experience scores across products, and what needs attention.', 'مؤشرات التجربة الرئيسية عبر المنتجات، وما يحتاج إلى اهتمام.')}
      />

      <div className="grid g5">
        <Tile label={t('NPS', 'مؤشر NPS')} value={fmtSigned(overallNps)} sub={t('promoters − detractors', 'المروّجون − المنتقدون')} />
        <Tile label="CSAT" value={overallCsat != null ? `${overallCsat}%` : '–'} />
        <Tile label={t('Responses', 'الردود')} value={totalResponses.toLocaleString()} />
        <Tile label={t('Mystery shopper score', 'نتيجة التسوق السري')} value={avgShopperScore != null ? `${avgShopperScore}%` : '–'} />
        <Tile label={t('Open incidents', 'الحوادث المفتوحة')} value={openIncidents.length} sub={breached.length ? t(`${breached.length} breached`, `${breached.length} تم خرقها`) : t('none breached', 'لا يوجد خرق')} trend={breached.length ? 'down' : undefined} />
      </div>

      <div className="grid g-21">
        <div className="card">
          <div className="card-h"><h2>{t('Monthly NPS trend by product', 'اتجاه NPS الشهري حسب المنتج')}</h2></div>
          <LineChart series={trendSeries} labels={['-5', '-4', '-3', '-2', '-1', t('Now', 'الآن')]} />
        </div>
        <div className="card">
          <div className="card-h"><h2>{t('Alerts', 'التنبيهات')}</h2></div>
          <div className="list">
            {ALERTS.filter((a) => scopedProducts.some((p) => p.id === a.product)).map((a, i) => (
              <div className="item" key={i}>
                <div className="row between">
                  <ProductTag productId={a.product} />
                  <Chip kind={a.level === 'crit' ? 'crit' : a.level === 'warn' ? 'warn' : 'good'}>{a.level}</Chip>
                </div>
                <p className="sm" style={{ marginTop: 4 }}>{L(a.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h2>{t('NPS by channel', 'مؤشر NPS حسب القناة')}</h2></div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>{t('Product', 'المنتج')}</th>
                {CHANNELS.map((c) => <th key={c.id} className="n">{L(c.short)}</th>)}
                <th className="n">{t('Overall', 'الإجمالي')}</th>
              </tr>
            </thead>
            <tbody>
              {scopedProducts.map((p) => {
                const rows = vocFor(p.id)
                const overall = aggregateNps(rows)
                return (
                  <tr key={p.id}>
                    <td><ProductTag productId={p.id} /></td>
                    {CHANNELS.map((c) => {
                      const row = rows.find((r) => r.channel === c.id)
                      const value = row ? aggregateNps([row]) : null
                      return (
                        <td key={c.id} className="n">
                          {row && row.n > 0 && value != null
                            ? <span style={{ color: npsColor(value), fontWeight: 600 }}>{fmtSigned(value)}</span>
                            : <span className="muted">{t('no data yet', 'لا توجد بيانات بعد')}</span>}
                        </td>
                      )
                    })}
                    <td className="n" style={{ fontWeight: 700 }}>{overall != null ? <span style={{ color: npsColor(overall) }}>{fmtSigned(overall)}</span> : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g-21">
        <div className="card">
          <div className="card-h"><h2>{t('Product comparison', 'مقارنة المنتجات')}</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th>{t('Product', 'المنتج')}</th><th className="n">NPS</th><th className="n">CSAT</th><th className="n">{t('Responses', 'الردود')}</th><th>{t('6-month trend', 'اتجاه 6 أشهر')}</th></tr></thead>
              <tbody>
                {PRODUCTS.map((p) => {
                  const rows = vocFor(p.id)
                  const n = aggregateNps(rows)
                  const c = aggregateCsat(rows)
                  return (
                    <tr key={p.id}>
                      <td><ProductTag productId={p.id} />{!p.live && <span className="muted sm"> · {t('hidden', 'مخفي')}</span>}</td>
                      <td className="n">{n != null ? fmtSigned(n) : '–'}</td>
                      <td className="n">{c != null ? `${c}%` : '–'}</td>
                      <td className="n">{rows.reduce((s, r) => s + r.n, 0)}</td>
                      <td><Sparkline values={TREND[p.id]} color={`var(${p.colorVar})`} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2>{t('Shopper pipeline', 'مسار التسوق السري')}</h2></div>
          <div className="list">
            {(['sent', 'opened', 'progress', 'submitted', 'review', 'approved', 'returned', 'overdue'] as const).map((status) => {
              const count = ASSIGNMENTS.filter((a) => a.status === status).length
              if (!count) return null
              return (
                <div className="row between" key={status}>
                  <span className="sm">{status}</span>
                  <Chip kind={status === 'overdue' ? 'crit' : status === 'approved' ? 'good' : undefined}>{count}</Chip>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
