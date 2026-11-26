import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Database } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuditActor } from '@/auth/useAuditActor'
import { useEnvScope } from '@/services/envScope'
import { useAiCampaigns } from '@/services/queries'
import { canViewCustomerNames } from '@/auth/permissions'
import { useCampaignList } from '@/data/marketingCampaigns'
import { useViewportMode } from '@/components/layout/useViewportMode'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ENVIRONMENTS, environmentById } from '@/data/environments'
import {
  AI_CALLS_DAYS,
  AI_CALLS_UPDATED_AT,
  AI_CALL_DAILY,
  AI_CALL_EXTRA,
  AI_CAMPAIGNS,
  BRIGHTCALL_OUTCOMES,
  DROP_LABEL,
  EXCLUDED_LABEL,
  GROUP_LABEL,
  NOT_CALLED_LABEL,
  setOutcomeResult,
  useBrightcallMapping,
  type CallGroup,
  type DropBucket,
  type MappedResult,
} from '@/data/brightcall'
import { CALL_RESULTS, callResultInfo, useCallSurveyRule } from '@/data/callSurveyRule'
import { summarizeAiCalls } from '@/utils/aiCalls'
import { CUSTOMER_KINDS, KIND_LABEL, linkOf, setCampaignLink, useCampaignLinks, type CampaignKindAi } from '@/data/campaignLinks'
import { CHANNEL_LABEL, CONTACT_TOUCHES, MESSAGE_STATUS, type TouchChannel } from '@/data/contactTouches'
import { repeatRows, repeatsByCampaign, repeatSummary, type RepeatRow } from '@/utils/contactRepeats'
import type { Bi, EnvId } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Segmented } from '@/components/ui/segmented'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'
const NOW = Date.parse('2026-11-26T06:40:00Z')
type Period = '7' | '30' | '90' | 'custom'
const TODAY = new Date(NOW).toISOString().slice(0, 10)
/** The earliest day the sample holds (the backend keeps 2 years of daily totals). */
const FIRST_DAY = new Date(NOW - (AI_CALLS_DAYS - 1) * 86_400_000).toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(NOW - (n - 1) * 86_400_000).toISOString().slice(0, 10)
const GROUP_COLOR: Record<CallGroup, string> = {
  answered: 'var(--chart-1)',
  dropped: 'var(--status-error-solid, #d93025)',
  no_answer: 'var(--ink-tertiary, #9aa0a6)',
  not_called: 'var(--chart-4)',
  excluded: 'var(--line, #e5e7eb)',
}

const nf = (lang: string) => new Intl.NumberFormat(lang === 'ar' ? 'ar-AE' : 'en-GB')
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–')

/** The filters the Overview and Repeat contacts tabs share. */
interface AiFilters {
  from: string
  to: string
  rangeOk: boolean
  env: string
  campaign: string
  /** The campaigns of the chosen kinds. */
  only: ReadonlySet<string>
}
type KindFilter = 'customer' | CampaignKindAi | 'all'

/**
 * The AI call center (BrightCall), 26 Nov (owner): the overall numbers from daily totals per environment, campaign and outcome; who was
 * contacted again and again (Repeat contacts); which portal campaign each BrightCall campaign belongs to (Campaign links); and the
 * outcome mapping. No recordings or transcripts: those stay in BrightCall. CX manager and CX team only.
 */
export default function AiCallCenter() {
  const { t, L, lang } = useI18n()
  const { env, allowed, fixed } = useEnvScope()
  const links = useCampaignLinks()
  const [params, setParams] = useSearchParams()
  const TABS = ['overview', 'repeats', 'links', 'mapping'] as const
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as (typeof TABS)[number]) : 'overview'
  const [period, setPeriod] = useState<Period>('30')
  const [envF, setEnvF] = useState<string>(ALL)
  const [campaign, setCampaign] = useState<string>(ALL)
  const [kind, setKind] = useState<KindFilter>('customer')
  // 26 Nov (owner): a custom from-to range besides the quick periods
  const [customFrom, setCustomFrom] = useState(daysAgo(30))
  const [customTo, setCustomTo] = useState(TODAY)
  const custom = period === 'custom'
  const rangeOk = !custom || (customFrom !== '' && customTo !== '' && customFrom <= customTo)
  const from = custom ? customFrom : daysAgo(Number(period))
  const to = custom ? customTo : TODAY
  const scopeEnv = env !== 'all' ? env : envF
  const only = useMemo(
    () =>
      new Set(
        AI_CAMPAIGNS.map((c) => c.campaign).filter((c) => {
          const k = linkOf(links, c).kind
          return kind === 'all' || (kind === 'customer' ? CUSTOMER_KINDS.includes(k) : k === kind)
        }),
      ),
    [links, kind],
  )
  const f: AiFilters = { from: rangeOk ? from : TODAY, to: rangeOk ? to : TODAY, rangeOk, env: scopeEnv, campaign, only }
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1
  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const campaigns = AI_CAMPAIGNS.filter((c) => (scopeEnv === ALL || c.envId === scopeEnv) && only.has(c.campaign))
  const envName = (id: string) => L(environmentById(id as EnvId).name)
  const filtered = tab === 'overview' || tab === 'repeats'

  return (
    <div data-density="comfortable" className="flex flex-col gap-6">
      <PageHeader
        sample
        title={t('AI call center', 'مركز الاتصال بالذكاء الاصطناعي')}
        description={t(
          'BrightCall campaigns in overall numbers: who we targeted, how many we reached, what happened and what it cost, and who we contacted again and again. Recordings and transcripts stay in BrightCall.',
          'حملات BrightCall بالأرقام الإجمالية: من استهدفنا، وكم وصلنا، وماذا حدث، وكم كلّف، ومن تواصلنا معه مراراً. التسجيلات والنصوص تبقى في BrightCall.',
        )}
      />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })} className="gap-6">
        <div className="-m-1 overflow-x-auto p-1">
          <TabsList className="min-w-max" aria-label={t('AI call center', 'مركز الاتصال بالذكاء الاصطناعي')}>
            <TabsTrigger value="overview">{t('Overview', 'نظرة عامة')}</TabsTrigger>
            <TabsTrigger value="repeats">{t('Repeat contacts', 'التواصل المتكرر')}</TabsTrigger>
            <TabsTrigger value="links">{t('Campaign links', 'ربط الحملات')}</TabsTrigger>
            <TabsTrigger value="mapping">{t('Outcome mapping', 'ربط النتائج')}</TabsTrigger>
          </TabsList>
        </div>

        {filtered && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented<Period>
                  label={t('Period', 'الفترة')}
                  variant="pressed"
                  value={period}
                  onValueChange={setPeriod}
                  options={[
                    { value: '7', label: t('7 days', '7 أيام') },
                    { value: '30', label: t('30 days', '30 يوماً') },
                    { value: '90', label: t('90 days', '90 يوماً') },
                    { value: 'custom', label: t('Custom', 'مخصص') },
                  ]}
                />
                {custom && (
                  <span className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {t('From', 'من')}
                      <Input
                        type="date"
                        value={customFrom}
                        min={FIRST_DAY}
                        max={customTo || TODAY}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="h-9 w-40"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {t('To', 'إلى')}
                      <Input
                        type="date"
                        value={customTo}
                        min={customFrom || FIRST_DAY}
                        max={TODAY}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="h-9 w-40"
                      />
                    </label>
                  </span>
                )}
                {fixed ? (
                  <StatusBadge tone="info">
                    {t('Your environment:', 'بيئتك:')} {envName(fixed)}
                  </StatusBadge>
                ) : (
                  env === 'all' && (
                    <Select
                      value={envF}
                      onValueChange={(v) => {
                        setEnvF(v)
                        setCampaign(ALL)
                      }}
                    >
                      <SelectTrigger aria-label={t('Environment', 'البيئة')} className="h-9 min-w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t('All environments', 'كل البيئات')}</SelectItem>
                        {ENVIRONMENTS.filter((e) => allowed.includes(e.id) && AI_CAMPAIGNS.some((c) => c.envId === e.id)).map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {L(e.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )}
                <Select
                  value={kind}
                  onValueChange={(v) => {
                    setKind(v as KindFilter)
                    setCampaign(ALL)
                  }}
                >
                  <SelectTrigger aria-label={t('Campaign type', 'نوع الحملة')} className="h-9 min-w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">{t('Customer campaigns', 'حملات العملاء')}</SelectItem>
                    {(Object.keys(KIND_LABEL) as CampaignKindAi[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {L(KIND_LABEL[k])}
                      </SelectItem>
                    ))}
                    <SelectItem value="all">{t('Every type', 'كل الأنواع')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={campaign} onValueChange={setCampaign}>
                  <SelectTrigger aria-label={t('Campaign', 'الحملة')} className="h-9 min-w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{t('All campaigns', 'كل الحملات')}</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.campaign} value={c.campaign}>
                        {c.campaign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {useFreshness()}
            </div>
            <p className={rangeOk ? 'text-sm text-muted-foreground' : 'text-sm text-(--status-error-text)'} aria-live="polite">
              {rangeOk
                ? t(
                    `Showing ${dateFmt.format(new Date(from))} to ${dateFmt.format(new Date(to))} · ${days} days`,
                    `يعرض من ${dateFmt.format(new Date(from))} إلى ${dateFmt.format(new Date(to))} · ${days} يوماً`,
                  )
                : t('Choose a start date on or before the end date.', 'اختر تاريخ بداية قبل تاريخ النهاية أو مساوياً له.')}
            </p>
          </div>
        )}

        <TabsContent value="overview">
          <Overview f={f} />
        </TabsContent>
        <TabsContent value="repeats">
          <RepeatContacts f={f} />
        </TabsContent>
        <TabsContent value="links">
          <CampaignLinksTab />
        </TabsContent>
        <TabsContent value="mapping">
          <Mapping />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function useFreshness() {
  const { t, lang } = useI18n()
  const mins = Math.round((NOW - Date.parse(AI_CALLS_UPDATED_AT)) / 60_000)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Database aria-hidden className="size-3.5" />
      {t(
        `Daily totals from BrightCall · updated ${mins} min ago`,
        `مجاميع يومية من BrightCall · حُدّثت قبل ${new Intl.NumberFormat(lang === 'ar' ? 'ar-AE' : 'en-GB').format(mins)} دقيقة`,
      )}
    </span>
  )
}

function Overview({ f }: { f: AiFilters }) {
  const { t, L, lang } = useI18n()
  const mapping = useBrightcallMapping()
  const survey = useCallSurveyRule()
  const links = useCampaignLinks()
  const N = nf(lang)
  const s = useMemo(
    () => summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, mapping, { env: f.env, campaign: f.campaign, from: f.from, to: f.to, only: f.only }),
    [mapping, f.env, f.campaign, f.from, f.to, f.only],
  )
  const repeats = useMemo(
    () => repeatsByCampaign(repeatRows(CONTACT_TOUCHES, { from: f.from, to: f.to, env: f.env, campaign: f.campaign, campaigns: f.only })),
    [f.from, f.to, f.env, f.campaign, f.only],
  )
  const answered = s.byGroup.answered
  const dropped = s.byGroup.dropped
  const surveyable = survey.sendOn.reduce((n, r) => n + (s.byResult.get(r)?.contacts ?? 0), 0)
  const answeredSent = s.sentiment.positive + s.sentiment.neutral + s.sentiment.negative
  const envName = (id: string) => L(environmentById(id as EnvId).name)

  const split: [CallGroup, number][] = [
    ['answered', answered],
    ['no_answer', s.byGroup.no_answer],
    ['dropped', dropped],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
        <KpiTile
          label={t('Targeted customers', 'العملاء المستهدفون')}
          value={N.format(s.targeted)}
          sub={t('in the selected campaigns', 'في الحملات المختارة')}
        />
        <KpiTile
          label={t('Progress', 'التقدّم')}
          value={pct(s.attempted, s.targeted)}
          sub={t(`${N.format(s.attempted)} tried at least once`, `${N.format(s.attempted)} جُرّب الاتصال بهم مرة على الأقل`)}
        />
        <KpiTile
          label={t('Calls', 'المكالمات')}
          value={N.format(s.calls)}
          sub={t(`answer rate ${pct(answered, s.calls)}`, `نسبة الرد ${pct(answered, s.calls)}`)}
        />
        <KpiTile
          label={t('Dropped calls', 'المكالمات المغلقة')}
          value={N.format(dropped)}
          sub={t(
            `${pct(dropped, s.calls)} of calls · ${N.format(s.drops.within_20s)} at the AI greeting`,
            `${pct(dropped, s.calls)} من المكالمات · ${N.format(s.drops.within_20s)} عند التحية`,
          )}
        />
        <KpiTile
          label={t('Leads generated', 'العملاء المحتملون')}
          value={N.format(s.leads)}
          sub={t(`${pct(s.leads, answered)} of answered calls`, `${pct(s.leads, answered)} من المكالمات المجابة`)}
        />
        <KpiTile
          label={t('Cost (AED)', 'التكلفة (درهم)')}
          value={N.format(Math.round(s.cost))}
          sub={t(
            `${s.leads ? N.format(Math.round(s.cost / s.leads)) : '–'} per lead`,
            `${s.leads ? N.format(Math.round(s.cost / s.leads)) : '–'} لكل عميل محتمل`,
          )}
        />
        <KpiTile
          label={t('Can get the CSAT + CES survey', 'مؤهلون لاستبيان CSAT + CES')}
          value={N.format(surveyable)}
          sub={t('contacts with an approved call result', 'عملاء بنتيجة مكالمة معتمدة')}
          to="/settings/surveys?tab=when"
        />
        <KpiTile
          label={t('Angry customers', 'عملاء غاضبون')}
          value={N.format(s.complaints)}
          sub={t('"Angry Bird": raised as complaint signals', '«Angry Bird»: تُرفع كإشارات شكوى')}
          to="/actions/signals"
        />
      </div>

      <div className="grid gap-6 desktop:grid-cols-2">
        <SectionCard
          title={t('Call split', 'توزيع المكالمات')}
          description={t('Answered, not answered and dropped, as BrightCall splits them.', 'مجابة وغير مجابة ومغلقة، كما يقسّمها BrightCall.')}
        >
          <div className="flex flex-col gap-4">
            <div aria-hidden className="flex h-4 w-full overflow-hidden rounded-full">
              {split.map(([g, n]) => (
                <span key={g} style={{ width: `${s.calls ? (100 * n) / s.calls : 0}%`, background: GROUP_COLOR[g] }} />
              ))}
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              {split.map(([g, n]) => (
                <div key={g} className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <dt className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: GROUP_COLOR[g] }} />
                    {L(GROUP_LABEL[g])}
                  </dt>
                  <dd className="tabular">
                    {N.format(n)} <span className="text-muted-foreground">({pct(n, s.calls)})</span>
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-1 text-muted-foreground">
                <dt>{t('Blocked before the call (DNCR, not in the CRM)', 'مُنعت قبل الاتصال (سجل عدم الاتصال، غير موجود في CRM)')}</dt>
                <dd className="tabular">{N.format(s.byGroup.not_called)}</dd>
              </div>
            </dl>
          </div>
        </SectionCard>

        <SectionCard title={t('Dropped calls', 'المكالمات المغلقة')} description={t('When the customer hung up.', 'متى أغلق العميل الخط.')}>
          <Bars rows={(Object.keys(DROP_LABEL) as DropBucket[]).map((k) => [L(DROP_LABEL[k]), s.drops[k]])} />
          <h3 className="label-style pt-5 pb-2">{t('Sentiment of answered calls', 'انطباع المكالمات المجابة')}</h3>
          <Bars
            total={answeredSent}
            rows={[
              [t('Positive', 'إيجابي'), s.sentiment.positive, 'var(--status-success-solid, #188038)'],
              [t('Neutral', 'محايد'), s.sentiment.neutral],
              [t('Negative', 'سلبي'), s.sentiment.negative, 'var(--status-error-solid, #d93025)'],
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard
        title={t('By call result', 'حسب نتيجة المكالمة')}
        description={t(
          'BrightCall outcomes grouped into the portal’s call results (Outcome mapping tab).',
          'نتائج BrightCall مجمّعة في نتائج المكالمة في البوابة (تبويب ربط النتائج).',
        )}
        actions={
          <Link to="?tab=mapping" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {t('Outcome mapping', 'ربط النتائج')}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
          </Link>
        }
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('Call result', 'نتيجة المكالمة')}</TableHead>
              <TableHead className="text-end">{t('Calls', 'مكالمات')}</TableHead>
              <TableHead className="text-end">{t('Contacts', 'عملاء')}</TableHead>
              <TableHead className="text-end">{t('Share', 'النسبة')}</TableHead>
              <TableHead>{t('Survey', 'الاستبيان')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CALL_RESULTS.filter((r) => s.byResult.has(r.id))
              .sort((a, z) => (s.byResult.get(z.id)?.calls ?? 0) - (s.byResult.get(a.id)?.calls ?? 0))
              .map((r) => {
                const v = s.byResult.get(r.id)!
                const sends = survey.enabled && survey.sendOn.includes(r.id)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{L(r.label)}</TableCell>
                    <TableCell className="text-end tabular">{N.format(v.calls)}</TableCell>
                    <TableCell className="text-end tabular">{N.format(v.contacts)}</TableCell>
                    <TableCell className="text-end tabular">{pct(v.calls, s.calls)}</TableCell>
                    <TableCell>
                      {sends ? <StatusBadge tone="success">{t('CSAT + CES', 'CSAT + CES')}</StatusBadge> : <span className="text-muted-foreground">–</span>}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        title={t('Campaigns', 'الحملات')}
        description={t(
          'Largest first. Drop rate is the share hung up at the AI greeting.',
          'الأكبر أولاً. نسبة الإغلاق هي نسبة من أغلقوا الخط عند تحية الذكاء الاصطناعي.',
        )}
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('Campaign', 'الحملة')}</TableHead>
              <TableHead>{t('Environment', 'البيئة')}</TableHead>
              <TableHead className="text-end">{t('Targeted', 'المستهدفون')}</TableHead>
              <TableHead className="text-end">{t('Progress', 'التقدّم')}</TableHead>
              <TableHead className="text-end">{t('Calls', 'مكالمات')}</TableHead>
              <TableHead className="text-end">{t('Answer rate', 'نسبة الرد')}</TableHead>
              <TableHead className="text-end">{t('Drop at greeting', 'إغلاق عند التحية')}</TableHead>
              <TableHead className="text-end">{t('Leads', 'محتملون')}</TableHead>
              <TableHead className="text-end">{t('Cost per lead', 'تكلفة العميل المحتمل')}</TableHead>
              <TableHead className="text-end">{t('Contacted 2+ times', 'تواصلنا معهم مرتين أو أكثر')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.campaigns.map((c) => {
              const drop = c.answered + c.dropped20 ? (100 * c.dropped20) / (c.answered + c.dropped20) : 0
              return (
                <TableRow key={c.campaign}>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">{c.campaign}</span>
                      <span className="text-xs text-muted-foreground">
                        {L(KIND_LABEL[linkOf(links, c.campaign).kind])}
                        {' · '}
                        {linkOf(links, c.campaign).linkedTo ?? t('not linked', 'غير مربوطة')}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{envName(c.envId)}</TableCell>
                  <TableCell className="text-end tabular">{N.format(c.targeted)}</TableCell>
                  <TableCell className="text-end tabular">{pct(c.attempted, c.targeted)}</TableCell>
                  <TableCell className="text-end tabular">{N.format(c.calls)}</TableCell>
                  <TableCell className="text-end tabular">{pct(c.answered, c.calls)}</TableCell>
                  <TableCell className="text-end">
                    <StatusBadge tone={drop >= 40 ? 'danger' : drop >= 30 ? 'warning' : 'neutral'}>{drop.toFixed(0)}%</StatusBadge>
                  </TableCell>
                  <TableCell className="text-end tabular">{N.format(c.leads)}</TableCell>
                  <TableCell className="text-end tabular">{c.leads ? N.format(Math.round(c.cost / c.leads)) : '–'}</TableCell>
                  <TableCell className="text-end">
                    <Link to={`?tab=repeats&c=${encodeURIComponent(c.campaign)}`} className="tabular underline-offset-2 hover:underline">
                      {N.format(repeats.get(c.campaign) ?? 0)}
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}

function Bars({ rows, total }: { rows: [string, number, string?][]; total?: number }) {
  const { lang } = useI18n()
  const N = nf(lang)
  const sum = total ?? rows.reduce((a, [, n]) => a + n, 0)
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map(([label, n, color]) => (
        <li key={label} className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between gap-3">
            <span className="text-foreground">{label}</span>
            <span className="tabular text-muted-foreground">
              {N.format(n)} · {pct(n, sum)}
            </span>
          </span>
          <span aria-hidden className="h-2 overflow-hidden rounded-full bg-well">
            <span className="block h-full rounded-full" style={{ width: `${sum ? (100 * n) / sum : 0}%`, background: color ?? 'var(--chart-1)' }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

const resultLabel = (r: MappedResult): Bi => (r === 'not_called' ? NOT_CALLED_LABEL : r === 'excluded' ? EXCLUDED_LABEL : callResultInfo(r).label)

function Mapping() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { log } = useAuditActor()
  const mapping = useBrightcallMapping()
  const survey = useCallSurveyRule()
  const canEdit = role.id === 'cxmgr'
  const N = nf(lang)
  const from = new Date(NOW - (AI_CALLS_DAYS - 1) * 86_400_000).toISOString().slice(0, 10)
  const s = useMemo(() => summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, mapping, { env: ALL, campaign: ALL, from }), [mapping, from])
  const known = new Set(mapping.map((m) => m.code))
  const unmapped = [...s.byOutcome.keys()].filter((c) => !known.has(c))
  const options: MappedResult[] = [...CALL_RESULTS.map((r) => r.id), 'not_called', 'excluded']

  return (
    <div className="flex flex-col gap-6">
      {unmapped.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-(--status-warning-bg) p-3 text-sm">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t(
            `New BrightCall outcomes not mapped yet: ${unmapped.join(', ')}. They count as "Other answered result" until mapped.`,
            `نتائج جديدة من BrightCall غير مربوطة بعد: ${unmapped.join('، ')}. تُحسب «نتيجة أخرى بعد الرد» حتى تُربط.`,
          )}
        </div>
      )}
      <SectionCard
        title={t('BrightCall outcome to portal call result', 'نتيجة BrightCall إلى نتيجة المكالمة في البوابة')}
        description={
          canEdit
            ? t(
                'Every outcome BrightCall sends maps to one call result. The survey after a call, the drop rate and the leads read this mapping. A change applies from now on and is logged.',
                'كل نتيجة يرسلها BrightCall تُربط بنتيجة مكالمة واحدة. الاستبيان بعد المكالمة ونسبة الإغلاق والعملاء المحتملون تقرأ هذا الربط. التغيير يسري من الآن ويُسجَّل.',
              )
            : t('View only. The CX manager changes the mapping.', 'للعرض فقط. يغيّر مدير تجربة العملاء الربط.')
        }
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('BrightCall outcome', 'نتيجة BrightCall')}</TableHead>
              <TableHead>{t('Group', 'المجموعة')}</TableHead>
              <TableHead>{t('Counts as', 'تُحسب كـ')}</TableHead>
              <TableHead>{t('Survey', 'الاستبيان')}</TableHead>
              <TableHead>{t('Also', 'أيضاً')}</TableHead>
              <TableHead className="text-end">{t('Calls, 90 days', 'مكالمات، 90 يوماً')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mapping.map((m) => {
              const sends = survey.enabled && m.result !== 'not_called' && m.result !== 'excluded' && survey.sendOn.includes(m.result)
              return (
                <TableRow key={m.code}>
                  <TableCell className="font-medium whitespace-nowrap" dir="ltr">
                    {m.code}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{L(GROUP_LABEL[m.group])}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={m.result}
                        onValueChange={(v) => {
                          const def = mapping.find((x) => x.code === m.code)
                          setOutcomeResult(m.code, v as MappedResult)
                          log('action', {
                            en: `BrightCall outcome "${m.code}" now counts as "${resultLabel(v as MappedResult).en}" (was "${def ? resultLabel(def.result).en : ''}")`,
                            ar: `نتيجة BrightCall «${m.code}» تُحسب الآن «${resultLabel(v as MappedResult).ar}» (كانت «${def ? resultLabel(def.result).ar : ''}»)`,
                          })
                        }}
                      >
                        <SelectTrigger aria-label={m.code} className="h-8 min-w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((o) => (
                            <SelectItem key={o} value={o}>
                              {L(resultLabel(o))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      L(resultLabel(m.result))
                    )}
                    {m.edited && (
                      <button
                        type="button"
                        className="ms-2 text-xs text-muted-foreground underline"
                        onClick={() => setOutcomeResult(m.code, null)}
                        disabled={!canEdit}
                      >
                        {t('changed · reset', 'معدّل · استرجاع')}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>{sends ? <StatusBadge tone="success">CSAT + CES</StatusBadge> : <span className="text-muted-foreground">–</span>}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {m.lead && <StatusBadge tone="info">{t('Lead', 'عميل محتمل')}</StatusBadge>}
                    {m.complaint && <StatusBadge tone="danger">{t('Complaint signal', 'إشارة شكوى')}</StatusBadge>}
                  </TableCell>
                  <TableCell className="text-end tabular">{N.format(s.byOutcome.get(m.code)?.calls ?? 0)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}

const CHANNEL_COLOR: Record<TouchChannel, string> = {
  ai_call: 'var(--chart-1)',
  whatsapp: 'var(--status-success-solid, #188038)',
  sms: 'var(--chart-3)',
  email: 'var(--chart-4)',
}
const REPEAT_PAGE = 20

/**
 * Repeat contacts (26 Nov, owner): customers contacted again and again, inside one campaign and across campaigns, by AI calls and by
 * the campaign's messages. A click opens the person's attempts: campaign, time, method, status and call duration. No contact limit is
 * enforced; this only shows it. It also feeds the personas later (how each person answers each channel).
 */
function RepeatContacts({ f }: { f: AiFilters }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const [params, setParams] = useSearchParams()
  const names = canViewCustomerNames(role.id)
  const N = nf(lang)
  const focus = params.get('c') ?? ''
  const [min, setMin] = useState<'2' | '3' | '5' | '10'>('2')
  const [shown, setShown] = useState(REPEAT_PAGE)
  const [open, setOpen] = useState<RepeatRow | null>(null)
  const rows = useMemo(
    () => repeatRows(CONTACT_TOUCHES, { from: f.from, to: f.to, env: f.env, campaign: focus || f.campaign, campaigns: f.only }),
    [f.from, f.to, f.env, f.campaign, f.only, focus],
  )
  const sum = repeatSummary(rows)
  const list = rows.filter((r) => r.total >= Number(min))
  const who = (r: RepeatRow) => (names ? r.contact.name : r.contact.crmId)

  return (
    <div className="flex flex-col gap-6">
      {focus && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone="info">
            {t('Campaign:', 'الحملة:')} {focus}
          </StatusBadge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('c')
              setParams(next, { replace: true })
            }}
          >
            {t('Show every campaign', 'عرض كل الحملات')}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
        <KpiTile
          label={t('Customers contacted', 'عملاء تم التواصل معهم')}
          value={N.format(sum.customers)}
          sub={t(`${N.format(sum.attempts)} attempts`, `${N.format(sum.attempts)} محاولة`)}
        />
        <KpiTile
          label={t('2+ times in one campaign', 'مرتين أو أكثر في حملة واحدة')}
          value={N.format(sum.repeatedInOne)}
          sub={t(`${pct(sum.repeatedInOne, sum.customers)} of the customers`, `${pct(sum.repeatedInOne, sum.customers)} من العملاء`)}
        />
        <KpiTile
          label={t('Reached by 2+ campaigns', 'وصلتهم حملتان أو أكثر')}
          value={N.format(sum.multiCampaign)}
          sub={t(`${N.format(sum.threePlus)} by 3 or more`, `${N.format(sum.threePlus)} من 3 حملات أو أكثر`)}
        />
        <KpiTile
          label={t('Most attempts on one customer', 'أكثر محاولات لعميل واحد')}
          value={N.format(sum.mostTouches)}
          sub={t('in the selected period', 'في الفترة المختارة')}
        />
      </div>

      <SectionCard
        title={t('Customers contacted again and again', 'عملاء تواصلنا معهم مراراً')}
        description={t('Most attempts first. Click a customer to see every attempt.', 'الأكثر محاولات أولاً. اضغط على العميل لرؤية كل المحاولات.')}
        actions={
          <Segmented<'2' | '3' | '5' | '10'>
            label={t('At least', 'على الأقل')}
            variant="pressed"
            value={min}
            onValueChange={(v) => {
              setMin(v)
              setShown(REPEAT_PAGE)
            }}
            options={[
              { value: '2', label: t('2+ times', '2+ مرات') },
              { value: '3', label: t('3+', '3+') },
              { value: '5', label: t('5+', '5+') },
              { value: '10', label: t('10+', '10+') },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('Nobody was contacted that often in this view.', 'لم يُتواصل مع أحد بهذا القدر في هذا العرض.')}</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {list.slice(0, shown).map((r) => (
                <li key={r.contact.crmId} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    className="flex w-full flex-col gap-2 rounded-lg px-2 py-3 text-start outline-hidden hover:bg-well focus-visible:ring-2 focus-visible:ring-ring/40 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium text-foreground">{who(r)}</span>
                      <span className="text-xs text-muted-foreground">
                        {L(environmentById(r.contact.envId).name)} · {r.contact.persona}
                      </span>
                    </span>
                    <span className="text-sm sm:w-72">
                      {t(
                        `Contacted ${r.total} times in ${r.perCampaign.length} ${r.perCampaign.length === 1 ? 'campaign' : 'campaigns'}`,
                        `تواصلنا معه ${N.format(r.total)} مرة في ${N.format(r.perCampaign.length)} ${r.perCampaign.length === 1 ? 'حملة' : 'حملات'}`,
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {t(`Most in one: ${r.perCampaign[0][0]} (${r.maxInOne})`, `الأكثر في حملة واحدة: ${r.perCampaign[0][0]} (${N.format(r.maxInOne)})`)}
                      </span>
                    </span>
                    <span className="flex w-full flex-col gap-1 sm:w-56">
                      <span aria-hidden className="flex h-2 overflow-hidden rounded-full bg-well">
                        {(Object.keys(CHANNEL_LABEL) as TouchChannel[]).map((ch) =>
                          r.byChannel[ch] ? <span key={ch} style={{ width: `${(100 * r.byChannel[ch]) / r.total}%`, background: CHANNEL_COLOR[ch] }} /> : null,
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(Object.keys(CHANNEL_LABEL) as TouchChannel[])
                          .filter((ch) => r.byChannel[ch])
                          .map((ch) => `${L(CHANNEL_LABEL[ch])} ${N.format(r.byChannel[ch])}`)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {list.length > shown && (
              <Button variant="outline" className="mt-3 self-start" onClick={() => setShown((n) => n + REPEAT_PAGE)}>
                {t(`Show more (${list.length - shown} left)`, `عرض المزيد (${N.format(list.length - shown)} متبقٍ)`)}
              </Button>
            )}
          </>
        )}
      </SectionCard>

      {open && <ContactAttempts row={open} name={who(open)} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** The attempts of one customer: per channel, per campaign, and each attempt with its time, method, status and duration. */
function ContactAttempts({ row, name, onClose }: { row: RepeatRow; name: string; onClose: () => void }) {
  const { t, L, lang } = useI18n()
  const phone = useViewportMode() === 'phone'
  const N = nf(lang)
  const dt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dubai',
  })
  const mapping = useBrightcallMapping()
  const callTone = (code: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    const m = mapping.find((x) => x.code === code)
    if (m?.complaint) return 'danger'
    if (m?.lead) return 'success'
    if (m?.group === 'dropped') return 'warning'
    return 'neutral'
  }
  const statusLabel = (ch: TouchChannel, s: string) => (ch === 'ai_call' ? s : L(MESSAGE_STATUS[s] ?? { en: s, ar: s }))
  const mins = (sec?: number) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '–')
  const body = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="t-h4">{name}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            `Contacted ${row.total} times in ${row.perCampaign.length} campaigns · ${row.contact.persona}`,
            `تواصلنا معه ${N.format(row.total)} مرة في ${N.format(row.perCampaign.length)} حملات · ${row.contact.persona}`,
          )}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="label-style">{t('By method', 'حسب الطريقة')}</h3>
          <Bars
            total={row.total}
            rows={(Object.keys(CHANNEL_LABEL) as TouchChannel[])
              .filter((ch) => row.byChannel[ch])
              .map((ch) => [L(CHANNEL_LABEL[ch]), row.byChannel[ch], CHANNEL_COLOR[ch]])}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="label-style">{t('By campaign', 'حسب الحملة')}</h3>
          <Bars total={row.total} rows={row.perCampaign.map(([c, n]) => [c, n])} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="label-style">{t('Every attempt', 'كل المحاولات')}</h3>
        <Table density="comfortable">
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('Date and time', 'التاريخ والوقت')}</TableHead>
              <TableHead>{t('Campaign', 'الحملة')}</TableHead>
              <TableHead>{t('Method', 'الطريقة')}</TableHead>
              <TableHead>{t('Status', 'الحالة')}</TableHead>
              <TableHead className="text-end">{t('Duration', 'المدة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...row.touches].reverse().map((x, i) => (
              <TableRow key={`${x.at}-${i}`}>
                <TableCell className="whitespace-nowrap tabular">{dt.format(new Date(x.at))}</TableCell>
                <TableCell className="whitespace-nowrap">{x.campaign}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: CHANNEL_COLOR[x.channel] }} />
                    {L(CHANNEL_LABEL[x.channel])}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    tone={x.channel === 'ai_call' ? callTone(x.status) : x.status === 'failed' ? 'warning' : x.status === 'replied' ? 'success' : 'neutral'}
                  >
                    <bdi dir={x.channel === 'ai_call' ? 'ltr' : undefined}>{statusLabel(x.channel, x.status)}</bdi>
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-end tabular">{x.channel === 'ai_call' ? mins(x.durationSec) : '–'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="t-caption">
          {t(
            'Recordings and transcripts stay in BrightCall. Message text stays in the marketing platform.',
            'التسجيلات والنصوص تبقى في BrightCall. نص الرسائل يبقى في منصة التسويق.',
          )}
        </p>
      </div>
    </div>
  )
  const title = t('Contact attempts', 'محاولات التواصل')
  return phone ? (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-b-none px-4 pt-6 pb-8">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{name}</SheetDescription>
        {body}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{name}</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  )
}

/** Campaign links (26 Nov, owner): what each BrightCall campaign is and which portal campaign it belongs to. CX manager edits. */
function CampaignLinksTab() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { log } = useAuditActor()
  const links = useCampaignLinks()
  const marketing = useCampaignList()
  const { data: aiCampaigns } = useAiCampaigns()
  const canEdit = role.id === 'cxmgr'
  const N = nf(lang)
  const totals = useMemo(
    () => summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, BRIGHTCALL_OUTCOMES, { env: ALL, campaign: ALL, from: FIRST_DAY }),
    [],
  )
  const calls = new Map(totals.campaigns.map((c) => [c.campaign, c.calls]))
  const NONE = '__none'
  const targets = (kind: CampaignKindAi): { id: string; label: string }[] =>
    kind === 'marketing'
      ? marketing.map((m) => ({ id: m.code, label: `${m.code} · ${m.name}` }))
      : kind === 'cx_interview'
        ? (aiCampaigns ?? []).map((a) => ({ id: a.id, label: L(a.name) }))
        : []
  const unlinked = AI_CAMPAIGNS.filter((c) => {
    const l = linkOf(links, c.campaign)
    return CUSTOMER_KINDS.includes(l.kind) && !l.linkedTo
  })

  return (
    <div className="flex flex-col gap-6">
      {unlinked.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-(--status-warning-bg) p-3 text-sm">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t(
            `${unlinked.length} customer campaigns are not linked yet, so their calls and cost are missing from Marketing campaigns. Ask that every new BrightCall campaign carries the campaign code (MKT-…) so it links by itself.`,
            `${N.format(unlinked.length)} حملات عملاء غير مربوطة بعد، فمكالماتها وتكلفتها غائبة عن الحملات التسويقية. اطلب أن تحمل كل حملة جديدة في BrightCall رمز الحملة (MKT-…) لتُربط تلقائياً.`,
          )}
        </div>
      )}
      <SectionCard
        title={t('BrightCall campaign to portal campaign', 'حملة BrightCall إلى حملة البوابة')}
        description={
          canEdit
            ? t(
                'A Marketing campaign links by its code; a CX interview campaign links to its Close the loop campaign. HR and test campaigns stay out of the customer numbers. Each change is logged.',
                'الحملة التسويقية تُربط برمزها؛ وحملة مقابلات تجربة العملاء تُربط بحملتها في إغلاق الحلقة. حملات الموارد البشرية والاختبار تبقى خارج أرقام العملاء. كل تغيير يُسجَّل.',
              )
            : t('View only. The CX manager changes the links.', 'للعرض فقط. يغيّر مدير تجربة العملاء الربط.')
        }
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('BrightCall campaign', 'حملة BrightCall')}</TableHead>
              <TableHead>{t('Type', 'النوع')}</TableHead>
              <TableHead>{t('Linked to', 'مربوطة بـ')}</TableHead>
              <TableHead className="text-end">{t('Calls, 90 days', 'مكالمات، 90 يوماً')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {AI_CAMPAIGNS.map((c) => {
              const l = linkOf(links, c.campaign)
              const opts = targets(l.kind)
              const save = (next: { kind: CampaignKindAi; linkedTo: string | null }) => {
                setCampaignLink(c.campaign, next)
                log('action', {
                  en: `BrightCall campaign "${c.campaign}": ${KIND_LABEL[next.kind].en}, linked to ${next.linkedTo ?? 'nothing'}`,
                  ar: `حملة BrightCall «${c.campaign}»: ${KIND_LABEL[next.kind].ar}، مربوطة بـ ${next.linkedTo ?? 'لا شيء'}`,
                })
              }
              return (
                <TableRow key={c.campaign}>
                  <TableCell className="font-medium whitespace-nowrap">{c.campaign}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={l.kind} onValueChange={(v) => save({ kind: v as CampaignKindAi, linkedTo: null })}>
                        <SelectTrigger aria-label={t('Type', 'النوع')} className="h-8 min-w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(KIND_LABEL) as CampaignKindAi[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {L(KIND_LABEL[k])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      L(KIND_LABEL[l.kind])
                    )}
                  </TableCell>
                  <TableCell>
                    {opts.length === 0 ? (
                      <span className="text-muted-foreground">{t('Not a customer campaign', 'ليست حملة عملاء')}</span>
                    ) : canEdit ? (
                      <Select value={l.linkedTo ?? NONE} onValueChange={(v) => save({ kind: l.kind, linkedTo: v === NONE ? null : v })}>
                        <SelectTrigger aria-label={t('Linked to', 'مربوطة بـ')} className="h-8 min-w-72">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{t('Not linked yet', 'غير مربوطة بعد')}</SelectItem>
                          {opts.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : l.linkedTo ? (
                      (opts.find((o) => o.id === l.linkedTo)?.label ?? l.linkedTo)
                    ) : (
                      <StatusBadge tone="warning">{t('Not linked yet', 'غير مربوطة بعد')}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="text-end tabular">{N.format(calls.get(c.campaign) ?? 0)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}
