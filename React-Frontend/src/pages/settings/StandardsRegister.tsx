import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ShieldAlert } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useSetRegisterStatus, useStandardsRegister } from '@/services/referenceQueries'
import {
  REGISTER_SOURCE,
  REGISTER_STATUS,
  STANDARD_AREA_LABEL,
  type RegisterStandard,
  type RegisterStatus,
  type StandardArea,
} from '@/data/v38Reference'
import type { Tone } from '@/lib/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CountTile, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'
import { LdDocumentList } from './Standards'

const STATUS_ORDER: RegisterStatus[] = ['obs', 'draft', 'appr']
const STATUS_TONE: Record<RegisterStatus, Tone> = { obs: 'warning', draft: 'info', appr: 'success' }
/** KB §15: L&D owns the fifteen people-facing standards (behaviour, communication,
 * selling, follow-up: M-12 to M-26) and edits them; only the CX manager
 * approves a standard for scoring. */
const PEOPLE_FACING: ReadonlySet<StandardArea> = new Set(['beh', 'com', 'sell', 'fol'])

/** KB §15 / Programme KB §28: the 26-standard register (M-01 to M-26) with
 * statuses observe only, draft standard, approved and scored. Items under a
 * standard that is not approved are recorded, not scored. */
export default function StandardsRegister() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: register, isLoading } = useStandardsRegister()
  const setStatus = useSetRegisterStatus()
  const [area, setArea] = useState<StandardArea | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RegisterStatus | 'all'>('all')

  const canEditRow = (s: RegisterStandard) => role.id === 'cxmgr' || (role.id === 'ld' && PEOPLE_FACING.has(s.area))
  const statusesFor = (s: RegisterStandard): RegisterStatus[] => (role.id === 'cxmgr' ? STATUS_ORDER : s.status === 'appr' ? STATUS_ORDER : ['obs', 'draft'])
  const visible = (register ?? []).filter((s) => (area === 'all' || s.area === area) && (statusFilter === 'all' || s.status === statusFilter))

  const columns = useMemo<ColumnDef<RegisterStandard>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <SortableHeader column={column}>{t('Code', 'الرمز')}</SortableHeader>,
        cell: ({ row }) => <span className="tabular">{row.original.code}</span>,
      },
      {
        id: 'name',
        accessorFn: (s) => L(s.name),
        header: ({ column }) => <SortableHeader column={column}>{t('Standard', 'المعيار')}</SortableHeader>,
        cell: ({ row }) => (
          <div className="flex min-w-52 flex-col gap-0.5 whitespace-normal">
            <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-foreground">
              {L(row.original.name)}
              {row.original.critical && (
                <StatusBadge tone="danger" icon={<ShieldAlert aria-hidden />}>
                  {t('Critical rule', 'قاعدة حرجة')}
                </StatusBadge>
              )}
            </span>
            <span className="text-xs">{L(row.original.rule)}</span>
          </div>
        ),
      },
      {
        id: 'area',
        accessorFn: (s) => L(STANDARD_AREA_LABEL[s.area]),
        header: t('Area', 'المجال'),
        cell: ({ getValue }) => <span className="whitespace-normal">{getValue<string>()}</span>,
        meta: { cellClassName: 'min-w-28 whitespace-normal' },
      },
      {
        id: 'owner',
        accessorFn: (s) => L(s.owner),
        header: t('Owner', 'المالك'),
        cell: ({ row }) => (
          <div className="flex min-w-24 flex-col whitespace-normal">
            <span className="text-foreground">{L(row.original.owner)}</span>
            {PEOPLE_FACING.has(row.original.area) && <span className="text-xs">{t('Edited by L&D', 'يحرره التعلم والتطوير')}</span>}
          </div>
        ),
      },
      {
        id: 'source',
        accessorFn: (s) => L(REGISTER_SOURCE[s.source]),
        header: t('Source', 'المصدر'),
        cell: ({ getValue }) => <span className="whitespace-normal">{getValue<string>()}</span>,
      },
      {
        id: 'status',
        accessorFn: (s) => L(REGISTER_STATUS[s.status].label),
        header: t('Status', 'الحالة'),
        cell: ({ row }) => {
          const s = row.original
          return canEditRow(s) && !(role.id === 'ld' && s.status === 'appr') ? (
            <Select value={s.status} onValueChange={(v) => setStatus.mutate({ code: s.code, status: v as RegisterStatus })}>
              <SelectTrigger size="sm" className="h-9 w-36" aria-label={`${s.code}: ${t('status', 'الحالة')}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusesFor(s).map((st) => (
                  <SelectItem key={st} value={st}>
                    {L(REGISTER_STATUS[st].label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex flex-col gap-0.5">
              <StatusBadge tone={STATUS_TONE[s.status]} dot>
                {L(REGISTER_STATUS[s.status].label)}
              </StatusBadge>
              {s.effective && <span className="text-xs">{L(s.effective)}</span>}
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, L, role.id, setStatus],
  )

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Standards register', 'سجل المعايير')}
        description={t(
          '26 standards (M-01 to M-26). Wave 1 of the mystery shopper is a baseline: shoppers observe and standards are set from it; only the two critical rules are scored from day one. Items under a standard that is not approved are recorded, not scored.',
          '26 معياراً (M-01 إلى M-26). الموجة الأولى للتسوق السري خط قاعدي: يلاحظ المتسوقون وتُحدَّد المعايير منها؛ ولا يُحتسب من اليوم الأول إلا القاعدتان الحرجتان. العناصر تحت معيار غير معتمد تُسجَّل ولا تُحتسب.',
        )}
      />
      {role.id !== 'cxmgr' && (
        <ViewOnlyNotice>
          {role.id === 'ld'
            ? t('You edit the fifteen people-facing standards; only the CX manager approves a standard for scoring.', 'أنت تحرر المعايير الخمسة عشر المتعلقة بالأشخاص؛ ومدير تجربة العملاء وحده يعتمد المعيار للتقييم.')
            : t('View only — the CX manager approves standards for scoring.', 'للعرض فقط — مدير تجربة العملاء يعتمد المعايير للتقييم.')}
        </ViewOnlyNotice>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATUS_ORDER.map((st) => {
          const n = (register ?? []).filter((s) => s.status === st).length
          const active = statusFilter === st
          return (
            <CountTile
              key={st}
              pressed={active}
              onPress={() => setStatusFilter(active ? 'all' : st)}
              head={
                <StatusBadge tone={STATUS_TONE[st]} dot>
                  {L(REGISTER_STATUS[st].label)}
                </StatusBadge>
              }
              count={n}
              note={L(REGISTER_STATUS[st].description)}
            />
          )
        })}
      </div>

      <SectionCard>
        <DataTable
          columns={columns}
          data={visible}
          isLoading={isLoading}
          getRowId={(s) => s.code}
          searchPlaceholder={t('Search standards…', 'ابحث في المعايير…')}
          pageSize={13}
          emptyTitle={t('No standards match this filter.', 'لا توجد معايير مطابقة لهذا الفلتر.')}
          toolbar={
            <Select value={area} onValueChange={(v) => setArea(v as typeof area)}>
              <SelectTrigger className="h-9 w-full sm:w-60" aria-label={t('Area', 'المجال')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All areas', 'كل المجالات')}</SelectItem>
                {(Object.keys(STANDARD_AREA_LABEL) as StandardArea[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {L(STANDARD_AREA_LABEL[a])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </SectionCard>

      <LdDocumentList />
    </section>
  )
}
