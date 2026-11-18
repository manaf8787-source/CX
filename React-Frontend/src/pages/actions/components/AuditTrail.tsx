import { useId } from 'react'
import { useI18n } from '@/i18n'
import { roleDef } from '@/data/roles'
import { AUDIT_COPY, newestFirst } from '@/utils/audit'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AuditEntry } from '@/types'

/** `2026-11-14 13:31` in local time: digits and separators only, so it reads the same in both directions. */
function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * The audit trail of a fix (v40 F21): every change, when, what, by which role, newest first. "By" is the role title of whoever
 * acted (never a person), "System" when the agents acted. Nothing is deleted. Every status change and every decision writes an
 * entry (`useDecideCorrectiveAction`, `useSetFixStatus`, `useSendToInvestigation`, `useReturnInvestigation`).
 *
 * Composition: heading and hint on the card, then the skill's dense table straight on the white card (a divider line is only visible on
 * white, so the log is not put in a well). The stamp is the dark-ink tabular column, the role grey.
 */
export function AuditTrail({ log }: { log: readonly AuditEntry[] }) {
  const { L } = useI18n()
  const headingId = useId()
  const rows = newestFirst(log)
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 text-card-foreground" data-testid="audit-trail">
      <div className="flex flex-col gap-0.5">
        <h3 id={headingId} className="t-h4">
          {L(AUDIT_COPY.title)}
        </h3>
        <p className="text-sm text-muted-foreground">{L(AUDIT_COPY.hint)}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L(AUDIT_COPY.empty)}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead className="w-44">{L(AUDIT_COPY.columns.when)}</TableHead>
              <TableHead>{L(AUDIT_COPY.columns.what)}</TableHead>
              <TableHead className="w-56">{L(AUDIT_COPY.columns.by)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e, i) => {
              const when = new Date(e.at)
              return (
                <TableRow key={`${e.at}-${i}`}>
                  <TableCell className="tabular">
                    <time dateTime={e.at}>
                      <bdi dir="ltr">{stamp(when)}</bdi>
                    </time>
                  </TableCell>
                  <TableCell className="whitespace-normal text-foreground">{L(e.what)}</TableCell>
                  <TableCell className="whitespace-normal">
                    {e.byRole === 'system' ? L(AUDIT_COPY.system) : (roleDef(e.byRole) ? L(roleDef(e.byRole)!.name) : e.byRole)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
