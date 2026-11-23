import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuditActor } from '@/auth/useAuditActor'
import {
  CAMPAIGNS,
  CAMPAIGN_NOW,
  METRIC_LABEL,
  TYPE_LABEL,
  auditOf,
  auditWindow,
  conversionPct,
  costPerLead,
  measure,
  removeCriterion,
  resetCriteria,
  saveCriterion,
  saveSettings,
  trackingOf,
  updateAudit,
  useAuditState,
  type Criterion,
  type MarketingCampaign,
  type Metric,
} from '@/data/marketingCampaigns'
import { downloadCsv } from '@/utils/csv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { ProductTag } from '@/components/common/Chip'
import { ChartTooltip, ChartWell, RankedBars } from '@/components/common/charts'
import { chartAxis, chartBar, chartCursorBar, chartGrid } from '@/components/common/chartTheme'
import { SubPageHeader } from './SubPageHeader'

/**
 * Marketing campaigns (owner's and Chairman's request, 23 Nov): one page for Marketing and the Internal Audit and Marketing Lead.
 * Results (both): per campaign, what the marketing platform sent and what the CRM says happened to the leads tagged with the campaign
 * code, read again every hour, with the conversion rate. Audit after the run and Criteria (the Internal Audit and Marketing Lead only):
 * criteria and targets per campaign, judged only after a long tracking window. 23 Nov: no clearance before a run (removed by the owner): everything here is after the campaign.
 * Sources: where each number comes from and what must exist in the CRM (the campaign tag).
 */
const TABS = ['results', 'audit', 'criteria', 'sources'] as const
type Tab = (typeof TABS)[number]
const ALL = 'all'

export default function MarketingCampaigns() {
  const { t } = useI18n()
  const { role } = useRole()
  const isAuditor = role.id === 'auditmkt'
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab') as Tab | null
  const allowed: Tab[] = isAuditor ? [...TABS] : ['results', 'sources']
  const tab: Tab = asked && allowed.includes(asked) ? asked : 'results'
  const [picked, setPicked] = useState<string>(params.get('campaign') ?? ALL)
  const pick = (id: string) => {
    setPicked(id)
    const next = new URLSearchParams(params)
    next.set('campaign', id)
    setParams(next, { replace: true })
  }

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Marketing campaigns', 'الحملات التسويقية')}
        description={t(
          'What each campaign sent, what happened to the leads it brought (read from the CRM every hour), and whether it worked. Marketing and the Internal Audit and Marketing Lead see the results; only the Internal Audit and Marketing Lead audits.',
          'ماذا أرسلت كل حملة، وماذا حدث لليدز التي جلبتها (تُقرأ من CRM كل ساعة)، وهل نجحت. التسويق ومسؤول التدقيق الداخلي والتسويق يرون النتائج؛ والتدقيق لمسؤول التدقيق الداخلي والتسويق فقط.',
        )}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params)
          next.set('tab', v)
          setParams(next, { replace: true })
        }}
        className="gap-4"
      >
        <div className="-m-1 overflow-x-auto p-1">
          <TabsList className="min-w-max" aria-label={t('Marketing campaigns', 'الحملات التسويقية')}>
            <TabsTrigger value="results">{t('Results', 'النتائج')}</TabsTrigger>
            {isAuditor && <TabsTrigger value="audit">{t('Audit after the run', 'التدقيق بعد التشغيل')}</TabsTrigger>}
            {isAuditor && <TabsTrigger value="criteria">{t('Criteria', 'المعايير')}</TabsTrigger>}
            <TabsTrigger value="sources">{t('Where the numbers come from', 'من أين تأتي الأرقام')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="results">
          <Results picked={picked} onPick={pick} />
        </TabsContent>
        {isAuditor && (
          <TabsContent value="audit">
            <AuditTab picked={picked} onPick={pick} />
          </TabsContent>
        )}
        {isAuditor && (
          <TabsContent value="criteria">
            <CriteriaTab />
          </TabsContent>
        )}
        <TabsContent value="sources">
          <SourcesTab />
        </TabsContent>
      </Tabs>
    </section>
  )
}

const fmt = (n: number, lang: 'en' | 'ar') => n.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')
const day = (iso: string, lang: 'en' | 'ar') =>
  new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function CampaignPicker({ picked, onPick, allowAll = true }: { picked: string; onPick: (id: string) => void; allowAll?: boolean }) {
  const { t } = useI18n()
  return (
    <label className="flex min-w-72 flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{t('Campaign', 'الحملة')}</span>
      <Select value={picked} onValueChange={onPick}>
        <SelectTrigger aria-label={t('Campaign', 'الحملة')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value={ALL}>{t('All campaigns', 'كل الحملات')}</SelectItem>}
          {CAMPAIGNS.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} · {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

// --- Results ----------------------------------------------------------------------------------------------------------

function Results({ picked, onPick }: { picked: string; onPick: (id: string) => void }) {
  const { t, L, lang } = useI18n()
  const rows = useMemo(() => CAMPAIGNS.map((c) => ({ c, tr: trackingOf(c) })), [])
  const current = rows.find((x) => x.c.id === picked)
  const lastRead = rows.reduce((m, x) => (x.tr.lastReadAt > m ? x.tr.lastReadAt : m), '')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CampaignPicker picked={picked} onPick={onPick} />
        <StatusBadge tone="info">
          {t('CRM read', 'قُرئ CRM')} {new Date(lastRead).toLocaleTimeString(lang === 'ar' ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
          {t('every hour', 'كل ساعة')}
        </StatusBadge>
      </div>
      <InlineNote>
        {t(
          'Sample campaigns and numbers until the marketing platform and the CRM campaign tag are connected.',
          'حملات وأرقام تجريبية حتى يتم ربط منصة التسويق ووسم الحملات في CRM.',
        )}
      </InlineNote>
      {current ? (
        <One c={current.c} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
            <KpiTile label={t('Campaigns', 'الحملات')} value={rows.length} />
            <KpiTile
              label={t('Leads they brought', 'ليدز جلبتها')}
              value={fmt(
                rows.reduce((s, x) => s + x.tr.leads, 0),
                lang,
              )}
            />
            <KpiTile
              label={t('Won', 'أُغلقت بنجاح')}
              value={fmt(
                rows.reduce((s, x) => s + x.tr.won, 0),
                lang,
              )}
            />
            <KpiTile
              label={t('Nobody contacted yet', 'لم يتواصل معهم أحد')}
              value={fmt(
                rows.reduce((s, x) => s + x.tr.notContacted, 0),
                lang,
              )}
              accent="var(--destructive)"
            />
          </div>
          <SectionCard
            title={t('Every campaign side by side', 'كل الحملات جنباً إلى جنب')}
            description={t('Click a campaign to open it.', 'اضغط على حملة لفتحها.')}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Campaign', 'الحملة')}</TableHead>
                    <TableHead>{t('Type', 'النوع')}</TableHead>
                    <TableHead>{t('Dates', 'التواريخ')}</TableHead>
                    <TableHead className="text-end">{t('Leads', 'الليدز')}</TableHead>
                    <TableHead className="text-end">{t('Not contacted', 'بلا تواصل')}</TableHead>
                    <TableHead className="text-end">{t('Won', 'مغلقة')}</TableHead>
                    <TableHead className="text-end">{t('Conversion', 'التحويل')}</TableHead>
                    <TableHead className="text-end">{t('Cost per lead', 'تكلفة الليد')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ c, tr }) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-normal">
                        <button
                          type="button"
                          onClick={() => onPick(c.id)}
                          className="text-start font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {c.name}
                        </button>
                        <span className="block text-xs text-muted-foreground tabular">{c.code}</span>
                      </TableCell>
                      <TableCell>{L(TYPE_LABEL[c.type])}</TableCell>
                      <TableCell className="tabular">
                        {day(c.startDate, lang)} – {day(c.endDate, lang)}
                      </TableCell>
                      <TableCell className="text-end tabular">{fmt(tr.leads, lang)}</TableCell>
                      <TableCell className="text-end tabular">{fmt(tr.notContacted, lang)}</TableCell>
                      <TableCell className="text-end tabular">{fmt(tr.won, lang)}</TableCell>
                      <TableCell className="text-end tabular font-medium text-foreground">{conversionPct(tr)}%</TableCell>
                      <TableCell className="text-end tabular">AED {fmt(costPerLead(c, tr), lang)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
          <SectionCard title={t('Conversion rate by campaign', 'نسبة التحويل لكل حملة')}>
            <RankedBars
              label={t('Conversion rate by campaign', 'نسبة التحويل لكل حملة')}
              layout="stacked"
              items={[...rows]
                .sort((a, b) => conversionPct(b.tr) - conversionPct(a.tr))
                .map(({ c, tr }) => ({ key: c.id, label: c.name, value: conversionPct(tr), display: `${conversionPct(tr)}%` }))}
            />
          </SectionCard>
        </>
      )}
    </div>
  )
}

function One({ c }: { c: MarketingCampaign }) {
  const { t, L, lang } = useI18n()
  const tr = trackingOf(c)
  const exportCsv = () =>
    downloadCsv(`campaign-${c.code}.csv`, [
      {
        campaign: c.name,
        code: c.code,
        leads: tr.leads,
        contacted: tr.contacted,
        not_contacted: tr.notContacted,
        no_answer: tr.noAnswer,
        in_progress: tr.inProgress,
        won: tr.won,
        lost: tr.lost,
        conversion_pct: conversionPct(tr),
        cost_per_lead_aed: costPerLead(c, tr),
      },
    ])
  return (
    <>
      <SectionCard
        title={c.name}
        description={`${c.code} · ${L(TYPE_LABEL[c.type])} · ${day(c.startDate, lang)} – ${day(c.endDate, lang)}`}
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            {t('Export CSV', 'تصدير CSV')}
          </Button>
        }
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Fact label={t('Product', 'المنتج')} value={<ProductTag productId={c.product} lang={lang} />} />
          <Fact label={t('Target segment', 'الشريحة المستهدفة')} value={c.segment} />
          <Fact label={t('Persona', 'الشخصية')} value={c.persona} />
          <Fact label={t('Responsible', 'المسؤول')} value={c.owner} />
          <Fact label={t('Channels', 'القنوات')} value={c.channels.join(' · ')} />
          <Fact label={t('Budget', 'الميزانية')} value={`AED ${fmt(c.budget, lang)}`} />
        </dl>
      </SectionCard>
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile
          label={t('Leads it brought (CRM)', 'ليدز جلبتها (CRM)')}
          value={fmt(tr.leads, lang)}
          sub={t(`${tr.taggedPct}% carry the campaign tag`, `${tr.taggedPct}% تحمل وسم الحملة`)}
        />
        <KpiTile
          label={t('Conversion rate', 'نسبة التحويل')}
          value={`${conversionPct(tr)}%`}
          sub={t(`${fmt(tr.won, lang)} won`, `${fmt(tr.won, lang)} مغلقة`)}
        />
        <KpiTile label={t('Cost per lead', 'تكلفة الليد')} value={`AED ${fmt(costPerLead(c, tr), lang)}`} />
        <KpiTile label={t('First contact, on average', 'أول تواصل، بالمتوسط')} value={t(`${tr.avgFirstContactHours} h`, `${tr.avgFirstContactHours} ساعة`)} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t('What the marketing platform sent', 'ماذا أرسلت منصة التسويق')}>
          <RankedBars
            label={t('What was sent', 'ما أُرسل')}
            max={Math.max(c.sent, c.clicked, 1)}
            items={[
              { key: 's', label: t('Sent', 'أُرسلت'), value: c.sent, display: c.sent ? fmt(c.sent, lang) : t('not applicable', 'لا ينطبق') },
              { key: 'd', label: t('Delivered', 'وصلت'), value: c.delivered, display: c.delivered ? fmt(c.delivered, lang) : '—' },
              { key: 'o', label: t('Opened', 'فُتحت'), value: c.opened, display: c.opened ? fmt(c.opened, lang) : '—' },
              { key: 'c', label: t('Clicked or replied', 'نُقرت أو رُدّ عليها'), value: c.clicked, display: fmt(c.clicked, lang) },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('What happened to the leads (CRM)', 'ماذا حدث لليدز (CRM)')}>
          <RankedBars
            label={t('Lead status', 'حالة الليدز')}
            max={tr.leads}
            items={[
              { key: 'won', label: t('Won', 'مغلقة بنجاح'), value: tr.won, display: fmt(tr.won, lang), hero: true },
              { key: 'prog', label: t('Still in progress', 'ما زالت قيد المتابعة'), value: tr.inProgress, display: fmt(tr.inProgress, lang), hero: false },
              { key: 'lost', label: t('Lost', 'خسرناها'), value: tr.lost, display: fmt(tr.lost, lang), hero: false },
              { key: 'na', label: t('Contacted, no answer', 'تم الاتصال ولم يردوا'), value: tr.noAnswer, display: fmt(tr.noAnswer, lang), hero: false },
              { key: 'nc', label: t('Nobody contacted them', 'لم يتواصل معهم أحد'), value: tr.notContacted, display: fmt(tr.notContacted, lang), hero: false },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('How we contacted them', 'كيف تواصلنا معهم')}>
          <RankedBars
            label={t('Contact method', 'طريقة التواصل')}
            items={tr.byMethod.map((m, i) => ({ key: String(i), label: L(m.method), value: m.count, display: fmt(m.count, lang) }))}
          />
        </SectionCard>
        <SectionCard
          title={t('Leads and wins by week', 'الليدز والإغلاقات أسبوعياً')}
          description={t('Weeks since the campaign started.', 'الأسابيع منذ بدء الحملة.')}
        >
          <ChartWell height={200} label={t('Leads and wins by week', 'الليدز والإغلاقات أسبوعياً')}>
            <BarChart data={tr.weekly}>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="week" {...chartAxis} />
              <YAxis {...chartAxis} width={36} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={chartCursorBar} />
              <Bar dataKey="leads" name={t('Leads', 'الليدز')} {...chartBar} radius={[6, 6, 0, 0]} fill="var(--chart-2)" />
              <Bar dataKey="won" name={t('Won', 'مغلقة')} {...chartBar} radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
            </BarChart>
          </ChartWell>
        </SectionCard>
      </div>
    </>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}

// --- Audit after the run ----------------------------------------------------------------------------------------------

function AuditTab({ picked, onPick }: { picked: string; onPick: (id: string) => void }) {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const st = useAuditState()
  const c = CAMPAIGNS.find((x) => x.id === picked) ?? CAMPAIGNS[0]
  const tr = trackingOf(c)
  const a = st.audits[c.id] ?? auditOf(c.id)
  const w = auditWindow(c, st.settings)
  const active = st.criteria.filter((k) => !a.skipped.includes(k.id))
  const results = active.map((k) => {
    if (!k.metric) return { k, value: undefined, target: undefined, pass: a.manual[k.id] }
    const target = a.targets[k.id] ?? k.target ?? 0
    const value = measure(k.metric, c, tr)
    return { k, value, target, pass: k.dir === 'max' ? value <= target : value >= target }
  })
  const passed = results.filter((x) => x.pass === true).length
  const open = w.phase === 'open' || w.phase === 'overdue'
  const unit = (k: Criterion, v: number) => (k.unit === 'AED' ? `AED ${fmt(v, lang)}` : `${v}${k.unit ?? ''}`)

  return (
    <div className="flex flex-col gap-4">
      <CampaignPicker picked={c.id} onPick={onPick} allowAll={false} />
      <InlineNote
        tone={w.phase === 'overdue' ? 'warning' : 'info'}
        title={
          w.phase === 'running'
            ? t('Still running', 'ما زالت تعمل')
            : w.phase === 'tracking'
              ? t('Being tracked: too early to judge', 'قيد التتبع: من المبكر الحكم')
              : w.phase === 'open'
                ? t('Ready for the audit', 'جاهزة للتدقيق')
                : t('Audit past its date', 'التدقيق تجاوز موعده')
        }
      >
        {t(
          `The CRM keeps being read until ${w.trackUntil}. The audit opens on ${w.opensOn} (${st.settings.auditOpensAfterDays} days after the end, so the leads have time to convert) and is due by ${w.dueOn}.`,
          `يستمر قراءة CRM حتى ${w.trackUntil}. يفتح التدقيق في ${w.opensOn} (${st.settings.auditOpensAfterDays} يوماً بعد النهاية ليكون لليدز وقت للتحويل) ويُستحق قبل ${w.dueOn}.`,
        )}
      </InlineNote>
      <SectionCard
        title={t(`Criteria for “${c.name}”`, `المعايير لـ «${c.name}»`)}
        description={t(
          'Each target is set for this campaign; switch a criterion off if it does not apply to it. The numbers come from the CRM and the marketing platform.',
          'كل هدف يُحدد لهذه الحملة؛ أوقف أي معيار لا ينطبق عليها. الأرقام من CRM ومنصة التسويق.',
        )}
      >
        <ul className="flex flex-col gap-2">
          {st.criteria.map((k) => {
            const on = !a.skipped.includes(k.id)
            const r = results.find((x) => x.k.id === k.id)
            return (
              <li key={k.id} className="well flex flex-wrap items-center justify-between gap-3 p-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{L(k.name)}</span>
                  <span className="text-xs text-muted-foreground">{k.metric ? L(METRIC_LABEL[k.metric]) : L(k.rule)}</span>
                </span>
                {on && k.metric && r?.value !== undefined && (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t('measured', 'المقاس')}</span>
                    <span className="font-medium tabular text-foreground">{unit(k, r.value)}</span>
                    <span className="text-muted-foreground">
                      {k.dir === 'max' ? t('target at most', 'الهدف بحد أقصى') : t('target at least', 'الهدف بحد أدنى')}
                    </span>
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={a.targets[k.id] ?? k.target ?? 0}
                      aria-label={t('Target for this campaign', 'الهدف لهذه الحملة')}
                      onChange={(e) => updateAudit(c.id, { targets: { ...a.targets, [k.id]: Number(e.target.value) } })}
                    />
                    <StatusBadge tone={r.pass ? 'success' : 'danger'}>{r.pass ? t('Met', 'متحقق') : t('Not met', 'غير متحقق')}</StatusBadge>
                  </span>
                )}
                {on && !k.metric && (
                  <span className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={a.manual[k.id] === true ? 'default' : 'outline'}
                      onClick={() => updateAudit(c.id, { manual: { ...a.manual, [k.id]: true } })}
                    >
                      {t('Met', 'متحقق')}
                    </Button>
                    <Button
                      size="sm"
                      variant={a.manual[k.id] === false ? 'default' : 'outline'}
                      onClick={() => updateAudit(c.id, { manual: { ...a.manual, [k.id]: false } })}
                    >
                      {t('Not met', 'غير متحقق')}
                    </Button>
                  </span>
                )}
                <Switch
                  checked={on}
                  aria-label={`${L(k.name)}: ${t('applies to this campaign', 'ينطبق على هذه الحملة')}`}
                  onCheckedChange={(v) => updateAudit(c.id, { skipped: v ? a.skipped.filter((x) => x !== k.id) : [...a.skipped, k.id] })}
                />
              </li>
            )
          })}
        </ul>
      </SectionCard>
      <SectionCard title={t('Verdict', 'الحكم')} description={t(`${passed} of ${active.length} criteria met.`, `${passed} من ${active.length} معايير متحققة.`)}>
        <div className="flex flex-col gap-3">
          <Textarea
            rows={2}
            value={a.note ?? ''}
            placeholder={t('Your notes for Marketing (optional)', 'ملاحظاتك للتسويق (اختياري)')}
            onChange={(e) => updateAudit(c.id, { note: e.target.value })}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {a.verdict && (
              <StatusBadge tone={a.verdict === 'success' ? 'success' : 'danger'}>
                {a.verdict === 'success' ? t('Judged successful', 'حُكم بنجاحها') : t('Judged not successful', 'حُكم بعدم نجاحها')} · {a.decidedAt}
              </StatusBadge>
            )}
            {!open && (
              <span className="text-xs text-muted-foreground">
                {t(`The verdict can be given from ${w.opensOn}.`, `يمكن إعطاء الحكم ابتداءً من ${w.opensOn}.`)}
              </span>
            )}
            {(['success', 'fail'] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={v === 'success' ? 'default' : 'outline'}
                disabled={!open}
                onClick={() => {
                  const at = new Date(CAMPAIGN_NOW).toISOString().slice(0, 10)
                  updateAudit(c.id, { verdict: v, decidedAt: at })
                  log(
                    'action',
                    {
                      en: `Judged the campaign "${c.name}" (${c.code}) ${v === 'success' ? 'successful' : 'not successful'}: ${passed} of ${active.length} criteria met`,
                      ar: `حكم على الحملة "${c.name}" (${c.code}) بأنها ${v === 'success' ? 'ناجحة' : 'غير ناجحة'}: ${passed} من ${active.length} معايير متحققة`,
                    },
                    '/settings/campaign-audit',
                  )
                  toast.success(t('Verdict saved.', 'تم حفظ الحكم.'))
                }}
              >
                {v === 'success' ? t('Successful', 'ناجحة') : t('Not successful', 'غير ناجحة')}
              </Button>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// --- Criteria -----------------------------------------------------------------------------------------------------------

function CriteriaTab() {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const st = useAuditState()
  const [draft, setDraft] = useState<Criterion | null>(null)
  const s = st.settings

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={t('Criteria every campaign is judged on', 'المعايير التي تُقيَّم عليها كل حملة')}
        description={t(
          'The default target of each criterion. On the audit tab every campaign can set its own target or switch a criterion off.',
          'الهدف الافتراضي لكل معيار. في تبويب التدقيق يمكن لكل حملة تحديد هدفها أو إيقاف معيار.',
        )}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => resetCriteria()}>
              <RotateCcw aria-hidden />
              {t('Back to the defaults', 'العودة للافتراضي')}
            </Button>
            <Button size="sm" onClick={() => setDraft({ id: `cr-${Date.now().toString(36)}`, name: { en: '', ar: '' }, rule: { en: '', ar: '' } })}>
              <Plus aria-hidden />
              {t('Add a criterion', 'أضف معياراً')}
            </Button>
          </div>
        }
      >
        <ul className="flex flex-col gap-2">
          {[...st.criteria, ...(draft && !st.criteria.some((x) => x.id === draft.id) ? [draft] : [])].map((k) =>
            draft?.id === k.id ? (
              <CriterionForm
                key={k.id}
                value={draft}
                onCancel={() => setDraft(null)}
                onSave={(v) => {
                  saveCriterion(v)
                  log(
                    'action',
                    { en: `Saved the campaign criterion "${v.name.en}"`, ar: `حفظ معيار الحملات "${v.name.ar || v.name.en}"` },
                    '/settings/campaign-audit',
                  )
                  setDraft(null)
                }}
              />
            ) : (
              <li key={k.id} className="well flex flex-wrap items-center justify-between gap-3 p-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{L(k.name)}</span>
                  <span className="text-xs text-muted-foreground">{L(k.rule)}</span>
                </span>
                <span className="text-sm text-foreground">
                  {k.metric
                    ? `${L(METRIC_LABEL[k.metric])} ${k.dir === 'max' ? '≤' : '≥'} ${k.unit === 'AED' ? `AED ${fmt(k.target ?? 0, lang)}` : `${k.target}${k.unit ?? ''}`}`
                    : t('Marked by the auditor', 'يحدده المدقق')}
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setDraft({ ...k })}>
                    {t('Edit', 'تعديل')}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={t('Remove', 'حذف')} onClick={() => removeCriterion(k.id)}>
                    <Trash2 aria-hidden />
                  </Button>
                </span>
              </li>
            ),
          )}
        </ul>
      </SectionCard>
      <SectionCard
        title={t('When a campaign is judged', 'متى تُقيَّم الحملة')}
        description={t(
          'A long window on purpose: leads from a campaign keep converting for weeks after it ends.',
          'نافذة طويلة عن قصد: ليدز الحملة تستمر بالتحويل لأسابيع بعد انتهائها.',
        )}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ['auditOpensAfterDays', t('The audit opens, days after the end', 'يفتح التدقيق، أيام بعد النهاية')],
              ['auditDueDays', t('Days the auditor has once it opens', 'أيام المدقق بعد فتحه')],
              ['trackingDays', t('The CRM is read, days after the end', 'تُقرأ CRM، أيام بعد النهاية')],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {label}
              <Input type="number" min={1} value={s[k]} onChange={(e) => saveSettings({ ...s, [k]: Math.max(1, Number(e.target.value)) })} />
            </label>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function CriterionForm({ value, onSave, onCancel }: { value: Criterion; onSave: (v: Criterion) => void; onCancel: () => void }) {
  const { t, L } = useI18n()
  const [v, setV] = useState<Criterion>(value)
  const set = (p: Partial<Criterion>) => setV((x) => ({ ...x, ...p }))
  const METRIC_UNIT: Record<Metric, '%' | 'AED'> = { conversion: '%', contact24: '%', notContacted: '%', cpl: 'AED', segment: '%', tagged: '%' }
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Name (English)', 'الاسم (بالإنجليزية)')}
          <Input value={v.name.en} onChange={(e) => set({ name: { ...v.name, en: e.target.value } })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Name (Arabic)', 'الاسم (بالعربية)')}
          <Input dir="rtl" value={v.name.ar} onChange={(e) => set({ name: { ...v.name, ar: e.target.value } })} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('How it is judged', 'كيف يُحكم')}
        <Textarea rows={2} value={v.rule.en} onChange={(e) => set({ rule: { en: e.target.value, ar: v.rule.ar || e.target.value } })} />
      </label>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Measured from', 'يُقاس من')}
          <Select
            value={v.metric ?? 'manual'}
            onValueChange={(m) =>
              m === 'manual'
                ? set({ metric: undefined, dir: undefined, target: undefined, unit: undefined })
                : set({ metric: m as Metric, dir: v.dir ?? 'min', target: v.target ?? 0, unit: METRIC_UNIT[m as Metric] })
            }
          >
            <SelectTrigger aria-label={t('Measured from', 'يُقاس من')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('The auditor marks it', 'يحدده المدقق')}</SelectItem>
              {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {L(METRIC_LABEL[m])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {v.metric && (
          <>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Must be', 'يجب أن يكون')}
              <Select value={v.dir ?? 'min'} onValueChange={(d) => set({ dir: d as 'min' | 'max' })}>
                <SelectTrigger aria-label={t('Must be', 'يجب أن يكون')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">{t('at least', 'على الأقل')}</SelectItem>
                  <SelectItem value="max">{t('at most', 'على الأكثر')}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t(`Default target (${v.unit ?? ''})`, `الهدف الافتراضي (${v.unit ?? ''})`)}
              <Input type="number" value={v.target ?? 0} onChange={(e) => set({ target: Number(e.target.value) })} />
            </label>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('Cancel', 'إلغاء')}
        </Button>
        <Button
          size="sm"
          disabled={!v.name.en.trim()}
          onClick={() => onSave({ ...v, name: { en: v.name.en.trim(), ar: v.name.ar.trim() || v.name.en.trim() } })}
        >
          {t('Save', 'حفظ')}
        </Button>
      </div>
    </li>
  )
}

// --- Sources ------------------------------------------------------------------------------------------------------------

function SourcesTab() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4">
      <SectionCard title={t('Two sources', 'مصدران')}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="well flex flex-col gap-2 p-4">
            <span className="t-ui-strong">{t('1. The marketing platform', '1. منصة التسويق')}</span>
            <p className="text-sm text-muted-foreground">
              {t(
                'Where Marketing builds and sends the campaign. Gives: the campaign name and code, type, target segment, persona, the responsible person, channels, budget, dates, and what was sent: who received an email or a message, delivered, opened, clicked.',
                'حيث يبني التسويق الحملة ويرسلها. يعطي: اسم الحملة ورمزها، النوع، الشريحة المستهدفة، الشخصية، المسؤول، القنوات، الميزانية، التواريخ، وماذا أُرسل: من وصله بريد أو رسالة، وصلت، فُتحت، نُقرت.',
              )}
            </p>
          </div>
          <div className="well flex flex-col gap-2 p-4">
            <span className="t-ui-strong">{t('2. The CRM', '2. نظام CRM')}</span>
            <p className="text-sm text-muted-foreground">
              {t(
                'Follows every lead the campaign brought, read again every hour: contacted or not, answered or not, by which method, in progress, won or lost. The conversion rate per campaign comes from here.',
                'يتابع كل ليد جلبته الحملة، ويُقرأ كل ساعة: تم التواصل أم لا، رد أم لا، بأي طريقة، قيد المتابعة، مغلق بنجاح أو خسرناه. نسبة التحويل لكل حملة تأتي من هنا.',
              )}
            </p>
          </div>
        </div>
      </SectionCard>
      <InlineNote tone="warning" title={t('What must exist in the CRM (Chairman’s rule)', 'ما يجب أن يوجد في CRM (قاعدة رئيس مجلس الإدارة)')}>
        {t(
          'Every lead that comes from a campaign carries the campaign’s code as a tag in the CRM, from the moment it is created, for the whole campaign period. Without the tag a lead cannot be traced back to its campaign and the conversion rate is wrong. Status: not verified yet in the live CRM (to be checked in each environment, read-only).',
          'كل ليد يأتي من حملة يحمل رمز الحملة كوسم في CRM منذ لحظة إنشائه، طوال فترة الحملة. بدون الوسم لا يمكن ربط الليد بحملته وتكون نسبة التحويل خاطئة. الحالة: لم يُتحقق منه بعد في CRM الفعلي (يُفحص في كل بيئة، للقراءة فقط).',
        )}
      </InlineNote>
      <SectionCard
        title={t('Connections', 'الاتصالات')}
        description={t(
          'Set up by the Super admin or the Admin on the Integrations page: “Marketing campaigns platform” and the three CRM connections (with the campaign tag field).',
          'يضبطها المشرف العام أو المشرف في صفحة الربط والتكاملات: «منصة الحملات التسويقية» واتصالات CRM الثلاثة (مع حقل وسم الحملة).',
        )}
      >
        <span />
      </SectionCard>
    </div>
  )
}

