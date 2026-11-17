import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tile } from '../components/ui/Tile'
import { Chip } from '../components/ui/Chip'
import { product } from '../data/products'
import { vocFor } from '../data/voc'
import { aggregateCsat, aggregateNps, fmtSigned } from '../lib/metrics'
import { useSettings } from '../settings/SettingsContext'
import { CLUB_MEMBERS, DRIVERS, EVENT_STAFF, GUIDES } from '../data/otherProducts'
import type { ProductId } from '../types'

const EXTRA: Record<string, { title: { en: string; ar: string }; rows: { name: string; a: string | number; b: string | number }[]; aLabel: { en: string; ar: string }; bLabel: { en: string; ar: string } }> = {
  cl: {
    title: { en: 'VIP members', ar: 'الأعضاء المميزون' },
    rows: CLUB_MEMBERS.map((m) => ({ name: m.name, a: m.leadsNominated, b: m.converted })),
    aLabel: { en: 'Leads nominated', ar: 'العملاء المرشّحون' }, bLabel: { en: 'Converted', ar: 'تم التحويل' },
  },
  to: {
    title: { en: 'Guides and drivers', ar: 'المرشدون والسائقون' },
    rows: [...GUIDES, ...DRIVERS].map((g) => ({ name: g.name, a: g.trips, b: g.rating })),
    aLabel: { en: 'Trips', ar: 'الرحلات' }, bLabel: { en: 'Rating', ar: 'التقييم' },
  },
  ev: {
    title: { en: 'Event leads', ar: 'قادة الفعاليات' },
    rows: EVENT_STAFF.map((e) => ({ name: e.name, a: e.events, b: e.checkInAvg })),
    aLabel: { en: 'Events', ar: 'الفعاليات' }, bLabel: { en: 'Avg. check-in', ar: 'متوسط التسجيل' },
  },
}

export default function ProductPage({ productId }: { productId: ProductId }) {
  const { L, t } = useI18n()
  const { isLaunched } = useSettings()
  const p = product(productId)!
  const rows = vocFor(productId)
  const nps = aggregateNps(rows)
  const csat = aggregateCsat(rows)
  const extra = EXTRA[productId]

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={L(p.name)} lede={L(p.blurb)} actions={!isLaunched(productId) ? <Chip kind="warn">{t('Hidden until launch', 'مخفي حتى الإطلاق')}</Chip> : undefined} />
      <div className="grid g3">
        <Tile label="NPS" value={fmtSigned(nps)} colorVar={p.colorVar} />
        <Tile label="CSAT" value={csat != null ? `${csat}%` : '–'} colorVar={p.colorVar} />
        <Tile label={t('Responses', 'الردود')} value={rows.reduce((s, r) => s + r.n, 0)} colorVar={p.colorVar} />
      </div>
      {extra && (
        <div className="card">
          <div className="card-h"><h2>{L(extra.title)}</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th></th><th className="n">{L(extra.aLabel)}</th><th className="n">{L(extra.bLabel)}</th></tr></thead>
              <tbody>
                {extra.rows.map((r) => <tr key={r.name}><td className="sm">{r.name}</td><td className="n">{r.a}</td><td className="n">{r.b}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
