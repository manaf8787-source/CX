import { useState } from 'react'
import { useI18n } from '../../i18n'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Chip, ProductTag } from '../../components/common/Chip'
import { useProducts, useVocComments, useVocRows } from '../../services/queries'
import type { ProductId, VocRow } from '../../types'

function nps(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  const p = rows.reduce((s, r) => s + r.promoters, 0)
  const d = rows.reduce((s, r) => s + r.detractors, 0)
  return Math.round(((p - d) / n) * 100)
}
function fmtSigned(v: number | null) {
  return v == null ? '–' : (v > 0 ? '+' : '') + v
}

/** Ported from `frontend/src/pages/VoiceOfCustomer.tsx` (APPLICATION_MODULES.md
 * §C) — "what customers say across every channel," reusing the results view
 * as-is while the Surveys and triggers page (net-new) owns the current
 * trigger/cap model. */
export default function Voc() {
  const { t, L, lang } = useI18n()
  const { data: products } = useProducts()
  const { data: vocRows } = useVocRows()
  const { data: comments } = useVocComments()
  const [filterProduct, setFilterProduct] = useState<ProductId | 'all'>('all')

  const launched = (products ?? []).filter((p) => p.live)
  const visibleComments = (comments ?? []).filter((c) => launched.some((p) => p.id === c.product) && (filterProduct === 'all' || c.product === filterProduct))

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted">{t('Comments, IVR feedback and survey free text across every channel, with themes and sentiment.', 'التعليقات وملاحظات الرد الصوتي والنصوص الحرة عبر كل القنوات، مع المواضيع والمشاعر.')}</p>
        <SampleBanner />
      </div>

      <div className="grid grid-2">
        {launched.map((p) => {
          const rows = (vocRows ?? []).filter((r) => r.product === p.id)
          return (
            <div className="card" key={p.id}>
              <div className="card-head">
                <ProductTag productId={p.id} lang={lang} />
                <span className="text-sm muted">NPS {fmtSigned(nps(rows))}</span>
              </div>
              <div className="col" style={{ gap: 6 }}>
                {rows.map((r) => (
                  <div key={r.channel} className="row between">
                    <span className="text-sm" style={{ width: 90 }}>{r.channel}</span>
                    <div className="stack" style={{ flex: 1 }}>
                      <i style={{ width: `${(r.promoters / Math.max(1, r.n)) * 100}%`, background: 'var(--good)' }} />
                      <i style={{ width: `${(r.passives / Math.max(1, r.n)) * 100}%`, background: 'var(--neutral)' }} />
                      <i style={{ width: `${(r.detractors / Math.max(1, r.n)) * 100}%`, background: 'var(--crit)' }} />
                    </div>
                    <span className="text-sm mono" style={{ width: 70, textAlign: 'end' }}>{r.n} {t('resp.', 'ردّ')}</span>
                  </div>
                ))}
                {!rows.length && <span className="text-sm muted">{t('no data yet', 'لا توجد بيانات بعد')}</span>}
              </div>
              <div className="legend" style={{ marginTop: 10 }}>
                <span><i style={{ background: 'var(--good)' }} />{t('Promoters', 'المروّجون')}</span>
                <span><i style={{ background: 'var(--neutral)' }} />{t('Passives', 'المحايدون')}</span>
                <span><i style={{ background: 'var(--crit)' }} />{t('Detractors', 'المنتقدون')}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('Comments and free text', 'التعليقات والنصوص الحرة')}</h2>
          <div className="row">
            <button type="button" className={`chip ${filterProduct === 'all' ? 'accent' : ''}`} onClick={() => setFilterProduct('all')}>{t('All', 'الكل')}</button>
            {launched.map((p) => (
              <button key={p.id} type="button" className={`chip ${filterProduct === p.id ? 'accent' : ''}`} onClick={() => setFilterProduct(p.id)}>{L(p.name)}</button>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 10 }}>
          {visibleComments.map((c, i) => (
            <div className="row between" key={i} style={{ alignItems: 'flex-start' }}>
              <div className="col" style={{ gap: 4 }}>
                <div className="row">
                  <ProductTag productId={c.product} lang={lang} />
                  <span className="text-sm muted">{c.channel}</span>
                  <Chip>{L(c.theme)}</Chip>
                </div>
                <p className="text-sm">{L(c.text)}</p>
              </div>
              <Chip tone={c.sentiment === 'positive' ? 'good' : c.sentiment === 'negative' ? 'crit' : undefined}>{c.sentiment}</Chip>
            </div>
          ))}
          {!visibleComments.length && <div className="empty-state">{t('No comments for this filter.', 'لا توجد تعليقات لهذا الفلتر.')}</div>}
        </div>
      </div>
    </div>
  )
}
