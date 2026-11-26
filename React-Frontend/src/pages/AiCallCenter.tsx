import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Database } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuditActor } from '@/auth/useAuditActor'
import { useEnvScope } from '@/services/envScope'
import { ENVIRONMENTS, environmentById } from '@/data/environments'
import {
  AI_CALLS_DAYS,
  AI_CALLS_UPDATED_AT,
  AI_CALL_DAILY,
  AI_CALL_EXTRA,
  AI_CAMPAIGNS,
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
import type { Bi, EnvId } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Segmented } from '@/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'
const NOW = Date.parse('2026-11-26T06:40:00Z')
type Period = '7' | '30' | '90'
const GROUP_COLOR: Record<CallGroup, string> = {
  answered: 'var(--chart-1)',
  dropped: 'var(--status-error-solid, #d93025)',
  no_answer: 'var(--ink-tertiary, #9aa0a6)',
  not_called: 'var(--chart-4)',
  excluded: 'var(--line, #e5e7eb)',
}

const nf = (lang: string) => new Intl.NumberFormat(lang === 'ar' ? 'ar-AE' : 'en-GB')
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–')

/**
 * The AI call center (BrightCall), 26 Nov (owner): the overall numbers only, from daily totals per environment, campaign and outcome.
 * No call list, recordings or transcripts: those stay in BrightCall, which keeps this page fast. Two tabs: Overview, and Outcome mapping
 * (each BrightCall outcome and the portal call result it counts as, which the survey after a call reads). CX manager and CX team only.
 */
export default function AiCallCenter() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'mapping' ? 'mapping' : 'overview'
  return (
    <div data-density="comfortable" className="flex flex-col gap-6">
      <PageHeader
        sample
        title={t('AI call center', 'مركز الاتصال بالذكاء الاصطناعي')}
        description={t(
          'BrightCall campaigns in overall numbers: who we targeted, how many we reached, what happened and what it cost. Daily totals only; call records stay in BrightCall.',
          'حملات BrightCall بالأرقام الإجمالية: من استهدفنا، وكم وصلنا، وماذا حدث، وكم كلّف. مجاميع يومية فقط؛ سجلات المكالمات تبقى في BrightCall.',
        )}
      />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'mapping' ? { tab: v } : {}, { replace: true })} className="gap-6">
        <TabsList aria-label={t('AI call center', 'مركز الاتصال بالذكاء الاصطناعي')}>
          <TabsTrigger value="overview">{t('Overview', 'نظرة عامة')}</TabsTrigger>
          <TabsTrigger value="mapping">{t('Outcome mapping', 'ربط النتائج')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview />
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

function Overview() {
  const { t, L, lang } = useI18n()
  const { env, allowed, fixed } = useEnvScope()
  const mapping = useBrightcallMapping()
  const survey = useCallSurveyRule()
  const [period, setPeriod] = useState<Period>('30')
  const [envF, setEnvF] = useState<string>(ALL)
  const [campaign, setCampaign] = useState<string>(ALL)
  const N = nf(lang)
  const scopeEnv = env !== 'all' ? env : envF
  const from = new Date(NOW - (Number(period) - 1) * 86_400_000).toISOString().slice(0, 10)
  const s = useMemo(
    () => summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, mapping, { env: scopeEnv, campaign, from }),
    [mapping, scopeEnv, campaign, from],
  )
  const campaigns = AI_CAMPAIGNS.filter((c) => scopeEnv === ALL || c.envId === scopeEnv)
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
            ]}
          />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.campaigns.map((c) => {
              const drop = c.answered + c.dropped20 ? (100 * c.dropped20) / (c.answered + c.dropped20) : 0
              return (
                <TableRow key={c.campaign}>
                  <TableCell className="font-medium whitespace-nowrap">{c.campaign}</TableCell>
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
