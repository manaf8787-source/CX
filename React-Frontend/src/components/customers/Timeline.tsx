import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, PhoneOff } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewAgentNames, canViewConversationText, resolveAgentDisplay } from '@/auth/permissions'
import { useAgentDirectory, useSignalsAll } from '@/services/queries'
import { evId } from '@/utils/trace'
import { TraceId } from '@/components/common/TraceId'
import { useScrollToTarget } from '@/components/trace/useScrollToTarget'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import type { ChannelId, Interaction, Signal } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'
import { CHANNEL_ICON, CHANNEL_LABEL, PUBLIC_CHANNELS } from './channels'

const ALL_CHANNELS: ChannelId[] = [
  'website', 'app', 'whatsapp', 'call', 'ivr', 'branch', 'email', 'survey',
  'shopper', 'club', 'wallet', 'events', 'tours', 'facebook', 'instagram', 'linkedin', 'google',
]

/** FR-2.5/2.6/2.9 — newest first, filterable by channel, problem events
 * highlighted, agent calls never show a transcript, and conversation
 * text/agent names stay behind the role gates from `auth/permissions.ts`.
 *
 * v40 (F12): every row carries its grey `EV-n` tag and one `SG-n` button per signal the event produced (opens the signal
 * detail dialog). Each row is an anchor: `id="EV-12"` (so `#EV-12` works) and `data-ev`. The row named by `?ev=EV-12` (a Trace
 * id on another page) is highlighted, scrolled into view, focused (a visible focus ring) and announced politely to screen readers. */
export function Timeline({ interactions }: { interactions: Interaction[] }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: directory } = useAgentDirectory()
  const { data: allSignals } = useSignalsAll()
  const [params] = useSearchParams()
  const targetEvent = params.get('ev')
  const targetRef = useRef<HTMLLIElement>(null)
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelId>('all')

  // event id -> the signals it produced (a public mention has no events, so it never appears here)
  const signalsByEvent = useMemo(() => {
    const map = new Map<string, Signal[]>()
    for (const s of allSignals ?? []) for (const e of s.eventIds) map.set(e, [...(map.get(e) ?? []), s])
    return map
  }, [allSignals])

  const usedChannels = useMemo(() => ALL_CHANNELS.filter((c) => interactions.some((i) => i.channel === c)), [interactions])
  const sorted = useMemo(
    () =>
      [...interactions]
        .filter((i) => channelFilter === 'all' || i.channel === channelFilter)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [interactions, channelFilter],
  )
  const canSeeText = canViewConversationText(role.id)
  const canSeeAgents = canViewAgentNames(role.id)
  const isTarget = (i: Interaction) => !!targetEvent && (targetEvent === evId(i.id) || targetEvent === i.id)
  const hasTarget = interactions.some(isTarget)
  useScrollToTarget(targetRef, hasTarget, 'center')
  // The row takes focus without scrolling (the hook above keeps it in view), so a keyboard user starts from the event.
  useEffect(() => {
    if (hasTarget) targetRef.current?.focus({ preventScroll: true })
  }, [hasTarget, targetEvent])
  const targetInteraction = hasTarget ? interactions.find(isTarget) : undefined

  return (
    <SectionCard
      title={t('Timeline', 'الجدول الزمني')}
      description={t('Every channel on one line, newest first. Red marks a problem the rules found.', 'كل القنوات على خط واحد، الأحدث أولاً. الأحمر يعني مشكلة رصدتها القواعد.')}
      actions={
        <>
          <label htmlFor="timeline-channel" className="sr-only">
            {t('Channel', 'القناة')}
          </label>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as 'all' | ChannelId)}>
            <SelectTrigger id="timeline-channel" className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All channels', 'كل القنوات')}</SelectItem>
              {usedChannels.map((c) => (
                <SelectItem key={c} value={c}>
                  {L(CHANNEL_LABEL[c])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    >
      <p aria-live="polite" aria-atomic="true" data-testid="timeline-live" className="sr-only">
        {targetInteraction ? t(`Event ${evId(targetInteraction.id)} is highlighted in the timeline.`, `الحدث ${evId(targetInteraction.id)} مُظلَّل في الجدول الزمني.`) : ''}
      </p>
      {!sorted.length ? (
        <EmptyState title={t('No interactions on this channel.', 'لا توجد تفاعلات على هذه القناة.')} />
      ) : (
        <ol className="flex flex-col gap-2.5">
          {sorted.map((i) => {
            const agent = directory ? resolveAgentDisplay(i.agentRef, role.id, directory, { en: 'Agent', ar: 'وكيل' }, lang) : null
            const hasProblem = i.problemFlags.length > 0
            const isPublic = PUBLIC_CHANNELS.has(i.channel)
            const Icon = CHANNEL_ICON[i.channel]
            const when = new Date(i.occurredAt)
            const target = isTarget(i)
            const produced = signalsByEvent.get(i.id) ?? []
            return (
              <li
                key={i.id}
                ref={target ? targetRef : undefined}
                id={evId(i.id)}
                data-ev={evId(i.id)}
                data-trace-id={evId(i.id)}
                data-highlighted={target ? 'true' : undefined}
                tabIndex={target ? -1 : undefined}
                // an event is a well; the one named by ?ev= is the selected row (the 1.5px ink ring), and takes the focus ring when focused
                className={cn('flex scroll-mt-24 gap-3 rounded-well bg-well px-4 py-3.5', target && 'ring-selected')}
              >
                {/* the channel icon in a 30px circle: dark material for an event the rules flagged; a 6px status dot at its corner (red = problem, blue = public channel) */}
                <span aria-hidden className={cn('relative inline-grid size-[30px] shrink-0 place-items-center rounded-full', hasProblem ? 'material-dark' : 'material-light')}>
                  <Icon className="size-4" />
                  {(hasProblem || isPublic) && <span className={cn('dot absolute -end-px -top-px ring-2 ring-(--surface-well)', hasProblem ? 'dot-error' : 'dot-info')} />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <TraceId kind="event" id={i.id} plain />
                    {produced.map((s) => (
                      <TraceId key={s.id} kind="signal" id={s.id} />
                    ))}
                    <span className="t-small-strong">{L(CHANNEL_LABEL[i.channel])}</span>
                    <time dateTime={i.occurredAt} className="tabular text-muted-foreground">
                      {when.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                      {when.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {i.direction === 'inbound' ? (
                        <ArrowDownLeft aria-hidden className="size-3.5 rtl:-scale-x-100" />
                      ) : (
                        <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
                      )}
                      {i.direction === 'inbound' ? t('Customer-started', 'بدأه العميل') : t('PSI-started', 'بدأته PSI')}
                    </span>
                    {canSeeAgents && agent?.visible && <span className="text-muted-foreground">· {agent.label}</span>}
                  </div>
                  {i.reason && <p className="text-sm text-foreground">{i.reason}</p>}
                  {i.outcome && <p className="text-sm text-muted-foreground">{t('Outcome', 'النتيجة')}: {i.outcome}</p>}
                  {i.promiseDueAt && (
                    <p className="text-sm text-muted-foreground">
                      {t('Promise due', 'موعد الوعد')}{' '}
                      <time dateTime={i.promiseDueAt} className="tabular">
                        {new Date(i.promiseDueAt).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </time>
                      {' · '}
                      {i.promiseKept ? t('kept', 'نُفِّذ') : t('not kept', 'لم يُنفَّذ')}
                    </p>
                  )}
                  {i.channel === 'call' ? (
                    <p className="inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                      <PhoneOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      {t('Call — fact, time, reason and result only, never a recording or transcript.', 'مكالمة — الواقعة والوقت والسبب والنتيجة فقط، دون تسجيل أو نص.')}
                    </p>
                  ) : (
                    canSeeText && i.text && (
                      <blockquote dir="auto" className="rounded-xl bg-card px-3.5 py-2.5 text-start text-sm text-muted-foreground shadow-hairline">
                        {i.text}
                      </blockquote>
                    )
                  )}
                  {(hasProblem || i.promiseKept === false) && (
                    <div className="flex flex-wrap gap-1.5">
                      {i.problemFlags.map((f) => {
                        const rule = JOURNEY_RULES.find((r) => r.id === f)
                        return (
                          <span key={f} title={rule ? L(rule.definition) : undefined}>
                            <StatusBadge tone="danger">{rule ? L(rule.label) : f}</StatusBadge>
                          </span>
                        )
                      })}
                      {i.promiseKept === false && <StatusBadge tone="warning">{t('Promise not kept', 'وعد لم يُنفَّذ')}</StatusBadge>}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </SectionCard>
  )
}
