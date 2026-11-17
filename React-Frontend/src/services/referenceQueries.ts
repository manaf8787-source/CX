import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MOCK_CORRECTIVE_ACTIONS, MOCK_INVESTIGATIONS } from './mockData'
import { sleep } from '../utils/random'
import {
  AGENT_JDS,
  CRM_FIELDS,
  DETRACTOR_REASONS,
  NPS_TREND,
  PRODUCT_ROUTING,
  PRODUCT_SURVEY_RULES,
  PUBLIC_MENTIONS,
  STANDARDS_REGISTER,
  SURVEY_DELIVERY_LAST_MONTH,
  SURVEY_INSTRUMENTS,
  type RegisterStatus,
} from '../data/v38Reference'
import type { CampaignBriefDraft, PlanLine } from '../components/ai/assistantIntents'
import type { Bi, CorrectiveAction, Investigation } from '../types'

/**
 * Same repository seam as `queries.ts` (each fetch is the call a real API
 * replaces later), for the v38 reference data transcribed in
 * `data/v38Reference.ts` and the assistant's plan / campaign outputs.
 */

const LATENCY_MS = 150

async function read<T>(value: T): Promise<T> {
  await sleep(LATENCY_MS)
  return value
}

export const useStandardsRegister = () => useQuery({ queryKey: ['standards-register'], queryFn: () => read(STANDARDS_REGISTER) })
export const usePublicMentions = () => useQuery({ queryKey: ['public-mentions'], queryFn: () => read(PUBLIC_MENTIONS) })
export const useNpsTrend = () => useQuery({ queryKey: ['nps-trend'], queryFn: () => read(NPS_TREND) })
export const useDetractorReasons = () => useQuery({ queryKey: ['detractor-reasons'], queryFn: () => read(DETRACTOR_REASONS) })
export const useSurveyInstruments = () => useQuery({ queryKey: ['survey-instruments'], queryFn: () => read(SURVEY_INSTRUMENTS) })
export const useSurveyDelivery = () => useQuery({ queryKey: ['survey-delivery'], queryFn: () => read(SURVEY_DELIVERY_LAST_MONTH) })
export const useProductSurveyRules = () => useQuery({ queryKey: ['product-survey-rules'], queryFn: () => read(PRODUCT_SURVEY_RULES) })
export const useProductRouting = () => useQuery({ queryKey: ['product-routing'], queryFn: () => read(PRODUCT_ROUTING) })
export const useCrmFields = () => useQuery({ queryKey: ['crm-fields'], queryFn: () => read(CRM_FIELDS) })
export const useAgentJobDescriptions = () => useQuery({ queryKey: ['agent-jds'], queryFn: () => read(AGENT_JDS) })

/** KB §15: only the CX manager approves a standard for scoring. */
export function useSetRegisterStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { code: string; status: RegisterStatus }) => {
      await sleep(LATENCY_MS)
      const s = STANDARDS_REGISTER.find((x) => x.code === input.code)
      if (!s) throw new Error('Standard not found')
      s.status = input.status
      return s
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standards-register'] }),
  })
}

// --- Assistant outputs (KB §13) ---------------------------------------------

export interface SavedCampaignBrief extends CampaignBriefDraft {
  id: string
  savedAt: string
  savedBy: Bi
}

const CAMPAIGN_BRIEFS: SavedCampaignBrief[] = []

export const useCampaignBriefs = () => useQuery({ queryKey: ['campaign-briefs'], queryFn: () => read([...CAMPAIGN_BRIEFS]) })

/** "A button that saves it for Marketing." */
export function useSaveCampaignBrief() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { brief: CampaignBriefDraft; savedBy: Bi }) => {
      await sleep(LATENCY_MS)
      const saved: SavedCampaignBrief = { ...input.brief, id: `brief-${CAMPAIGN_BRIEFS.length + 1}`, savedAt: new Date().toISOString(), savedBy: input.savedBy }
      CAMPAIGN_BRIEFS.unshift(saved)
      return saved
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-briefs'] }),
  })
}

/** "A button that creates them as proposed actions" — proposed only; the
 * owner still approves, changes, rejects or investigates (KB §1). */
export function useCreateProposedActions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { plan: PlanLine[]; scope: Bi }) => {
      await sleep(LATENCY_MS)
      const created: CorrectiveAction[] = input.plan.map((line, k) => ({
        id: `ca-${MOCK_CORRECTIVE_ACTIONS.length + 1 + k}`,
        kind: line.kind,
        title: { en: `Fix "${line.fault.en}" for ${input.scope.en}`, ar: `معالجة "${line.fault.ar}" لـ ${input.scope.ar}` },
        owner: line.owner.en,
        dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        status: 'proposed',
        verificationDueAt: new Date(Date.now() + 74 * 86_400_000).toISOString(),
      }))
      MOCK_CORRECTIVE_ACTIONS.push(...created)
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      qc.invalidateQueries({ queryKey: ['home-summary'] })
    },
  })
}

/** KB §6: the manager may "ask for an investigation first" instead of deciding. */
export function useSendToInvestigation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { actionId: string; patternId?: string; environment?: string; reason?: string }) => {
      await sleep(LATENCY_MS)
      const action = MOCK_CORRECTIVE_ACTIONS.find((a) => a.id === input.actionId)
      if (!action) throw new Error('Action not found')
      action.decision = undefined
      action.decisionReason = input.reason ? { en: input.reason, ar: input.reason } : undefined
      action.sentToInvestigation = true
      const inv: Investigation = {
        id: `inv-${MOCK_INVESTIGATIONS.length + 1}`,
        patternId: input.patternId,
        kind: 'customer_interviews',
        requestedCount: 5,
        environment: input.environment,
        status: 'requested',
      }
      MOCK_INVESTIGATIONS.push(inv)
      return inv
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      qc.invalidateQueries({ queryKey: ['investigations'] })
    },
  })
}
