import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useFeeds } from '@/services/queriesV40'
import { FEEDS_COPY, FEED_STATUS, lateFeedsLabel } from '@/data/feeds'
import { environmentById } from '@/data/environments'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SubPageHeader } from './SubPageHeader'

const DAY_MS = 86_400_000
const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Data feeds (v40 F13): where every number comes from and whether it arrived today. The three CRM environments are
 * three separate feeds (separate databases, each connected on its own); the other sources are shared. Read-only: nobody
 * edits a feed here (the Internal Audit and Marketing Lead marks a feed trusted once a month, in the rule line).
 * A late feed is shown as "Late" with yesterday's date, never silently.
 */
export default function Feeds() {
  const { t, L, lang } = useI18n()
  const { data: feeds, isLoading, isError, refetch } = useFeeds()
  const now = useNow()
  const c = FEEDS_COPY.columns
  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB'
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

  /** "Today 06:10", "Yesterday 06:05" or the date, relative to the current day. */
  function received(iso: string) {
    const ms = Date.parse(iso)
    const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY_MS)
    const day = days === 0 ? t('Today', 'اليوم') : days === 1 ? t('Yesterday', 'أمس') : date.format(ms)
    return (
      <span className="inline-flex items-center gap-1.5">
        {day}
        <bdi dir="ltr" className="tabular-nums">
          {time.format(ms)}
        </bdi>
      </span>
    )
  }

  const lateCount = (feeds ?? []).filter((f) => f.status !== 'ok').length

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={L(FEEDS_COPY.title)}
        description={L(FEEDS_COPY.intro)}
        actions={
          feeds &&
          (lateCount > 0 ? (
            <StatusBadge tone="warning" icon={<TriangleAlert aria-hidden />}>
              {L(lateFeedsLabel(lateCount))}
            </StatusBadge>
          ) : (
            <StatusBadge tone="success" icon={<CheckCircle2 aria-hidden />}>
              {L(FEEDS_COPY.barAllReceived)}
            </StatusBadge>
          ))
        }
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !feeds ? (
        <LoadingState rows={6} />
      ) : feeds.length === 0 ? (
        <EmptyState title={t('No feeds are configured yet.', 'لا توجد تغذيات مضبوطة بعد.')} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{L(c.feed)}</TableHead>
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{L(c.environment)}</TableHead>
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{L(c.today)}</TableHead>
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{L(c.lastReceived)}</TableHead>
                <TableHead className="px-3 text-end text-xs font-semibold text-muted-foreground">{L(c.records)}</TableHead>
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{L(c.carries)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeds.map((f) => (
                <TableRow key={f.id} className={cn(f.status !== 'ok' && 'bg-warning/5')}>
                  <TableCell className="px-3 py-2.5 font-medium">{L(f.name)}</TableCell>
                  <TableCell className="px-3 py-2.5 text-muted-foreground">{f.env ? L(environmentById(f.env).name) : L(FEEDS_COPY.shared)}</TableCell>
                  <TableCell className="px-3 py-2.5">
                    <StatusBadge tone={FEED_STATUS[f.status].tone} dot>
                      {L(FEED_STATUS[f.status].label)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">{received(f.receivedAt)}</TableCell>
                  <TableCell className="px-3 py-2.5 text-end tabular-nums">{f.rows.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')}</TableCell>
                  <TableCell className="min-w-56 px-3 py-2.5 whitespace-normal text-muted-foreground">{L(f.note)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{L(FEEDS_COPY.rule)}</p>
    </section>
  )
}
