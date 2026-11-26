import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Search, Smartphone, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewCustomerNames, canViewMobiles } from '@/auth/permissions'
import { useEnvScope } from '@/services/envScope'
import { useProducts, useSurveyResponses } from '@/services/queries'
import {
  DETRACTOR_REASONS,
  DETRACTOR_THEMES,
  FOLLOW_UP_LABEL,
  GROUP_LABEL,
  SCALE,
  reasonInfo,
  themeInfo,
  type DetractorReason,
  type DetractorTheme,
  type ResponseInstrument,
  type SurveyResponse,
} from '@/services/surveyResponses'
import { ENVIRONMENTS, environmentById } from '@/data/environments'
import { downloadCsv } from '@/utils/csv'
import type { Bi, EnvId, ProductId } from '@/types'
import { RecoveryPanel } from '@/pages/RecoveryResults'
import { productScope } from '@/utils/detractors'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ExportButton } from '@/components/common/ExportButton'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { ProductTag } from '@/components/common/Chip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ALL = 'all'
const TITLE: Record<ResponseInstrument, string> = { nps: 'NPS', csat: 'CSAT', ces: 'CES' }
const THEME_COLOR: Record<DetractorTheme, string> = {
  people: 'var(--chart-1)',
  digital: 'var(--chart-2)',
  process: 'var(--chart-3)',
  commercial: 'var(--chart-4)',
  pending: 'var(--ink-tertiary, #9aa0a6)',
}

/** Count per key, largest first. */
function tally<K extends string>(rows: readonly SurveyResponse[], key: (r: SurveyResponse) => K | undefined) {
  const m = new Map<K, number>()
  for (const r of rows) {
    const k = key(r)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, z) => z[1] - a[1])
}

/**
 * Detractor analysis (26 Nov, owner): every detractor with the reason they are one, grouped under an overall reason (people and
 * service, app and technical issues, process and maintenance, price and offer); and, in a second tab, the detractors we contacted
 * and re-surveyed. The overall page covers every product and environment (the environment switch narrows it); each product page
 * has the same analysis as a tab. Home's daily brief opens it from the detractors number.
 */
export default function DetractorAnalysis() {
  const { t } = useI18n()
  const { role } = useRole()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'contacted' ? 'contacted' : 'all'
  return (
    <div data-density="comfortable" className="flex flex-col gap-6">
      <PageHeader
        sample
        title={t('Detractor analysis', 'تحليل المنتقدين')}
        description={t(
          'Every detractor across all products and environments, why they are detractors, and what happened after we contacted them.',
          'كل المنتقدين في كل المنتجات والبيئات، ولماذا هم منتقدون، وماذا حدث بعد أن تواصلنا معهم.',
        )}
      />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'contacted' ? { tab: v } : {}, { replace: true })} className="gap-6">
        <TabsList aria-label={t('Detractor analysis', 'تحليل المنتقدين')}>
          <TabsTrigger value="all">{t('All detractors', 'كل المنتقدين')}</TabsTrigger>
          <TabsTrigger value="contacted">{t('Contacted detractors', 'المنتقدون الذين تواصلنا معهم')}</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <DetractorsPanel />
        </TabsContent>
        <TabsContent value="contacted">
          <RecoveryPanel productIds={productScope(role.product)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** The Detractor analysis tab of a product page: the same two views, for this product only. */
export function ProductDetractorAnalysis({ productId }: { productId: ProductId }) {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'contacted' ? 'contacted' : 'all'
  return (
    <div className="flex flex-col gap-6">
      <Segmented<'all' | 'contacted'>
        label={t('View', 'العرض')}
        variant="pressed"
        value={view}
        onValueChange={(v) => {
          const next = new URLSearchParams(params)
          if (v === 'contacted') next.set('view', v)
          else next.delete('view')
          setParams(next, { replace: true })
        }}
        options={[
          { value: 'all', label: t('All detractors', 'كل المنتقدين') },
          { value: 'contacted', label: t('Contacted detractors', 'الذين تواصلنا معهم') },
        ]}
      />
      {view === 'all' ? <DetractorsPanel productId={productId} /> : <RecoveryPanel productIds={productScope(productId)} />}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allLabel: string
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  )
}

/** A labelled bar: share of the total, with the count. Clickable to filter. */
function Bar({
  label,
  n,
  total,
  color,
  active,
  onClick,
  hint,
}: {
  label: string
  n: number
  total: number
  color: string
  active?: boolean
  onClick?: () => void
  hint?: string
}) {
  const pct = total ? Math.round((100 * n) / total) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full flex-col gap-1.5 rounded-xl px-3 py-2 text-start outline-hidden transition-colors hover:bg-well focus-visible:ring-2 focus-visible:ring-ring/40',
        active && 'bg-well',
      )}
    >
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular text-muted-foreground">
          {n} · {pct}%
        </span>
      </span>
      <span aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-well">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(pct, n ? 2 : 0)}%`, background: color }} />
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  )
}

export function DetractorsPanel({ productId }: { productId?: ProductId }) {
  const [params, setParams] = useSearchParams()
  const instrument = (['nps', 'csat', 'ces'].includes(params.get('i') ?? '') ? params.get('i') : 'nps') as ResponseInstrument
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { env, allowed, fixed } = useEnvScope()
  const { data: products } = useProducts()
  const { data: all, isLoading } = useSurveyResponses()
  const names = canViewCustomerNames(role.id)
  const mobiles = canViewMobiles(role.id)
  // a role tied to one product (After-Sales lead, environment CEO) reads that product only, here too
  const scope = productScope(productId ?? role.product)

  const [q, setQ] = useState('')
  const [productF, setProductF] = useState<string>(ALL)
  const [envF, setEnvF] = useState<string>(ALL)
  const [theme, setTheme] = useState<string>(ALL)
  const [reason, setReason] = useState<string>(ALL)
  const [follow, setFollow] = useState<string>(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const answers = useMemo(
    () => (all ?? []).filter((r) => r.instrument === instrument && (!scope || scope.includes(r.product)) && (env === 'all' || !r.envId || r.envId === env)),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [all, instrument, productId, role.product, env],
  )
  const scoped = useMemo(() => answers.filter((r) => r.group === 'detractor'), [answers])
  const productOptions = useMemo(() => [...new Set(scoped.map((r) => r.product))], [scoped])

  // the breakdowns read every filter except the reason ones, so a click on a bar narrows the table and keeps the bars readable
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return scoped.filter(
      (r) =>
        (productF === ALL || r.product === productF) &&
        (envF === ALL || r.envId === envF) &&
        (follow === ALL || r.followUp === follow) &&
        (!from || r.answeredAt.slice(0, 10) >= from) &&
        (!to || r.answeredAt.slice(0, 10) <= to) &&
        (!needle ||
          [names ? r.customer.name : '', mobiles ? r.customer.mobile : '', r.customer.crmId, r.id, r.comment?.en ?? '', r.comment?.ar ?? '', L(r.touchpoint)]
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    )
  }, [scoped, q, productF, envF, follow, from, to, names, mobiles, L])
  const rows = useMemo(
    () => base.filter((r) => (theme === ALL || (r.reason && reasonInfo(r.reason).theme === theme)) && (reason === ALL || r.reason === reason)),
    [base, theme, reason],
  )

  const byTheme = useMemo(() => tally(base, (r) => (r.reason ? reasonInfo(r.reason).theme : undefined)), [base])
  const byReason = useMemo(
    () =>
      tally(
        base.filter((r) => theme === ALL || (r.reason && reasonInfo(r.reason).theme === theme)),
        (r) => r.reason,
      ),
    [base, theme],
  )
  const byTouchpoint = useMemo(() => {
    const m = new Map<string, { label: Bi; digital: boolean; n: number; reasons: Map<DetractorReason, number> }>()
    for (const r of rows) {
      const k = r.touchpoint.en
      const e = m.get(k) ?? { label: r.touchpoint, digital: Boolean(r.digital), n: 0, reasons: new Map() }
      e.n++
      if (r.reason) e.reasons.set(r.reason, (e.reasons.get(r.reason) ?? 0) + 1)
      m.set(k, e)
    }
    return [...m.values()].sort((a, z) => z.n - a.n).slice(0, 8)
  }, [rows])
  const byWhere = useMemo(
    () => (scope && scope.length === 1 ? tally(rows, (r) => r.envId ?? 'none') : tally(rows, (r) => r.product as string)),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [rows, productId, role.product],
  )

  const classified = base.filter((r) => r.reason && r.reason !== 'pending').length
  const topTheme = byTheme.find(([k]) => k !== 'pending')
  const topReason = tally(base, (r) => (r.reason && r.reason !== 'pending' ? r.reason : undefined))[0]
  const toCall = base.filter((r) => r.followUp === 'to_call').length
  const recovered = base.filter((r) => r.followUp === 'recovered').length
  const share = answers.length ? Math.round((100 * scoped.length) / answers.length) : 0

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' })
  const timeFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' })
  const envLabel = (id?: EnvId | 'none') => (id && id !== 'none' ? L(environmentById(id).name) : t('No CRM environment', 'بلا بيئة CRM'))
  const productLabel = (id: string) => L(products?.find((p) => p.id === id)?.name ?? { en: id, ar: id })
  const who = (r: SurveyResponse) => (names ? r.customer.name : r.customer.crmId)
  const showProduct = !scope || scope.length > 1

  const columns: ColumnDef<SurveyResponse>[] = [
    {
      id: 'at',
      accessorFn: (r) => r.answeredAt,
      header: ({ column }) => <SortableHeader column={column}>{t('Date and time', 'التاريخ والوقت')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="flex flex-col whitespace-nowrap tabular">
          <span className="text-foreground">{dateFmt.format(new Date(row.original.answeredAt))}</span>
          <span className="text-xs text-muted-foreground">{timeFmt.format(new Date(row.original.answeredAt))}</span>
        </span>
      ),
    },
    {
      id: 'customer',
      accessorFn: (r) => who(r),
      header: ({ column }) => <SortableHeader column={column}>{t('Customer', 'العميل')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium whitespace-nowrap text-foreground">{who(row.original)}</span>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {L(row.original.customer.persona)} · {row.original.customer.age}
          </span>
        </span>
      ),
    },
    {
      id: 'reason',
      accessorFn: (r) => (r.reason ? L(reasonInfo(r.reason).label) : ''),
      header: ({ column }) => <SortableHeader column={column}>{t('Why a detractor', 'سبب الانتقاد')}</SortableHeader>,
      cell: ({ row }) => {
        const r = row.original.reason
        if (!r) return <span className="text-muted-foreground">–</span>
        const info = reasonInfo(r)
        return (
          <span className="flex min-w-48 flex-col">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: THEME_COLOR[info.theme] }} />
              {L(info.label)}
            </span>
            <span className="text-xs text-muted-foreground">{L(themeInfo(info.theme).label)}</span>
          </span>
        )
      },
    },
    {
      id: 'comment',
      accessorFn: (r) => (r.comment ? L(r.comment) : ''),
      header: () => t('What they said', 'ما قاله'),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.comment ? <span className="block min-w-56 text-sm">{L(row.original.comment)}</span> : <span className="text-muted-foreground">–</span>,
    },
    {
      id: 'score',
      accessorFn: (r) => r.score,
      header: ({ column }) => (
        <SortableHeader column={column}>
          {t('Score', 'الدرجة')} <span className="font-normal text-muted-foreground">({SCALE[instrument]})</span>
        </SortableHeader>
      ),
      meta: { align: 'end' },
      cell: ({ row }) => <StatusBadge tone="danger">{row.original.score}</StatusBadge>,
    },
    ...(showProduct
      ? [
          {
            id: 'product',
            accessorFn: (r: SurveyResponse) => r.product,
            header: () => t('Product', 'المنتج'),
            cell: ({ row }: { row: { original: SurveyResponse } }) => <ProductTag productId={row.original.product} lang={lang} />,
          } satisfies ColumnDef<SurveyResponse>,
        ]
      : []),
    {
      id: 'env',
      accessorFn: (r) => envLabel(r.envId),
      header: ({ column }) => <SortableHeader column={column}>{t('Environment', 'البيئة')}</SortableHeader>,
      cell: ({ row }) => <span className="whitespace-nowrap">{envLabel(row.original.envId)}</span>,
    },
    {
      id: 'touchpoint',
      accessorFn: (r) => r.handledBy ?? L(r.touchpoint),
      header: ({ column }) => <SortableHeader column={column}>{t('Touchpoint', 'نقطة الخدمة')}</SortableHeader>,
      cell: ({ row }) =>
        row.original.digital ? (
          <span className="flex min-w-48 items-start gap-1.5">
            <Smartphone aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>{L(row.original.touchpoint)}</span>
          </span>
        ) : (
          <span className="flex flex-col whitespace-nowrap">
            <span className="text-foreground">{row.original.handledBy}</span>
            <span className="text-xs text-muted-foreground">{L(row.original.touchpoint)}</span>
          </span>
        ),
    },
    {
      id: 'followUp',
      accessorFn: (r) => (r.followUp ? L(FOLLOW_UP_LABEL[r.followUp]) : ''),
      header: ({ column }) => <SortableHeader column={column}>{t('Follow-up', 'المتابعة')}</SortableHeader>,
      cell: ({ row }) =>
        row.original.followUp ? (
          <StatusBadge tone={row.original.followUp === 'to_call' ? 'warning' : row.original.followUp === 'recovered' ? 'success' : 'info'}>
            {L(FOLLOW_UP_LABEL[row.original.followUp])}
          </StatusBadge>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
  ]

  function exportReport() {
    downloadCsv(
      `${productId ?? 'all'}-${instrument}-detractors.csv`,
      rows.map((r) => ({
        [t('Answer ID', 'رقم الإجابة')]: r.id,
        [t('Date', 'التاريخ')]: dateFmt.format(new Date(r.answeredAt)),
        [t('Time (Gulf)', 'الوقت (الخليج)')]: timeFmt.format(new Date(r.answeredAt)),
        [t('Instrument', 'المقياس')]: TITLE[r.instrument],
        [t(`Score (${SCALE[r.instrument]})`, `الدرجة (${SCALE[r.instrument]})`)]: r.score,
        [t('Overall reason', 'السبب العام')]: r.reason ? L(themeInfo(reasonInfo(r.reason).theme).label) : '',
        [t('Reason', 'السبب')]: r.reason ? L(reasonInfo(r.reason).label) : '',
        [t('Comment', 'التعليق')]: r.comment ? L(r.comment) : '',
        [t('Survey', 'الاستبيان')]: L(r.surveyName),
        [t('Moment', 'اللحظة')]: L(r.moment),
        [t('Product', 'المنتج')]: productLabel(r.product),
        [t('Environment', 'البيئة')]: envLabel(r.envId),
        [t('Touchpoint', 'نقطة الخدمة')]: L(r.touchpoint),
        [t('Handled by', 'تعامل معه')]: r.handledBy ?? t('No person (digital step)', 'لا أحد (خطوة رقمية)'),
        [t('CRM contact ID', 'رقم العميل في CRM')]: r.customer.crmId,
        [t('Customer name', 'اسم العميل')]: names ? r.customer.name : '',
        ...(mobiles ? { [t('Mobile', 'الجوال')]: r.customer.mobile } : {}),
        [t('Age', 'العمر')]: r.customer.age,
        [t('Persona', 'الشخصية')]: L(r.customer.persona),
        [t('Follow-up', 'المتابعة')]: r.followUp ? L(FOLLOW_UP_LABEL[r.followUp]) : '',
      })),
    )
  }

  const clearable = q || productF !== ALL || envF !== ALL || theme !== ALL || reason !== ALL || follow !== ALL || from || to
  const word = L(GROUP_LABEL[instrument].detractor)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<ResponseInstrument>
          label={t('Instrument', 'المقياس')}
          variant="pressed"
          value={instrument}
          onValueChange={(v) => {
            const next = new URLSearchParams(params)
            next.set('i', v)
            setParams(next, { replace: true })
          }}
          options={(['nps', 'csat', 'ces'] as const).map((v) => ({ value: v, label: TITLE[v] }))}
        />
        <ExportButton
          onExport={exportReport}
          disabled={!rows.length}
          what={{ en: `${TITLE[instrument]} detractors (${rows.length})`, ar: `منتقدو ${TITLE[instrument]} (${rows.length})` }}
        >
          {t('Export report (CSV)', 'تصدير التقرير (CSV)')}
        </ExportButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
        <KpiTile
          label={t(`${TITLE[instrument]} detractors`, `منتقدو ${TITLE[instrument]}`)}
          value={base.length}
          sub={t(`${share}% of ${answers.length} answers, 90 days`, `${share}% من ${answers.length} إجابة، 90 يوماً`)}
        />
        <KpiTile
          label={t('Top overall reason', 'السبب العام الأكثر')}
          value={topTheme ? `${Math.round((100 * topTheme[1]) / Math.max(classified, 1))}%` : '–'}
          sub={topTheme ? L(themeInfo(topTheme[0]).label) : t('Nothing classified yet', 'لم يُصنَّف شيء بعد')}
        />
        <KpiTile label={t('Top reason', 'السبب الأكثر')} value={topReason ? topReason[1] : '–'} sub={topReason ? L(reasonInfo(topReason[0]).label) : '–'} />
        <KpiTile
          label={t('Still to call', 'لم يُتصل بهم بعد')}
          value={toCall}
          sub={t(`${recovered} recovered after the call`, `${recovered} تحسّنوا بعد المكالمة`)}
        />
      </div>

      <SectionCard
        title={t(`Why they are ${word.toLowerCase()}s`, 'لماذا هم منتقدون')}
        description={t(
          'Classified from what the customer wrote, the call notes, or the touchpoint (an app step is an app issue). Click a reason to filter the list.',
          'مصنّف من كلام العميل أو ملاحظات المكالمة أو نقطة الخدمة (خطوة في التطبيق تعني مشكلة في التطبيق). اضغط على سبب لتصفية القائمة.',
        )}
        actions={
          (theme !== ALL || reason !== ALL) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTheme(ALL)
                setReason(ALL)
              }}
            >
              <X aria-hidden />
              {t('Show every reason', 'عرض كل الأسباب')}
            </Button>
          )
        }
      >
        {base.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No detractors in this view.', 'لا يوجد منتقدون في هذا العرض.')}</p>
        ) : (
          <div className="grid gap-6 desktop:grid-cols-2">
            <div className="flex flex-col gap-1">
              <h3 className="label-style px-3 pb-1">{t('Overall reason', 'السبب العام')}</h3>
              {DETRACTOR_THEMES.map((th) => {
                const n = byTheme.find(([k]) => k === th.id)?.[1] ?? 0
                if (!n && th.id === 'pending') return null
                return (
                  <Bar
                    key={th.id}
                    label={L(th.label)}
                    hint={L(th.hint)}
                    n={n}
                    total={base.length}
                    color={THEME_COLOR[th.id]}
                    active={theme === th.id}
                    onClick={() => {
                      setTheme(theme === th.id ? ALL : th.id)
                      setReason(ALL)
                    }}
                  />
                )
              })}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="label-style px-3 pb-1">
                {theme === ALL ? t('Reason', 'السبب') : `${t('Reason', 'السبب')} · ${L(themeInfo(theme as DetractorTheme).label)}`}
              </h3>
              {byReason.map(([id, n]) => (
                <Bar
                  key={id}
                  label={L(reasonInfo(id).label)}
                  n={n}
                  total={byReason.reduce((s, [, x]) => s + x, 0)}
                  color={THEME_COLOR[reasonInfo(id).theme]}
                  active={reason === id}
                  onClick={() => setReason(reason === id ? ALL : id)}
                />
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {rows.length > 0 && (
        <div className="grid gap-6 desktop:grid-cols-2">
          <SectionCard
            title={t('Where it happens', 'أين يحدث')}
            description={t('Touchpoints with the most detractors, and their main reason.', 'نقاط الخدمة الأكثر منتقدين وسببها الرئيسي.')}
          >
            <ul className="flex flex-col">
              {byTouchpoint.map((tp) => {
                const top = [...tp.reasons.entries()].sort((a, z) => z[1] - a[1])[0]
                return (
                  <li key={tp.label.en} className="flex items-start justify-between gap-3 border-b border-line py-2.5 last:border-0">
                    <span className="flex min-w-0 items-start gap-1.5">
                      {tp.digital && <Smartphone aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="flex flex-col">
                        <span className="text-sm text-foreground">{L(tp.label)}</span>
                        {top && <span className="text-xs text-muted-foreground">{L(reasonInfo(top[0]).label)}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular">{tp.n}</span>
                  </li>
                )
              })}
            </ul>
          </SectionCard>
          <SectionCard
            title={scope && scope.length === 1 ? t('By environment', 'حسب البيئة') : t('By product', 'حسب المنتج')}
            description={t('Detractors in the current filters.', 'المنتقدون ضمن المرشّحات الحالية.')}
          >
            <div className="flex flex-col gap-1">
              {byWhere.map(([k, n]) => (
                <Bar
                  key={k}
                  label={scope && scope.length === 1 ? envLabel(k as EnvId) : productLabel(k)}
                  n={n}
                  total={rows.length}
                  color="var(--chart-1)"
                  onClick={scope && scope.length === 1 ? undefined : () => setProductF(productF === k ? ALL : k)}
                  active={productF === k}
                />
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t('Every detractor', 'كل المنتقدين')}
            <StatusBadge tone="danger">{rows.length}</StatusBadge>
          </span>
        }
        description={t('Last 90 days. Filter, sort, then export exactly what you see.', 'آخر 90 يوماً. صفِّ ورتّب ثم صدّر ما تراه تماماً.')}
      >
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          getRowId={(r) => r.id}
          pageSize={20}
          initialSorting={[{ id: 'at', desc: true }]}
          emptyTitle={t('No detractors match.', 'لا منتقدين مطابقين.')}
          toolbar={
            <>
              <div className="relative w-full sm:w-72">
                <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('Name, CRM ID, touchpoint or a word', 'اسم، رقم CRM، نقطة خدمة أو كلمة')}
                  aria-label={t('Search the detractors', 'ابحث في المنتقدين')}
                  className="h-9 ps-9"
                />
              </div>
              {showProduct && (
                <FilterSelect label={t('Product', 'المنتج')} value={productF} onChange={setProductF} allLabel={t('All products', 'كل المنتجات')}>
                  {productOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {productLabel(p)}
                    </SelectItem>
                  ))}
                </FilterSelect>
              )}
              {fixed ? (
                <StatusBadge tone="info">
                  {t('Your environment:', 'بيئتك:')} {L(environmentById(fixed).name)}
                </StatusBadge>
              ) : (
                env === 'all' && (
                  <FilterSelect label={t('Environment', 'البيئة')} value={envF} onChange={setEnvF} allLabel={t('All environments', 'كل البيئات')}>
                    {ENVIRONMENTS.filter((e) => allowed.includes(e.id)).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {L(e.name)}
                      </SelectItem>
                    ))}
                  </FilterSelect>
                )
              )}
              <FilterSelect
                label={t('Overall reason', 'السبب العام')}
                value={theme}
                onChange={(v) => {
                  setTheme(v)
                  setReason(ALL)
                }}
                allLabel={t('Every overall reason', 'كل الأسباب العامة')}
              >
                {DETRACTOR_THEMES.map((th) => (
                  <SelectItem key={th.id} value={th.id}>
                    {L(th.label)}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect label={t('Reason', 'السبب')} value={reason} onChange={setReason} allLabel={t('Every reason', 'كل الأسباب')}>
                {DETRACTOR_REASONS.filter((r) => theme === ALL || r.theme === theme).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {L(r.label)}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect label={t('Follow-up', 'المتابعة')} value={follow} onChange={setFollow} allLabel={t('Any follow-up', 'أي متابعة')}>
                {(['to_call', 'called', 'recovered'] as const).map((f) => (
                  <SelectItem key={f} value={f}>
                    {L(FOLLOW_UP_LABEL[f])}
                  </SelectItem>
                ))}
              </FilterSelect>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {t('From', 'من')}
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {t('To', 'إلى')}
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
              </label>
              {clearable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ('')
                    setProductF(ALL)
                    setEnvF(ALL)
                    setTheme(ALL)
                    setReason(ALL)
                    setFollow(ALL)
                    setFrom('')
                    setTo('')
                  }}
                >
                  <X aria-hidden />
                  {t('Clear', 'مسح')}
                </Button>
              )}
            </>
          }
        />
      </SectionCard>
    </div>
  )
}
