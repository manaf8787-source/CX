import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useFixMatrixLine } from '@/services/queriesV40'
import { MATRIX_COPY, MATRIX_FIELDS, MATRIX_LINE_LABELS } from '@/data/escalationDefaults'
import { PRODUCTS } from '@/data/products'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { Button } from '@/components/ui/button'
import type { Bi, CorrectiveAction, MatrixCells } from '@/types'

/**
 * One line before the Classification card (v40 F22): "From the matrix ({product}): receiver {x} · informed {y} · backup {z} ·
 * respond {n} h · resolve {m} h" and a "Matrix" button to the page that holds it (only for roles that may open it). The fix's
 * classification reads the matrix of its own product. A value still at its default is a proposal until the owners confirm it:
 * the line then carries one [Proposed] badge.
 *
 * Composition: a well, the sentence's lead in ink, each value a white pill (label grey, value ink) so the five fields scan as one row.
 * The text still reads "receiver X informed Y ..." in order (tests and screen readers read the sentence).
 */
export function MatrixLine({ fix }: { fix: Pick<CorrectiveAction, 'kind' | 'product'> }) {
  const { L } = useI18n()
  const { role } = useRole()
  const line = useFixMatrixLine(fix)
  if (!line) return null
  const product = PRODUCTS.find((p) => p.id === line.product)
  const c = line.row.cells
  const text = (v: MatrixCells[keyof MatrixCells]) => (v === null ? '–' : typeof v === 'number' ? String(v) : L(v as Bi))
  const anyDefault = MATRIX_FIELDS.some((f) => line.row.isDefault[f])
  const parts: [Bi, string][] = [
    [MATRIX_LINE_LABELS.receiver, text(c.receiver)],
    [MATRIX_LINE_LABELS.informed, text(c.informed)],
    [MATRIX_LINE_LABELS.backup, text(c.backup)],
    [MATRIX_LINE_LABELS.respond, c.respondH === null ? '–' : `${c.respondH} h`],
    [MATRIX_LINE_LABELS.resolve, c.resolveH === null ? '–' : `${c.resolveH} h`],
  ]
  const canOpen = canAccessPath(role.id, '/settings/escalation-matrix')
  return (
    <div className="well flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" data-testid="matrix-line">
      <span className="text-foreground">
        <strong className="font-medium">{L(MATRIX_LINE_LABELS.from)}</strong> ({product ? L(product.name) : line.product}):
      </span>
      {parts.map(([label, value], i) => (
        <span key={i} className="inline-flex min-h-6 items-center rounded-full bg-card px-2.5 py-0.5 shadow-hairline">
          <span className="text-muted-foreground">{L(label)}</span> <bdi className="ms-1.5 font-medium text-foreground">{value}</bdi>
        </span>
      ))}
      {anyDefault && <ProposedBadge />}
      {canOpen && (
        <Button variant="outline" size="xs" asChild className="ms-auto">
          <Link to={`/settings/escalation-matrix?product=${line.product}`}>{L(MATRIX_COPY.matrixButton)}</Link>
        </Button>
      )}
    </div>
  )
}
