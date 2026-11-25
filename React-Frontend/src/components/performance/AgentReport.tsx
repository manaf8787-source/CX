import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Clock, Download, Headset, Percent, ShieldAlert, Star, TrendingUp, UserX, Users } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useAuditActor } from '@/auth/useAuditActor'
import { AGENTS, PRODUCT_SOURCES, REASSIGN_AFTER_MIN, agentHistory, agentMetrics, type Agent, type AgentKind, type AgentRecord } from '@/data/agents'
import { ENVIRONMENTS, envName } from '@/data/environments'
import { PRODUCTS } from '@/data/products'
import { presetRange, ymd, type RangePreset } from '@/data/performance'
import { downloadCsv } from '@/utils/csv'
import type { EnvId, ProductId } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { SortHead, useSort } from '@/components/common/SortHead'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiTile } from '@/components/common/KpiTile'
import { Bad, Good, Rate } from '@/components/common/Trend'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { ChartTooltip, ChartWell, ChartLegend } from '@/components/common/charts'
import { chartAxis, chartBar, chartBarMuted, chartColor, chartCursorBar, chartGrid } from '@/components/common/chartTheme'

/**
 * The Sales agents and Excellence team reports (22 Nov; the Excellence team was "Support agents" until 23 Nov): one component, filterable by product, period, environment and agent.
 * `envId` limits it to one environment (the environment's CEO sees their own only); without it every agent shows.
 * The date range drives the tiles, the table, the chart and the export, so what is on screen is what is exported.
 */
interface Props {
  kind: AgentKind
  canExport: boolean
  envId?: EnvId
}

const fmtPct = (n: number | null) => (n === null ? '—' : `${n}%`)

export function AgentReport({ kind, canExport, envId }: Props) {
  const { t, L, lang } = useI18n()
  const now = useNow()
  const { log } = useAuditActor()

  const [preset, setPreset] = useState<RangePreset>('last_90')
  const initial = presetRange('last_90', now)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [product, setProduct] = useState<ProductId | 'all'>('all')
  const [env, setEnv] = useState<EnvId | 'all'>('all')
  const [agentId, setAgentId] = useState('all')

  const choosePreset = (p: RangePreset) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = presetRange(p, now)
      setFrom(r.from)
      setTo(r.to)
    }
  }

  // the agents this report may show: this kind, and for a single-environment viewer only agents of that environment
  const allowed = useMemo(() => AGENTS.filter((a) => a.kind === kind && (!envId || a.envId === envId)), [kind, envId])
  const products = useMemo(() => PRODUCTS.filter((p) => allowed.some((a) => a.product === p.id)), [allowed])
  const agents = useMemo(
    () => allowed.filter((a) => (product === 'all' || a.product === product) && (env === 'all' || a.envId === env)),
    [allowed, product, env],
  )

  const records = useMemo(() => {
    const byAgent = new Map<string, AgentRecord[]>()
    for (const a of agents)
      byAgent.set(
        a.id,
        agentHistory(a, now).filter((r) => r.at >= from && r.at <= to),
      )
    return byAgent
  }, [agents, now, from, to])

  const rows = useMemo(
    () => agents.map((a) => ({ agent: a, m: agentMetrics(records.get(a.id) ?? []) })).sort((x, y) => y.m.records - x.m.records),
    [agents, records],
  )

  const selectedAgents = agentId === 'all' ? agents : agents.filter((a) => a.id === agentId)
  const selected = useMemo(() => selectedAgents.flatMap((a) => records.get(a.id) ?? []), [selectedAgents, records])
  const total = agentMetrics(selected)

  const trend = useMemo(() => {
    const byMonth = new Map<string, AgentRecord[]>()
    for (const r of selected) byMonth.set(r.at.slice(0, 7), [...(byMonth.get(r.at.slice(0, 7)) ?? []), r])
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, rs]) => {
        const m = agentMetrics(rs)
        const d = new Date(`${month}-01T00:00:00`)
        return {
          month: new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { month: 'short', year: '2-digit' }).format(d),
          handled: m.records,
          late: m.firstMeasured - m.firstOnTime,
        }
      })
  }, [selected, lang])

  const productName = (id: ProductId) => L(PRODUCTS.find((p) => p.id === id)?.name ?? { en: id, ar: id })
  const channelName = (a: Agent) => (a.channel === 'whatsapp' ? t('WhatsApp', 'واتساب') : a.channel === 'chat' ? t('In-app chat', 'دردشة التطبيق') : '—')
  const sources = (product === 'all' ? products.map((p) => p.id) : [product]).filter((id) => PRODUCT_SOURCES[id])

  const sales = kind === 'sales'
  const baseName = sales ? 'sales-agents' : 'excellence-team'
  const rangeTag = `${from}_to_${to}`
  const title = sales ? t('Sales agents', 'وكلاء المبيعات') : t('Excellence team', 'فريق التميّز')
  const description = sales
    ? t(
        'How each sales agent handles leads: first response against the CRM lead SLA, activities done on time against their SLA, leads handled and converted, and what customers say about the agent.',
        'كيف يتعامل كل وكيل مبيعات مع العملاء المحتملين: أول رد مقابل مهلة CRM، والأنشطة المنجزة في موعدها، والعملاء المعالجون والمحوّلون، وما يقوله العملاء عن الوكيل.',
      )
    : t(
        'How each Excellence team member handles customers on WhatsApp and in-app chat: first response and resolution against their SLA, first-contact resolution, escalations and customer score.',
        'كيف يتعامل كل عضو في فريق التميّز مع العملاء عبر واتساب ودردشة التطبيق: أول رد والحل مقابل المهلة، والحل من أول تواصل، والتصعيد، وتقييم العميل.',
      )

  // leads each agent received because another agent did not reply in time, and how many agents lost at least one
  const receivedBy = new Map<string, number>()
  for (const a of agents) for (const r of records.get(a.id) ?? []) if (r.reassignedTo) receivedBy.set(r.reassignedTo, (receivedBy.get(r.reassignedTo) ?? 0) + 1)
  const agentsWhoLost = rows.filter(({ m }) => m.lostToReassign > 0).length
  // 24 Nov (owner): every number and percentage column sorts on click
  type AgentCol = 'name' | 'records' | 'first' | 'avgFirst' | 'acts' | 'converted' | 'conv' | 'lost' | 'received' | 'resolved' | 'fcr' | 'escalated' | 'score'
  const {
    sorted: sortedRows,
    sort,
    toggle,
  } = useSort<(typeof rows)[number], AgentCol>(rows, ({ agent, m }, k) =>
    k === 'name'
      ? agent.name
      : k === 'records'
        ? m.records
        : k === 'first'
          ? m.firstOnTimePct
          : k === 'avgFirst'
            ? m.avgFirstMin
            : k === 'acts'
              ? m.actsOnTimePct
              : k === 'converted'
                ? m.converted
                : k === 'conv'
                  ? m.conversionPct
                  : k === 'lost'
                    ? m.lostToReassign
                    : k === 'received'
                      ? (receivedBy.get(agent.id) ?? 0)
                      : k === 'resolved'
                        ? m.resolvedOnTimePct
                        : k === 'fcr'
                          ? m.fcrPct
                          : k === 'escalated'
                            ? m.escalated
                            : m.avgScore,
  )

  function exportSummary() {
    downloadCsv(
      `${baseName}-summary-${rangeTag}.csv`,
      rows.map(({ agent, m }) => ({
        [t('Agent', 'الوكيل')]: agent.name,
        [t('Product', 'المنتج')]: productName(agent.product),
        [t('Environment', 'البيئة')]: agent.envId ? L(envName(agent.envId)) : t('All', 'الكل'),
        ...(sales
          ? {
              [t('Leads handled', 'العملاء المعالجون')]: m.records,
              [t('First response on time %', 'أول رد في الموعد %')]: m.firstOnTimePct ?? '',
              [t('Avg minutes to first response', 'متوسط دقائق أول رد')]: m.avgFirstMin ?? '',
              [t('Activities', 'الأنشطة')]: m.acts,
              [t('Activities on time %', 'الأنشطة في الموعد %')]: m.actsOnTimePct ?? '',
              [t('Converted', 'المحوّلون')]: m.converted,
              [t('Conversion %', 'التحويل %')]: m.conversionPct ?? '',
              [t('Lost to another agent (no reply in time)', 'خسرها لوكيل آخر (لا رد في الموعد)')]: m.lostToReassign,
              [t('Lost to another agent %', 'خسرها لوكيل آخر %')]: m.lostToReassignPct ?? '',
              [t('Received from other agents', 'استلمها من وكلاء آخرين')]: receivedBy.get(agent.id) ?? 0,
            }
          : {
              [t('Channel', 'القناة')]: channelName(agent),
              [t('Conversations', 'المحادثات')]: m.records,
              [t('First response on time %', 'أول رد في الموعد %')]: m.firstOnTimePct ?? '',
              [t('Avg minutes to first response', 'متوسط دقائق أول رد')]: m.avgFirstMin ?? '',
              [t('Resolved within SLA %', 'الحل ضمن المهلة %')]: m.resolvedOnTimePct ?? '',
              [t('First-contact resolution %', 'الحل من أول تواصل %')]: m.fcrPct ?? '',
              [t('Escalated', 'المصعّدة')]: m.escalated,
            }),
        [t('Customer score (1-5)', 'تقييم العميل (1-5)')]: m.avgScore ?? '',
        [t('Customers who scored', 'عدد المقيّمين')]: m.scored,
        [t('From', 'من')]: from,
        [t('To', 'إلى')]: to,
      })),
    )
    log('action', {
      en: `Exported the ${sales ? 'sales agents' : 'Excellence team'} summary, ${from} to ${to}`,
      ar: `صدّر ملخص ${sales ? 'وكلاء المبيعات' : 'فريق التميّز'}، من ${from} إلى ${to}`,
    })
  }

  function exportRecords() {
    const name = (id: string) => AGENTS.find((a) => a.id === id)?.name ?? id
    downloadCsv(
      `${baseName}-records-${rangeTag}.csv`,
      selected
        .slice()
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((r) => ({
          [t('Agent', 'الوكيل')]: name(r.agentId),
          [sales ? t('Lead received', 'استلام العميل') : t('Conversation started', 'بدء المحادثة')]: r.at,
          [t('Minutes to first response', 'دقائق أول رد')]: r.firstMin ?? '',
          [t('First response SLA (min)', 'مهلة أول رد (دقيقة)')]: r.firstSlaMin ?? '',
          ...(sales
            ? {
                [t('Activities', 'الأنشطة')]: r.acts ?? '',
                [t('Activities on time', 'الأنشطة في الموعد')]: r.actsOnTime ?? '',
                [t('Converted', 'محوّل')]: r.converted === undefined ? '' : r.converted ? t('yes', 'نعم') : t('no', 'لا'),
                [t('Reassigned to (no reply in time)', 'أُعيد إسناده إلى (لا رد في الموعد)')]: r.reassignedTo ? name(r.reassignedTo) : '',
              }
            : {
                [t('Hours to resolve', 'ساعات الحل')]: r.resolveHrs ?? '',
                [t('Resolve SLA (h)', 'مهلة الحل (ساعة)')]: r.resolveSlaHrs ?? '',
                [t('Resolved at first contact', 'حُلّت من أول تواصل')]: r.fcr === undefined ? '' : r.fcr ? t('yes', 'نعم') : t('no', 'لا'),
                [t('Escalated', 'مصعّدة')]: r.escalated ? t('yes', 'نعم') : t('no', 'لا'),
              }),
          [t('Customer score (1-5)', 'تقييم العميل (1-5)')]: r.score ?? '',
          [t('Source', 'المصدر')]: t('Sample history', 'سجل تجريبي'),
        })),
    )
    log('action', {
      en: `Exported every record behind the ${sales ? 'sales agents' : 'Excellence team'} report, ${from} to ${to}`,
      ar: `صدّر كل السجلات خلف تقرير ${sales ? 'وكلاء المبيعات' : 'فريق التميّز'}، من ${from} إلى ${to}`,
    })
  }

  return (
    <div className="flex flex-col gap-4" data-density="comfortable" data-testid={`agent-report-${kind}`}>
      <PageHeader
        title={
          canExport ? (
            title
          ) : (
            <>
              {title}
              {/* 25 Nov (owner): a small tag beside the title instead of a banner */}
              <StatusBadge tone="neutral" className="ms-2 font-normal">
                {t('You can read this report. Exporting is not part of your role.', 'يمكنك قراءة هذا التقرير. التصدير ليس ضمن دورك.')}
              </StatusBadge>
            </>
          )
        }
        description={description}
        actions={
          canExport && (
            <>
              <Button variant="outline" onClick={exportRecords}>
                <Download aria-hidden />
                {sales ? t('Export every lead', 'تصدير كل العملاء') : t('Export every conversation', 'تصدير كل المحادثات')}
              </Button>
              <Button onClick={exportSummary}>
                <Download aria-hidden />
                {t('Export summary', 'تصدير الملخص')}
              </Button>
            </>
          )
        }
      />

      {envId && <InlineNote tone="info">{t(`You see the agents of ${L(envName(envId))} only.`, `ترى وكلاء ${L(envName(envId))} فقط.`)}</InlineNote>}

      <SectionCard>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Product', 'المنتج')}
            <Select
              value={product}
              onValueChange={(v) => {
                setProduct(v as ProductId | 'all')
                setAgentId('all')
              }}
            >
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
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Agent', 'الوكيل')}
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="h-9 min-w-48" aria-label={t('Agent', 'الوكيل')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All agents', 'كل الوكلاء')}</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {!envId && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Environment', 'البيئة')}
              <Select
                value={env}
                onValueChange={(v) => {
                  setEnv(v as EnvId | 'all')
                  setAgentId('all')
                }}
              >
                <SelectTrigger className="h-9 min-w-44" aria-label={t('Environment', 'البيئة')}>
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
          )}
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
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="agent-tiles">
        <KpiTile
          label={sales ? t('Leads handled', 'العملاء المعالجون') : t('Conversations', 'المحادثات')}
          value={total.records}
          icon={sales ? <Users /> : <Headset />}
          sub={t(`${selectedAgents.length} ${selectedAgents.length === 1 ? 'agent' : 'agents'}`, `${selectedAgents.length} وكلاء`)}
        />
        <KpiTile
          label={t('First response on time', 'أول رد في الموعد')}
          value={<Rate value={total.firstOnTimePct}>{fmtPct(total.firstOnTimePct)}</Rate>}
          icon={<Clock />}
          sub={total.avgFirstMin === null ? undefined : t(`${total.avgFirstMin} min on average`, `${total.avgFirstMin} دقيقة في المتوسط`)}
        />
        {sales ? (
          <>
            <KpiTile
              label={t('Activities on time', 'الأنشطة في الموعد')}
              value={<Rate value={total.actsOnTimePct}>{fmtPct(total.actsOnTimePct)}</Rate>}
              icon={<CheckCircle2 />}
              sub={t(`${total.actsOnTime} of ${total.acts}`, `${total.actsOnTime} من ${total.acts}`)}
            />
            <KpiTile
              label={t('Conversion', 'التحويل')}
              value={fmtPct(total.conversionPct)}
              icon={<TrendingUp />}
              sub={t(`${total.converted} converted`, `${total.converted} محوّل`)}
            />
            {/* 23 Nov (owner): leads taken from an agent for no first response in time and given to another */}
            <KpiTile
              label={t('Lost to another agent', 'خسرها لوكيل آخر')}
              value={total.lostToReassign ? <Bad>{total.lostToReassign}</Bad> : <Good>0</Good>}
              icon={<UserX />}
              sub={t(
                `${fmtPct(total.lostToReassignPct)} of leads · ${agentsWhoLost} of ${selectedAgents.filter((a) => a.crm).length} agents · no reply within ${REASSIGN_AFTER_MIN} min`,
                `${fmtPct(total.lostToReassignPct)} من العملاء · ${agentsWhoLost} من ${selectedAgents.filter((a) => a.crm).length} وكلاء · لا رد خلال ${REASSIGN_AFTER_MIN} دقيقة`,
              )}
            />
          </>
        ) : (
          <>
            <KpiTile
              label={t('Resolved within SLA', 'الحل ضمن المهلة')}
              value={<Rate value={total.resolvedOnTimePct}>{fmtPct(total.resolvedOnTimePct)}</Rate>}
              icon={<CheckCircle2 />}
            />
            <KpiTile
              label={t('First-contact resolution', 'الحل من أول تواصل')}
              value={
                <Rate value={total.fcrPct} good={70} bad={50}>
                  {fmtPct(total.fcrPct)}
                </Rate>
              }
              icon={<Percent />}
            />
            <KpiTile label={t('Escalated', 'المصعّدة')} value={total.escalated ? <Bad>{total.escalated}</Bad> : <Good>0</Good>} icon={<ShieldAlert />} />
          </>
        )}
        <KpiTile
          label={t('Customer score', 'تقييم العملاء')}
          value={total.avgScore === null ? '—' : <Rate value={total.avgScore * 20}>{total.avgScore}</Rate>}
          unit={total.avgScore === null ? undefined : '/5'}
          icon={<Star />}
          sub={t(`${total.scored} customers scored`, `${total.scored} عميل قيّم`)}
        />
      </div>

      <SectionCard
        title={t('By agent', 'حسب الوكيل')}
        description={t(
          'Most handled first. Click a column title to sort it; click a name to look at one agent.',
          'الأكثر معالجة أولاً. اضغط على عنوان عمود لترتيبه، وعلى اسم لعرض وكيل واحد.',
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead sortKey="name" sort={sort} onSort={toggle} label={t('Agent', 'الوكيل')} align="start" />
              <SortHead sortKey="records" sort={sort} onSort={toggle} label={sales ? t('Leads', 'العملاء') : t('Conversations', 'المحادثات')} />
              <SortHead sortKey="first" sort={sort} onSort={toggle} label={t('First response %', 'أول رد %')} />
              <SortHead sortKey="avgFirst" sort={sort} onSort={toggle} label={t('Avg first (min)', 'متوسط أول رد (د)')} />
              {sales ? (
                <>
                  <SortHead sortKey="acts" sort={sort} onSort={toggle} label={t('Activities on time %', 'الأنشطة في الموعد %')} />
                  <SortHead sortKey="converted" sort={sort} onSort={toggle} label={t('Converted', 'المحوّلون')} />
                  <SortHead sortKey="conv" sort={sort} onSort={toggle} label={t('Conversion %', 'التحويل %')} />
                  <SortHead sortKey="lost" sort={sort} onSort={toggle} label={t('Lost to another agent', 'خسرها لوكيل آخر')} />
                  <SortHead sortKey="received" sort={sort} onSort={toggle} label={t('Received from others', 'استلمها من غيره')} />
                </>
              ) : (
                <>
                  <SortHead sortKey="resolved" sort={sort} onSort={toggle} label={t('Resolved in SLA %', 'الحل ضمن المهلة %')} />
                  <SortHead sortKey="fcr" sort={sort} onSort={toggle} label={t('First contact %', 'أول تواصل %')} />
                  <SortHead sortKey="escalated" sort={sort} onSort={toggle} label={t('Escalated', 'مصعّدة')} />
                </>
              )}
              <SortHead sortKey="score" sort={sort} onSort={toggle} label={t('Score', 'التقييم')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-muted-foreground">
                  {t('No agents match these filters.', 'لا يوجد وكلاء يطابقون هذه المرشحات.')}
                </TableCell>
              </TableRow>
            )}
            {sortedRows.map(({ agent, m }) => (
              <TableRow key={agent.id} data-state={agentId === agent.id ? 'selected' : undefined}>
                <TableCell>
                  <button
                    type="button"
                    className="flex flex-col items-start text-start outline-hidden focus-visible:ring-2"
                    onClick={() => setAgentId(agentId === agent.id ? 'all' : agent.id)}
                  >
                    <span className="font-medium text-foreground">{agent.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {productName(agent.product)}
                      {agent.envId ? ` · ${L(envName(agent.envId))}` : ''}
                      {agent.channel ? ` · ${channelName(agent)}` : ''}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="tabular text-end">{m.records}</TableCell>
                <TableCell className="tabular text-end">
                  {agent.crm || !sales ? (
                    <Rate value={m.firstOnTimePct}>{fmtPct(m.firstOnTimePct)}</Rate>
                  ) : (
                    <span className="text-muted-foreground">{t('API needed', 'يحتاج واجهة')}</span>
                  )}
                </TableCell>
                <TableCell className="tabular text-end">{m.avgFirstMin ?? '—'}</TableCell>
                {sales ? (
                  <>
                    <TableCell className="tabular text-end">
                      <Rate value={m.actsOnTimePct}>{fmtPct(m.actsOnTimePct)}</Rate>
                    </TableCell>
                    <TableCell className="tabular text-end">{agent.crm ? m.converted : '—'}</TableCell>
                    <TableCell className="tabular text-end">{fmtPct(m.conversionPct)}</TableCell>
                    <TableCell className="tabular text-end">
                      {agent.crm ? (
                        m.lostToReassign ? (
                          <Bad>
                            {m.lostToReassign} <span className="text-xs">({fmtPct(m.lostToReassignPct)})</span>
                          </Bad>
                        ) : (
                          '0 (0%)'
                        )
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="tabular text-end">{agent.crm ? (receivedBy.get(agent.id) ?? 0) : '—'}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="tabular text-end">
                      <Rate value={m.resolvedOnTimePct}>{fmtPct(m.resolvedOnTimePct)}</Rate>
                    </TableCell>
                    <TableCell className="tabular text-end">
                      <Rate value={m.fcrPct} good={70} bad={50}>
                        {fmtPct(m.fcrPct)}
                      </Rate>
                    </TableCell>
                    <TableCell className="tabular text-end">{m.escalated ? <Bad>{m.escalated}</Bad> : m.escalated}</TableCell>
                  </>
                )}
                <TableCell className="tabular text-end">{m.avgScore == null ? '—' : <Rate value={m.avgScore * 20}>{m.avgScore}</Rate>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        title={t('Month by month', 'شهراً بشهر')}
        description={agentId === 'all' ? t('All agents shown', 'كل الوكلاء المعروضين') : (agents.find((a) => a.id === agentId)?.name ?? '')}
      >
        {trend.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('Nothing to chart in this period.', 'لا شيء للعرض في هذه الفترة.')}</p>
        ) : (
          <ChartWell
            height={220}
            label={t('Handled and late first responses per month', 'المعالَج وأول الردود المتأخرة شهرياً')}
            legend={
              <ChartLegend
                items={[
                  { label: sales ? t('Leads handled', 'العملاء المعالجون') : t('Conversations', 'المحادثات'), color: chartColor(0) },
                  { label: t('First response late', 'أول رد متأخر'), color: chartColor(1) },
                ]}
              />
            }
          >
            <BarChart data={trend}>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="month" {...chartAxis} />
              <YAxis {...chartAxis} width={32} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={chartCursorBar} />
              <Bar
                dataKey="handled"
                name={sales ? t('Leads handled', 'العملاء المعالجون') : t('Conversations', 'المحادثات')}
                {...chartBar}
                radius={[6, 6, 0, 0]}
                fill="var(--chart-1)"
              />
              <Bar dataKey="late" name={t('First response late', 'أول رد متأخر')} {...chartBarMuted} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartWell>
        )}
      </SectionCard>

      {sources.length > 0 && (
        <SectionCard
          title={t('Where these numbers come from', 'من أين تأتي هذه الأرقام')}
          description={t(
            'One source per product. “API needed” means the data is not connected yet.',
            'مصدر لكل منتج. «يحتاج واجهة» يعني أن البيانات غير موصولة بعد.',
          )}
        >
          <ul className="flex flex-col gap-2" data-testid="agent-sources">
            {sources.map((id) => {
              const s = PRODUCT_SOURCES[id]!
              return (
                <li key={id} className="flex items-start gap-3 text-sm">
                  <StatusBadge tone={s.ready ? 'success' : 'warning'} dot>
                    {s.ready ? t('CRM', 'CRM') : t('API needed', 'يحتاج واجهة')}
                  </StatusBadge>
                  <span className="text-muted-foreground">{L(s.text)}</span>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
