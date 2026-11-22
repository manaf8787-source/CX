import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { resolveAgentDisplay } from '@/auth/permissions'
import { useAgentDirectory } from '@/services/queries'
import { PRODUCTS } from '@/data/products'
import { envNameFromShort } from '@/data/environments'
import { DataTable } from '@/components/common/DataTable'
import { TraceId } from '@/components/common/TraceId'
import type { Pattern, Signal } from '@/types'
import { signalCategoryLabel, signalKindLabel } from './labels'

/**
 * The signals as rows (v40 F12): the first column is the date, and under it a button `SG-n` that opens the signal detail dialog
 * (a public mention keeps its `PUB-3nn` id and links to no person). The last column names the pattern each signal counts toward.
 * Signals are counted, not worked: nothing here is an action on one signal.
 * Dense table (row 44): the date and the signal are the ink cells, the rest grey; the ids are grey tags.
 */
export function SignalsTable({ signals, patterns, isLoading }: { signals: Signal[] | undefined; patterns: Pattern[] | undefined; isLoading: boolean }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: directory } = useAgentDirectory()

  // signal id -> the patterns it belongs to (for the "Counted in" column)
  const patternsOf = useMemo(() => {
    const map = new Map<string, Pattern[]>()
    for (const p of patterns ?? []) for (const id of p.signalIds) map.set(id, [...(map.get(id) ?? []), p])
    return map
  }, [patterns])

  const columns: ColumnDef<Signal>[] = [
    {
      id: 'date',
      header: t('Date', 'التاريخ'),
      accessorFn: (s) => s.occurredAt,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <time dateTime={row.original.occurredAt} className="tabular font-medium text-foreground">
            <bdi dir="ltr">{row.original.occurredAt.slice(0, 10)}</bdi>
          </time>
          <TraceId kind="signal" id={row.original.id} />
        </div>
      ),
    },
    { id: 'signal', header: t('Signal', 'الإشارة'), accessorFn: (s) => L(signalCategoryLabel(s.category)), meta: { cellClassName: 'font-medium text-foreground' } },
    { id: 'type', header: t('Type', 'النوع'), accessorFn: (s) => L(signalKindLabel(s.kind)) },
    {
      id: 'where',
      header: t('Where', 'أين'),
      accessorFn: (s) => `${L(envNameFromShort(s.environment))} · ${L(PRODUCTS.find((p) => p.id === s.product)?.name ?? { en: s.product, ar: s.product })}`,
    },
    {
      id: 'agent',
      header: t('Agent', 'الموظف'),
      accessorFn: (s) => (directory && s.agentRef ? resolveAgentDisplay(s.agentRef, role.id, directory, { en: 'Agent', ar: 'موظف' }, lang).label : ''),
      cell: ({ getValue }) => getValue<string>() || <span className="text-muted-foreground">–</span>,
    },
    {
      id: 'pattern',
      header: t('Counted in pattern', 'مُحتسبة في النمط'),
      enableSorting: false,
      accessorFn: (s) => (patternsOf.get(s.id) ?? []).map((p) => p.traceId).join(' '),
      cell: ({ row }) => {
        const list = patternsOf.get(row.original.id) ?? []
        return list.length ? (
          <div className="flex flex-wrap gap-1.5">
            {list.map((p) => (
              <TraceId key={p.id} kind="pattern" id={p.traceId} />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">{t('under the line', 'تحت الحد')}</span>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={signals}
      isLoading={isLoading}
      pageSize={8}
      initialSorting={[{ id: 'date', desc: true }]}
      searchPlaceholder={t('Search the signals', 'ابحث في الإشارات')}
      emptyTitle={t('No signals yet.', 'لا توجد إشارات بعد.')}
      getRowId={(s) => s.id}
      // a phone: the signal and its id on the first line, type and date as tags, where it happened and its patterns behind "Details"
      phone={{ title: 'signal', meta: ['date', 'type'], detail: ['where', 'pattern'] }}
    />
  )
}
