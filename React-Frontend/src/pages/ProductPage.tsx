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
    <div className="flex flex-col gap-6">
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

      <section aria-label={t('Indicators', 'المؤشرات')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile term="NPS" label="NPS" value={npsOf(rows) ?? t('Too early', 'مبكر')} accent={`var(${product.colorVar})`} sub={product.id === 'ev' ? t('No NPS for this product', 'لا NPS لهذا المنتج') : undefined} />
        <KpiTile term="CSAT" label="CSAT" value={csat != null ? `${csat}%` : '–'} accent="var(--success)" />
        <KpiTile term="CES" label="CES" value={ces != null ? `${ces}%` : '–'} accent="var(--info)" />
        <KpiTile label={t('Responses', 'الردود')} value={n ? fmt(n) : '–'} accent="var(--chart-4)" />
      </section>
      <p className="-mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Ban aria-hidden className="size-4" />
        {t('This product’s own line — never combined into a group number.', 'هذا خط المنتج الخاص — لا يُدمج أبداً في رقم موحّد.')}
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title={t('By channel', 'حسب القناة')}>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No responses yet.', 'لا ردود بعد.')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((r) => (
                <li key={r.channel} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{L(VOC_CHANNEL[r.channel] ?? { en: r.channel, ar: r.channel })}</span>
                    <span className="text-muted-foreground tabular-nums">
                      NPS <bdi dir="ltr">{npsOf([r]) ?? '–'}</bdi> · CSAT {r.csat}% · n {r.n}
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="bg-success" style={{ width: `${(100 * r.promoters) / Math.max(1, r.n)}%` }} />
                    <span className="bg-muted-foreground/40" style={{ width: `${(100 * r.passives) / Math.max(1, r.n)}%` }} />
                    <span className="bg-destructive" style={{ width: `${(100 * r.detractors) / Math.max(1, r.n)}%` }} />
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
            <div className="grid grid-cols-2 gap-3">
              <KpiTile label={t('PSI Website', 'موقع PSI')} value={sourceCount('PSI Website') != null ? fmt(sourceCount('PSI Website')!) : '–'} sub={t('Enquiries, sample', 'استفسارات، عينة')} icon={<Globe />} accent="var(--p-to)" />
              <KpiTile label={t('PSI Real Estate app', 'تطبيق PSI العقاري')} value={sourceCount('PSI Real Estate app') != null ? fmt(sourceCount('PSI Real Estate app')!) : '–'} sub={t('Enquiries, sample', 'استفسارات، عينة')} icon={<Smartphone />} accent="var(--p-cl)" />
            </div>
          </SectionCard>
        )}

        {product.id === 'wl' && (
          <SectionCard title={t('Complaint types and owners', 'أنواع الشكاوى والمالكون')} description={t('Wallet events sit on the investor’s timeline as a source.', 'أحداث المحفظة تظهر على الجدول الزمني للمستثمر كمصدر.')}>
            <ul className="flex flex-col divide-y">
              {WALLET_COMPLAINT_TYPES.map((c) => (
                <li key={c.type.en} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0 text-sm">
                  <span>{L(c.type)}</span>
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
              <Link to="/surveys">
                {t('All surveys', 'كل الاستبيانات')}
                <ArrowRight aria-hidden className="rtl:rotate-180" />
              </Link>
            </Button>
          }
        >
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            {[
              ['NPS', rule.nps],
              ['CSAT', rule.csat],
              ['CES', rule.ces],
              [t('"What stopped you?"', '"ما الذي أوقفك؟"'), rule.whatStoppedYou],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 p-3">
                <dt className="text-xs font-semibold text-muted-foreground">{label as string}</dt>
                <dd>{L(value as { en: string; ar: string })}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{L(rule.sources)}</p>
        </SectionCard>
      )}
    </div>
  )
}
