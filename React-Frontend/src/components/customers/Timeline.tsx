import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, PhoneOff } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewAgentNames, canViewConversationText, resolveAgentDisplay } from '@/auth/permissions'
import { useAgentDirectory } from '@/services/queries'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import type { ChannelId, Interaction } from '@/types'
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
 * text/agent names stay behind the role gates from `auth/permissions.ts`. */
export function Timeline({ interactions }: { interactions: Interaction[] }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: directory } = useAgentDirectory()
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelId>('all')

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
      {!sorted.length ? (
        <EmptyState title={t('No interactions on this channel.', 'لا توجد تفاعلات على هذه القناة.')} />
      ) : (
        <ol className="relative flex flex-col">
          {sorted.map((i, idx) => {
            const agent = directory ? resolveAgentDisplay(i.agentRef, role.id, directory, { en: 'Agent', ar: 'وكيل' }, lang) : null
            const hasProblem = i.problemFlags.length > 0
            const Icon = CHANNEL_ICON[i.channel]
            const isLast = idx === sorted.length - 1
            const when = new Date(i.occurredAt)
            return (
              <li key={i.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && <span aria-hidden className="absolute start-4 top-9 bottom-0 w-px -translate-x-1/2 bg-border rtl:translate-x-1/2" />}
                <span
                  aria-hidden
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-card',
                    hasProblem
                      ? 'border-destructive text-danger-text'
                      : PUBLIC_CHANNELS.has(i.channel)
                        ? 'border-info/40 text-info-text'
                        : 'border-border text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg px-3 py-2',
                    hasProblem ? 'border border-destructive/25 bg-destructive/5' : 'bg-muted/40',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium">{L(CHANNEL_LABEL[i.channel])}</span>
                    <time dateTime={i.occurredAt} className="text-muted-foreground tabular-nums">
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
                  {i.reason && <p className="text-sm">{i.reason}</p>}
                  {i.channel === 'call' ? (
                    <p className="inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                      <PhoneOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      {t('Call — fact, time, reason and result only, never a recording or transcript.', 'مكالمة — الواقعة والوقت والسبب والنتيجة فقط، دون تسجيل أو نص.')}
                    </p>
                  ) : (
                    canSeeText && i.text && <blockquote dir="auto" className="border-s-2 border-border ps-3 text-start text-sm text-muted-foreground">{i.text}</blockquote>
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
