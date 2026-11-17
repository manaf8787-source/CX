import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, ArrowLeft, CalendarClock, ChevronDown, Crown, Layers, MessagesSquare, Radio } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAiJourneyReading, usePersonEffort, usePersonInteractions, usePersons } from '@/services/queries'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import type { Person } from '@/types'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ProfileCard } from '@/components/customers/ProfileCard'
import { AiReadingCard } from '@/components/customers/AiReadingCard'
import { Timeline } from '@/components/customers/Timeline'
import { SourceBadge } from '@/components/customers/SourceBadge'
import { CHANNEL_LABEL } from '@/components/customers/channels'

export default function Customers() {
  const { personId } = useParams()
  if (personId) return <CustomerDetail personId={personId} />
  return <CustomerList />
}

/** FR-2.1 — the search list behind Home's "no exact match" fallback
 * (`/customers?q=...`); FR-1.4 — environment management sees only their own
 * environment here too, not just from Home's search. */
function CustomerList() {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const { role } = useRole()
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const { data: persons, isLoading } = usePersons()

  const visible = useMemo(() => {
    let list = persons ?? []
    if (role.id === 'envmgmt' && role.environment) list = list.filter((p) => p.environment === role.environment)
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.identity.mobile?.includes(q) || p.identity.emiratesId?.toLowerCase().includes(q))
    return list
  }, [persons, role, q])

  const columns: ColumnDef<Person>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>{t('Name', 'الاسم')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2 font-medium">
          {row.original.name}
          {row.original.vip && (
            <StatusBadge tone="warning" icon={<Crown aria-hidden />}>
              VIP
            </StatusBadge>
          )}
        </span>
      ),
    },
    {
      id: 'type',
      accessorFn: (p) => (p.type === 'customer' ? t('Customer', 'عميل') : t('Lead', 'عميل محتمل')),
      header: ({ column }) => <SortableHeader column={column}>{t('Type', 'النوع')}</SortableHeader>,
    },
    {
      id: 'environment',
      accessorKey: 'environment',
      header: ({ column }) => <SortableHeader column={column}>{t('Environment', 'البيئة')}</SortableHeader>,
    },
    {
      id: 'channel',
      accessorFn: (p) => L(CHANNEL_LABEL[p.preferredChannel]),
      header: t('Preferred channel', 'القناة المفضلة'),
      cell: ({ row }) => <SourceBadge channel={row.original.preferredChannel} />,
    },
    {
      id: 'units',
      accessorKey: 'unitsOrDeals',
      header: ({ column }) => <SortableHeader column={column}>{t('Units/deals', 'الوحدات/الصفقات')}</SortableHeader>,
      meta: { align: 'end' },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        term="Omnichannel" title={t('Customers', 'العملاء')}
        description={t('One record per person: CRM profile, effort tiles, AI reading, and a channel timeline.', 'سجل واحد لكل شخص: الملف الشخصي، مؤشرات الجهد، قراءة الذكاء الاصطناعي، والجدول الزمني.')}
      />

      {role.id === 'envmgmt' && role.environment && (
        <StatusBadge tone="info" className="self-start">
          {t('Scoped to your environment:', 'محصور ببيئتك:')} {role.environment}
        </StatusBadge>
      )}

      <SectionCard
        title={t('People', 'الأشخاص')}
        description={q ? `${t('Matching', 'مطابق لـ')} “${params.get('q')}”` : undefined}
        actions={
          <span className="text-sm text-muted-foreground tabular-nums">
            {visible.length} {t('records', 'سجل')}
          </span>
        }
      >
        <DataTable
          columns={columns}
          data={visible}
          isLoading={isLoading}
          searchPlaceholder={t('Filter by name, type or environment', 'تصفية بالاسم أو النوع أو البيئة')}
          onRowClick={(p) => navigate(`/customers/${p.id}`)}
          getRowId={(p) => p.id}
          emptyTitle={q ? `${t('No match for', 'لا توجد نتيجة لـ')} “${params.get('q')}”` : t('No records in scope.', 'لا توجد سجلات ضمن النطاق.')}
          pageSize={12}
        />
      </SectionCard>
    </div>
  )
}

function CustomerDetail({ personId }: { personId: string }) {
  const { t, L } = useI18n()
  const { data: persons, isLoading: personsLoading } = usePersons()
  const { data: effort, isLoading: effortLoading } = usePersonEffort(personId)
  const { data: interactions } = usePersonInteractions(personId)
  const { data: reading } = useAiJourneyReading(personId)
  const person = persons?.find((p) => p.id === personId)

  const problemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of interactions ?? []) for (const f of i.problemFlags) counts.set(f, (counts.get(f) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [interactions])
  const channelsUsed = useMemo(() => [...new Set((interactions ?? []).map((i) => i.channel))], [interactions])
  const totalProblems = problemCounts.reduce((sum, [, c]) => sum + c, 0)

  const back = (
    <Button variant="ghost" size="sm" asChild className="-ms-2 self-start text-muted-foreground">
      <Link to="/customers">
        <ArrowLeft aria-hidden className="rtl:rotate-180" />
        {t('All customers', 'كل العملاء')}
      </Link>
    </Button>
  )

  if (!person) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        {personsLoading ? <LoadingState rows={6} /> : <EmptyState title={t('No such record.', 'لا يوجد سجل كهذا.')} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {back}
        <PageHeader title={person.name} description={t('One record, every channel, newest first.', 'سجل واحد، كل القنوات، الأحدث أولاً.')} />
      </div>

      <ProfileCard person={person} />

      <section aria-label={t('Effort', 'الجهد')} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile label={t('Interactions', 'التفاعلات')} value={effort?.interactions ?? '—'} accent="var(--chart-1)" icon={<MessagesSquare />} loading={effortLoading} />
        <KpiTile label={t('Contacts in 90 days', 'تواصل خلال 90 يوماً')} value={effort?.contactsLast90Days ?? '—'} accent="var(--chart-4)" icon={<Radio />} loading={effortLoading} />
        <KpiTile label={t('Problems found', 'مشاكل مكتشفة')} value={effort?.problemsFound ?? '—'} accent="var(--destructive)" icon={<AlertTriangle />} loading={effortLoading} />
        <KpiTile label={t('Days since last contact', 'أيام منذ آخر تواصل')} value={effort?.daysSinceLastContact ?? '—'} accent="var(--warning)" icon={<CalendarClock />} loading={effortLoading} />
      </section>

      {reading && <AiReadingCard reading={reading} interactions={interactions ?? []} />}

      <Timeline interactions={interactions ?? []} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Folded title={t('Problems found', 'المشاكل المكتشفة')} count={totalProblems} icon={<AlertTriangle aria-hidden className="size-4 text-danger-text" />}>
          {problemCounts.length ? (
            <ul className="flex flex-col divide-y">
              {problemCounts.map(([flag, count]) => {
                const rule = JOURNEY_RULES.find((r) => r.id === flag)
                return (
                  <li key={flag} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
                    <span>{rule ? L(rule.label) : flag}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('None recorded.', 'لا يوجد.')}</p>
          )}
        </Folded>

        <Folded title={t('Channels used', 'القنوات المستخدمة')} count={channelsUsed.length} icon={<Layers aria-hidden className="size-4 text-primary" />}>
          {channelsUsed.length ? (
            <div className="flex flex-wrap gap-1.5">
              {channelsUsed.map((c) => (
                <SourceBadge key={c} channel={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('None recorded.', 'لا يوجد.')}</p>
          )}
        </Folded>
      </div>
    </div>
  )
}

function Folded({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <Collapsible>
        <CollapsibleTrigger className="group flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-5 py-3 text-start outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <span className="inline-flex items-center gap-2 text-base font-semibold">
            {icon}
            {title}
            <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
          </span>
          <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-5 pb-4">{children}</CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
