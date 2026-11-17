import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { canViewAgentNames, canViewConversationText, resolveAgentDisplay } from '../../auth/permissions'
import { useAgentDirectory } from '../../services/queries'
import { JOURNEY_RULES } from '../../utils/journeyRules'
import { SourceBadge } from './SourceBadge'
import type { ChannelId, Interaction } from '../../types'

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
    <div className="card">
      <div className="card-head">
        <h2>{t('Timeline', 'الجدول الزمني')}</h2>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as 'all' | ChannelId)}>
          <option value="all">{t('All channels', 'كل القنوات')}</option>
          {usedChannels.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="col" style={{ gap: 2 }}>
        {sorted.map((i) => {
          const agent = directory ? resolveAgentDisplay(i.agentRef, role.id, directory, { en: 'Agent', ar: 'وكيل' }, lang) : null
          const hasProblem = i.problemFlags.length > 0
          return (
            <div
              key={i.id}
              className="row between"
              style={{ padding: '8px 6px', borderInlineStart: `3px solid ${hasProblem ? 'var(--crit)' : 'transparent'}`, alignItems: 'flex-start', gap: 10 }}
            >
              <div className="col" style={{ gap: 4, flex: 1 }}>
                <div className="row" style={{ gap: 8 }}>
                  <SourceBadge channel={i.channel} />
                  <span className="text-sm muted">{new Date(i.occurredAt).toLocaleString(lang)}</span>
                  <span className="text-sm muted">{i.direction === 'inbound' ? t('Customer-started', 'بدأه العميل') : t('PSI-started', 'بدأته PSI')}</span>
                  {canSeeAgents && agent?.visible && <span className="text-sm muted">{agent.label}</span>}
                </div>
                {i.reason && <span className="text-sm">{i.reason}</span>}
                {i.channel === 'call' ? (
                  <span className="text-sm muted">
                    {t('Call — fact, time, reason and result only, never a recording or transcript.', 'مكالمة — الواقعة والوقت والسبب والنتيجة فقط، دون تسجيل أو نص.')}
                  </span>
                ) : (
                  canSeeText && i.text && <span className="text-sm muted">&ldquo;{i.text}&rdquo;</span>
                )}
                {hasProblem && (
                  <div className="row" style={{ gap: 4 }}>
                    {i.problemFlags.map((f) => {
                      const rule = JOURNEY_RULES.find((r) => r.id === f)
                      return (
                        <span key={f} className="chip crit" title={rule ? L(rule.definition) : undefined}>
                          {rule ? L(rule.label) : f}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
              {i.promiseKept === false && <span className="chip warn">{t('Promise not kept', 'وعد لم يُنفَّذ')}</span>}
            </div>
          )
        })}
        {!sorted.length && <div className="empty-state">{t('No interactions on this channel.', 'لا توجد تفاعلات على هذه القناة.')}</div>}
      </div>
    </div>
  )
}
