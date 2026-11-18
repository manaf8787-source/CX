// FOUNDATION STUB: owner = workstream A (a working inbox over `useInbox`: A polishes the layout, grouping and empty states).
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useInbox, useRules } from '@/services/queriesV40'
import { INBOX_COPY } from '@/utils/inbox'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { EmptyState } from '@/components/common/EmptyState'
import { DayChip } from '@/components/common/DayChip'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function Inbox() {
  const { L } = useI18n()
  const { role } = useRole()
  const rules = useRules()
  const { data: items, isLoading } = useInbox()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={L(INBOX_COPY.title)} description={L(INBOX_COPY.intro)} />
      {isLoading || !items ? (
        <LoadingState rows={5} />
      ) : items.length === 0 ? (
        <EmptyState title={L(INBOX_COPY.empty)} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{L(INBOX_COPY.columns.due)}</TableHead>
              <TableHead>{L(INBOX_COPY.columns.what)}</TableHead>
              <TableHead>{L(INBOX_COPY.columns.with)}</TableHead>
              <TableHead>
                <span className="sr-only">{L(INBOX_COPY.open)}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <DayChip daysLeft={item.daysLeft} unit={item.unit} />
                </TableCell>
                <TableCell className="whitespace-normal">{L(item.text)}</TableCell>
                <TableCell>{item.who ? L(item.who) : ''}</TableCell>
                <TableCell>
                  {canAccessPath(role.id, item.target.split('?')[0]) && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={item.target}>{L(INBOX_COPY.open)}</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-sm text-muted-foreground">{L(INBOX_COPY.footer(rules.approveDays, rules.verifyDays))}</p>
    </div>
  )
}
