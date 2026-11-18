import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarClock, ChevronDown, Layers, MessagesSquare, Radio } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAiJourneyReading, usePersonEffort, usePersonInteractions, usePersons } from '@/services/queries'
import { CUSTOMERS_LIST_COPY } from '@/data/customersList'
import { journeyNext } from '@/data/steps'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import { personLabel } from '@/utils/peopleExport'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiTile } from '@/components/common/KpiTile'
import { NextBox } from '@/components/common/NextBox'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ProfileCard } from '@/components/customers/ProfileCard'
import { ConsentRow } from '@/components/customers/ConsentRow'
import { AiReadingCard } from '@/components/customers/AiReadingCard'
import { Timeline } from '@/components/customers/Timeline'
import { SourceBadge } from '@/components/customers/SourceBadge'
import { CustomersTabs } from '@/components/customers/CustomersTabs'
import { CustomerList } from '@/components/customers/CustomerList'
import { usePeopleFacts } from '@/components/customers/usePeopleFacts'

/** "1 · Customers" (v40 F17): Find a person, Who is leaving and Personas and campaigns are tabs of one page (three URLs). */
export default function Customers() {
  const { personId } = useParams()
  if (personId) return <CustomerDetail personId={personId} />
  return <CustomersHome />
}

/** FR-2.1: the search and the browsable list behind Home's "no exact match" fallback (`/customers?q=...`). */
function CustomersHome() {
  const { L } = useI18n()
  const [params] = useSearchParams()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader term="Omnichannel" title={L(CUSTOMERS_LIST_COPY.pageTitle)} description={L(CUSTOMERS_LIST_COPY.pageDescription)} />
      <CustomersTabs />
      {/* Keyed on the search so a new `?q=` from Home starts a new filter. */}
      <CustomerList key={params.get('q') ?? ''} />
    </div>
  )
}

function CustomerDetail({ personId }: { personId: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: persons, isLoading: personsLoading } = usePersons()
  const { data: effort, isLoading: effortLoading } = usePersonEffort(personId)
  const { data: interactions } = usePersonInteractions(personId)
  const { data: reading } = useAiJourneyReading(personId)
  const person = persons?.find((p) => p.id === personId)
  const onePerson = useMemo(() => (person ? [person] : undefined), [person])
  const { facts, isLoading: factsLoading } = usePeopleFacts(onePerson)

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
        <CustomersTabs />
        {back}
        {personsLoading ? <LoadingState rows={6} /> : <EmptyState title={t('No such record.', 'لا يوجد سجل كهذا.')} />}
      </div>
    )
  }

  const next = journeyNext({ drifting: facts.drifting.has(person.id), problems: effort?.problemsFound ?? totalProblems })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {back}
        <PageHeader title={personLabel(person, role.id)} description={t('One record, every channel, newest first.', 'سجل واحد، كل القنوات، الأحدث أولاً.')} />
      </div>
      <CustomersTabs />

      {/* Where you are, what happens next (F07): step 2 when the person drifts or has problems, else step 1. */}
      {!effortLoading && !factsLoading && <NextBox next={next} />}

      <ProfileCard person={person} />

      <ConsentRow person={person} />

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
