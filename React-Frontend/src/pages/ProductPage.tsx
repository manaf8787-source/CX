import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Ban, Globe, Smartphone } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useLeadFunnel, useProducts, useVocRows } from '@/services/queries'
import { useProductSurveyRules } from '@/services/referenceQueries'
import { CES_SAMPLE, PRODUCT_COVERAGE, WALLET_COMPLAINT_TYPES } from '@/data/v38Reference'
import type { ProductId, VocRow } from '@/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingState } from '@/components/common/LoadingState'

const VOC_CHANNEL: Record<string, { en: string; ar: string }> = {
  digital: { en: 'Digital', ar: 'رقمي' },
  call: { en: 'Call', ar: 'اتصال' },
  app: { en: 'App', ar: 'التطبيق' },
  branch: { en: 'Branch', ar: 'الفرع' },
  event: { en: 'Event', ar: 'فعالية' },
}

function npsOf(rows: VocRow[]) {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  return Math.round(((rows.reduce((s, r) => s + r.promoters, 0) - rows.reduce((s, r) => s + r.detractors, 0)) / n) * 100)
}

/** Modules KB §16: each product has its own page, its own indicators and its
 * own survey moments; nothing is combined. Not-launched products stay hidden
 * until the CX manager switches them on. */
export default function ProductPage() {
  const { productId } = useParams<{ productId: ProductId }>()
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: products, isLoading } = useProducts()
  const { data: vocRows } = useVocRows()
  const { data: funnel } = useLeadFunnel()
  const { data: rules } = useProductSurveyRules()

  if (isLoading) return <LoadingState rows={6} />
  const product = products?.find((p) => p.id === productId)
  const isCx = role.id === 'cxmgr' || role.id === 'cxteam'
  if (!product || (!product.live && !isCx)) return <Navigate to={role.home} replace />

  const rows = (vocRows ?? []).filter((r) => r.product === product.id)
  const n = rows.reduce((s, r) => s + r.n, 0)
  const csat = n ? Math.round(rows.reduce((s, r) => s + r.csat * r.n, 0) / n) : null
  const ces = CES_SAMPLE[product.id]
  const rule = rules?.find((r) => r.product === product.id)
  const enquiries = funnel?.find((f) => f.stage === 'enquiry')
  const sourceCount = (name: string) => enquiries?.sourceSplit.find((s) => s.label.en === name)?.count
  const fmt = (v: number) => v.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')

  return (
    <div data-density="comfortable" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t('Product', 'المنتج')}
        title={L(product.name)}
        description={L(PRODUCT_COVERAGE[product.id])}
        actions={
          product.live ? (
            <StatusBadge tone="success" dot>
              {t('Live', 'مُفعّل')}
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral" dot>
              {t('Not launched — shown to CX for planning', 'لم يُطلق — يظهر لفريق تجربة العملاء للتخطيط')}
            </StatusBadge>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <section aria-label={t('Indicators', 'المؤشرات')} className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
          {/* The product's own hue is the one colour that means something here: a 6px dot before NPS. */}
          <KpiTile term="NPS" label="NPS" value={npsOf(rows) ?? t('Too early', 'مبكر')} accent={`var(${product.colorVar})`} sub={product.id === 'ev' ? t('No NPS for this product', 'لا NPS لهذا المنتج') : undefined} />
          <KpiTile term="CSAT" label="CSAT" value={csat ?? '–'} unit={csat != null ? '%' : undefined} />
          <KpiTile term="CES" label="CES" value={ces ?? '–'} unit={ces != null ? '%' : undefined} />
          <KpiTile label={t('Responses', 'الردود')} value={n ? fmt(n) : '–'} />
        </section>
        <p className="well flex items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground">
          <Ban aria-hidden className="size-4 shrink-0" />
          {t('This product’s own line — never combined into a group number.', 'هذا خط المنتج الخاص — لا يُدمج أبداً في رقم موحّد.')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-2">
        <SectionCard title={t('By channel', 'حسب القناة')} well>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No responses yet.', 'لا ردود بعد.')}</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {rows.map((r) => (
                <li key={r.channel} className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="t-small-strong">{L(VOC_CHANNEL[r.channel] ?? { en: r.channel, ar: r.channel })}</span>
                    <span className="t-body-s tabular">
                      NPS <bdi dir="ltr">{npsOf([r]) ?? '–'}</bdi> · CSAT {r.csat}% · n {r.n}
                    </span>
                  </div>
                  {/* Promoters = the dark hero, passives and detractors = the two greys; the numbers above are the printed values. */}
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-line shadow-inset-track" aria-hidden>
                    <span className="material-dark" style={{ width: `${(100 * r.promoters) / Math.max(1, r.n)}%` }} />
                    <span className="bg-chart-2" style={{ width: `${(100 * r.passives) / Math.max(1, r.n)}%` }} />
                    <span className="bg-chart-5" style={{ width: `${(100 * r.detractors) / Math.max(1, r.n)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {product.id === 're' && (
          <SectionCard
            term="Omnichannel" title={t('Website and app: two named sources', 'الموقع والتطبيق: مصدران منفصلان')}
            description={t('Kept apart in every count — a web user and an app user are different people at different stages.', 'منفصلان في كل عدد — مستخدم الموقع ومستخدم التطبيق شخصان مختلفان في مرحلتين مختلفتين.')}
          >
            <div className="grid grid-cols-1 gap-(--grid-gap) min-[480px]:grid-cols-2">
              <SourceWell icon={<Globe />} label={t('PSI Website', 'موقع PSI')} value={sourceCount('PSI Website') != null ? fmt(sourceCount('PSI Website')!) : '–'} sub={t('Enquiries, sample', 'استفسارات، عينة')} />
              <SourceWell
                icon={<Smartphone />}
                label={t('PSI Real Estate app', 'تطبيق PSI العقاري')}
                value={sourceCount('PSI Real Estate app') != null ? fmt(sourceCount('PSI Real Estate app')!) : '–'}
                sub={t('Enquiries, sample', 'استفسارات، عينة')}
              />
            </div>
          </SectionCard>
        )}

        {product.id === 'wl' && (
          <SectionCard title={t('Complaint types and owners', 'أنواع الشكاوى والمالكون')} description={t('Wallet events sit on the investor’s timeline as a source.', 'أحداث المحفظة تظهر على الجدول الزمني للمستثمر كمصدر.')}>
            <ul className="flex flex-col">
              {WALLET_COMPLAINT_TYPES.map((c) => (
                <li key={c.type.en} className="row-divider flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
                  <span className="font-medium text-foreground">{L(c.type)}</span>
                  <span className="text-muted-foreground">{L(c.owner)}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      {rule && (
        <SectionCard
          title={t('When this product asks', 'متى يسأل هذا المنتج')}
          description={L(rule.completed)}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings/surveys">
                {t('All surveys', 'كل الاستبيانات')}
                <ArrowRight aria-hidden className="rtl:rotate-180" />
              </Link>
            </Button>
          }
        >
          <dl className="grid grid-cols-1 gap-(--grid-gap) md:grid-cols-2">
            {[
              ['NPS', rule.nps],
              ['CSAT', rule.csat],
              ['CES', rule.ces],
              [t('"What stopped you?"', '"ما الذي أوقفك؟"'), rule.whatStoppedYou],
            ].map(([label, value]) => (
              <div key={String(label)} className="well flex flex-col gap-1">
                <dt className="text-xs font-medium text-muted-foreground">{label as string}</dt>
                <dd className="text-sm text-foreground">{L(value as { en: string; ar: string })}</dd>
              </div>
            ))}
          </dl>
          <p className="t-body-s mt-4">{L(rule.sources)}</p>
        </SectionCard>
      )}
    </div>
  )
}

/** One named source (website or app) as a well: a neutral light icon circle, the label, the count in the KPI style, a grey sub line. */
function SourceWell({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="well flex min-w-0 flex-col gap-2.5">
      <span className="t-small-strong flex items-center gap-2 text-muted-foreground">
        <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full text-foreground [&_svg]:size-4">
          {icon}
        </span>
        {label}
      </span>
      <bdi className="t-kpi">{value}</bdi>
      <span className="text-sm text-muted-foreground">{sub}</span>
    </div>
  )
}
