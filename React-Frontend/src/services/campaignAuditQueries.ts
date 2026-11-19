import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { latency, mock } from './mockStore'
import { createCampaignAuditStore, type AuditCampaignView } from './mockCampaignAudit'
import { buildAuditCampaigns, type CheckId, type Verdict } from '../data/campaignAudit'
import { summariseCampaignAudit, type CampaignAuditSummary } from '../utils/campaignAudit'
import { useRole } from '../auth/RoleContext'

/**
 * Hooks for the campaign audit (v42.1, F33). Same repository seam as `queries.ts`: the store in `mockCampaignAudit.ts` is what a real API
 * replaces, components call the `use*` hooks only. The register is built from the personas and the AI interview campaigns, so a campaign
 * the CX team creates later shows up as "waiting for clearance" (`useCreateAiCampaign` refreshes this list).
 */

const LATENCY_MS = 150

export const CAMPAIGN_AUDIT_KEY = ['campaign-audit'] as const

/** The one register of the app (it lives as long as the page does, like the `MOCK_*` arrays). An AI campaign's status follows its stage. */
export const campaignAuditStore = createCampaignAuditStore(() => buildAuditCampaigns(mock.MOCK_PERSONAS, mock.MOCK_AI_CAMPAIGNS), {
  onStage: (campaign, stage) => {
    if (campaign.kind !== 'ai') return
    const ai = mock.MOCK_AI_CAMPAIGNS.find((c) => c.id === campaign.sourceId)
    if (ai) ai.status = stage === 'running' ? 'running' : stage === 'after' ? 'closed' : 'draft'
  },
})

/** Every campaign with its checks, verdict and stage. `enabled: false` for a role that does not read it (the inbox and the brief ask only for the audit lead). */
export function useCampaignAudit({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: CAMPAIGN_AUDIT_KEY,
    enabled,
    queryFn: async (): Promise<AuditCampaignView[]> => {
      await latency(LATENCY_MS)
      return campaignAuditStore.list()
    },
  })
}

/** The counts of the inbox and the brief, from the same list the page shows. */
export function useCampaignAuditSummary({ enabled = true }: { enabled?: boolean } = {}): { data: CampaignAuditSummary | undefined; isLoading: boolean; dataUpdatedAt: number } {
  const { data, isLoading, dataUpdatedAt } = useCampaignAudit({ enabled })
  const summary = useMemo(() => (data ? summariseCampaignAudit(data) : undefined), [data])
  return { data: summary, isLoading, dataUpdatedAt }
}

/** One campaign by its source id (the persona id of a Marketing campaign, the id of an AI interview campaign). Undefined while loading or unknown. */
export function useCampaignGate(sourceId: string | undefined): { campaign: AuditCampaignView | undefined; isLoading: boolean } {
  const { data, isLoading } = useCampaignAudit()
  return { campaign: sourceId ? data?.find((c) => c.sourceId === sourceId) : undefined, isLoading }
}

/** Puts the updated campaign into the cached list at once, so the page and every count change before any refetch. */
function useSyncCampaign() {
  const qc = useQueryClient()
  return (updated: AuditCampaignView) => {
    qc.setQueryData<AuditCampaignView[]>(CAMPAIGN_AUDIT_KEY, (list) => (list ? list.map((c) => (c.id === updated.id ? updated : c)) : list))
    // an AI campaign's own status (draft, running, closed) follows its stage: Close the loop reads it from `ai-campaigns`
    if (updated.kind === 'ai') qc.invalidateQueries({ queryKey: ['ai-campaigns'] })
  }
}

/** ✓ or ✗ on one check (`value: null` clears the mark). The Internal Audit and Marketing Lead and the CX manager only. A changed check withdraws the verdict. */
export function useSetCampaignCheck() {
  const { role } = useRole()
  const sync = useSyncCampaign()
  return useMutation({
    mutationFn: async (input: { id: string; check: CheckId; value: boolean | null }) => {
      await latency(LATENCY_MS)
      return campaignAuditStore.setCheck({ ...input, by: role.id })
    },
    onSuccess: sync,
  })
}

/** "Cleared to run" (all five passed) or "Send back" (at least one failed). */
export function useSetCampaignVerdict() {
  const { role } = useRole()
  const sync = useSyncCampaign()
  return useMutation({
    mutationFn: async (input: { id: string; verdict: Verdict }) => {
      await latency(LATENCY_MS)
      return campaignAuditStore.setVerdict({ ...input, by: role.id })
    },
    onSuccess: sync,
  })
}

/** Starts a campaign. Refuses one that is not cleared (`CampaignAuditError` with code `not_cleared`): nothing is sent before clearance. */
export function useStartCampaign() {
  const { role } = useRole()
  const sync = useSyncCampaign()
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      await latency(LATENCY_MS)
      return campaignAuditStore.start({ ...input, by: role.id })
    },
    onSuccess: sync,
  })
}

/** Marks a running campaign finished: its numbers are then audited after the run. */
export function useFinishCampaign() {
  const { role } = useRole()
  const sync = useSyncCampaign()
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      await latency(LATENCY_MS)
      return campaignAuditStore.finish({ ...input, by: role.id })
    },
    onSuccess: sync,
  })
}
