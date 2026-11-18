import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrainCircuit, ChevronDown } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { resolveAgentDisplay } from '@/auth/permissions'
import { WHO_DOES_WHAT } from '@/lib/agents'
import { AgentChip } from '@/components/common/AgentChip'
import { Button } from '@/components/ui/button'
import { useAgentDirectory, useCorrectiveRationale } from '@/services/queries'
import type { Pattern } from '@/types'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/** FR-4.2 — every action carries this panel: sources + dates, the rule that
 * fired with its threshold, where, who (role-gated), why this team, why
 * this action (recovery figure in full sentence form), and what the AI did
 * not do. Reads the AgentOutputEnvelope's `evidence`/`rulesApplied` fields
 * directly (NFR-7) rather than a bespoke shape.
 *
 * v40 (F33, S17): a line of agent chips under the heading: Agent 3 (counted it), Agent 5 when the AI made the suggestion,
 * "CX Supervisor: 6 checks passed", and a "Who does what" button to the AI team page (only for roles that may open it).
 * The chips carry the agent name in the active language. */
export function HowAiFoundThis({ actionId, pattern, aiMade = true }: { actionId: string; pattern?: Pattern; aiMade?: boolean }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const [open, setOpen] = useState(false)
  const { data: envelope } = useCorrectiveRationale(actionId)
  const { data: directory } = useAgentDirectory()
  const canSeeTeam = canAccessPath(role.id, '/intelligent-cx-team')

  const agentDisplay = pattern?.agentRef && directory
    ? resolveAgentDisplay(pattern.agentRef, role.id, directory, { en: 'Agent (name withheld)', ar: 'وكيل (الاسم محجوب)' }, lang)
    : null

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-muted/40">
      <CollapsibleTrigger className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-start outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <BrainCircuit aria-hidden className="size-4 text-primary" />
          {t('How the AI found this', 'كيف توصّل الذكاء الاصطناعي لهذا')}
        </span>
        <ChevronDown aria-hidden className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2" data-testid="found-agents">
        <AgentChip agent={3} />
        {aiMade && <AgentChip agent={5} />}
        <AgentChip agent="supervisor" />
        {canSeeTeam && (
          <Button variant="outline" size="sm" asChild className="h-7 px-2 text-xs">
            <Link to="/intelligent-cx-team">{L(WHO_DOES_WHAT)}</Link>
          </Button>
        )}
      </div>
      <CollapsibleContent className="px-3 pb-3">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 border-t pt-3 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
          <Row label={t('Where', 'أين')} value={pattern?.team ?? '—'} />
          <Row label={t('Who', 'من')} value={agentDisplay ? agentDisplay.label : t('Team-level, no single agent named', 'على مستوى الفريق، دون وكيل بعينه')} />
          <Row label={t('Rule that fired', 'القاعدة التي انطبقت')} value={envelope?.rulesApplied.join(', ') || '—'} mono />
          {envelope?.payload.whyThisTeam && <Row label={t('Why this team', 'لماذا هذا الفريق')} value={L(envelope.payload.whyThisTeam)} />}
          {pattern?.recoveryFigure && <Row label={t('Why this action', 'لماذا هذا الإجراء')} value={L(pattern.recoveryFigure)} />}
          {envelope?.payload.whatAiDidNotDo && <Row label={t('What the AI did not do', 'ما لم يقم به الذكاء الاصطناعي')} value={L(envelope.payload.whatAiDidNotDo)} />}
        </dl>
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{t('Sources', 'المصادر')}</span>
          <ul className="flex flex-col gap-1 ps-4 text-sm marker:text-muted-foreground [list-style:disc]">
            {envelope?.evidence.map((e) => (
              <li key={e.sourceId}>
                {L(e.summary)} <span className="text-muted-foreground">— {new Date(e.occurredAt).toLocaleDateString(lang)}</span>
              </li>
            ))}
            {!envelope?.evidence.length && <li className="text-muted-foreground">{t('No evidence recorded.', 'لا توجد أدلة مسجّلة.')}</li>}
          </ul>
        </div>
        {envelope && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('Confidence', 'مستوى الثقة')}: <bdi dir="ltr" className="font-medium text-foreground tabular-nums">{Math.round(envelope.confidence * 100)}%</bdi>
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-foreground', mono && 'font-mono text-xs')}>{value}</dd>
    </>
  )
}
