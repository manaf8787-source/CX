import { useMemo, useState } from 'react'
import { CalendarX, Hourglass, MessageSquareWarning, MoonStar, PhoneMissed, Shuffle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useAllInteractions, usePersons } from '@/services/queries'
import { usePeopleFacts } from '@/components/customers/usePeopleFacts'
import { PRODUCTS } from '@/data/products'
import { presetRange, ymd, type RangePreset } from '@/data/performance'
import { RUNAWAY_LEARNING_ORDER, RUNAWAY_TYPE_LABEL } from '@/utils/runaway'
import { fmtSigned } from '@/utils/indicators'
import type { ProductId, RunawayType } from '@/types'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { InlineNote } from '@/components/common/InlineNote'
import { ProductTag } from '@/components/common/Chip'

/**
 * "CX reports" (22 Nov, owner): the summary a reporting person may read. The indicators (NPS, CSAT, answers) per product for a chosen
 * period, and how many customers are leaving or lost, by type. Counts only: no names, no case or conversation, no link to a person,
 * nothing waiting for a reply. Built for the "Reporting viewer" custom role; no other role lists it (see `blocked` in auth/access).
 */
const TYPE_ICON: Record<RunawayType, LucideIcon> = {
  silent_lead: PhoneMissed,
  did_not_renew: CalendarX,
  dormant_owner: MoonStar,
  went_to_competitor: Shuffle,
  frozen_deal: Hourglass,
  complained_then_left: MessageSquareWarning,
}

/** Prototype rule on the 0 to 10 sample answers: 9 and 10 promote, 0 to 6 detract, 7 and above is satisfied. */
function indicators(scores: number[]) {
  const n = scores.length
  if (!n) return { n: 0, nps: null as number | null, csat: null as number | null, detractors: 0 }
  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length
  return {
    n,
    nps: Math.round(((promoters - detractors) / n) * 100),
    csat: Math.round((scores.filter((s) => s >= 7).length / n) * 100),
    detractors,
  }
}

export default function CxReports() {
  const { t, L, lang } = useI18n()
  const now = useNow()
  const [preset, setPreset] = useState<RangePreset>('last_90')
  const initial = presetRange('last_90', now)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [product, setProduct] = useState<ProductId | 'all'>('all')

  const choosePreset = (p: RangePreset) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = presetRange(p, now)
      setFrom(r.from)
      setTo(r.to)
    }
  }

  const { data: interactions = [], isLoading: l1 } = useAllInteractions()
  const { data: persons = [], isLoading: l2 } = usePersons()
  const { facts, isLoading: l3 } = usePeopleFacts(persons)
  const loading = l1 || l2 || l3

  const products = PRODUCTS.filter((p) => p.live)
  const shown = product === 'all' ? products : products.filter((p) => p.id === product)

  const perProduct = useMemo(
    () =>
      shown.map((p) => ({
        product: p,
        ...indicators(
          interactions
            .filter((i) => i.product === p.id && i.score !== undefined && i.occurredAt.slice(0, 10) >= from && i.occurredAt.slice(0, 10) <= to)
            .map((i) => i.score as number),
        ),
      })),
    [shown, interactions, from, to],
  )

  const counts = useMemo(() => {
    const out = new Map<RunawayType, number>()
    for (const [personId, c] of facts.drifting) {
      const person = persons.find((x) => x.id === personId)
      if (!person) continue
      if (product !== 'all' && !person.products.includes(product)) continue
      out.set(c.type, (out.get(c.type) ?? 0) + 1)
    }
    return out
  }, [facts.drifting, persons, product])
  const totalLeaving = [...counts.values()].reduce((s, n) => s + n, 0)

  return (
    <div data-density="comfortable" className="flex flex-col gap-6" data-testid="cx-reports">
      <PageHeader
        title={t('CX reports', 'تقارير تجربة العملاء')}
        description={t(
          'The headline indicators per product and how many customers are leaving, as numbers only. No names and no case details.',
          'مؤشرات التجربة الرئيسية لكل منتج وعدد العملاء الذين يبتعدون، كأرقام فقط. بلا أسماء وبلا تفاصيل حالات.',
        )}
      />

      <SectionCard>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <Segmented<RangePreset>
            label={t('Period', 'الفترة')}
            variant="pressed"
            value={preset}
            onValueChange={choosePreset}
            options={[
              { value: 'month', label: t('This month', 'هذا الشهر') },
              { value: 'last_month', label: t('Last month', 'الشهر الماضي') },
              { value: 'last_90', label: t('Last 90 days', 'آخر 90 يوماً') },
              { value: 'ytd', label: t('This year', 'هذا العام') },
              { value: 'custom', label: t('Custom', 'مخصص') },
            ]}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('From', 'من')}
            <Input
              type="date"
              className="h-9 w-40"
              value={from}
              max={to}
              onChange={(e) => {
                setPreset('custom')
                setFrom(e.target.value)
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('To', 'إلى')}
            <Input
              type="date"
              className="h-9 w-40"
              value={to}
              min={from}
              max={ymd(new Date(now))}
              onChange={(e) => {
                setPreset('custom')
                setTo(e.target.value)
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Product', 'المنتج')}
            <Select value={product} onValueChange={(v) => setProduct(v as ProductId | 'all')}>
              <SelectTrigger className="h-9 min-w-44" aria-label={t('Product', 'المنتج')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All products', 'كل المنتجات')}</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {L(p.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title={t('Indicators per product', 'المؤشرات لكل منتج')} description={t('One line per product, never one blended number.', 'سطر لكل منتج، دون رقم إجمالي واحد أبداً.')}>
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Product', 'المنتج')}</TableHead>
              <TableHead className="text-end">NPS</TableHead>
              <TableHead className="text-end">CSAT</TableHead>
              <TableHead className="text-end">{t('Answers', 'الردود')}</TableHead>
              <TableHead className="text-end">{t('Detractors', 'المنتقدون')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="cx-report-indicators">
            {perProduct.map((r) => (
              <TableRow key={r.product.id}>
                <TableCell>
                  <ProductTag productId={r.product.id} lang={lang} />
                </TableCell>
                <TableCell className="text-end font-medium tabular text-foreground">
                  <bdi dir="ltr">{fmtSigned(r.nps)}</bdi>
                </TableCell>
                <TableCell className="text-end font-medium tabular text-foreground">
                  <bdi dir="ltr">{r.csat === null ? '–' : `${r.csat}%`}</bdi>
                </TableCell>
                <TableCell className="text-end tabular">{r.n}</TableCell>
                <TableCell className="text-end tabular">{r.detractors}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        title={t('Customers leaving or lost', 'العملاء المبتعدون أو المفقودون')}
        description={t(`${totalLeaving} in total, by type. Numbers only.`, `${totalLeaving} في المجموع، حسب النوع. أرقام فقط.`)}
      >
        <section aria-label={t('Runaway types', 'أنواع العملاء الهاربين')} className="grid grid-cols-2 gap-(--grid-gap) xl:grid-cols-3" data-testid="cx-report-runaway">
          {RUNAWAY_LEARNING_ORDER.map((type) => {
            const Icon = TYPE_ICON[type]
            return <KpiTile key={type} variant="well" label={L(RUNAWAY_TYPE_LABEL[type])} value={counts.get(type) ?? 0} icon={<Icon />} loading={loading} />
          })}
        </section>
      </SectionCard>

      <InlineNote tone="info">
        {t(
          'Prototype: NPS and CSAT here are worked out from the scored sample answers in the period you pick. The customer counts are today’s position, so the period does not change them.',
          'نموذج أولي: يُحسب NPS وCSAT هنا من الإجابات التجريبية المقيّمة في الفترة المختارة. أعداد العملاء هي الوضع الحالي، لذا لا تتغير بتغيير الفترة.',
        )}
      </InlineNote>
    </div>
  )
}

