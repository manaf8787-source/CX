import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DeferredRender } from '@/components/common/DeferredRender'
import { ArrowRight, Globe2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { PUBLIC_MENTIONS_COPY } from '@/data/publicMentions'
import { useChartMotion } from '@/hooks/useChartMotion'
import { useNow } from '@/hooks/useNow'
import { formatMonth } from '@/lib/format'
import { useLeadFunnel } from '@/services/queries'
import { useDetractorReasons, useNpsTrend, usePublicMentions } from '@/services/referenceQueries'
import { GOOGLE_RATING_90D, type PublicPlatform } from '@/data/v38Reference'
import { CHANNEL_LABEL } from '@/components/customers/channels'
import type { Bi, Product, VocRow } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { ProductTag } from '@/components/common/Chip'
import { ChartLegend, ChartTooltip, ChartWell, RankedBars } from '@/components/common/charts'
import { CHART_MAX_CATEGORIES, chartActiveDot, chartAxis, chartColor, chartCursorLine, chartGrid, chartLine, chartLineMuted } from '@/components/common/chartTheme'
import { PressFilter } from './SubPageHeader'
import { StatWell } from './StatWell'
import { NpsBar, NpsLegend } from './NpsBar'
import { StackedBars } from './StackedBars'

const VOC_CHANNEL_LABEL: Record<string, Bi> = {
  digital: { en: 'Digital', ar: 'رقمي' },
  call: { en: 'Call', ar: 'اتصال' },
  app: { en: 'App', ar: 'التطبيق' },
  branch: { en: 'Branch', ar: 'الفرع' },
  event: { en: 'Event', ar: 'فعالية' },
}

const PLATFORM_CHANNEL: Record<PublicPlatform, 'facebook' | 'instagram' | 'linkedin' | 'google'> = {
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  google: 'google',
}

function npsOf(r: Pick<VocRow, 'n' | 'promoters' | 'detractors'>) {
  return r.n ? Math.round(((r.promoters - r.detractors) / r.n) * 100) : null
}

/** The status dot of a heatmap cell: error below 0, warning below 30, success above (sample-scale bands). The number is printed in ink. */
function heatDot(v: number | null) {
  if (v == null) return null
  return v < 0 ? 'dot-error' : v < 30 ? 'dot-warning' : 'dot-success'
}

/** KB §10: the public reputation index — volume, share negative, Google rating,
 * reply rate and time, per channel. Separate from NPS; nobody here is identified.
 * Four stat wells (no colour on the numbers) and the platform table on the card. */
export function ReputationIndex() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: mentions, isLoading } = usePublicMentions()
  const idx = useMemo(() => {
    const list = mentions ?? []
    const neg = list.filter((m) => m.sentiment < 0)
    const hours = list.filter((m) => m.replyHours != null).map((m) => m.replyHours as number)
    const platforms: PublicPlatform[] = ['facebook', 'instagram', 'linkedin', 'google']
    return {
      n: list.length,
      posShare: list.length ? Math.round((100 * list.filter((m) => m.sentiment > 0).length) / list.length) : 0,
      negShare: list.length ? Math.round((100 * neg.length) / list.length) : 0,
      avgReplyH: hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : 0,
      movedShare: neg.length ? Math.round((100 * neg.filter((m) => m.becameIdentified).length) / neg.length) : 0,
      byPlatform: platforms.map((p) => {
        const rows = list.filter((m) => m.platform === p)
        return {
          platform: p,
          n: rows.length,
          pos: rows.filter((m) => m.sentiment > 0).length,
          neg: rows.filter((m) => m.sentiment < 0).length,
          replied: rows.filter((m) => m.replied).length,
          identified: rows.filter((m) => m.becameIdentified).length,
        }
      }),
    }
  }, [mentions])
  const num = (v: number) => v.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')

  return (
    <SectionCard
      term="Public reputation index"
      title={
        <span className="inline-flex items-center gap-2">
          <Globe2 aria-hidden className="size-4 text-muted-foreground" />
          {t('Public reputation index', 'مؤشر السمعة العامة')}
        </span>
      }
      description={t(
        'Facebook, Instagram, LinkedIn and Google. Nobody here is identified, so there are no surveys: mentions count as signals and as reputation, never as journeys. Separate from NPS.',
        'فيسبوك وإنستغرام ولينكد إن وغوغل. لا أحد هنا معرَّف، فلا استبيانات: تُحسب الإشارات كإشارات وكسمعة، لا كرحلات. منفصل عن NPS.',
      )}
      actions={
        // v40 (F30): the button into the Public mentions list (reply status, Marketing as owner, the 48-hour clock).
        canAccessPath(role.id, '/settings/public-mentions') && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/settings/public-mentions">
              {L(PUBLIC_MENTIONS_COPY.reputationButton)}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        )
      }
      contentClassName="flex flex-col gap-5"
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatWell
              label={t('Positive / negative', 'إيجابي / سلبي')}
              value={<bdi dir="ltr">{`${idx.posShare}% / ${idx.negShare}%`}</bdi>}
              sub={t(`${idx.n} public mentions, 30 days`, `${num(idx.n)} إشارة عامة، 30 يوماً`)}
            />
            <StatWell label={t('Google rating', 'تقييم غوغل')} value={GOOGLE_RATING_90D.toFixed(1)} sub={t('Average of the last 90 days', 'متوسط آخر 90 يوماً')} />
            <StatWell label={t('Public reply time', 'زمن الرد العام')} value={<bdi dir="ltr">{`${idx.avgReplyH} h`}</bdi>} sub={t('Target: under 48 h', 'الهدف: أقل من 48 ساعة')} />
            <StatWell label={t('Moved to a private channel', 'انتقلوا إلى قناة خاصة')} value={`${idx.movedShare}%`} sub={t('of negative mentions became identified', 'من الإشارات السلبية أصبحت معرَّفة')} />
          </div>
          <div className="-mx-2.5">
            <Table density="comfortable">
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Platform', 'المنصة')}</TableHead>
                  <TableHead className="text-end">{t('Mentions', 'الإشارات')}</TableHead>
                  <TableHead className="text-end">{t('Positive', 'إيجابي')}</TableHead>
                  <TableHead className="text-end">{t('Negative', 'سلبي')}</TableHead>
                  <TableHead className="text-end">{t('Replied', 'رُدّ عليها')}</TableHead>
                  <TableHead className="text-end">{t('Became identified', 'أصبحت معرَّفة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {idx.byPlatform.map((r) => (
                  <TableRow key={r.platform}>
                    <TableCell className="font-medium text-foreground">
                      {L(CHANNEL_LABEL[PLATFORM_CHANNEL[r.platform]])} <span className="font-normal text-muted-foreground">· {t('public', 'عام')}</span>
                    </TableCell>
                    {[r.n, r.pos, r.neg, r.replied, r.identified].map((v, k) => (
                      <TableCell key={k} className="text-end tabular">
                        {num(v)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="t-body-s">
            {t(
              'Rule: every negative public mention gets a public reply within 48 hours, inviting the person to WhatsApp or the app. Once they give a mobile number or booking reference, the mention moves onto their journey.',
              'القاعدة: كل إشارة عامة سلبية تحصل على رد عام خلال 48 ساعة يدعو الشخص إلى واتساب أو التطبيق. حين يعطي رقم جوال أو مرجع حجز تنتقل الإشارة إلى رحلته.',
            )}
          </p>
        </>
      )}
    </SectionCard>
  )
}

/** One product's NPS trend as a small multiple: its name, the latest value printed, one ink line. Used past the skill's four categories. */
function ProductTrend({ product, rows, latest }: { product: Product; rows: Record<string, string | number>[]; latest: number | undefined }) {
  const { lang } = useI18n()
  const chartMotion = useChartMotion()
  return (
    <div className="well flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <ProductTag productId={product.id} lang={lang} />
        <span className="t-small-strong tabular">
          NPS <bdi dir="ltr">{latest ?? '–'}</bdi>
        </span>
      </div>
      <div className="h-20 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <YAxis hide domain={[0, 80]} />
            <Line type="monotone" dataKey={product.id} {...chartLine} {...chartMotion} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** KB §15: NPS by month and by channel, the product-by-channel heatmap and
 * why detractors are unhappy — each product on its own line, no group number.
 * Charts follow the skill: the first product is the ink hero line, the others grey, blue and amber (four at most); with more live
 * products the trend becomes small multiples. Values are printed (tooltip, row text) because the grey series is low contrast. */
export function OverviewCharts({ products, vocRows }: { products: Product[]; vocRows: VocRow[] }) {
  const { t, L, lang, dir } = useI18n()
  const chartMotion = useChartMotion()
  const now = useNow()
  const { data: trend } = useNpsTrend()
  const { data: reasons } = useDetractorReasons()
  const [channelProduct, setChannelProduct] = useState(products[0]?.id)
  const selected = products.some((p) => p.id === channelProduct) ? channelProduct : products[0]?.id

  const months = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now)
        d.setDate(1)
        d.setMonth(d.getMonth() - (5 - i))
        return formatMonth(d, lang)
      }),
    [now, lang],
  )
  const trendRows = useMemo(() => {
    const rows = months.map((month, i) => {
      const row: Record<string, string | number> = { month }
      for (const p of products) {
        const v = trend?.[p.id]?.[i]
        if (v !== undefined) row[p.id] = v
      }
      return row
    })
    return dir === 'rtl' ? rows.reverse() : rows
  }, [months, products, trend, dir])

  const channels = [...new Set(vocRows.filter((r) => products.some((p) => p.id === r.product)).map((r) => r.channel))]
  const multiples = products.length > CHART_MAX_CATEGORIES

  return (
    <>
      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-2">
        <SectionCard term="NPS" title={t('NPS by month', 'NPS حسب الشهر')} description={t('One line per product; never combined.', 'خط لكل منتج؛ دون دمج.')}>
          {multiples ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <ProductTrend key={p.id} product={p} rows={trendRows} latest={trend?.[p.id]?.[5]} />
              ))}
            </div>
          ) : (
            <div dir="ltr">
              <DeferredRender fallback={<div aria-hidden className="well" style={{ height: 292 }} />}>
                <ChartWell
                  height={240}
                  label={t('NPS by month', 'NPS حسب الشهر')}
                  legend={<ChartLegend items={products.map((p, i) => ({ label: L(p.name), color: chartColor(i) }))} />}
                >
                  <LineChart data={trendRows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis dataKey="month" {...chartAxis} />
                    <YAxis {...chartAxis} width={28} orientation={dir === 'rtl' ? 'right' : 'left'} domain={[0, 80]} />
                    <Tooltip cursor={chartCursorLine} content={<ChartTooltip />} />
                    {products.map((p, i) => (
                      <Line key={p.id} type="monotone" dataKey={p.id} name={L(p.name)} {...(i === 0 ? chartLine : chartLineMuted)} stroke={chartColor(i)} activeDot={chartActiveDot} {...chartMotion} />
                    ))}
                  </LineChart>
                </ChartWell>
              </DeferredRender>
            </div>
          )}
        </SectionCard>

        <SectionCard
          term="NPS"
          title={t('NPS by channel', 'NPS حسب القناة')}
          description={t('Promoters, passives and detractors, for one product at a time.', 'المروّجون والمحايدون والمنتقدون، لمنتج واحد في كل مرة.')}
          contentClassName="flex flex-col gap-4"
        >
          <PressFilter label={t('Product', 'المنتج')} value={selected ?? ''} onChange={setChannelProduct} options={products.map((p) => ({ id: p.id, label: L(p.name) }))} />
          <div className="well flex flex-col gap-4">
            <ul className="flex flex-col gap-3.5">
              {vocRows
                .filter((r) => r.product === selected && r.n > 0)
                .map((r) => (
                  <li key={r.channel} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="t-small-strong">{L(VOC_CHANNEL_LABEL[r.channel] ?? { en: r.channel, ar: r.channel })}</span>
                      <span className="t-body-s tabular">
                        NPS <bdi dir="ltr" className="font-medium text-foreground">{npsOf(r)}</bdi> · n {r.n}
                      </span>
                    </div>
                    <NpsBar promoters={r.promoters} passives={r.passives} detractors={r.detractors} />
                  </li>
                ))}
            </ul>
            <NpsLegend />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-2">
        <SectionCard title={t('NPS heatmap: product by channel', 'خريطة NPS: المنتج حسب القناة')} description={t('Each cell shows NPS and its sample size.', 'تُظهر كل خلية NPS وحجم عينتها.')}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th scope="col" className="t-body-s px-1 pb-1 text-start font-normal">{t('Product', 'المنتج')}</th>
                  {channels.map((c) => (
                    <th key={c} scope="col" className="t-body-s px-1 pb-1 text-center font-normal">
                      {L(VOC_CHANNEL_LABEL[c] ?? { en: c, ar: c })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="px-1 py-1 text-start font-normal">
                      <ProductTag productId={p.id} lang={lang} />
                    </th>
                    {channels.map((c) => {
                      const row = vocRows.find((r) => r.product === p.id && r.channel === c)
                      const v = row ? npsOf(row) : null
                      const dot = heatDot(v)
                      return (
                        <td key={c} className="p-1" title={row ? `n ${row.n}` : undefined}>
                          <div className="flex h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-[10px] bg-well tabular">
                            <span className="inline-flex items-center gap-1.5">
                              {dot && <span aria-hidden className={cn('dot', dot)} />}
                              <bdi dir="ltr" className="t-small-strong">{v ?? '–'}</bdi>
                            </span>
                            {row && <span className="t-caption">n {row.n}</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title={t('Why detractors are unhappy', 'أسباب عدم رضا المنتقدين')} description={t('Share of detractor reasons, %.', 'نسبة أسباب المنتقدين، %.')} well>
          <StackedBars
            label={t('Why detractors are unhappy', 'أسباب عدم رضا المنتقدين')}
            items={(reasons ?? []).map((r) => ({ key: r.reason.en, label: L(r.reason), value: r.pct, display: `${r.pct}%` }))}
          />
        </SectionCard>
      </div>
    </>
  )
}

/** KB §9/§15: the lead funnel on the Overview — five stages and where people stop. The bar comparison of the skill: the first stage is the
 * dark hero row, the rest grey, every count printed. */
export function FunnelSummary() {
  const { t, L, lang } = useI18n()
  const { data: funnel, isLoading } = useLeadFunnel()
  const STAGE: Record<string, Bi> = {
    enquiry: { en: 'Leads', ar: 'العملاء المحتملون' },
    contacted: { en: 'Contacted', ar: 'تم التواصل' },
    viewing: { en: 'Viewings', ar: 'المعاينات' },
    offer: { en: 'Offers', ar: 'العروض' },
    signed: { en: 'Signed deals', ar: 'صفقات موقّعة' },
  }
  return (
    <SectionCard
      title={t('Lead funnel', 'قمع العملاء المحتملين')}
      description={t('PSI Real Estate, sample figures; stages [Proposed] until Marketing confirms them.', 'العقارية، أرقام توضيحية؛ المراحل [مقترحة] حتى يؤكدها التسويق.')}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/surveys">
            {t('Source split and why they stopped', 'المصادر وأسباب التوقف')}
            <ArrowRight aria-hidden className="rtl:rotate-180" />
          </Link>
        </Button>
      }
      well
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : (
        <RankedBars
          label={t('Lead funnel', 'قمع العملاء المحتملين')}
          items={(funnel ?? []).map((f) => ({
            key: f.stage,
            label: L(STAGE[f.stage] ?? { en: f.stage, ar: f.stage }),
            value: f.count,
            display: f.count.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US'),
          }))}
        />
      )}
    </SectionCard>
  )
}
