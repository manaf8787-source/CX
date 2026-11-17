import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useStandards, useUpdateStandardStatus } from '@/services/queries'
import type { Standard, StandardStatus } from '@/types'
import { STANDARD_STATUS_LABEL as STATUS_LABEL, STANDARD_STATUS_TONE as STATUS_TONE } from '@/lib/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'

const STATUS_ORDER: StandardStatus[] = ['not_started', 'legal_review', 'drafted', 'approved_scored']

/** Ported and grown from `frontend/src/pages/Standards.tsx`'s flat 13-item
 * list (APPLICATION_MODULES.md §C: "needs to grow to a numbered register").
 * The `ld_document` rows are transcribed from `Standards-Documentation-
 * List-for-LD.docx` §1–6. [Proposed]: that document states "twenty-eight
 * documents in six groups" (§7), but transcribing its six group tables
 * yielded 33 distinct titles — flagged here rather than silently dropped to
 * force the stated count; L&D should reconcile the two when the document is
 * finalised. */
export function LdDocumentList() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: standards, isLoading } = useStandards()
  const update = useUpdateStandardStatus()
  const [groupFilter, setGroupFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StandardStatus | 'all'>('all')

  const groups = useMemo(() => {
    const seen = new Map<string, Standard['group']>()
    for (const s of (standards ?? []).filter((x) => x.source === 'ld_document')) if (!seen.has(s.group.en)) seen.set(s.group.en, s.group)
    return [...seen.entries()]
  }, [standards])
  const docs = (standards ?? []).filter((s) => s.source === 'ld_document')
  const visible = docs.filter(
    (s) => (groupFilter === 'all' || s.group.en === groupFilter) && (statusFilter === 'all' || s.status === statusFilter),
  )

  const columns = useMemo<ColumnDef<Standard>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <SortableHeader column={column}>{t('Code', 'الرمز')}</SortableHeader>,
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
      },
      {
        id: 'title',
        accessorFn: (s) => L(s.title),
        header: ({ column }) => <SortableHeader column={column}>{t('Standard', 'المعيار')}</SortableHeader>,
        cell: ({ row }) => (
          <div className="flex min-w-56 flex-col whitespace-normal">
            <span className="text-sm font-medium">{L(row.original.title)}</span>
            {row.original.linkedItems > 0 && (
              <span className="text-xs text-muted-foreground">
                {row.original.linkedItems} {t('linked items', 'عنصراً مرتبطاً')}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'writer',
        accessorFn: (s) => L(s.writer),
        header: t('Writer', 'الكاتب'),
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
      },
      {
        id: 'variant',
        accessorFn: (s) => (s.environmentVariant ? L(s.environmentVariant) : '–'),
        header: t('Environment variant', 'اختلاف البيئة'),
        cell: ({ getValue }) => <span className="whitespace-normal text-muted-foreground">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'priorityTier',
        header: ({ column }) => <SortableHeader column={column}>{t('Priority', 'الأولوية')}</SortableHeader>,
        cell: ({ row }) => row.original.priorityTier ?? '–',
        meta: { align: 'end' },
      },
      {
        id: 'status',
        accessorFn: (s) => L(STATUS_LABEL[s.status]),
        header: t('Status', 'الحالة'),
        cell: ({ row }) => {
          const s = row.original
          return canEdit ? (
            <Select value={s.status} onValueChange={(v) => update.mutate({ id: s.id, status: v as StandardStatus })}>
              <SelectTrigger size="sm" className="h-9 w-48" aria-label={`${s.code}: ${t('status', 'الحالة')}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((st) => (
                  <SelectItem key={st} value={st}>
                    {L(STATUS_LABEL[st])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge tone={STATUS_TONE[s.status]} dot>
              {L(STATUS_LABEL[s.status])}
            </StatusBadge>
          )
        },
      },
    ],
    [t, L, canEdit, update],
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t('What L&D is writing', 'ما يكتبه التعلم والتطوير')}</h3>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          {t(
            'The standards documents from the Standards Documentation List for L&D (KB §18): six groups, one template, priority order. Separate from the 26-standard scoring register above.',
            'وثائق المعايير من قائمة توثيق المعايير للتعلم والتطوير: ست مجموعات، قالب واحد، ترتيب أولويات. منفصلة عن سجل التقييم ذي المعايير الـ26 أعلاه.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_ORDER.map((st) => {
          const n = docs.filter((s) => s.status === st).length
          const active = statusFilter === st
          return (
            <button
              key={st}
              type="button"
              aria-pressed={active}
              onClick={() => setStatusFilter(active ? 'all' : st)}
              className="flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-xl border bg-card p-3 text-start shadow-xs outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-accent"
            >
              <StatusBadge tone={STATUS_TONE[st]} dot>
                {L(STATUS_LABEL[st])}
              </StatusBadge>
              <span className="text-2xl font-semibold tabular-nums">{n}</span>
            </button>
          )
        })}
      </div>

      <SectionCard>
        <DataTable
          columns={columns}
          data={visible}
          isLoading={isLoading}
          getRowId={(s) => s.id}
          searchPlaceholder={t('Search standards…', 'ابحث في المعايير…')}
          pageSize={15}
          emptyTitle={t('No standards match this filter.', 'لا توجد معايير مطابقة لهذا الفلتر.')}
          toolbar={
            <>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-9 w-full sm:w-56" aria-label={t('Group', 'المجموعة')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All groups', 'كل المجموعات')}</SelectItem>
                  {groups.map(([key, g]) => (
                    <SelectItem key={key} value={key}>
                      {L(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-9 w-full sm:w-52" aria-label={t('Status', 'الحالة')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All statuses', 'كل الحالات')}</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {L(STATUS_LABEL[s])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground tabular-nums">
                <bdi dir="ltr">
                  {visible.length} / {docs.length}
                </bdi>
              </span>
            </>
          }
        />
      </SectionCard>
    </section>
  )
}
