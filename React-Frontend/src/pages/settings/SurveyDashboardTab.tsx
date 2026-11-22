import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { useI18n } from '@/i18n'
import { useCampaigns, type SurveyCampaign } from '@/data/surveyCampaigns'
import { hasLogic } from '@/data/surveyLogic'
import type { EditableQuestion } from '@/data/surveyEditor'
import { campaignResult, type CampaignResult, type QuestionResult } from '@/data/campaignResults'
import { PRODUCTS } from '@/data/products'
import { downloadCsv } from '@/utils/csv'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { EmptyState } from '@/components/common/EmptyState'
import { ChartTooltip, ChartWell, RankedBars } from '@/components/common/charts'
import { chartAxis, chartBar, chartCursorBar, chartGrid } from '@/components/common/chartTheme'
import { CHANNEL_LABEL, CampaignProductTag } from './SurveyCampaignsTab'

/**
 * The Dashboard tab of Surveys (22 Nov, owner): campaigns only. Pick one campaign (or all sent ones) and see who was asked, who
 * answered, how the answers fell, question by question, and how it compares with the others. Results tab is the short brief on the fixed
 * surveys; this one is the wide view on the surveys the team sent on purpose.
 * Prototype: the example campaigns and their numbers are samples (see data/campaignResults.ts).
 */
const ALL = '__all__'

function fmtDate(iso: string | undefined, lang: 'en' | 'ar') {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function SurveyDashboardTab() {
  const { t, L, lang } = useI18n()
  const campaigns = useCampaigns()
  const [product, setProduct] = useState<string>(ALL)
  const [picked, setPicked] = useState<string>(ALL)

  const sent = useMemo(
    () =>
      campaigns.filter((c) => c.status === 'sent' && (product === ALL || c.product === product)).sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? '')),
    [campaigns, product],
  )
  const drafts = campaigns.filter((c) => c.status === 'draft' && !c.archived).length
  const rows = useMemo(() => sent.map((c) => ({ c, r: campaignResult(c) as CampaignResult })).filter((x) => x.r), [sent])
  const current = picked === ALL ? undefined : rows.find((x) => x.c.id === picked)
  const fmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')

  const productsUsed = PRODUCTS.filter((p) => campaigns.some((c) => c.product === p.id && c.status === 'sent'))

  const header = (
    <SectionCard
      title={t('Choose a campaign', 'اختر حملة')}
      description={t('Show one campaign, or every campaign that was sent.', 'اعرض حملة واحدة أو كل الحملات المرسلة.')}
    >
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex min-w-48 flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">{t('Product', 'المنتج')}</span>
          <Select
            value={product}
            onValueChange={(v) => {
              setProduct(v)
              setPicked(ALL)
            }}
          >
            <SelectTrigger aria-label={t('Product', 'المنتج')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('All products', 'كل المنتجات')}</SelectItem>
              {campaigns.some((c) => c.product === 'general' && c.status === 'sent') && (
                <SelectItem value="general">{t('Not tied to a product', 'غير مرتبطة بمنتج')}</SelectItem>
              )}
              {productsUsed.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {L(p.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex min-w-64 flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">{t('Campaign', 'الحملة')}</span>
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger aria-label={t('Campaign', 'الحملة')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('All sent campaigns', 'كل الحملات المرسلة')}</SelectItem>
              {rows.map(({ c }) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.archived ? ` (${t('archived', 'مؤرشفة')})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {drafts > 0 && (
          <p className="t-body-s pb-2">
            {t(`${drafts} draft${drafts === 1 ? '' : 's'} not sent yet, so not counted here.`, `${drafts} مسودة لم تُرسل بعد، لذلك لا تُحتسب هنا.`)}
          </p>
        )}
      </div>
    </SectionCard>
  )

  if (!rows.length)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title={t('No sent campaigns yet', 'لا توجد حملات مرسلة بعد')}
          note={t('Send a campaign from the Campaigns tab and its results appear here.', 'أرسل حملة من تبويب الحملات وستظهر نتائجها هنا.')}
        />
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {header}
      <InlineNote>
        {t(
          'Example campaigns with sample numbers, to show how the Dashboard reads. Nothing here is a real customer’s answer.',
          'حملات تجريبية بأرقام عيّنة لتوضيح شكل اللوحة. لا شيء هنا هو إجابة عميل حقيقي.',
        )}
      </InlineNote>
      {current ? (
        <One c={current.c} r={current.r} others={rows.filter((x) => x.c.id !== current.c.id).map((x) => x.r)} fmt={fmt} />
      ) : (
        <Overview rows={rows} onPick={setPicked} fmt={fmt} />
      )}
    </div>
  )
}

function Overview({ rows, onPick, fmt }: { rows: { c: SurveyCampaign; r: CampaignResult }[]; onPick: (id: string) => void; fmt: (n: number) => string }) {
  const { t, L, lang } = useI18n()
  const asked = rows.reduce((s, x) => s + x.r.asked, 0)
  const answered = rows.reduce((s, x) => s + x.r.answered, 0)
  const best = [...rows].sort((a, b) => b.r.rate - a.r.rate)[0]
  return (
    <>
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile label={t('Campaigns sent', 'الحملات المرسلة')} value={fmt(rows.length)} />
        <KpiTile label={t('People asked', 'من سُئلوا')} value={fmt(asked)} />
        <KpiTile
          label={t('Answered', 'أجابوا')}
          value={fmt(answered)}
          sub={t(`${Math.round((answered / asked) * 100)}% of those asked`, `${Math.round((answered / asked) * 100)}٪ ممن سُئلوا`)}
        />
        <KpiTile label={t('Best response rate', 'أفضل نسبة رد')} value={`${best.r.rate}%`} sub={best.c.name} />
      </div>
      <SectionCard
        title={t('Every campaign side by side', 'كل الحملات جنباً إلى جنب')}
        description={t('Click a campaign to see its questions and answers.', 'اضغط على حملة لترى أسئلتها وإجاباتها.')}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Campaign', 'الحملة')}</TableHead>
              <TableHead>{t('Product', 'المنتج')}</TableHead>
              <TableHead>{t('Sent', 'أُرسلت')}</TableHead>
              <TableHead>{t('Channel', 'القناة')}</TableHead>
              <TableHead className="text-end">{t('Asked', 'سُئلوا')}</TableHead>
              <TableHead className="text-end">{t('Answered', 'أجابوا')}</TableHead>
              <TableHead className="text-end">{t('Response rate', 'نسبة الرد')}</TableHead>
              <TableHead className="text-end">{t('Score', 'النتيجة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ c, r }) => (
              <TableRow key={c.id}>
                <TableCell>
                  <button type="button" className="text-start font-medium text-foreground underline-offset-4 hover:underline" onClick={() => onPick(c.id)}>
                    {c.name}
                  </button>
                  {c.archived && <StatusBadge className="ms-2">{t('Archived', 'مؤرشفة')}</StatusBadge>}
                </TableCell>
                <TableCell>
                  <CampaignProductTag product={c.product} lang={lang} />
                </TableCell>
                <TableCell>{fmtDate(c.sentAt, lang)}</TableCell>
                <TableCell>{L(CHANNEL_LABEL[c.channel])}</TableCell>
                <TableCell className="text-end">{fmt(r.asked)}</TableCell>
                <TableCell className="text-end">{fmt(r.answered)}</TableCell>
                <TableCell className="text-end">{r.rate}%</TableCell>
                <TableCell className="text-end">{r.headline ? `${r.headline.value}${r.headline.unit} ${L(r.headline.label)}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <SectionCard
        title={t('Response rate by campaign', 'نسبة الرد لكل حملة')}
        description={t('Of the people asked, how many answered.', 'من بين من سُئلوا، كم أجاب.')}
      >
        <RankedBars
          label={t('Response rate by campaign', 'نسبة الرد لكل حملة')}
          layout="stacked"
          max={100}
          items={[...rows]
            .sort((a, b) => b.r.rate - a.r.rate)
            .map(({ c, r }) => ({
              key: c.id,
              label: c.name,
              value: r.rate,
              display: `${r.rate}%`,
            }))}
        />
      </SectionCard>
    </>
  )
}

function One({ c, r, others, fmt }: { c: SurveyCampaign; r: CampaignResult; others: CampaignResult[]; fmt: (n: number) => string }) {
  const { t, L, lang } = useI18n()
  const avgRate = others.length ? Math.round(others.reduce((s, x) => s + x.rate, 0) / others.length) : undefined
  const diff = avgRate == null ? undefined : r.rate - avgRate
  const exportCsv = () =>
    downloadCsv(
      `campaign-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
      r.questions.flatMap((q) =>
        (q.bars.length ? q.bars : [{ label: { en: '(open text)', ar: '(نص حر)' }, count: q.answered }]).map((b) => ({
          campaign: c.name,
          product: c.product,
          question: q.question.en,
          answer: b.label.en,
          count: b.count,
        })),
      ),
    )
  return (
    <>
      <SectionCard
        title={c.name}
        description={c.audience}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download aria-hidden />
            {t('Export CSV', 'تصدير CSV')}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CampaignProductTag product={c.product} lang={lang} />
          <span className="text-muted-foreground">{L(CHANNEL_LABEL[c.channel])}</span>
          <span className="text-muted-foreground">
            · {t('sent', 'أُرسلت')} {fmtDate(c.sentAt, lang)}
          </span>
          {c.archived && <StatusBadge>{t('Archived', 'مؤرشفة')}</StatusBadge>}
        </div>
      </SectionCard>
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile label={t('People asked', 'من سُئلوا')} value={fmt(r.asked)} sub={t(`${fmt(r.delivered)} received it`, `${fmt(r.delivered)} استلموها`)} />
        <KpiTile label={t('Answered', 'أجابوا')} value={fmt(r.answered)} />
        <KpiTile
          label={t('Response rate', 'نسبة الرد')}
          value={`${r.rate}%`}
          sub={
            diff == null
              ? undefined
              : t(
                  `${diff >= 0 ? '+' : ''}${diff} points vs the other campaigns (${avgRate}%)`,
                  `${diff >= 0 ? '+' : ''}${diff} نقطة مقارنة بالحملات الأخرى (${avgRate}٪)`,
                )
          }
        />
        <KpiTile label={r.headline ? L(r.headline.label) : t('Score', 'النتيجة')} value={r.headline ? `${r.headline.value}${r.headline.unit}` : '—'} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title={t('From sent to answered', 'من الإرسال إلى الإجابة')} description={t('Where people dropped off.', 'أين انقطع الناس.')}>
          <RankedBars
            label={t('From sent to answered', 'من الإرسال إلى الإجابة')}
            max={r.asked}
            items={[
              {
                key: 'asked',
                label: t('Sent', 'أُرسلت'),
                value: r.asked,
                display: fmt(r.asked),
              },
              {
                key: 'delivered',
                label: t('Received', 'استُلمت'),
                value: r.delivered,
                display: fmt(r.delivered),
              },
              {
                key: 'opened',
                label: t('Opened', 'فُتحت'),
                value: r.opened,
                display: fmt(r.opened),
              },
              {
                key: 'answered',
                label: t('Answered', 'أُجيبت'),
                value: r.answered,
                display: fmt(r.answered),
              },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('Answers by day', 'الإجابات حسب اليوم')} description={t('Days after it was sent.', 'الأيام بعد الإرسال.')}>
          <ChartWell height={200} label={t('Answers by day after sending', 'الإجابات حسب اليوم بعد الإرسال')}>
            <BarChart data={r.daily}>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="day" {...chartAxis} />
              <YAxis {...chartAxis} width={32} allowDecimals={false} />
              <Tooltip content={<ChartTooltip labelFormatter={(l) => t(`Day ${l}`, `اليوم ${l}`)} />} cursor={chartCursorBar} />
              <Bar dataKey="count" name={t('Answers', 'الإجابات')} {...chartBar} radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
            </BarChart>
          </ChartWell>
        </SectionCard>
      </div>
      {r.questions.map((q) => (
        <QuestionCard key={q.index} q={q} fmt={fmt} allQuestions={c.questions} />
      ))}
    </>
  )
}

function QuestionCard({ q, fmt, allQuestions }: { q: QuestionResult; fmt: (n: number) => string; allQuestions: EditableQuestion[] }) {
  const { t, L } = useI18n()
  const top = Math.max(1, ...q.bars.map((b) => b.count))
  return (
    <SectionCard
      title={t(`Question ${q.index + 1}`, `السؤال ${q.index + 1}`)}
      description={
        q.index > 0 && hasLogic(allQuestions) ? (
          <>
            {L(q.question)}
            <span className="mt-1 block">
              {t(`Reached by ${fmt(q.reached)} people, following the survey's jumps`, `وصل إليه ${fmt(q.reached)} شخصاً حسب مسارات الاستبيان`)}
            </span>
          </>
        ) : (
          L(q.question)
        )
      }
      actions={q.headline ? <StatusBadge tone="info">{`${L(q.headline.label)}: ${q.headline.value}${q.headline.unit}`}</StatusBadge> : undefined}
    >
      {q.kind === 'open' ? (
        <ul className="flex flex-col gap-3">
          {q.quotes.map((x, i) => (
            <li key={i} className="well flex items-center justify-between gap-3 text-sm">
              <span>“{L(x.text)}”</span>
              <StatusBadge tone={x.tone === 'good' ? 'success' : x.tone === 'bad' ? 'warning' : 'neutral'}>
                {x.tone === 'good' ? t('Positive', 'إيجابي') : x.tone === 'bad' ? t('Needs attention', 'يحتاج انتباهاً') : t('Neutral', 'محايد')}
              </StatusBadge>
            </li>
          ))}
          <li className="t-body-s">
            {t(`${fmt(q.answered)} people wrote an answer. Examples shown are samples.`, `${fmt(q.answered)} شخصاً كتبوا إجابة. الأمثلة المعروضة عيّنات.`)}
          </li>
        </ul>
      ) : (
        <RankedBars
          label={L(q.question)}
          max={top}
          layout={q.kind === 'choice' ? 'stacked' : 'inline'}
          items={q.bars.map((b, i) => ({
            key: String(i),
            label: L(b.label),
            value: b.count,
            display: `${fmt(b.count)} · ${Math.round((b.count / Math.max(1, q.answered)) * 100)}%`,
            hero: false,
          }))}
        />
      )}
    </SectionCard>
  )
}

