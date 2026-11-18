import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useFeeds } from '@/services/queriesV40'
import { FEEDS_COPY, FEED_STATUS, lateFeedsLabel } from '@/data/feeds'
import { environmentById } from '@/data/environments'
import { useNow } from '@/hooks/useNow'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IN_CARD, SubPageHeader } from './SubPageHeader'

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
        <bdi dir="ltr" className="tabular">
          {time.format(ms)}
        </bdi>
      </span>
    )
  }

  const lateCount = (feeds ?? []).filter((f) => f.status !== 'ok').length

  return (
    <section data-density="dense" className="flex flex-col gap-4">
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
        <SectionCard contentClassName={IN_CARD}>
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
                  <TableCell className="font-medium text-foreground">{L(f.name)}</TableCell>
                  <TableCell>{f.env ? L(environmentById(f.env).name) : L(FEEDS_COPY.shared)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={FEED_STATUS[f.status].tone} dot>
                      {L(FEED_STATUS[f.status].label)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-foreground">{received(f.receivedAt)}</TableCell>
                  <TableCell className="text-end font-medium tabular text-foreground">{f.rows.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')}</TableCell>
                  <TableCell className="min-w-40 whitespace-normal">{L(f.note)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <p className="text-sm text-muted-foreground">{L(FEEDS_COPY.rule)}</p>
    </section>
  )
}
