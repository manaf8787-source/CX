import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuditActor } from '@/auth/useAuditActor'
import { useAuth } from '@/auth/session'
import {
  UNKNOWN_CRM_TAGS,
  codeTaken,
  latestRecord,
  envShares,
  trackingIn,
  recordVerdict,
  registerCampaign,
  useCampaignList,
  type AuditRecord,
  type CampaignType,
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
import { ENVIRONMENTS, environmentById } from '@/data/environments'
import type { EnvId } from '@/types'

/**
 * Marketing campaigns (owner's and Chairman's request, 23 Nov): one page for Marketing and the Internal Audit and Marketing Lead.
 * Results (both): per campaign, what the marketing platform sent and what the CRM says happened to the leads tagged with the campaign
 * code, read again every hour, with the conversion rate. Audit after the run and Criteria (the Internal Audit and Marketing Lead only):
 * criteria and targets per campaign, judged only after a long tracking window. 23 Nov: no clearance before a run (removed by the owner): everything here is after the campaign.
 * Sources: where each number comes from and what must exist in the CRM (the campaign tag).
 */
const TABS = ['results', 'history', 'audit', 'criteria', 'sources'] as const
type Tab = (typeof TABS)[number]
const ALL = 'all'

export default function MarketingCampaigns() {
  const { t } = useI18n()
  const { role } = useRole()
  const isAuditor = role.id === 'auditmkt'
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab') as Tab | null
  const allowed: Tab[] = isAuditor ? [...TABS] : ['results', 'history', 'sources']
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
            <TabsTrigger value="history">{t('Audit history', 'سجل التدقيق')}</TabsTrigger>
            {isAuditor && <TabsTrigger value="audit">{t('Audit after the run', 'التدقيق بعد التشغيل')}</TabsTrigger>}
            {isAuditor && <TabsTrigger value="criteria">{t('Criteria', 'المعايير')}</TabsTrigger>}
            <TabsTrigger value="sources">{t('Where the numbers come from', 'من أين تأتي الأرقام')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="results">
          <Results picked={picked} onPick={pick} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab
            onOpen={(id) => {
              pick(id)
            }}
          />
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
  const campaigns = useCampaignList()
  return (
    <label className="flex min-w-72 flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{t('Campaign', 'الحملة')}</span>
      <Select value={picked} onValueChange={onPick}>
        <SelectTrigger aria-label={t('Campaign', 'الحملة')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value={ALL}>{t('All campaigns', 'كل الحملات')}</SelectItem>}
          {campaigns.map((c) => (
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
  const campaigns = useCampaignList()
  const st = useAuditState()
  const [registering, setRegistering] = useState<string | null>(null)
  const [env, setEnv] = useState<EnvId | 'all'>('all')
  const rows = useMemo(() => campaigns.filter((c) => env === 'all' || c.envIds?.includes(env)).map((c) => ({ c, tr: trackingIn(c, env) })), [campaigns, env])
  const unknown = UNKNOWN_CRM_TAGS.filter((u) => !codeTaken(u.code))
  const current = rows.find((x) => x.c.id === picked)
  const lastRead = rows.reduce((m, x) => (x.tr.lastReadAt > m ? x.tr.lastReadAt : m), '')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CampaignPicker picked={picked} onPick={onPick} />
        <EnvFilter value={env} onChange={setEnv} />
        <Button size="sm" variant="outline" onClick={() => setRegistering('')}>
          <Plus aria-hidden />
          {t('Register a campaign', 'سجّل حملة')}
        </Button>
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
      {unknown.map((u) => (
        <InlineNote
          key={u.code}
          tone="warning"
          title={t(
            `${u.leads} leads in the CRM carry the code ${u.code}, but no campaign has it`,
            `${u.leads} ليد في CRM تحمل الرمز ${u.code} ولا توجد حملة بهذا الرمز`,
          )}
          action={
            <Button size="sm" variant="outline" onClick={() => setRegistering(u.code)}>
              {t('Register it', 'سجّلها')}
            </Button>
          }
        >
          {t(
            `Seen since ${u.firstSeen}. Either Marketing adds it to the marketing platform (it then arrives here by itself), or register it now.`,
            `ظهرت منذ ${u.firstSeen}. إما أن يضيفها التسويق إلى منصة التسويق (فتصل هنا تلقائياً)، أو سجّلها الآن.`,
          )}
        </InlineNote>
      ))}
      {registering !== null && (
        <RegisterForm
          code={registering}
          onCancel={() => setRegistering(null)}
          onSaved={(id) => {
            setRegistering(null)
            onPick(id)
          }}
        />
      )}
      {current ? (
        <One c={current.c} env={env} record={latestRecord(st.history, current.c.id)} />
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
                    <TableHead>{t('Audit', 'التدقيق')}</TableHead>
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
                      <TableCell>
                        <VerdictBadge record={latestRecord(st.history, c.id)} />
                      </TableCell>
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

function One({ c, env, record }: { c: MarketingCampaign; env: EnvId | 'all'; record?: AuditRecord }) {
  const { t, L, lang } = useI18n()
  const tr = trackingIn(c, env)
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
          <Fact
            label={t('Audit', 'التدقيق')}
            value={
              <span className="flex flex-wrap items-center gap-2">
                <VerdictBadge record={record} />
                {record && (
                  <span className="text-xs text-muted-foreground">
                    {record.decidedAt} · {record.met}/{record.total} {t('criteria met', 'معايير متحققة')}
                    {record.note ? ` · “${record.note}”` : ''}
                  </span>
                )}
              </span>
            }
          />
          <Fact
            label={t('Came from', 'المصدر')}
            value={
              c.source === 'manual'
                ? t(`Registered by hand (${c.registeredBy ?? ''})`, `سُجّلت يدوياً (${c.registeredBy ?? ''})`)
                : t('The marketing platform', 'منصة التسويق')
            }
          />
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
      {env !== 'all' && (
        <InlineNote>
          {t(
            `Showing the leads that landed in ${L(environmentById(env).name)} only. What the platform sent is the whole campaign.`,
            `تُعرض الليدز التي وصلت إلى ${L(environmentById(env).name)} فقط. ما أرسلته المنصة هو للحملة كاملة.`,
          )}
        </InlineNote>
      )}
      <EnvBreakdown c={c} />
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
  const { session } = useAuth()
  const campaigns = useCampaignList()
  const c = campaigns.find((x) => x.id === picked) ?? campaigns[0]
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
      <EnvBreakdown c={c} />
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
                  recordVerdict({
                    id: `ar-${Date.now().toString(36)}`,
                    campaignId: c.id,
                    code: c.code,
                    name: c.name,
                    product: c.product,
                    type: c.type,
                    startDate: c.startDate,
                    endDate: c.endDate,
                    decidedAt: at,
                    decidedBy: session?.email ?? '',
                    verdict: v,
                    note: a.note?.trim() || undefined,
                    met: passed,
                    total: active.length,
                    snapshot: {
                      leads: tr.leads,
                      won: tr.won,
                      conversion: conversionPct(tr),
                      costPerLead: costPerLead(c, tr),
                      notContacted: tr.leads ? Math.round((tr.notContacted / tr.leads) * 100) : 0,
                    },
                    criteria: results.map((x) => ({ name: x.k.name, measured: x.value, target: x.target, unit: x.k.unit, dir: x.k.dir, pass: x.pass })),
                  })
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
      <SectionCard title={t('How a new campaign arrives', 'كيف تصل حملة جديدة')}>
        <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm text-foreground">
          <li>
            {t(
              'Marketing creates the campaign on the marketing platform, with a code (e.g. MKT-2026-046).',
              'ينشئ التسويق الحملة على منصة التسويق برمز (مثل MKT-2026-046).',
            )}
          </li>
          <li>
            {t(
              'Within the hour the portal reads it from the platform and it appears in the list, with what it sent.',
              'خلال ساعة يقرأها البورتال من المنصة وتظهر في القائمة مع ما أرسلته.',
            )}
          </li>
          <li>
            {t(
              'Every lead it brings is created in the CRM with that code as its tag; the portal counts and follows them every hour.',
              'كل ليد تجلبه يُنشأ في CRM بهذا الرمز كوسم؛ ويعدّها البورتال ويتابعها كل ساعة.',
            )}
          </li>
          <li>
            {t(
              'A code found on CRM leads that no campaign carries is flagged on the Results tab, to be registered.',
              'الرمز الموجود على ليدز CRM دون حملة تحمله يُنبَّه إليه في تبويب النتائج ليُسجَّل.',
            )}
          </li>
          <li>
            {t(
              'Until the platform is connected, Marketing or the auditor registers a campaign by hand ("Register a campaign").',
              'حتى تُربط المنصة، يسجّل التسويق أو المدقق الحملة يدوياً («سجّل حملة»).',
            )}
          </li>
        </ol>
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

// --- Verdict badge, history, register -----------------------------------------------------------------------------------

function VerdictBadge({ record }: { record?: AuditRecord }) {
  const { t } = useI18n()
  if (!record) return <span className="text-xs text-muted-foreground">{t('Not audited yet', 'لم تُدقَّق بعد')}</span>
  return (
    <StatusBadge tone={record.verdict === 'success' ? 'success' : 'danger'}>
      {record.verdict === 'success' ? t('Successful', 'ناجحة') : t('Not successful', 'غير ناجحة')}
    </StatusBadge>
  )
}

/** 23 Nov (owner): every verdict, frozen with its numbers, so a campaign can be looked up a year later. Marketing and the auditor read it. */
function HistoryTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, L, lang } = useI18n()
  const st = useAuditState()
  const [year, setYear] = useState<string>(ALL)
  const [verdict, setVerdict] = useState<string>(ALL)
  const [openId, setOpenId] = useState<string | null>(null)
  const years = [...new Set(st.history.map((r) => r.decidedAt.slice(0, 4)))].sort().reverse()
  const rows = [...st.history].reverse().filter((r) => (year === ALL || r.decidedAt.startsWith(year)) && (verdict === ALL || r.verdict === verdict))
  const exportCsv = () =>
    downloadCsv(
      'campaign-audit-history.csv',
      rows.map((r) => ({
        audited_on: r.decidedAt,
        audited_by: r.decidedBy,
        campaign: r.name,
        code: r.code,
        product: r.product,
        start: r.startDate,
        end: r.endDate,
        verdict: r.verdict === 'success' ? 'Successful' : 'Not successful',
        criteria_met: `${r.met}/${r.total}`,
        leads: r.snapshot.leads,
        won: r.snapshot.won,
        conversion_pct: r.snapshot.conversion,
        cost_per_lead_aed: r.snapshot.costPerLead,
        note: r.note ?? '',
      })),
    )
  const show = (n: number | undefined, unit?: string) => (n === undefined ? '—' : unit === 'AED' ? `AED ${fmt(n, lang)}` : `${n}${unit ?? ''}`)

  return (
    <div className="flex flex-col gap-4">
      <InlineNote>
        {t(
          'Every verdict is kept here with the numbers as they were on the day it was given, so it reads the same a year later even if the CRM changes. A campaign judged twice has two lines.',
          'كل حكم محفوظ هنا مع الأرقام كما كانت يوم صدوره، فيُقرأ كما هو بعد سنة حتى لو تغيّر CRM. الحملة التي حُكم عليها مرتين لها سطران.',
        )}
      </InlineNote>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-36 flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">{t('Year', 'السنة')}</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger aria-label={t('Year', 'السنة')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('All years', 'كل السنوات')}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex min-w-44 flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">{t('Verdict', 'الحكم')}</span>
          <Select value={verdict} onValueChange={setVerdict}>
            <SelectTrigger aria-label={t('Verdict', 'الحكم')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('All verdicts', 'كل الأحكام')}</SelectItem>
              <SelectItem value="success">{t('Successful', 'ناجحة')}</SelectItem>
              <SelectItem value="fail">{t('Not successful', 'غير ناجحة')}</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <Button size="sm" variant="outline" className="ms-auto" onClick={exportCsv}>
          {t('Export CSV', 'تصدير CSV')}
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-sm text-muted-foreground">{t('No audit yet for this choice.', 'لا تدقيق بعد لهذا الاختيار.')}</li>}
        {rows.map((r) => {
          const open = openId === r.id
          return (
            <li key={r.id} className="well flex flex-col gap-3 p-3">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-start outline-hidden focus-visible:ring-2"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.code} · {L(TYPE_LABEL[r.type])} · {r.startDate} – {r.endDate}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {t(`audited ${r.decidedAt} by ${r.decidedBy}`, `دُقّقت ${r.decidedAt} بواسطة ${r.decidedBy}`)}
                  <span className="tabular">
                    {r.met}/{r.total}
                  </span>
                  <VerdictBadge record={r} />
                  {r.sample && <StatusBadge>{t('Sample', 'تجريبي')}</StatusBadge>}
                </span>
              </button>
              {open && (
                <div className="flex flex-col gap-3 border-t border-line pt-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Fact label={t('Leads', 'الليدز')} value={fmt(r.snapshot.leads, lang)} />
                    <Fact label={t('Won', 'مغلقة')} value={fmt(r.snapshot.won, lang)} />
                    <Fact label={t('Conversion', 'التحويل')} value={`${r.snapshot.conversion}%`} />
                    <Fact label={t('Cost per lead', 'تكلفة الليد')} value={`AED ${fmt(r.snapshot.costPerLead, lang)}`} />
                    <Fact label={t('Not contacted', 'بلا تواصل')} value={`${r.snapshot.notContacted}%`} />
                  </div>
                  <ul className="flex flex-col gap-1">
                    {r.criteria.map((k, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-foreground">{L(k.name)}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {k.measured !== undefined && (
                            <>
                              {show(k.measured, k.unit)} · {k.dir === 'max' ? '≤' : '≥'} {show(k.target, k.unit)}
                            </>
                          )}
                          <StatusBadge tone={k.pass ? 'success' : k.pass === false ? 'danger' : 'neutral'}>
                            {k.pass ? t('Met', 'متحقق') : k.pass === false ? t('Not met', 'غير متحقق') : '—'}
                          </StatusBadge>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {r.note && <p className="text-foreground">“{r.note}”</p>}
                  {!r.sample && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => onOpen(r.campaignId)}>
                        {t('Open the campaign’s results today', 'افتح نتائج الحملة اليوم')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Until the marketing platform is connected: register a campaign by hand. Its code must be the tag Marketing puts on the leads in the CRM. */
function RegisterForm({ code, onCancel, onSaved }: { code: string; onCancel: () => void; onSaved: (id: string) => void }) {
  const { t, L } = useI18n()
  const { log } = useAuditActor()
  const { session } = useAuth()
  const today = new Date(CAMPAIGN_NOW).toISOString().slice(0, 10)
  const [v, setV] = useState({
    name: '',
    code,
    type: 'paid_social' as CampaignType,
    product: 're' as MarketingCampaign['product'],
    segment: '',
    persona: '',
    owner: '',
    channels: '',
    startDate: today,
    endDate: today,
    budget: 0,
    envIds: ['dub'] as EnvId[],
  })
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }))
  const dup = v.code.trim() !== '' && codeTaken(v.code)
  const ok = v.name.trim() && v.code.trim() && !dup && v.endDate >= v.startDate && v.envIds.length > 0
  const field = (label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {el}
    </label>
  )
  return (
    <SectionCard
      title={t('Register a campaign', 'سجّل حملة')}
      description={t(
        'Until the marketing platform is connected, a campaign can be entered by hand. Its code must be exactly the tag on its leads in the CRM, so the leads are counted.',
        'حتى تُربط منصة التسويق يمكن إدخال الحملة يدوياً. يجب أن يكون رمزها نفس الوسم على ليدزها في CRM تماماً ليتم عدّها.',
      )}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {field(t('Campaign name', 'اسم الحملة'), <Input value={v.name} onChange={(e) => set({ name: e.target.value })} />)}
        {field(
          t('Code (the CRM tag)', 'الرمز (وسم CRM)'),
          <>
            <Input dir="ltr" value={v.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="MKT-2026-046" aria-invalid={dup} />
            {dup && <span className="text-(--status-error-text)">{t('This code is already used.', 'هذا الرمز مستخدم.')}</span>}
          </>,
        )}
        {field(
          t('Type', 'النوع'),
          <Select value={v.type} onValueChange={(x) => set({ type: x as CampaignType })}>
            <SelectTrigger aria-label={t('Type', 'النوع')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABEL) as CampaignType[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {L(TYPE_LABEL[k])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
        {field(t('Starts', 'تبدأ'), <Input type="date" value={v.startDate} onChange={(e) => set({ startDate: e.target.value })} />)}
        {field(t('Ends', 'تنتهي'), <Input type="date" value={v.endDate} onChange={(e) => set({ endDate: e.target.value })} />)}
        {field(
          t('Budget (AED)', 'الميزانية (درهم)'),
          <Input type="number" min={0} value={v.budget} onChange={(e) => set({ budget: Number(e.target.value) })} />,
        )}
        {field(t('Target segment', 'الشريحة المستهدفة'), <Input value={v.segment} onChange={(e) => set({ segment: e.target.value })} />)}
        {field(t('Persona', 'الشخصية'), <Input value={v.persona} onChange={(e) => set({ persona: e.target.value })} />)}
        {field(t('Responsible (title)', 'المسؤول (المسمى)'), <Input value={v.owner} onChange={(e) => set({ owner: e.target.value })} />)}
        {field(t('Channels (comma separated)', 'القنوات (مفصولة بفاصلة)'), <Input value={v.channels} onChange={(e) => set({ channels: e.target.value })} />)}
        <fieldset className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-3">
          <legend className="mb-1">{t('Environments its leads land in (one or more)', 'البيئات التي تصل إليها ليدزها (واحدة أو أكثر)')}</legend>
          <div className="flex flex-wrap gap-3">
            {ENVIRONMENTS.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={v.envIds.includes(e.id)}
                  onChange={(ev) => set({ envIds: ev.target.checked ? [...v.envIds, e.id] : v.envIds.filter((x) => x !== e.id) })}
                />
                {L(e.name)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('Cancel', 'إلغاء')}
        </Button>
        <Button
          size="sm"
          disabled={!ok}
          onClick={() => {
            const id = `mk-${Date.now().toString(36)}`
            registerCampaign({
              id,
              code: v.code.trim(),
              name: v.name.trim(),
              type: v.type,
              product: v.product,
              segment: v.segment.trim(),
              persona: v.persona.trim(),
              owner: v.owner.trim(),
              channels: v.channels
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
              startDate: v.startDate,
              endDate: v.endDate,
              budget: v.budget,
              sent: 0,
              delivered: 0,
              opened: 0,
              clicked: 0,
              segmentMatchPct: 0,
              envIds: v.envIds,
              source: 'manual',
              registeredBy: session?.email ?? '',
            })
            log(
              'action',
              { en: `Registered the campaign "${v.name.trim()}" (${v.code.trim()}) by hand`, ar: `سجّل الحملة "${v.name.trim()}" (${v.code.trim()}) يدوياً` },
              '/settings/campaign-audit',
            )
            toast.success(t('Registered. Its leads are counted from the CRM tag.', 'سُجّلت. تُعدّ ليدزها من وسم CRM.'))
            onSaved(id)
          }}
        >
          {t('Register', 'سجّل')}
        </Button>
      </div>
    </SectionCard>
  )
}

/** All environments or one; each environment has its own CRM. */
function EnvFilter({ value, onChange }: { value: EnvId | 'all'; onChange: (v: EnvId | 'all') => void }) {
  const { t, L } = useI18n()
  return (
    <label className="flex min-w-48 flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{t('Environment', 'البيئة')}</span>
      <Select value={value} onValueChange={(v) => onChange(v as EnvId | 'all')}>
        <SelectTrigger aria-label={t('Environment', 'البيئة')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('All environments', 'كل البيئات')}</SelectItem>
          {ENVIRONMENTS.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {L(e.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

/** One campaign, environment by environment: its leads can land in several CRMs. */
function EnvBreakdown({ c }: { c: MarketingCampaign }) {
  const { t, L, lang } = useI18n()
  const shares = envShares(c)
  return (
    <SectionCard
      title={t('By environment', 'حسب البيئة')}
      description={t('Each environment has its own CRM; the campaign’s leads are counted in each one.', 'لكل بيئة CRM خاص بها؛ تُعدّ ليدز الحملة في كل واحدة.')}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Environment', 'البيئة')}</TableHead>
            <TableHead className="text-end">{t('Leads', 'الليدز')}</TableHead>
            <TableHead className="text-end">{t('Not contacted', 'بلا تواصل')}</TableHead>
            <TableHead className="text-end">{t('Won', 'مغلقة')}</TableHead>
            <TableHead className="text-end">{t('Conversion', 'التحويل')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.map(({ envId }) => {
            const tr = trackingIn(c, envId)
            return (
              <TableRow key={envId}>
                <TableCell className="font-medium text-foreground">{L(environmentById(envId).name)}</TableCell>
                <TableCell className="text-end tabular">{fmt(tr.leads, lang)}</TableCell>
                <TableCell className="text-end tabular">{fmt(tr.notContacted, lang)}</TableCell>
                <TableCell className="text-end tabular">{fmt(tr.won, lang)}</TableCell>
                <TableCell className="text-end tabular">{conversionPct(tr)}%</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </SectionCard>
  )
}

