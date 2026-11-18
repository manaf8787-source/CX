import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Crown, Download, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewCustomerNames, canViewMobiles } from '@/auth/permissions'
import { usePersons } from '@/services/queries'
import { useEnvScope } from '@/services/queriesV40'
import { CUSTOMERS_LIST_COPY as COPY, SEGMENT_LABEL, SOURCE_LABEL } from '@/data/customersList'
import { ENVIRONMENTS, envNameFromShort } from '@/data/environments'
import { RUNAWAY_TYPE_LABEL } from '@/utils/runaway'
import { personLabel, peopleCsvRows } from '@/utils/peopleExport'
import { downloadCsv } from '@/utils/csv'
import type { EnvId, LeadSource, Person, PersonSegment } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { ProductTag } from '@/components/common/Chip'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LeadSourceBadge } from './LeadSourceBadge'
import { usePeopleFacts } from './usePeopleFacts'

const SEGMENTS = Object.keys(SEGMENT_LABEL) as PersonSegment[]
const SOURCES = Object.keys(SOURCE_LABEL) as LeadSource[]

type Filter<T extends string> = 'all' | T

/**
 * "Everyone on record" (v40 F29): browse instead of search. Filter by environment, type and source of the lead, open a
 * person, or export the list for a call round or a campaign. Names and mobiles show only to roles that may see them
 * (decided 18 Nov): the Internal Audit and Marketing Lead sees the reference (`P-005`) in the list, in the search and in
 * the file. The export is scope-respecting: it writes the rows the filters leave, with no mobile column for a role
 * without the right.
 *
 * Design: dense (the page sets `data-density="dense"`): 44px rows, the skill's table, light tags for the source and product, tinted tags only
 * for the two states that need attention (problems, drifting).
 */
export function CustomerList() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const [params] = useSearchParams()
  const { allowed, fixed } = useEnvScope()
  const { data: persons, isLoading } = usePersons()
  const { facts, isLoading: factsLoading } = usePeopleFacts(persons)

  const [q, setQ] = useState(params.get('q') ?? '')
  const [envFilter, setEnvFilter] = useState<Filter<EnvId>>('all')
  const [typeFilter, setTypeFilter] = useState<Filter<PersonSegment>>('all')
  const [sourceFilter, setSourceFilter] = useState<Filter<LeadSource>>('all')

  const names = canViewCustomerNames(role.id)
  const mobiles = canViewMobiles(role.id)

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (persons ?? []).filter((p) => {
      if (envFilter !== 'all' && p.envId !== envFilter) return false
      if (typeFilter !== 'all' && p.segment !== typeFilter) return false
      if (sourceFilter !== 'all' && p.sourceOfLead !== sourceFilter) return false
      if (!needle) return true
      // Search only what this role may see: the Internal Audit and Marketing Lead can search the reference, never a name or a number.
      const fields = [p.id, p.identity.crmContactId, names ? p.name : undefined, mobiles ? p.identity.mobile : undefined, names ? p.identity.emiratesId : undefined]
      return fields.some((f) => f?.toLowerCase().includes(needle))
    })
  }, [persons, q, envFilter, typeFilter, sourceFilter, names, mobiles])

  const fmtDate = (iso: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

  const columns: ColumnDef<Person>[] = [
    {
      id: 'person',
      accessorFn: (p) => personLabel(p, role.id),
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.person)}</SortableHeader>,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <Link to={`/customers/${row.original.id}`} className="rounded-xs font-medium text-foreground underline-offset-4 outline-none hover:underline">
            {personLabel(row.original, role.id)}
          </Link>
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
      accessorFn: (p) => L(SEGMENT_LABEL[p.segment]),
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.type)}</SortableHeader>,
    },
    {
      id: 'environment',
      accessorFn: (p) => L(envNameFromShort(p.environment)),
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.environment)}</SortableHeader>,
    },
    {
      id: 'source',
      accessorFn: (p) => L(SOURCE_LABEL[p.sourceOfLead]),
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.source)}</SortableHeader>,
      cell: ({ row }) => <LeadSourceBadge source={row.original.sourceOfLead} />,
    },
    {
      id: 'product',
      accessorFn: (p) => p.products.join(' '),
      header: L(COPY.columns.product),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1">
          {row.original.products.map((id) => (
            <ProductTag key={id} productId={id} lang={lang} />
          ))}
        </span>
      ),
    },
    {
      id: 'lastContact',
      accessorFn: (p) => facts.lastContact.get(p.id) ?? '',
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.lastContact)}</SortableHeader>,
      cell: ({ getValue }) => {
        const iso = getValue<string>()
        return iso ? <bdi dir="ltr" className="tabular">{fmtDate(iso)}</bdi> : <span className="text-muted-foreground">–</span>
      },
    },
    {
      id: 'problems',
      accessorFn: (p) => facts.problems.get(p.id) ?? 0,
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.problems)}</SortableHeader>,
      meta: { align: 'end' },
      cell: ({ row }) => {
        const n = facts.problems.get(row.original.id) ?? 0
        if (n === 0) return <span className="tabular text-muted-foreground">0</span>
        return <StatusBadge tone={facts.critical.has(row.original.id) ? 'danger' : 'warning'}>{n}</StatusBadge>
      },
    },
    {
      id: 'drifting',
      accessorFn: (p) => {
        const c = facts.drifting.get(p.id)
        return c ? L(RUNAWAY_TYPE_LABEL[c.type]) : ''
      },
      header: ({ column }) => <SortableHeader column={column}>{L(COPY.columns.drifting)}</SortableHeader>,
      cell: ({ row }) => {
        const c = facts.drifting.get(row.original.id)
        return c ? <StatusBadge tone="danger">{L(RUNAWAY_TYPE_LABEL[c.type])}</StatusBadge> : <span className="text-muted-foreground">–</span>
      },
    },
  ]

  function exportList() {
    downloadCsv('psi-people.csv', peopleCsvRows(visible, role.id, lang, (id) => facts.lastContact.get(id)))
    toast(L(COPY.exportToast))
  }

  const envChoices = ENVIRONMENTS.filter((e) => allowed.includes(e.id))
  const searchLabel = t('A name, a mobile, an ID', 'اسم، جوال، هوية')

  return (
    <SectionCard
      title={L(COPY.title)}
      description={L(COPY.hint)}
      actions={
        <span className="flex items-center gap-3">
          <span className="tabular t-body-s" aria-live="polite">
            {L(COPY.count(visible.length))}
          </span>
          <Button variant="outline" size="sm" onClick={exportList} disabled={!visible.length}>
            <Download aria-hidden />
            {L(COPY.export)}
          </Button>
        </span>
      }
    >
      <DataTable
        columns={columns}
        data={visible}
        isLoading={isLoading || factsLoading}
        getRowId={(p) => p.id}
        pageSize={12}
        emptyTitle={q ? `${t('No match for', 'لا توجد نتيجة لـ')} “${q}”` : t('No records in scope.', 'لا توجد سجلات ضمن النطاق.')}
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel} aria-label={t('Search this list', 'ابحث في هذه القائمة')} className="h-9 ps-9" />
            </div>
            {fixed ? (
              <StatusBadge tone="info">
                {t('Scoped to your environment:', 'محصور ببيئتك:')} {L(ENVIRONMENTS.find((e) => e.id === fixed)!.name)}
              </StatusBadge>
            ) : (
              <FilterSelect label={L(COPY.columns.environment)} value={envFilter} onChange={(v) => setEnvFilter(v as Filter<EnvId>)} allLabel={L(COPY.filters.environment)}>
                {envChoices.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {L(e.name)}
                  </SelectItem>
                ))}
              </FilterSelect>
            )}
            <FilterSelect label={L(COPY.columns.type)} value={typeFilter} onChange={(v) => setTypeFilter(v as Filter<PersonSegment>)} allLabel={L(COPY.filters.type)}>
              {SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {L(SEGMENT_LABEL[s])}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect label={L(COPY.columns.source)} value={sourceFilter} onChange={(v) => setSourceFilter(v as Filter<LeadSource>)} allLabel={L(COPY.filters.source)}>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {L(SOURCE_LABEL[s])}
                </SelectItem>
              ))}
            </FilterSelect>
          </>
        }
      />
      {!names && (
        <p className="well mt-4 flex items-start gap-2.5 px-4 py-3 text-sm text-muted-foreground">
          <span aria-hidden className="dot dot-info mt-[5px]" />
          {t('Names and mobiles are not shown to this role: people appear by reference (for example P-005), in the list and in the file.', 'الأسماء وأرقام الجوال لا تظهر لهذا الدور: يظهر الأشخاص بمرجع (مثل P-005)، في القائمة وفي الملف.')}
        </p>
      )}
    </SectionCard>
  )
}

function FilterSelect({ label, value, onChange, allLabel, children }: { label: string; value: string; onChange: (v: string) => void; allLabel: string; children: React.ReactNode }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  )
}
