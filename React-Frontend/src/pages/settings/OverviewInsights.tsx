import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DeferredRender } from '@/components/common/DeferredRender'
import { ArrowRight, Globe2, Star } from 'lucide-react'
import { useI18n } from '@/i18n'
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
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { ProductTag } from '@/components/common/Chip'

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

/** NPS cell colour: red below 0, amber to 30, green above (sample-scale bands). */
function heatClass(v: number | null) {
  if (v == null) return 'bg-muted text-muted-foreground'
  if (v < 0) return 'bg-destructive/15 text-danger-text'
  if (v < 30) return 'bg-warning/15 text-warning-text'
  return 'bg-success/15 text-success-text'
}

/** KB §10: the public reputation index — volume, share negative, Google rating,
 * reply rate and time, per channel. Separate from NPS; nobody here is identified. */
export function ReputationIndex() {
  const { t, L, lang } = useI18n()
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
  const th = 'px-3 text-xs font-semibold text-muted-foreground'
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
      contentClassName="flex flex-col gap-4"
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile
              label={t('Positive / negative', 'إيجابي / سلبي')}
              value={<bdi dir="ltr">{`${idx.posShare}% / ${idx.negShare}%`}</bdi>}
              sub={t(`${idx.n} public mentions, 30 days`, `${num(idx.n)} إشارة عامة، 30 يوماً`)}
              accent="var(--chart-4)"
            />
            <KpiTile label={t('Google rating', 'تقييم غوغل')} value={GOOGLE_RATING_90D.toFixed(1)} sub={t('Average of the last 90 days', 'متوسط آخر 90 يوماً')} icon={<Star />} accent="var(--brand-gold)" />
            <KpiTile
              label={t('Public reply time', 'زمن الرد العام')}
              value={<bdi dir="ltr">{`${idx.avgReplyH} h`}</bdi>}
              sub={t('Target: under 48 h', 'الهدف: أقل من 48 ساعة')}
              accent={idx.avgReplyH <= 48 ? 'var(--success)' : 'var(--destructive)'}
            />
            <KpiTile
              label={t('Moved to a private channel', 'انتقلوا إلى قناة خاصة')}
              value={`${idx.movedShare}%`}
              sub={t('of negative mentions became identified', 'من الإشارات السلبية أصبحت معرَّفة')}
              accent="var(--success)"
            />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={th}>{t('Platform', 'المنصة')}</TableHead>
                  <TableHead className={cn(th, 'text-end')}>{t('Mentions', 'الإشارات')}</TableHead>
                  <TableHead className={cn(th, 'text-end')}>{t('Positive', 'إيجابي')}</TableHead>
                  <TableHead className={cn(th, 'text-end')}>{t('Negative', 'سلبي')}</TableHead>
                  <TableHead className={cn(th, 'text-end')}>{t('Replied', 'رُدّ عليها')}</TableHead>
                  <TableHead className={cn(th, 'text-end')}>{t('Became identified', 'أصبحت معرَّفة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {idx.byPlatform.map((r) => (
                  <TableRow key={r.platform}>
                    <TableCell className="px-3 text-sm font-medium">
                      {L(CHANNEL_LABEL[PLATFORM_CHANNEL[r.platform]])} <span className="text-xs text-muted-foreground">· {t('public', 'عام')}</span>
                    </TableCell>
                    {[r.n, r.pos, r.neg, r.replied, r.identified].map((v, k) => (
                      <TableCell key={k} className="px-3 text-end text-sm tabular-nums">
                        {num(v)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
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

/** KB §15: NPS by month and by channel, the product-by-channel heatmap and
 * why detractors are unhappy — each product on its own line, no group number. */
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
  const tooltipStyle = { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard term="NPS" title={t('NPS by month', 'NPS حسب الشهر')} description={t('One line per product; never combined.', 'خط لكل منتج؛ دون دمج.')}>
          <div className="h-60" dir="ltr">
            <DeferredRender>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendRows} margin={dir === 'rtl' ? { top: 6, right: -16, bottom: 0, left: 8 } : { top: 6, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <YAxis orientation={dir === 'rtl' ? 'right' : 'left'} domain={[0, 80]} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--muted-foreground)' }}>{v}</span>} />
                  {products.map((p) => (
                    <Line key={p.id} type="monotone" dataKey={p.id} name={L(p.name)} stroke={`var(${p.colorVar})`} strokeWidth={2.4} dot={{ r: 2.5 }} {...chartMotion} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </DeferredRender>
          </div>
        </SectionCard>

        <SectionCard
          term="NPS"
          title={t('NPS by channel', 'NPS حسب القناة')}
          description={t('Promoters, passives and detractors, for one product at a time.', 'المروّجون والمحايدون والمنتقدون، لمنتج واحد في كل مرة.')}
          actions={
            <div className="flex flex-wrap gap-1" role="group" aria-label={t('Product', 'المنتج')}>
              {products.map((p) => (
                <Button key={p.id} size="sm" variant={p.id === selected ? 'default' : 'outline'} className="h-8" aria-pressed={p.id === selected} onClick={() => setChannelProduct(p.id)}>
                  {L(p.name)}
                </Button>
              ))}
            </div>
          }
        >
          <ul className="flex flex-col gap-3">
            {vocRows
              .filter((r) => r.product === selected && r.n > 0)
              .map((r) => {
                const pct = (v: number) => `${(100 * v) / r.n}%`
                return (
                  <li key={r.channel} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{L(VOC_CHANNEL_LABEL[r.channel] ?? { en: r.channel, ar: r.channel })}</span>
                      <span className="text-muted-foreground tabular-nums">
                        NPS <bdi dir="ltr">{npsOf(r)}</bdi> · n {r.n}
                      </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="bg-success" style={{ width: pct(r.promoters) }} />
                      <span className="bg-muted-foreground/40" style={{ width: pct(r.passives) }} />
                      <span className="bg-destructive" style={{ width: pct(r.detractors) }} />
                    </div>
                  </li>
                )
              })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-2 rounded-full bg-success" />{t('Promoters', 'المروّجون')}</span>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-2 rounded-full bg-muted-foreground/40" />{t('Passives', 'المحايدون')}</span>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-2 rounded-full bg-destructive" />{t('Detractors', 'المنتقدون')}</span>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title={t('NPS heatmap: product by channel', 'خريطة NPS: المنتج حسب القناة')} description={t('Each cell shows NPS and its sample size.', 'تُظهر كل خلية NPS وحجم عينتها.')}>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="px-2 text-start text-xs font-semibold text-muted-foreground">{t('Product', 'المنتج')}</th>
                  {channels.map((c) => (
                    <th key={c} scope="col" className="px-2 text-center text-xs font-semibold text-muted-foreground">
                      {L(VOC_CHANNEL_LABEL[c] ?? { en: c, ar: c })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="px-2 text-start font-normal">
                      <ProductTag productId={p.id} lang={lang} />
                    </th>
                    {channels.map((c) => {
                      const row = vocRows.find((r) => r.product === p.id && r.channel === c)
                      const v = row ? npsOf(row) : null
                      return (
                        <td key={c} className={cn('h-11 min-w-16 rounded-md text-center tabular-nums', heatClass(v))} title={row ? `n ${row.n}` : undefined}>
                          <bdi dir="ltr" className="font-semibold">{v ?? '–'}</bdi>
                          {row && <div className="text-[11px] leading-tight">n {row.n}</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title={t('Why detractors are unhappy', 'أسباب عدم رضا المنتقدين')} description={t('Share of detractor reasons, %.', 'نسبة أسباب المنتقدين، %.')}>
          <ul className="flex flex-col gap-2.5">
            {(reasons ?? []).map((r) => (
              <li key={r.reason.en} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{L(r.reason)}</span>
                  <span className="font-medium tabular-nums">{r.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-destructive" style={{ width: `${(r.pct / 35) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  )
}

/** KB §9/§15: the lead funnel on the Overview — five stages and where people stop. */
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
  const max = Math.max(1, ...(funnel ?? []).map((f) => f.count))
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
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : (
        <ol className="flex flex-col gap-2">
          {(funnel ?? []).map((f) => (
            <li key={f.stage} className="grid grid-cols-[7rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
              <span className="truncate">{L(STAGE[f.stage] ?? { en: f.stage, ar: f.stage })}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(f.count / max) * 100}%` }} />
              </span>
              <span className="text-end font-medium tabular-nums">{f.count.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
