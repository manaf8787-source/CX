import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, TimerOff } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canMarkMentionReplied } from '@/auth/permissions'
import { usePublicMentions } from '@/services/referenceQueries'
import { useMarkReplied, useRules } from '@/services/queriesV40'
import { PUBLIC_MENTIONS_COPY as COPY, replyLabel, replyState, type ReplyState } from '@/data/publicMentions'
import { envNameFromShort } from '@/data/environments'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SourceBadge } from '@/components/customers/SourceBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { KpiTile } from '@/components/common/KpiTile'
import { LoadingState } from '@/components/common/LoadingState'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Segmented } from '@/components/ui/segmented'
import { IN_CARD, SubPageHeader } from './SubPageHeader'

type Filter = 'all' | ReplyState

const HOUR_MS = 3_600_000

/**
 * Public mentions (v40 F30): every public comment on Facebook, Instagram, LinkedIn and Google with its reply status.
 * Marketing (the channel owner) replies within the reply clock (48 hours from the approved wording, a rule value);
 * the CX team watches the clock and raises a signal when it is missed, so an overdue mention is shown to every role that
 * can open the page; the Internal Audit and Marketing Lead audits monthly. Decided 18 Nov, so the owner column has no badge.
 * Nobody here is surveyed or matched to a record: a mention is never linked to a person. "Mark replied" is for the
 * CX roles and Marketing.
 *
 * Design: a register, so dense. The filter is the segmented pill track (toggle buttons with counts), the list is one card with a
 * table; colour appears only as the status tags and the dot on a KPI that needs a look.
 */
export default function PublicMentions() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const rules = useRules()
  const hours = rules.publicReplyHours
  const { data: mentions, isLoading, isError, refetch } = usePublicMentions()
  const markReplied = useMarkReplied()
  const canReply = canMarkMentionReplied(role.id)
  const [filter, setFilter] = useState<Filter>('all')
  const c = COPY.columns

  const rows = useMemo(() => [...(mentions ?? [])].sort((a, b) => b.date.localeCompare(a.date)).map((m) => ({ m, state: replyState(m, now, hours) })), [mentions, now, hours])
  const counts = { all: rows.length, awaiting: rows.filter((r) => r.state === 'awaiting').length, overdue: rows.filter((r) => r.state === 'overdue').length, replied: rows.filter((r) => r.state === 'replied').length }
  const shown = filter === 'all' ? rows : rows.filter((r) => r.state === filter)
  const tone = (s: number) => (s < 0 ? COPY.tone.negative : s > 0 ? COPY.tone.positive : COPY.tone.neutral)
  const fmtDate = (d: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: t('All', 'الكل') },
    { id: 'awaiting', label: t('Awaiting reply', 'بانتظار الرد') },
    { id: 'overdue', label: t(`Over ${hours} h`, `تجاوزت ${hours} ساعة`) },
    { id: 'replied', label: t('Replied', 'رُدّ عليها') },
  ]

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro(hours))} />
      <p className="max-w-[72ch] text-sm text-muted-foreground">{L(COPY.ownerNote(hours))}</p>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !mentions ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiTile label={t('Mentions', 'الإشارات')} value={counts.all} />
            <KpiTile label={t('Awaiting reply', 'بانتظار الرد')} value={counts.awaiting} sub={t(`inside the ${hours}-hour clock`, `ضمن مهلة ${hours} ساعة`)} />
            <KpiTile label={t(`Over ${hours} h, no reply`, `تجاوزت ${hours} ساعة بلا رد`)} value={counts.overdue} accent={counts.overdue ? 'var(--destructive)' : undefined} sub={counts.overdue ? L(COPY.missedSignal) : undefined} />
            <KpiTile label={t('Replied', 'رُدّ عليها')} value={counts.replied} />
          </div>

          <Segmented
            variant="pressed"
            label={t('Filter by reply status', 'تصفية حسب حالة الرد')}
            options={FILTERS.map((f) => ({ value: f.id, label: f.label, count: counts[f.id] }))}
            value={filter}
            onValueChange={setFilter}
          />

          {shown.length === 0 ? (
            <EmptyState title={t('No mentions match this filter.', 'لا إشارات تطابق هذه التصفية.')} />
          ) : (
            <SectionCard contentClassName={IN_CARD}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {[c.date, c.channel, c.mention, c.tone, c.reply, c.identified, c.owner].map((h) => (
                      <TableHead key={h.en}>{L(h)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(({ m, state }) => {
                    const leftH = Math.max(1, Math.ceil(hours - (now - Date.parse(m.date)) / HOUR_MS))
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="tabular">
                          <bdi dir="ltr">{fmtDate(m.date)}</bdi>
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-col items-start gap-1">
                            <SourceBadge channel={m.platform} />
                            <span className="text-xs">{L(envNameFromShort(m.environment))}</span>
                          </span>
                        </TableCell>
                        <TableCell className="min-w-40 whitespace-normal text-foreground">{m.text}</TableCell>
                        <TableCell>
                          <StatusBadge tone={m.sentiment < 0 ? 'danger' : m.sentiment > 0 ? 'success' : 'neutral'}>{L(tone(m.sentiment))}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-col items-start gap-1.5">
                            <StatusBadge tone={state === 'replied' ? 'success' : state === 'overdue' ? 'danger' : 'warning'} icon={state === 'overdue' ? <TimerOff aria-hidden /> : undefined}>
                              {L(replyLabel(m, now, hours))}
                            </StatusBadge>
                            {state === 'awaiting' && <span className="text-xs tabular">{t(`${leftH} h left on the clock`, `${leftH} ساعة متبقية على المهلة`)}</span>}
                            {canReply && !m.replied && (
                              <Button
                                size="xs"
                                variant="outline"
                                aria-label={`${L(COPY.action)}: ${m.text.slice(0, 40)}`}
                                onClick={() => markReplied.mutate({ id: m.id }, { onSuccess: () => toast(L(COPY.toast)) })}
                              >
                                <Check aria-hidden />
                                {L(COPY.action)}
                              </Button>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-24 whitespace-normal">{m.becameIdentified ? L(COPY.identified[m.channelMovedTo ?? 'private']) : '–'}</TableCell>
                        <TableCell className="min-w-24 whitespace-normal">{L(m.owner)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </>
      )}
    </section>
  )
}
