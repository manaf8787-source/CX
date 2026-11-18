import { useMemo } from 'react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useSignals } from '@/services/queries'
import { useRules } from '@/services/queriesV40'
import { WHAT_IF_CANDIDATES, RULES_POINTER_COPY } from '@/data/whatIf'
import { whatIf } from '@/utils/patterns'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * "What if" (v40 F32, S16): with today's thresholds there are {n} patterns; for each of the three thresholds (same issue, same
 * agent, window) the table shows how many patterns there would be with that one value changed, the current setting in bold.
 * Patterns are computed from the rules at read time (`whatIf` over the signals in the environment scope), so a threshold edited
 * under Settings changes this card too. The candidate values are samples, kept in `data/whatIf.ts`. [Proposed]
 *
 * Composition: a dense card with the skill's table; every candidate value is a small pill and the current setting is the dark pill
 * (selected = dark, so "bold" is no longer the only signal; the screen-reader text stays).
 */
export function WhatIfCard() {
  const { L } = useI18n()
  const now = useNow()
  const rules = useRules()
  // The mock registers are edited in place: the stamp is the change signal, not the array identity.
  const { data: signals, isLoading, dataUpdatedAt } = useSignals()
  const result = useMemo(
    () => (signals ? whatIf(signals, rules.patterns, WHAT_IF_CANDIDATES, now) : null),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [signals, rules.patterns, now, dataUpdatedAt],
  )

  return (
    <SectionCard title={L(RULES_POINTER_COPY.whatIfTitle)} description={result ? L(RULES_POINTER_COPY.whatIfHint(result.total)) : undefined} contentClassName="px-[calc(var(--card-pad)-10px)]">
      {isLoading || !result ? (
        <LoadingState rows={3} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">{L(RULES_POINTER_COPY.tableHeading)}</TableHead>
              <TableHead>{L({ en: 'Patterns with that value', ar: 'عدد الأنماط بهذه القيمة' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row) => (
              <TableRow key={row.rule}>
                <TableCell className="align-top font-medium whitespace-normal text-foreground">{L(RULES_POINTER_COPY.rows[row.rule])}</TableCell>
                <TableCell className="whitespace-normal">
                  <ul className="flex flex-wrap gap-1.5">
                    {row.cells.map((c) => (
                      <li key={c.value} className={cn('pill tabular', c.isCurrent ? 'pill-dark' : 'pill-chip font-normal text-muted-foreground')} data-current={c.isCurrent ? 'true' : undefined}>
                        <bdi dir="ltr">{L(RULES_POINTER_COPY.cell(c.value, c.patterns))}</bdi>
                        {c.isCurrent && <span className="sr-only"> ({L({ en: 'current setting', ar: 'الإعداد الحالي' })})</span>}
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  )
}
