import { inboxItemHref } from './InboxItem'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardCheck,
  CircleCheck,
  FileCheck,
  FileSearch,
  Megaphone,
  PhoneCall,
  ScanSearch,
  Wrench,
  type LucideIcon,
  MessageCircle,
  Gift,
} from 'lucide-react'
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
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StackedRows } from '@/components/common/StackedRows'
import { useViewportMode } from '@/components/layout/useViewportMode'
import type { InboxItem, InboxKind } from '@/types'

const KIND_ICON: Record<InboxKind, LucideIcon> = {
  approve: CircleCheck,
  do: Wrench,
  verify: ScanSearch,
  call: PhoneCall,
  inv: FileSearch,
  sample: ClipboardCheck,
  caud: Megaphone,
  caud2: FileCheck,
  mention: MessageCircle,
  gift: Gift,
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
  const phone = useViewportMode() === 'phone'
  // 26 Nov (owner): filter by urgency and sort by the due date
  const [level, setLevel] = useState<'all' | '2' | '1' | '0'>('all')
  const [order, setOrder] = useState<'urgency' | 'soonest' | 'latest'>('urgency')
  const dueMs = (item: InboxItem) => dueDate(item, today, rules)?.getTime() ?? null
  const shown = (items ?? [])
    .filter((x) => level === 'all' || String(x.priority) === level)
    .sort((a, b) => {
      if (order === 'urgency') return 0
      const x = dueMs(a)
      const y = dueMs(b)
      if (x === null && y === null) return 0
      if (x === null) return 1
      if (y === null) return -1
      return order === 'soonest' ? x - y : y - x
    })
  const filters = items && items.length > 0 && (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented<'all' | '2' | '1' | '0'>
        label={t('Status', 'الحالة')}
        variant="pressed"
        value={level}
        onValueChange={setLevel}
        options={[
          { value: 'all', label: t(`All (${items.length})`, `الكل (${items.length})`) },
          {
            value: '2',
            label: t(`Most urgent (${items.filter((x) => x.priority === 2).length})`, `الأكثر إلحاحاً (${items.filter((x) => x.priority === 2).length})`),
          },
          { value: '1', label: t(`Urgent (${items.filter((x) => x.priority === 1).length})`, `عاجل (${items.filter((x) => x.priority === 1).length})`) },
          { value: '0', label: t(`Normal (${items.filter((x) => x.priority === 0).length})`, `عادي (${items.filter((x) => x.priority === 0).length})`) },
        ]}
      />
      <Select value={order} onValueChange={(v) => setOrder(v as typeof order)}>
        <SelectTrigger size="sm" className="min-w-48" aria-label={t('Sort by date', 'الترتيب حسب التاريخ')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="urgency">{t('Most urgent first', 'الأكثر إلحاحاً أولاً')}</SelectItem>
          <SelectItem value="soonest">{t('Due date: soonest first', 'الموعد: الأقرب أولاً')}</SelectItem>
          <SelectItem value="latest">{t('Due date: latest first', 'الموعد: الأبعد أولاً')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div data-density="dense" className="flex flex-col gap-6">
      <PageHeader title={L(INBOX_COPY.title)} description={L(INBOX_COPY.intro)} />

      {next && first && (
        <div className="flex flex-col gap-2">
          <p className="label-style">{t('For your first row', 'للسطر الأول')}</p>
          <NextBox next={next} who={first.who ? L(first.who) : undefined} />
        </div>
      )}

      <SectionCard description={isLoading || !items ? undefined : L(WORK_TODAY_COPY.hint(stats.total, stats.urgent))} contentClassName="flex flex-col gap-5">
        {isLoading || !items ? (
          <LoadingState rows={5} />
        ) : items.length === 0 ? (
          <EmptyState title={L(INBOX_COPY.empty)} icon={<CircleCheck />} />
        ) : (
          <>
            {filters}
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('Nothing at this level.', 'لا شيء في هذا المستوى.')}</p>
            ) : phone ? (
              // a phone: the sentence and its urgency on two lines, the Open button, "Who it is with" behind "Details"
              <StackedRows
                label={L(INBOX_COPY.title)}
                rows={shown.map((item) => {
                  const Icon = KIND_ICON[item.kind]
                  const date = dueDate(item, today, rules)
                  const path = item.target.split('?')[0]
                  return {
                    id: item.id,
                    attrs: { 'data-kind': item.kind, 'data-priority': item.priority, 'data-tour': 'inbox-row' },
                    title: (
                      <span className="flex items-start gap-3">
                        <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full [&_svg]:size-4">
                          <Icon />
                        </span>
                        <span className="min-w-0 pt-1">{L(item.text)}</span>
                      </span>
                    ),
                    meta: (
                      <>
                        {date ? (
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <DayChip daysLeft={item.daysLeft} unit={item.unit} />
                            <span className="t-caption">
                              <span className="sr-only">{t('Due', 'المهلة')} </span>
                              <bdi>{fmt.format(date)}</bdi>
                            </span>
                          </span>
                        ) : (
                          <span aria-label={t('No date', 'بلا موعد')}>–</span>
                        )}
                        {item.priority === 2 && <StatusBadge tone="danger">{t('Most urgent', 'الأكثر إلحاحاً')}</StatusBadge>}
                        {item.priority === 1 && <StatusBadge tone="warning">{t('Urgent', 'عاجل')}</StatusBadge>}
                      </>
                    ),
                    end: canAccessPath(role.id, path) && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={inboxItemHref(item.target)}>
                          {L(INBOX_COPY.open)}
                          <span className="sr-only"> · {L(item.text)}</span>
                        </Link>
                      </Button>
                    ),
                    detail: item.who ? [{ key: 'with', label: L(INBOX_COPY.columns.with), value: L(item.who) }] : undefined,
                  }
                })}
              />
            ) : (
              <div className="px-1">
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
                    {shown.map((item) => {
                      const Icon = KIND_ICON[item.kind]
                      const date = dueDate(item, today, rules)
                      const path = item.target.split('?')[0]
                      return (
                        <TableRow key={item.id} data-kind={item.kind} data-priority={item.priority} data-tour="inbox-row">
                          <TableCell>
                            {date ? (
                              <div className="flex flex-col items-start gap-1">
                                <DayChip daysLeft={item.daysLeft} unit={item.unit} />
                                <span className="t-caption">
                                  <span className="sr-only">{t('Due', 'المهلة')} </span>
                                  <bdi>{fmt.format(date)}</bdi>
                                </span>
                              </div>
                            ) : (
                              <span aria-label={t('No date', 'بلا موعد')}>–</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <div className="flex items-center gap-3">
                              <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full [&_svg]:size-4">
                                <Icon />
                              </span>
                              <div className="flex min-w-0 flex-col items-start gap-1.5">
                                <span className="min-w-48 font-medium text-foreground">{L(item.text)}</span>
                                {item.priority === 2 && <StatusBadge tone="danger">{t('Most urgent', 'الأكثر إلحاحاً')}</StatusBadge>}
                                {item.priority === 1 && <StatusBadge tone="warning">{t('Urgent', 'عاجل')}</StatusBadge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.who ? L(item.who) : ''}</TableCell>
                          <TableCell className="text-end">
                            {canAccessPath(role.id, path) && (
                              <Button asChild variant="outline" size="sm">
                                <Link to={inboxItemHref(item.target)}>
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
              </div>
            )}
          </>
        )}
        <div className="t-body-s flex flex-col gap-1">
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
