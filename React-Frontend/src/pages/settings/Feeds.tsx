// FOUNDATION STUB: owner = workstream C (a working read-only table over `useFeeds`: C finishes the design and the empty/error states).
import { useI18n } from '@/i18n'
import { useFeeds } from '@/services/queriesV40'
import { FEEDS_COPY, FEED_STATUS } from '@/data/feeds'
import { environmentById } from '@/data/environments'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingState } from '@/components/common/LoadingState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SubPageHeader } from './SubPageHeader'

export default function Feeds() {
  const { L, lang } = useI18n()
  const { data: feeds, isLoading } = useFeeds()
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const c = FEEDS_COPY.columns
  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={L(FEEDS_COPY.title)} description={L(FEEDS_COPY.intro)} />
      {isLoading || !feeds ? (
        <LoadingState rows={6} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{L(c.feed)}</TableHead>
              <TableHead>{L(c.environment)}</TableHead>
              <TableHead>{L(c.today)}</TableHead>
              <TableHead>{L(c.lastReceived)}</TableHead>
              <TableHead className="text-end">{L(c.records)}</TableHead>
              <TableHead>{L(c.carries)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeds.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{L(f.name)}</TableCell>
                <TableCell className="text-muted-foreground">{f.env ? L(environmentById(f.env).name) : L(FEEDS_COPY.shared)}</TableCell>
                <TableCell>
                  <StatusBadge tone={FEED_STATUS[f.status].tone}>{L(FEED_STATUS[f.status].label)}</StatusBadge>
                </TableCell>
                <TableCell className="tabular-nums"><bdi dir="ltr">{fmt(f.receivedAt)}</bdi></TableCell>
                <TableCell className="text-end tabular-nums">{f.rows.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{L(f.note)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-sm text-muted-foreground">{L(FEEDS_COPY.rule)}</p>
    </section>
  )
}
