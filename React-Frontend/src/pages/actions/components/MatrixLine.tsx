import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useFixMatrixLine, useIsVipFix } from '@/services/queriesV40'
import { MATRIX_COPY, MATRIX_LINE_LABELS } from '@/data/escalationDefaults'
import { PRODUCTS } from '@/data/products'
import { formatClockWithUnit } from '@/utils/matrixFormat'
import { effectiveCells } from '@/utils/vipClock'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import type { Bi, CorrectiveAction } from '@/types'

/**
 * One line before the Classification card (v40 F22, v42 F30): "From the matrix ({product}): receiver {x} · informed {y} · backup {z} ·
 * respond {n} h · resolve {m} h" and a "Matrix" button to the page that holds it (only for roles that may open it). The fix's
 * classification reads the matrix of its own product. The cells are decided (set 19 Nov), so the line carries the quiet tag
 * "Set 19 Nov · titles adjustable until 28 Nov", not [Proposed].
 *
 * A VIP-related fix (its pattern includes a person tagged VIP in the CRM, `utils/vipClock.ts`) reads the VIP version of the row: both clocks
 * halved, the head of the environment added to "informed", the CX manager as backup, and one sentence under the line says so.
 *
 * Composition: a well, the sentence's lead in ink, each value a white pill (label grey, value ink) so the five fields scan as one row.
 * The text still reads "receiver X informed Y ..." in order (tests and screen readers read the sentence).
 */
export function MatrixLine({ fix }: { fix: Pick<CorrectiveAction, 'kind' | 'product'> & Partial<Pick<CorrectiveAction, 'patternId'>> }) {
  const { L, lang } = useI18n()
  const { role } = useRole()
  const line = useFixMatrixLine(fix)
  const vip = useIsVipFix(fix)
  if (!line) return null
  const product = PRODUCTS.find((p) => p.id === line.product)
  const c = effectiveCells(line.row.cells, line.rule, vip)
  const text = (v: Bi | null) => (v === null ? '–' : L(v))
  const parts: [Bi, string][] = [
    [MATRIX_LINE_LABELS.receiver, text(c.receiver)],
    [MATRIX_LINE_LABELS.informed, text(c.informed)],
    [MATRIX_LINE_LABELS.backup, text(c.backup)],
    [MATRIX_LINE_LABELS.respond, formatClockWithUnit(c.respondH, { asDays: !!c.asDays?.respondH, lang })],
    [MATRIX_LINE_LABELS.resolve, formatClockWithUnit(c.resolveH, { asDays: !!c.asDays?.resolveH, lang })],
  ]
  const canOpen = canAccessPath(role.id, '/settings/escalation-matrix')
  return (
    <div className="well flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" data-testid="matrix-line" data-vip={vip ? 'true' : undefined}>
      <span className="text-foreground">
        <strong className="font-medium">{L(MATRIX_LINE_LABELS.from)}</strong> ({product ? L(product.name) : line.product}):
      </span>
      {parts.map(([label, value], i) => (
        <span key={i} className="inline-flex min-h-6 items-center rounded-full bg-card px-2.5 py-0.5 shadow-hairline">
          <span className="text-muted-foreground">{L(label)}</span> <bdi className="ms-1.5 font-medium text-foreground">{value}</bdi>
        </span>
      ))}
      <span data-testid="matrix-set">
        <StatusBadge tone="neutral">{L(MATRIX_COPY.setNote)}</StatusBadge>
      </span>
      {canOpen && (
        <Button variant="outline" size="xs" asChild className="ms-auto">
          <Link to={`/settings/escalation-matrix?product=${line.product}`}>{L(MATRIX_COPY.matrixButton)}</Link>
        </Button>
      )}
      {vip && (
        <p className="t-caption w-full" data-testid="matrix-vip-note">
          {L(MATRIX_COPY.vipApplied)}
        </p>
      )}
    </div>
  )
}
