import { toast } from 'sonner'
import { Play, SquareCheck } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canStartCampaign } from '@/auth/permissions'
import { CAMPAIGN_AUDIT_COPY as COPY, type CampaignKind } from '@/data/campaignAudit'
import type { AuditCampaignView } from '@/services/mockCampaignAudit'
import { useCampaignGate, useFinishCampaign, useStartCampaign } from '@/services/campaignAuditQueries'
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
 * Start and finish of a campaign on the places that run one (Close the loop's AI interview campaigns). 23 Nov (owner): there is no
 * clearance before a run any more; the Internal Audit and Marketing Lead audits the results after the run (Marketing campaigns page).
 * A role that may run it (`canStartCampaign`) gets "Start campaign" before it runs and "Mark as finished" while it runs.
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
  /** Running and Finished tags. Off where the page already shows the stage (Close the loop's own status tag). */
  showStage?: boolean
  className?: string
}) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { campaign } = useCampaignGate(sourceId)
  const start = useStartCampaign()
  const finish = useFinishCampaign()
  if (!campaign) return null
  const mayRun = canStartCampaign(role.id, kind)

  return (
    <div data-slot="campaign-gate" data-testid={`campaign-gate-${sourceId}`} data-stage={campaign.stage} className={cn('flex flex-col items-start gap-2', className)}>
      {showStage && campaign.stage !== 'before' && (
        <div className="flex flex-wrap items-center gap-2">
          {campaign.stage === 'running' && <StatusBadge tone="info">{L(COPY.gate.stageRunning)}</StatusBadge>}
          {campaign.stage === 'after' && <StatusBadge tone="neutral">{L(COPY.gate.stageAfter)}</StatusBadge>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {mayRun && campaign.stage === 'before' && (
          <Button
            size={compact ? 'xs' : 'sm'}
            loading={start.isPending}
            onClick={() =>
              start.mutate({ id: campaign.id }, { onSuccess: () => toast.success(L(COPY.gate.started)), onError: () => toast.error(t('Could not start the campaign.', 'تعذّر بدء الحملة.')) })
            }
          >
            <Play aria-hidden className="fill-current" />
            {L(COPY.gate.start)}
          </Button>
        )}
        {mayRun && campaign.stage === 'running' && (
          <Button size={compact ? 'xs' : 'sm'} variant="outline" loading={finish.isPending} onClick={() => finish.mutate({ id: campaign.id }, { onSuccess: () => toast.success(L(COPY.gate.finished)) })}>
            <SquareCheck aria-hidden />
            {L(COPY.gate.finish)}
          </Button>
        )}
      </div>
    </div>
  )
}

