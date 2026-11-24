import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useInbox, useRules } from '@/services/queriesV40'
import { INBOX_COPY, WORK_TODAY_COPY } from '@/utils/inbox'
import { nextForInboxItem } from '@/utils/brief'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/common/SectionCard'
import { DayChip } from '@/components/common/DayChip'
import { NextBox } from '@/components/common/NextBox'
import { LoadingState } from '@/components/common/LoadingState'

/** How many inbox rows the Home card shows (v40 F06: the first four). */
const ROWS = 4

/**
 * "Your work today" (v40 F06, S1): a summary of My inbox. The hint counts the items on the role and how many are urgent,
 * the box says where the first row sits on the six steps and what happens next, then the first four rows with their day
 * chip. The page and the card read the same `useInbox` list, so the two can never disagree.
 *
 * Design: card -> the next-step well -> rows divided by `row-divider`. "Open my inbox" is a light pill: the primary pill on Home is the search.
 */
export function WorkToday({ className }: { className?: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const rules = useRules()
  const { data: items, isLoading, stats } = useInbox()
  const canInbox = canAccessPath(role.id, '/inbox')
  const first = items?.[0]
  const next = first ? nextForInboxItem(first, rules) : null
  // 24 Nov (owner): Home shows only sections with something in them; nothing on you today -> no card
  if (!isLoading && items && items.length === 0) return null

  return (
    <SectionCard
      className={className}
      title={L(WORK_TODAY_COPY.title)}
      description={isLoading || !items ? undefined : L(WORK_TODAY_COPY.hint(stats.total, stats.urgent))}
      actions={
        canInbox && (
          <Button asChild variant="outline" size="sm">
            <Link to="/inbox">
              {L(WORK_TODAY_COPY.button)}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        )
      }
      contentClassName="flex flex-col gap-4"
    >
      {isLoading || !items ? (
        <LoadingState rows={3} />
      ) : (
        <>
          {next && first && <NextBox next={next} who={first.who ? L(first.who) : undefined} />}
          <ul aria-label={t('First rows of my inbox', 'أول أسطر صندوقي')} className="flex flex-col">
            {items.slice(0, ROWS).map((item) => {
              const path = item.target.split('?')[0]
              return (
                <li key={item.id} className="row-divider flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                  <span className="flex min-w-36 shrink-0 items-center">
                    <DayChip daysLeft={item.daysLeft} unit={item.unit} />
                  </span>
                  <span className="min-w-0 flex-1 basis-56 text-base">{L(item.text)}</span>
                  {canAccessPath(role.id, path) && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={item.target}>
                        {L(INBOX_COPY.open)}
                        <span className="sr-only"> · {L(item.text)}</span>
                      </Link>
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </SectionCard>
  )
}
