import { useId } from 'react'
import { useI18n } from '@/i18n'
import { roleDef } from '@/data/roles'
import { AUDIT_COPY, newestFirst } from '@/utils/audit'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AuditEntry } from '@/types'

/**
 * The audit trail of a fix (v40 F21): every change, when, what, by which role, newest first. "By" is the role title of whoever
 * acted (never a person), "System" when the agents acted. Nothing is deleted. Every status change and every decision writes an
 * entry (`useDecideCorrectiveAction`, `useSetFixStatus`, `useSendToInvestigation`, `useReturnInvestigation`).
 */
export function AuditTrail({ log }: { log: readonly AuditEntry[] }) {
  const { L, lang } = useI18n()
  const headingId = useId()
  const rows = newestFirst(log)
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground" data-testid="audit-trail">
      <div className="flex flex-col gap-0.5">
        <h3 id={headingId} className="text-base font-semibold">
          {L(AUDIT_COPY.title)}
        </h3>
        <p className="text-sm text-muted-foreground">{L(AUDIT_COPY.hint)}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L(AUDIT_COPY.empty)}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44 px-3">{L(AUDIT_COPY.columns.when)}</TableHead>
              <TableHead className="px-3">{L(AUDIT_COPY.columns.what)}</TableHead>
              <TableHead className="w-56 px-3">{L(AUDIT_COPY.columns.by)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e, i) => {
              const when = new Date(e.at)
              return (
                <TableRow key={`${e.at}-${i}`}>
                  <TableCell className="px-3 text-sm tabular-nums">
                    <time dateTime={e.at}>
                      <bdi dir="ltr">
                        {when.toLocaleDateString(lang, { year: 'numeric', month: '2-digit', day: '2-digit' })}{' '}
                        {when.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </bdi>
                    </time>
                  </TableCell>
                  <TableCell className="px-3 text-sm whitespace-normal">{L(e.what)}</TableCell>
                  <TableCell className="px-3 text-sm whitespace-normal text-muted-foreground">
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
