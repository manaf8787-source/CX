import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useLeadFunnel, useProductSurveyMoments, useSurveyTriggers } from '../services/queries'
import { SampleBanner } from '../components/common/SampleBanner'
import { ProductTag } from '../components/common/Chip'
import { PRODUCTS } from '../data/products'
import type { LeadFunnelStage } from '../types'

const INSTRUMENT_LABEL: Record<string, { en: string; ar: string }> = {
  nps: { en: 'NPS', ar: 'مؤشر الترويج الصافي' },
  csat_ces: { en: 'CSAT + CES', ar: 'رضا العملاء + جهد العميل' },
  what_stopped_you: { en: '"What stopped you?"', ar: '"ما الذي أوقفك؟"' },
  abandoned_ces: { en: 'CES', ar: 'جهد العميل' },
  re_survey: { en: 'Re-survey', ar: 'إعادة استبيان' },
}

const STAGE_LABEL: Record<LeadFunnelStage, { en: string; ar: string }> = {
  enquiry: { en: 'Enquiry', ar: 'استفسار' },
  contacted: { en: 'Contacted', ar: 'تم التواصل' },
  viewing: { en: 'Viewing', ar: 'معاينة' },
  offer: { en: 'Offer', ar: 'عرض' },
  signed: { en: 'Signed', ar: 'توقيع' },
}

/** FR-7.1–7.4 — the lead funnel framing every transactional survey, the
 * nine-row trigger/cap table (FR-7.2) collapsed to the five confirmed
 * instruments, the public-channel exemption (FR-7.3), and the per-product
 * "no group NPS, by design" breakdown (FR-7.4) as explicit UI copy, not an
 * implied omission. */
export default function Surveys() {
  const { t, L, lang } = useI18n()
  const { data: funnel } = useLeadFunnel()
  const { data: triggers } = useSurveyTriggers()
  const { data: productMoments } = useProductSurveyMoments()
  const [selectedStage, setSelectedStage] = useState<LeadFunnelStage>('contacted')

  const selected = useMemo(() => funnel?.find((f) => f.stage === selectedStage), [funnel, selectedStage])

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Surveys and triggers', 'الاستبيانات والمحفزات')}</h1>
          <p className="page-lede">
            {t('Ask only after something meaningful, never on a public channel, never more than the caps — one line per product.', 'نسأل فقط بعد أمر ذي معنى، وأبداً على قناة عامة، وأبداً أكثر من الحدود المسموحة — خط واحد لكل منتج.')}
          </p>
        </div>
        <SampleBanner />
      </div>

      <div className="card tint">
        <span className="chip warn" style={{ marginBottom: 6 }}>{t('Group NPS: none, by design', 'مؤشر NPS الموحد: غير موجود، بالتصميم')}</span>
        <p className="text-sm" style={{ marginTop: 6 }}>
          {t(
            'Each product has its own NPS, CSAT and CES line and its own moments — Tour Estate, PSI Club and PSI Events are separate businesses with different customers, so no number ever mixes them (FR-7.4).',
            'لكل منتج خط NPS وCSAT وCES خاص به ولحظاته الخاصة — تور إستيت ونادي بي إس آي وفعاليات بي إس آي أعمال منفصلة بعملاء مختلفين، فلا يُدمج أي رقم بينها — FR-7.4.',
          )}
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('The lead funnel: who completes, and why the rest do not', 'قمع العملاء المحتملين: من يكمل، ولماذا لا يكمل الباقون')}</h2>
          <span className="text-sm muted">{t('PSI Real Estate · sample figures', 'العقارية · أرقام توضيحية')}</span>
        </div>
        <div className="steps-row">
          {funnel?.map((f) => (
            <button
              type="button"
              key={f.stage}
              className="step-card"
              style={{ '--c': f.stage === selectedStage ? 'var(--brand)' : 'var(--line-strong)', textAlign: 'start', cursor: 'pointer' } as CSSProperties}
              onClick={() => setSelectedStage(f.stage)}
            >
              <span className="text-sm muted">{L(STAGE_LABEL[f.stage])}</span>
              <b>{f.count.toLocaleString()}</b>
            </button>
          ))}
        </div>
        <p className="text-sm muted" style={{ marginTop: 8 }}>
          {t('Enquiry on the website or app: no survey — measured by the reach index (reply time, channels needed). NPS is asked only of the 150 who complete; the rest are asked other things, at the stage they stopped. 12 deals are frozen.', 'الاستفسار عبر الموقع أو التطبيق: دون استبيان — يُقاس بمؤشر الوصول (زمن الرد، القنوات المطلوبة). يُطلب مؤشر NPS فقط ممن أكملوا (150)؛ ويُسأل الباقون أموراً أخرى عند مرحلة توقفهم. 12 صفقة مجمّدة.')}
        </p>

        {selected && (
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div className="col">
              <h3 style={{ marginBottom: 6 }}>{t('Source split', 'تقسيم المصدر')}</h3>
              <div className="col" style={{ gap: 4 }}>
                {selected.sourceSplit.map((s, i) => (
                  <div className="row between" key={i}>
                    <span className="text-sm">{L(s.label)}</span>
                    <span className="text-sm mono muted">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col">
              <h3 style={{ marginBottom: 6 }}>{t('Why they stopped here', 'لماذا توقفوا هنا')}</h3>
              <div className="col" style={{ gap: 4 }}>
                {selected.whyTheyStopped?.map((w, i) => (
                  <div className="row between" key={i}>
                    <span className="text-sm">{L(w.reason)}</span>
                    <span className="text-sm mono muted">{w.count.toLocaleString()}</span>
                  </div>
                ))}
                {!selected.whyTheyStopped && <span className="text-sm muted">{t('Everyone here completed — nothing to explain.', 'الجميع هنا أكملوا — لا يوجد ما يُفسَّر.')}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('When we ask, and when we never ask', 'متى نسأل، ومتى لا نسأل أبداً')}</h2>
          <Link to="/settings/rules" className="text-sm">{t('Edit caps under Rules as configuration →', 'تعديل الحدود ضمن القواعد كإعدادات ←')}</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Instrument', 'الأداة')}</th>
                <th>{t('Moment and rule', 'اللحظة والقاعدة')}</th>
                <th className="num">{t('Cap', 'الحد')}</th>
              </tr>
            </thead>
            <tbody>
              {triggers?.map((tr) => (
                <tr key={tr.id}>
                  <td><span className="chip accent">{L(INSTRUMENT_LABEL[tr.instrument] ?? { en: tr.instrument, ar: tr.instrument })}</span></td>
                  <td className="text-sm">{L(tr.triggerDescription)}</td>
                  <td className="num mono">{tr.capDays ? t(`${tr.capDays}d`, `${tr.capDays} يوم`) : t('No cap', 'بدون حد')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!triggers?.length && <div className="empty-state">{t('No instruments configured yet.', 'لا توجد أدوات مُعدّة بعد.')}</div>}
        </div>
      </div>

      <div className="card tint">
        <span className="chip crit" style={{ marginBottom: 6 }}>{t('Never surveyed', 'لا يُستبين أبداً')}</span>
        <p className="text-sm" style={{ marginTop: 6 }}>
          {t(
            'Facebook, Instagram, LinkedIn and Google are never surveyed — a public mention cannot be tied to a customer, a stage or an agent with confidence. Instead it is counted as a signal with a public reply within 48 hours, feeding the public reputation index (FR-7.3).',
            'فيسبوك وإنستغرام ولينكد إن وجوجل لا تُستبين أبداً — لا يمكن ربط الإشارة العامة بعميل أو مرحلة أو وكيل بثقة. بدلاً من ذلك تُحتسب إشارةً مع رد عام خلال 48 ساعة، لتغذية مؤشر السمعة العامة — FR-7.3.',
          )}
        </p>
        <Link to="/actions/signals" className="text-sm">{t('See the 48h public-reply clock in Signals & patterns →', 'انظر ساعة الرد العام خلال 48 ساعة في الإشارات والأنماط ←')}</Link>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 10 }}>{t('Per product, no group number', 'لكل منتج، دون رقم موحد')}</h2>
        <div className="grid grid-3">
          {PRODUCTS.map((p) => {
            const moments = productMoments?.find((m) => m.product === p.id)
            return (
              <div className="card tint" key={p.id}>
                <div className="row between">
                  <ProductTag productId={p.id} lang={lang} />
                  {!p.live && <span className="chip">{t('Hidden until launch', 'مخفي حتى الإطلاق')}</span>}
                </div>
                <p className="text-sm" style={{ marginTop: 8 }}>{moments ? L(moments.momentsSummary) : '—'}</p>
                {moments && !moments.hasNps && (
                  <span className="chip warn" style={{ marginTop: 6 }}>{t('No NPS for this product', 'لا يوجد NPS لهذا المنتج')}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
