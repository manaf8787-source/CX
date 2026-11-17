import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Ban, ChevronRight, EyeOff, MessageCircleOff, PieChart, SlidersHorizontal } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useLeadFunnel, useProductSurveyMoments, useSurveyTriggers } from '@/services/queries'
import { PRODUCTS } from '@/data/products'
import type { LeadFunnelStage } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'

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

function GoLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ms-3 h-auto min-h-8 max-w-full self-start py-1.5 text-start whitespace-normal text-primary">
      <Link to={to}>
        {children}
        <ArrowRight aria-hidden className="rtl:rotate-180" />
      </Link>
    </Button>
  )
}

function BarList({ items, tone }: { items: { label: string; count: number }[]; tone: 'primary' | 'warning' }) {
  const { lang } = useI18n()
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">{it.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{it.count.toLocaleString(lang === 'ar' ? 'ar' : 'en')}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', tone === 'primary' ? 'bg-primary' : 'bg-warning')} style={{ width: `${(it.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** FR-7.1–7.4 — the lead funnel framing every transactional survey, the
 * nine-row trigger/cap table (FR-7.2) collapsed to the five confirmed
 * instruments, the public-channel exemption (FR-7.3), and the per-product
 * "no group NPS, by design" breakdown (FR-7.4) as explicit UI copy, not an
 * implied omission. */
export default function Surveys() {
  const { t, L, lang } = useI18n()
  const { data: funnel, isLoading: funnelLoading } = useLeadFunnel()
  const { data: triggers, isLoading: triggersLoading } = useSurveyTriggers()
  const { data: productMoments } = useProductSurveyMoments()
  const [selectedStage, setSelectedStage] = useState<LeadFunnelStage>('contacted')

  const selected = useMemo(() => funnel?.find((f) => f.stage === selectedStage), [funnel, selectedStage])
  const maxCount = Math.max(1, ...(funnel ?? []).map((f) => f.count))
  const fmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar' : 'en')
  const th = 'px-3 text-xs font-semibold text-muted-foreground'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Surveys and triggers', 'الاستبيانات والمحفزات')}
        description={t(
          'Ask only after something meaningful, never on a public channel, never more than the caps — one line per product.',
          'نسأل فقط بعد أمر ذي معنى، وأبداً على قناة عامة، وأبداً أكثر من الحدود المسموحة — خط واحد لكل منتج.',
        )}
      />

      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-text">
          <Ban className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold text-warning-text">{t('Group NPS: none, by design', 'مؤشر NPS الموحد: غير موجود، بالتصميم')}</span>
          <p className="text-sm">
            {t(
              'Each product has its own NPS, CSAT and CES line and its own moments — Tour Estate, PSI Club and PSI Events are separate businesses with different customers, so no number ever mixes them (FR-7.4).',
              'لكل منتج خط NPS وCSAT وCES خاص به ولحظاته الخاصة — تور إستيت ونادي بي إس آي وفعاليات بي إس آي أعمال منفصلة بعملاء مختلفين، فلا يُدمج أي رقم بينها — FR-7.4.',
            )}
          </p>
        </div>
      </div>

      <SectionCard
        title={t('The lead funnel: who completes, and why the rest do not', 'قمع العملاء المحتملين: من يكمل، ولماذا لا يكمل الباقون')}
        description={t('PSI Real Estate · sample figures', 'العقارية · أرقام توضيحية')}
        contentClassName="flex flex-col gap-4"
      >
        {funnelLoading ? (
          <LoadingState rows={3} />
        ) : (
          <>
            <div role="radiogroup" aria-label={t('Funnel stage', 'مرحلة القمع')} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-stretch">
              {funnel?.map((f, i) => {
                const active = f.stage === selectedStage
                return (
                  <div key={f.stage} className="flex min-w-0 items-center gap-2 lg:flex-1">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedStage(f.stage)}
                      className={cn(
                        'flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1.5 rounded-lg border p-3 text-start outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        active ? 'border-primary bg-accent' : 'bg-card hover:bg-muted/60',
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground">{L(STAGE_LABEL[f.stage])}</span>
                      <span className="text-2xl font-semibold tabular-nums">{fmt(f.count)}</span>
                      <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <span className={cn('block h-full rounded-full', active ? 'bg-primary' : 'bg-muted-foreground/40')} style={{ width: `${(f.count / maxCount) * 100}%` }} />
                      </span>
                    </button>
                    {i < (funnel?.length ?? 0) - 1 && <ChevronRight aria-hidden className="hidden size-4 shrink-0 text-muted-foreground lg:block rtl:rotate-180" />}
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                'Enquiry on the website or app: no survey — measured by the reach index (reply time, channels needed). NPS is asked only of the 150 who complete; the rest are asked other things, at the stage they stopped. 12 deals are frozen.',
                'الاستفسار عبر الموقع أو التطبيق: دون استبيان — يُقاس بمؤشر الوصول (زمن الرد، القنوات المطلوبة). يُطلب مؤشر NPS فقط ممن أكملوا (150)؛ ويُسأل الباقون أموراً أخرى عند مرحلة توقفهم. 12 صفقة مجمّدة.',
              )}
            </p>

            {selected && (
              <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <PieChart aria-hidden className="size-4 text-muted-foreground" />
                    {t('Source split', 'تقسيم المصدر')}
                  </h3>
                  <BarList tone="primary" items={selected.sourceSplit.map((s) => ({ label: L(s.label), count: s.count }))} />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <MessageCircleOff aria-hidden className="size-4 text-muted-foreground" />
                    {t('Why they stopped here', 'لماذا توقفوا هنا')}
                  </h3>
                  {selected.whyTheyStopped ? (
                    <BarList tone="warning" items={selected.whyTheyStopped.map((w) => ({ label: L(w.reason), count: w.count }))} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('Everyone here completed — nothing to explain.', 'الجميع هنا أكملوا — لا يوجد ما يُفسَّر.')}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard
        title={t('When we ask, and when we never ask', 'متى نسأل، ومتى لا نسأل أبداً')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/rules">
              <SlidersHorizontal aria-hidden />
              {t('Edit caps under Rules as configuration', 'تعديل الحدود ضمن القواعد كإعدادات')}
            </Link>
          </Button>
        }
      >
        {triggersLoading ? (
          <LoadingState rows={4} />
        ) : triggers?.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={th}>{t('Instrument', 'الأداة')}</TableHead>
                  <TableHead className={th}>{t('Moment and rule', 'اللحظة والقاعدة')}</TableHead>
                  <TableHead className={cn(th, 'text-end')}>{t('Cap', 'الحد')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggers.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="px-3 align-top">
                      <StatusBadge tone="info">{L(INSTRUMENT_LABEL[tr.instrument] ?? { en: tr.instrument, ar: tr.instrument })}</StatusBadge>
                    </TableCell>
                    <TableCell className="min-w-64 px-3 text-sm whitespace-normal">{L(tr.triggerDescription)}</TableCell>
                    <TableCell className="px-3 text-end text-sm whitespace-nowrap tabular-nums">
                      {tr.capDays ? t(`${tr.capDays}d`, `${tr.capDays} يوم`) : <span className="text-muted-foreground">{t('No cap', 'بدون حد')}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title={t('No instruments configured yet.', 'لا توجد أدوات مُعدّة بعد.')} />
        )}
      </SectionCard>

      <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/6 p-4">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-danger-text">
          <EyeOff className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold text-danger-text">{t('Never surveyed', 'لا يُستبين أبداً')}</span>
          <p className="text-sm">
            {t(
              'Facebook, Instagram, LinkedIn and Google are never surveyed — a public mention cannot be tied to a customer, a stage or an agent with confidence. Instead it is counted as a signal with a public reply within 48 hours, feeding the public reputation index (FR-7.3).',
              'فيسبوك وإنستغرام ولينكد إن وجوجل لا تُستبين أبداً — لا يمكن ربط الإشارة العامة بعميل أو مرحلة أو وكيل بثقة. بدلاً من ذلك تُحتسب إشارةً مع رد عام خلال 48 ساعة، لتغذية مؤشر السمعة العامة — FR-7.3.',
            )}
          </p>
          <GoLink to="/actions/signals">{t('See the 48h public-reply clock in Signals & patterns', 'انظر ساعة الرد العام خلال 48 ساعة في الإشارات والأنماط')}</GoLink>
        </div>
      </div>

      <SectionCard title={t('Per product, no group number', 'لكل منتج، دون رقم موحد')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRODUCTS.map((p) => {
            const moments = productMoments?.find((m) => m.product === p.id)
            return (
              <div key={p.id} className={cn('flex min-w-0 flex-col gap-2 rounded-lg border p-4', p.live ? 'bg-card' : 'bg-muted/40')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ProductTag productId={p.id} lang={lang} />
                  {!p.live && <StatusBadge>{t('Hidden until launch', 'مخفي حتى الإطلاق')}</StatusBadge>}
                </div>
                <p className="text-sm">{moments ? L(moments.momentsSummary) : '—'}</p>
                {moments && !moments.hasNps && (
                  <StatusBadge tone="warning" className="self-start">
                    {t('No NPS for this product', 'لا يوجد NPS لهذا المنتج')}
                  </StatusBadge>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
