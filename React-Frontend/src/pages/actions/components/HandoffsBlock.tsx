import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useI18n } from '@/i18n'
import { useHandoffs } from '@/services/queries'
import { HANDOFF_RULES } from '@/data/handoffRules'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTable } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TermHelp } from '@/components/common/TermHelp'
import { cn } from '@/lib/utils'
import type { HandoffItem } from '@/types'

/**
 * "One-customer corrections handed to other systems" (v40 F19, S11b): the hand-offs list and the hand-off rules by signal
 * type, folded under the fixes tab as a collapsed block at the bottom. Hand-offs are recorded and checked; no clock runs here.
 * (It used to sit on the Signals page.)
 *
 * Composition: a dense card whose header is the toggle (heading 4, grey aside, a 12px chevron that mirrors); the list and the rules
 * are plain tables on the card, no inner lines.
 */
export function HandoffsBlock() {
  const { t, L } = useI18n()
  const { data: handoffs, isLoading } = useHandoffs()
  const [open, setOpen] = useState(false)

  const columns: ColumnDef<HandoffItem>[] = [
    { id: 'owner', header: t('Owner system', 'النظام المالك'), accessorFn: (h) => L(h.ownerSystem), meta: { cellClassName: 'font-medium text-foreground' } },
    {
      id: 'status',
      header: t('Status', 'الحالة'),
      accessorKey: 'status',
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status === 'done' ? 'success' : 'neutral'} dot>
          {row.original.status === 'done' ? t('Done', 'منجز') : t('Open', 'مفتوح')}
        </StatusBadge>
      ),
    },
  ]

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="surface-card text-card-foreground" data-testid="handoffs-block">
      <div className="flex items-center gap-1 ps-(--card-pad) pe-3">
        <h2 className="t-h4 min-w-0 flex-1">
          <CollapsibleTrigger className="flex min-h-14 w-full cursor-pointer items-center gap-2 rounded-md py-3 text-start outline-hidden">
            <ChevronDown
              aria-hidden
              className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-400 ease-spring motion-reduce:transition-none', open ? 'rotate-0' : 'ltr:-rotate-90 rtl:rotate-90')}
            />
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span>{t('One-customer corrections handed to other systems', 'تصحيحات لزبون واحد سُلّمت لأنظمة أخرى')}</span>
              <span className="text-sm font-normal text-muted-foreground">{t('(hand-offs: recorded and checked, no clock)', '(تسليمات: تُسجَّل وتُتابع، بلا مؤقت)')}</span>
            </span>
          </CollapsibleTrigger>
        </h2>
        <TermHelp term="Hand-off" />
      </div>
      <CollapsibleContent className="flex flex-col gap-6 px-(--card-pad) pb-(--card-pad)">
        <DataTable columns={columns} data={handoffs} isLoading={isLoading} pageSize={6} emptyTitle={t('No hand-offs', 'لا تسليمات')} />
        <div className="flex flex-col gap-2">
          <h3 className="t-h4">{t('Hand-off rules by signal type', 'قواعد التسليم حسب نوع الإشارة')}</h3>
          <Table>
            <TableHeader>
              <TableRow className="row-divider-none">
                <TableHead>{t('Signal type', 'نوع الإشارة')}</TableHead>
                <TableHead>{t('Goes to', 'يذهب إلى')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HANDOFF_RULES.map((r) => (
                <TableRow key={r.signalType.en}>
                  <TableCell className="align-top font-medium whitespace-normal text-foreground">{L(r.signalType)}</TableCell>
                  <TableCell className="whitespace-normal">{L(r.goesTo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
