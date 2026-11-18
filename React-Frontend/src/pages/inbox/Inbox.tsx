import { Link } from 'react-router-dom'
import { ClipboardCheck, CircleCheck, FileSearch, PhoneCall, ScanSearch, Wrench, type LucideIcon } from 'lucide-react'
import { useI18n, type Lang } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useNow } from '@/hooks/useNow'
import { useInbox, useRules } from '@/services/queriesV40'
import { INBOX_COPY, WORK_TODAY_COPY } from '@/utils/inbox'
import { nextForInboxItem } from '@/utils/brief'
import { calendarFromRules, type RulesBag } from '@/utils/ruleValues'
import { addWorkingDays, startOfDay } from '@/utils/workingDays'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { EmptyState } from '@/components/common/EmptyState'
import { DayChip } from '@/components/common/DayChip'
import { NextBox } from '@/components/common/NextBox'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { InboxItem, InboxKind } from '@/types'

const KIND_ICON: Record<InboxKind, LucideIcon> = {
  approve: CircleCheck,
  do: Wrench,
  verify: ScanSearch,
  call: PhoneCall,
  inv: FileSearch,
  sample: ClipboardCheck,
}

/** The date an item falls due, from its day counter: working days on the configured week, or calendar days. Null for an item with no date. */
function dueDate(item: InboxItem, today: Date, rules: RulesBag): Date | null {
  if (item.daysLeft === null) return null
  if (item.unit === 'wd') return addWorkingDays(today, item.daysLeft, calendarFromRules(rules))
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + item.daysLeft)
}

const dayFormat = (lang: Lang) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Monday to Friday" / "من الاثنين إلى الجمعة" for a run of weekdays, otherwise the names in a list. */
function weekText(days: readonly number[], lang: Lang): string {
  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB'
  const name = (d: number) => new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2024, 0, 7 + d)) // 7 Jan 2024 is a Sunday
  const sorted = [...days].sort((a, b) => a - b)
  const run = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (run) return lang === 'ar' ? `من ${name(sorted[0])} إلى ${name(sorted[sorted.length - 1])}` : `${name(sorted[0])} to ${name(sorted[sorted.length - 1])}`
  return sorted.map(name).join(lang === 'ar' ? '، ' : ', ')
}

/**
 * My inbox (v40 F20, S7): everything that is on the signed-in role, ordered by urgency (priority, then fewest days
 * left, undated last). Each row carries its day counter (working days for approvals and calls, calendar days for fix due
 * dates and checks), the date it falls due, the priority, who it is with, and a link to the record. Rows read the same
 * `useInbox` list as the Home card. The box above says where the first row sits on the six steps and what happens next.
 */
export default function Inbox() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const rules = useRules()
  const now = useNow()
  const { data: items, isLoading, stats } = useInbox()
  const today = startOfDay(now)
  const fmt = dayFormat(lang)
  const first = items?.[0]
  const next = first ? nextForInboxItem(first, rules) : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={L(INBOX_COPY.title)} description={L(INBOX_COPY.intro)} />

      {next && first && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('For your first row', 'للسطر الأول')}</p>
          <NextBox next={next} who={first.who ? L(first.who) : undefined} />
        </div>
      )}

      <SectionCard description={isLoading || !items ? undefined : L(WORK_TODAY_COPY.hint(stats.total, stats.urgent))} contentClassName="flex flex-col gap-4">
        {isLoading || !items ? (
          <LoadingState rows={5} />
        ) : items.length === 0 ? (
          <EmptyState title={L(INBOX_COPY.empty)} icon={<CircleCheck />} />
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
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind]
                const date = dueDate(item, today, rules)
                const path = item.target.split('?')[0]
                return (
                  <TableRow key={item.id} data-kind={item.kind} data-priority={item.priority}>
                    <TableCell className="align-top">
                      {date ? (
                        <div className="flex flex-col items-start gap-1">
                          <DayChip daysLeft={item.daysLeft} unit={item.unit} />
                          <span className="text-xs text-muted-foreground">
                            <span className="sr-only">{t('Due', 'المهلة')} </span>
                            <bdi>{fmt.format(date)}</bdi>
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground" aria-label={t('No date', 'بلا موعد')}>
                          –
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <div className="flex items-start gap-3">
                        <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div className="flex min-w-0 flex-col items-start gap-1.5">
                          <span className="min-w-48">{L(item.text)}</span>
                          {item.priority === 2 && <StatusBadge tone="danger">{t('Most urgent', 'الأكثر إلحاحاً')}</StatusBadge>}
                          {item.priority === 1 && <StatusBadge tone="warning">{t('Urgent', 'عاجل')}</StatusBadge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">{item.who ? L(item.who) : ''}</TableCell>
                    <TableCell className="align-top">
                      {canAccessPath(role.id, path) && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={item.target}>
                            {L(INBOX_COPY.open)}
                            <span className="sr-only"> · {L(item.text)}</span>
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>{L(INBOX_COPY.footer(rules.approveDays, rules.verifyDays))}</p>
          <p>
            {t(
              `Working days count ${weekText(rules.workingDays, 'en')}. Approvals and calls are counted in working days; a fix’s due date, the ${rules.verifyDays}-day check and the weekly sample in calendar days.`,
              `أيام العمل تُحسب ${weekText(rules.workingDays, 'ar')}. الاعتماد والاتصالات تُحسب بأيام العمل؛ أما موعد الحل وفحص الـ${rules.verifyDays} يوماً والعينة الأسبوعية فبالأيام التقويمية.`,
            )}
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
