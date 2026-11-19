import { useId } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Play, SquareCheck } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canOpenPage } from '@/auth/access'
import { canStartCampaign } from '@/auth/permissions'
import { CAMPAIGN_AUDIT_COPY as COPY, CAMPAIGN_AUDIT_PATH, checkById, type CampaignKind } from '@/data/campaignAudit'
import { CampaignAuditError, type AuditCampaignView } from '@/services/mockCampaignAudit'
import { useCampaignGate, useFinishCampaign, useStartCampaign } from '@/services/campaignAuditQueries'
import { failedCheckNames, startBlock } from '@/utils/campaignAudit'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'

/**
 * The clearance badge of a campaign: cleared by Internal Audit (quiet), waiting for clearance (tinted: it needs action), sent back (tinted).
 * Shared by Close the loop and Personas, so both say the same thing about the same campaign.
 */
export function ClearanceBadge({ clearance }: { clearance: AuditCampaignView['clearance'] }) {
  const { L } = useI18n()
  return clearance === 'cleared' ? (
    <StatusBadge tone="success">{L(COPY.gate.badgeCleared)}</StatusBadge>
  ) : clearance === 'sent_back' ? (
    <StatusBadge tone="danger">{L(COPY.gate.badgeSentBack)}</StatusBadge>
  ) : (
    <StatusBadge tone="warning">{L(COPY.gate.badgeWaiting)}</StatusBadge>
  )
}

/**
 * The gate on the places that run campaigns (v42.1 F33, Decision 4: nothing reaches a customer before the Internal Audit and Marketing
 * Lead has cleared it). It reads the campaign by its source id (an AI interview campaign's id on Close the loop, the persona's id on
 * Personas) and shows where it stands. A role that may start it (`canStartCampaign`) gets "Start campaign": pressable only when the
 * campaign is cleared, otherwise `aria-disabled` with the reason written beside it (and tied to the button with `aria-describedby`),
 * so a keyboard user keeps the focus and a screen reader hears why. A running campaign offers "Mark as finished"; a finished one nothing.
 * The data layer refuses a start that is not cleared as well (`campaignAuditStore.start`), so the button is not the only lock.
 *
 * @example <CampaignGate sourceId={campaign.id} kind="ai" />      <CampaignGate sourceId={persona.id} kind="persona" compact />
 */
export function CampaignGate({
  sourceId,
  kind,
  compact = false,
  showStage = true,
  className,
}: {
  sourceId: string
  kind: CampaignKind
  compact?: boolean
  /** Running and Finished tags beside the clearance. Off where the page already shows the stage (Close the loop's own status tag). */
  showStage?: boolean
  className?: string
}) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { campaign } = useCampaignGate(sourceId)
  const start = useStartCampaign()
  const finish = useFinishCampaign()
  const reasonId = useId()
  if (!campaign) return null

  const block = startBlock(campaign)
  const mayRun = canStartCampaign(role.id, kind)
  const failedNames = failedCheckNames(campaign.failed, (id) => L(checkById(id).title), lang)
  const reason = block === 'waiting' ? L(COPY.gate.blockedWaiting) : block === 'sent_back' ? L(COPY.gate.blockedSentBack(failedNames)) : null
  const audit = canOpenPage(role.id, CAMPAIGN_AUDIT_PATH)

  const onStart = () => {
    if (block) return
    start.mutate(
      { id: campaign.id },
      {
        onSuccess: () => toast.success(L(COPY.gate.started)),
        onError: (e) => toast.error(e instanceof CampaignAuditError && e.code === 'not_cleared' ? L(COPY.gate.blockedWaiting) : t('Could not start the campaign.', 'تعذّر بدء الحملة.')),
      },
    )
  }

  return (
    <div data-slot="campaign-gate" data-testid={`campaign-gate-${sourceId}`} data-clearance={campaign.clearance} data-stage={campaign.stage} className={cn('flex flex-col items-start gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <ClearanceBadge clearance={campaign.clearance} />
        {showStage && campaign.stage === 'running' && <StatusBadge tone="info">{L(COPY.gate.stageRunning)}</StatusBadge>}
        {showStage && campaign.stage === 'after' && <StatusBadge tone="neutral">{L(COPY.gate.stageAfter)}</StatusBadge>}
      </div>
      {campaign.stage === 'before' && reason && (
        <p id={reasonId} data-testid={`campaign-gate-reason-${sourceId}`} className={cn('max-w-[60ch] text-sm text-muted-foreground', compact && 'max-w-[34ch] text-xs')}>
          {reason}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {mayRun && campaign.stage === 'before' && (
          <Button size={compact ? 'xs' : 'sm'} aria-disabled={block ? true : undefined} aria-describedby={block ? reasonId : undefined} loading={start.isPending} onClick={onStart}>
            <Play aria-hidden className="fill-current" />
            {L(COPY.gate.start)}
          </Button>
        )}
        {mayRun && campaign.stage === 'running' && (
          <Button
            size={compact ? 'xs' : 'sm'}
            variant="outline"
            loading={finish.isPending}
            onClick={() => finish.mutate({ id: campaign.id }, { onSuccess: () => toast.success(L(COPY.gate.finished)) })}
          >
            <SquareCheck aria-hidden />
            {L(COPY.gate.finish)}
          </Button>
        )}
        {audit && (
          <Link to={`${CAMPAIGN_AUDIT_PATH}?campaign=${campaign.id}`} className="text-sm text-foreground underline underline-offset-4">
            {L(COPY.gate.seeAudit)}
            <span className="sr-only"> · {campaign.id}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
