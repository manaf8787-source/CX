// FOUNDATION STUB: owner = workstream B (a working read-only table over `useMatrix`: B builds the product selector, the editable cells, the per-cell [Proposed] badges and the Rules.tsx template link).
import { useI18n } from '@/i18n'
import { useMatrix } from '@/services/queriesV40'
import { MATRIX_COPY, MATRIX_FIELDS } from '@/data/escalationDefaults'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MatrixCells } from '@/types'
import { SubPageHeader } from './SubPageHeader'

export default function EscalationMatrix() {
  const { L } = useI18n()
  const { data: rows, isLoading } = useMatrix('re')
  const c = MATRIX_COPY.columns
  const text = (v: MatrixCells[keyof MatrixCells]) => (v === null ? '–' : typeof v === 'number' ? String(v) : L(v))
  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={L(MATRIX_COPY.title)} description={L(MATRIX_COPY.intro)} actions={<ProposedBadge>{L(MATRIX_COPY.defaultsAreProposals)}</ProposedBadge>} />
      {isLoading || !rows ? (
        <LoadingState rows={6} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{L(c.kind)}</TableHead>
              {MATRIX_FIELDS.map((f) => (
                <TableHead key={f}>{L(c[f])}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.kind}>
                <TableCell className="font-medium">{L(r.label)}</TableCell>
                {MATRIX_FIELDS.map((f) => (
                  <TableCell key={f} className="whitespace-normal">
                    <bdi>{text(r.cells[f])}</bdi>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-sm text-muted-foreground">{L(MATRIX_COPY.principles)}</p>
    </section>
  )
}
