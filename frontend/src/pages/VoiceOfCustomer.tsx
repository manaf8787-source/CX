import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip, ProductTag } from '../components/ui/Chip'
import { StackBar } from '../components/ui/Charts'
import { PRODUCTS } from '../data/products'
import { useSettings } from '../settings/SettingsContext'
import { channel as findChannel } from '../data/channels'
import { vocFor } from '../data/voc'
import { VOC_COMMENTS } from '../data/vocComments'
import { aggregateCsat, aggregateNps, fmtSigned } from '../lib/metrics'
import { useRole } from '../auth/RoleContext'

export default function VoiceOfCustomer() {
  const { L, t } = useI18n()
  const { role } = useRole()
  const { isLaunched } = useSettings()
  const [filterProduct, setFilterProduct] = useState<string>('all')

  const scoped = role?.product ? PRODUCTS.filter((p) => p.id === role.product) : PRODUCTS.filter((p) => isLaunched(p.id))
  const comments = VOC_COMMENTS.filter((c) => scoped.some((p) => p.id === c.product) && (filterProduct === 'all' || c.product === filterProduct))

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Voice of Customer', 'صوت العميل')} lede={t('What customers say across every channel — comments, IVR feedback and survey free text, with themes and sentiment.', 'ما يقوله العملاء عبر كل القنوات — التعليقات، ملاحظات الرد الصوتي، والنصوص الحرة في الاستبيانات، مع المواضيع والمشاعر.')} />

      <div className="grid g-21">
        {scoped.map((p) => {
          const rows = vocFor(p.id)
          return (
            <div className="card" key={p.id}>
              <div className="card-h">
                <h2><ProductTag productId={p.id} /></h2>
                <span className="sm muted">{t('NPS', 'NPS')} {fmtSigned(aggregateNps(rows))} · CSAT {aggregateCsat(rows) ?? '–'}%</span>
              </div>
              <div className="list">
                {rows.map((r) => {
                  const ch = findChannel(r.channel)
                  return (
                    <div key={r.channel} className="row between" style={{ gap: 10 }}>
                      <span className="sm" style={{ width: 90 }}>{ch && L(ch.short)}</span>
                      {r.n > 0 ? (
                        <>
                          <div style={{ flex: 1 }}><StackBar promoters={r.promoters} passives={r.passives} detractors={r.detractors} /></div>
                          <span className="sm mono" style={{ width: 70, textAlign: 'end' }}>{r.n} {t('resp.', 'ردّ')}</span>
                        </>
                      ) : (
                        <span className="muted sm" style={{ flex: 1 }}>{t('no data yet', 'لا توجد بيانات بعد')}</span>
                      )}
                    </div>
                  )
                })}
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
        <div className="card-h">
          <h2>{t('Comments and free text', 'التعليقات والنصوص الحرة')}</h2>
          <div className="pills">
            <button className={`pill-b ${filterProduct === 'all' ? '' : ''}`} aria-pressed={filterProduct === 'all'} onClick={() => setFilterProduct('all')}>{t('All', 'الكل')}</button>
            {scoped.map((p) => (
              <button key={p.id} className="pill-b" style={{ ['--c' as string]: `var(${p.colorVar})` }} aria-pressed={filterProduct === p.id} onClick={() => setFilterProduct(p.id)}>{L(p.name)}</button>
            ))}
          </div>
        </div>
        <div className="list">
          {comments.map((c, i) => (
            <div className="item" key={i}>
              <div className="row between">
                <div className="row">
                  <ProductTag productId={c.product} />
                  <span className="ent">{L(findChannel(c.channel)!.short)}</span>
                  <Chip>{L(c.theme)}</Chip>
                </div>
                <Chip kind={c.sentiment === 'positive' ? 'good' : c.sentiment === 'negative' ? 'crit' : undefined}>{c.sentiment}</Chip>
              </div>
              <p className="sm" style={{ marginTop: 6 }}>{L(c.text)}</p>
            </div>
          ))}
          {comments.length === 0 && <div className="empty">{t('No comments for this filter.', 'لا توجد تعليقات لهذا الفلتر.')}</div>}
        </div>
      </div>
    </div>
  )
}
