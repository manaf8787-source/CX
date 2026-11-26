import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Crown, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewCustomerNames, canViewMobiles } from '@/auth/permissions'
import { useEnvScope } from '@/services/envScope'
import { useProducts, useSurveyResponses } from '@/services/queries'
import {
  FOLLOW_UP_LABEL,
  GROUP_LABEL,
  SCALE,
  responseChannelLabel,
  type ResponseGroup,
  type ResponseInstrument,
  type SurveyResponse,
} from '@/services/surveyResponses'
import { ENVIRONMENTS, environmentById } from '@/data/environments'
import { INCLUDES } from '@/utils/indicators'
import { downloadCsv } from '@/utils/csv'
import type { EnvId, ProductId } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ExportButton } from '@/components/common/ExportButton'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { ProductTag } from '@/components/common/Chip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL = 'all'
const TONE: Record<ResponseGroup, 'success' | 'neutral' | 'danger'> = { promoter: 'success', passive: 'neutral', detractor: 'danger' }
const TITLE: Record<ResponseInstrument, string> = { nps: 'NPS', csat: 'CSAT', ces: 'CES' }

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

/**
 * Every survey answer behind a product's NPS, CSAT or CES tile on Home (26 Nov, owner): no new menu entry, the tile opens it.
 * One row per answer with the survey and its rule, the moment, the score, the customer's details, the environment, the date and
 * the time; filters for each; the export carries every column (subject to the per-person export permission). A signed lease in
 * PSI Assets is a completed transaction, so its NPS answers are here like a sale's. The environment switch and an environment
 * manager's fixed environment narrow the list, as they narrow the tile.
 */
export default function SurveyAnswers() {
  const { productId = 're' } = useParams<{ productId: ProductId }>()
  const [params, setParams] = useSearchParams()
  const instrument = (['nps', 'csat', 'ces'].includes(params.get('i') ?? '') ? params.get('i') : 'nps') as ResponseInstrument
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { env, allowed, fixed } = useEnvScope()
  const { data: products } = useProducts()
  const { data: all, isLoading } = useSurveyResponses()
  const names = canViewCustomerNames(role.id)
  const mobiles = canViewMobiles(role.id)
  const product = products?.find((p) => p.id === productId)

  const [q, setQ] = useState('')
  const [envF, setEnvF] = useState<string>(ALL)
  const [survey, setSurvey] = useState<string>(ALL)
  const [group, setGroup] = useState<string>(ALL)
  const [persona, setPersona] = useState<string>(ALL)
  const [channel, setChannel] = useState<string>(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // the tile's own rows: this product (PSI Real Estate includes After-Sales), this instrument, the environment in scope
  const scoped = useMemo(
    () =>
      (all ?? []).filter(
        (r) =>
          r.instrument === instrument &&
          (r.product === productId || (INCLUDES[productId] ?? []).includes(r.product)) &&
          (env === 'all' || !r.envId || r.envId === env),
      ),
    [all, instrument, productId, env],
  )
  const surveys = useMemo(() => [...new Map(scoped.map((r) => [r.surveyName.en, r.surveyName])).values()], [scoped])
  const personas = useMemo(() => [...new Map(scoped.map((r) => [r.customer.persona.en, r.customer.persona])).values()], [scoped])
  const channels = useMemo(() => [...new Set(scoped.map((r) => r.channel))], [scoped])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return scoped.filter(
      (r) =>
        (envF === ALL || r.envId === envF) &&
        (survey === ALL || r.surveyName.en === survey) &&
        (group === ALL || r.group === group) &&
        (persona === ALL || r.customer.persona.en === persona) &&
        (channel === ALL || r.channel === channel) &&
        (!from || r.answeredAt.slice(0, 10) >= from) &&
        (!to || r.answeredAt.slice(0, 10) <= to) &&
        (!needle ||
          [names ? r.customer.name : '', mobiles ? r.customer.mobile : '', r.customer.crmId, r.id, r.comment?.en ?? '', r.comment?.ar ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    )
  }, [scoped, q, envF, survey, group, persona, channel, from, to, names, mobiles])

  const counts = useMemo(() => {
    const c = { promoter: 0, passive: 0, detractor: 0 }
    for (const r of rows) c[r.group]++
    return c
  }, [rows])
  const headline =
    rows.length === 0
      ? '–'
      : instrument === 'nps'
        ? `${Math.round(((counts.promoter - counts.detractor) / rows.length) * 100) > 0 ? '+' : ''}${Math.round(((counts.promoter - counts.detractor) / rows.length) * 100)}`
        : `${Math.round((counts.promoter / rows.length) * 100)}%`

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' })
  const timeFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' })
  const envLabel = (id?: EnvId) => (id ? L(environmentById(id).name) : t('No CRM environment', 'بلا بيئة CRM'))
  const who = (r: SurveyResponse) => (names ? r.customer.name : r.customer.crmId)

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
          <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-foreground">
            {who(row.original)}
            {row.original.customer.vip && <Crown aria-label="VIP" className="size-3.5 text-(--status-warning-solid)" />}
          </span>
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular" dir="ltr">
            {mobiles ? row.original.customer.mobile : row.original.customer.crmId}
          </span>
        </span>
      ),
    },
    {
      id: 'age',
      accessorFn: (r) => r.customer.age,
      header: ({ column }) => <SortableHeader column={column}>{t('Age', 'العمر')}</SortableHeader>,
      meta: { align: 'end' },
      cell: ({ row }) => row.original.customer.age,
    },
    {
      id: 'persona',
      accessorFn: (r) => L(r.customer.persona),
      header: ({ column }) => <SortableHeader column={column}>{t('Persona', 'الشخصية')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap text-foreground">{L(row.original.customer.persona)}</span>
          <span className="text-xs text-muted-foreground">
            {L(row.original.customer.type)} · {L(row.original.customer.nationality)}
          </span>
        </span>
      ),
    },
    {
      id: 'env',
      accessorFn: (r) => envLabel(r.envId),
      header: ({ column }) => <SortableHeader column={column}>{t('Environment', 'البيئة')}</SortableHeader>,
      cell: ({ row }) => <span className="whitespace-nowrap">{envLabel(row.original.envId)}</span>,
    },
    {
      id: 'survey',
      accessorFn: (r) => L(r.surveyName),
      header: ({ column }) => <SortableHeader column={column}>{t('Survey', 'الاستبيان')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="flex min-w-56 flex-col">
          <span className="text-foreground">{L(row.original.surveyName)}</span>
          <span className="text-xs text-muted-foreground">
            {L(row.original.moment)} · {L(responseChannelLabel(row.original.channel))}
          </span>
        </span>
      ),
    },
    ...(INCLUDES[productId]?.length
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
      id: 'score',
      accessorFn: (r) => r.score,
      header: ({ column }) => (
        <SortableHeader column={column}>
          {t('Score', 'الدرجة')} <span className="font-normal text-muted-foreground">({SCALE[instrument]})</span>
        </SortableHeader>
      ),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <StatusBadge tone={TONE[row.original.group]}>{L(GROUP_LABEL[instrument][row.original.group])}</StatusBadge>
          <span className="t-small-strong text-foreground">{row.original.score}</span>
        </span>
      ),
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
      id: 'agent',
      accessorFn: (r) => r.agent,
      header: ({ column }) => <SortableHeader column={column}>{t('Agent', 'الموظف')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{row.original.agent}</span>
          <span className="text-xs text-muted-foreground">{row.original.unit}</span>
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

  /** The full report: every field of every filtered answer (names and mobiles follow the customer-names rule). */
  function exportReport() {
    downloadCsv(
      `${productId}-${instrument}-answers.csv`,
      rows.map((r) => ({
        [t('Answer ID', 'رقم الإجابة')]: r.id,
        [t('Date', 'التاريخ')]: dateFmt.format(new Date(r.answeredAt)),
        [t('Time (Gulf)', 'الوقت (الخليج)')]: timeFmt.format(new Date(r.answeredAt)),
        [t('Instrument', 'المقياس')]: TITLE[r.instrument],
        [t('Survey', 'الاستبيان')]: L(r.surveyName),
        [t('Survey rule', 'قاعدة الاستبيان')]: L(r.surveyRule),
        [t('Moment', 'اللحظة')]: L(r.moment),
        [t('Channel', 'القناة')]: L(responseChannelLabel(r.channel)),
        [t('Product', 'المنتج')]: L(products?.find((p) => p.id === r.product)?.name ?? { en: r.product, ar: r.product }),
        [t('Environment', 'البيئة')]: envLabel(r.envId),
        [t(`Score (${SCALE[r.instrument]})`, `الدرجة (${SCALE[r.instrument]})`)]: r.score,
        [t('Group', 'الفئة')]: L(GROUP_LABEL[r.instrument][r.group]),
        [t('Comment', 'التعليق')]: r.comment ? L(r.comment) : '',
        [t('CRM contact ID', 'رقم العميل في CRM')]: r.customer.crmId,
        [t('Customer name', 'اسم العميل')]: names ? r.customer.name : '',
        ...(mobiles ? { [t('Mobile', 'الجوال')]: r.customer.mobile, [t('Email', 'البريد')]: r.customer.email } : {}),
        [t('Age', 'العمر')]: r.customer.age,
        [t('Gender', 'الجنس')]: r.customer.gender === 'female' ? t('Female', 'أنثى') : t('Male', 'ذكر'),
        [t('Nationality', 'الجنسية')]: L(r.customer.nationality),
        [t('Customer type', 'نوع العميل')]: L(r.customer.type),
        [t('Persona', 'الشخصية')]: L(r.customer.persona),
        VIP: r.customer.vip ? t('yes', 'نعم') : t('no', 'لا'),
        [t('Preferred language', 'اللغة المفضلة')]: r.customer.language === 'ar' ? t('Arabic', 'العربية') : t('English', 'الإنجليزية'),
        [t('Agent', 'الموظف')]: r.agent,
        [t('Project / unit', 'المشروع / الوحدة')]: r.unit,
        [t('Follow-up', 'المتابعة')]: r.followUp ? L(FOLLOW_UP_LABEL[r.followUp]) : '',
      })),
    )
  }

  const clearable = q || envF !== ALL || survey !== ALL || group !== ALL || persona !== ALL || channel !== ALL || from || to
  const groupWord = GROUP_LABEL[instrument]

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/home">
          <ArrowLeft aria-hidden className="rtl:rotate-180" />
          {t('Home', 'الرئيسية')}
        </Link>
      </Button>
      <PageHeader
        eyebrow={product ? L(product.name) : undefined}
        title={t(`${TITLE[instrument]} answers`, `إجابات ${TITLE[instrument]}`)}
        term={TITLE[instrument]}
        description={t(
          'Every answer behind the tile on Home, one row each: the survey that asked, the moment, the score, the customer and when. Leases in PSI Assets count as completed transactions, like sales.',
          'كل إجابة خلف المؤشر في الرئيسية، سطر لكل إجابة: الاستبيان الذي سأل، واللحظة، والدرجة، والعميل، والوقت. عقود الإيجار في PSI للأصول تُحسب معاملات مكتملة مثل البيع.',
        )}
        actions={
          <ExportButton
            onExport={exportReport}
            disabled={!rows.length}
            what={{ en: `${TITLE[instrument]} answers (${rows.length})`, ar: `إجابات ${TITLE[instrument]} (${rows.length})` }}
          >
            {t('Export report (CSV)', 'تصدير التقرير (CSV)')}
          </ExportButton>
        }
      />

      <Segmented<ResponseInstrument>
        label={t('Instrument', 'المقياس')}
        variant="pressed"
        value={instrument}
        onValueChange={(v) => {
          setParams({ i: v }, { replace: true })
          setSurvey(ALL)
          setGroup(ALL)
        }}
        options={(['nps', 'csat', 'ces'] as const).map((v) => ({ value: v, label: TITLE[v] }))}
      />

      <SectionCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="tabular">
              {TITLE[instrument]} <bdi dir="ltr">{headline}</bdi>
            </span>
            <StatusBadge tone="neutral">{t(`${rows.length} answers`, `${rows.length} إجابة`)}</StatusBadge>
            <StatusBadge tone="success">
              {L(groupWord.promoter)}: {counts.promoter}
            </StatusBadge>
            <StatusBadge tone="neutral">
              {L(groupWord.passive)}: {counts.passive}
            </StatusBadge>
            <StatusBadge tone="danger">
              {L(groupWord.detractor)}: {counts.detractor}
            </StatusBadge>
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
          emptyTitle={t('No answers match.', 'لا إجابات مطابقة.')}
          toolbar={
            <>
              <div className="relative w-full sm:w-72">
                <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('Name, mobile, CRM ID or a word', 'اسم، جوال، رقم CRM أو كلمة')}
                  aria-label={t('Search the answers', 'ابحث في الإجابات')}
                  className="h-9 ps-9"
                />
              </div>
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
              <FilterSelect label={t('Survey', 'الاستبيان')} value={survey} onChange={setSurvey} allLabel={t('All surveys', 'كل الاستبيانات')}>
                {surveys.map((s) => (
                  <SelectItem key={s.en} value={s.en}>
                    {L(s)}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect label={t('Group', 'الفئة')} value={group} onChange={setGroup} allLabel={t('All scores', 'كل الدرجات')}>
                {(['promoter', 'passive', 'detractor'] as const).map((g) => (
                  <SelectItem key={g} value={g}>
                    {L(groupWord[g])}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect label={t('Persona', 'الشخصية')} value={persona} onChange={setPersona} allLabel={t('All personas', 'كل الشخصيات')}>
                {personas.map((p) => (
                  <SelectItem key={p.en} value={p.en}>
                    {L(p)}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect label={t('Channel', 'القناة')} value={channel} onChange={setChannel} allLabel={t('All channels', 'كل القنوات')}>
                {channels.map((c) => (
                  <SelectItem key={c} value={c}>
                    {L(responseChannelLabel(c))}
                  </SelectItem>
                ))}
              </FilterSelect>
              <span className="flex items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={t('From', 'من')}
                  className="h-9 w-40"
                  dir="ltr"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={t('To', 'إلى')}
                  className="h-9 w-40"
                  dir="ltr"
                />
              </span>
              {clearable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ('')
                    setEnvF(ALL)
                    setSurvey(ALL)
                    setGroup(ALL)
                    setPersona(ALL)
                    setChannel(ALL)
                    setFrom('')
                    setTo('')
                  }}
                >
                  {t('Clear filters', 'مسح الفلاتر')}
                </Button>
              )}
            </>
          }
        />
      </SectionCard>
    </div>
  )
}
