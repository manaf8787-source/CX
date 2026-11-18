// FOUNDATION STUB: owner = workstream C (a working table over `usePublicMentions` and `useMarkReplied`: C finishes the design, filters and the owner badge).
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canMarkMentionReplied } from '@/auth/permissions'
import { usePublicMentions } from '@/services/referenceQueries'
import { useMarkReplied, useRules } from '@/services/queriesV40'
import { PUBLIC_MENTIONS_COPY as COPY, replyLabel, replyState } from '@/data/publicMentions'
import { envNameFromShort } from '@/data/environments'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SubPageHeader } from './SubPageHeader'

export default function PublicMentions() {
  const { L, t } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const rules = useRules()
  const { data: mentions, isLoading } = usePublicMentions()
  const markReplied = useMarkReplied()
  const canReply = canMarkMentionReplied(role.id)
  const c = COPY.columns
  const sorted = [...(mentions ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const tone = (s: number) => (s < 0 ? COPY.tone.negative : s > 0 ? COPY.tone.positive : COPY.tone.neutral)

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro(rules.publicReplyHours))} />
      {isLoading || !mentions ? (
        <LoadingState rows={6} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{L(c.date)}</TableHead>
              <TableHead>{L(c.channel)}</TableHead>
              <TableHead>{L(c.mention)}</TableHead>
              <TableHead>{L(c.tone)}</TableHead>
              <TableHead>{L(c.reply)}</TableHead>
              <TableHead>{L(c.identified)}</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-2">{L(c.owner)} <ProposedBadge /></span>
              </TableHead>
              <TableHead>
                <span className="sr-only">{L(COPY.action)}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m) => {
              const state = replyState(m, now, rules.publicReplyHours)
              return (
                <TableRow key={m.id}>
                  <TableCell className="tabular-nums"><bdi dir="ltr">{m.date}</bdi></TableCell>
                  <TableCell>
                    {m.platform} · {L(envNameFromShort(m.environment))}
                  </TableCell>
                  <TableCell className="whitespace-normal">{m.text}</TableCell>
                  <TableCell>{L(tone(m.sentiment))}</TableCell>
                  <TableCell>
                    <StatusBadge tone={state === 'replied' ? 'success' : state === 'overdue' ? 'danger' : 'warning'}>{L(replyLabel(m, now, rules.publicReplyHours))}</StatusBadge>
                  </TableCell>
                  <TableCell>{m.becameIdentified ? L(COPY.identified[m.channelMovedTo ?? 'private']) : '–'}</TableCell>
                  <TableCell>{L(m.owner)}</TableCell>
                  <TableCell>
                    {canReply && !m.replied && (
                      <Button size="sm" variant="outline" onClick={() => markReplied.mutate({ id: m.id }, { onSuccess: () => toast(t('Marked replied; the index updates.', 'عُلّم كمردود؛ يتحدث المؤشر.')) })}>
                        {L(COPY.action)}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
