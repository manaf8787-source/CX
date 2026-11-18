import { latency, mock } from './mockStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  TRAINING_MATERIALS,
  TRAINING_SESSIONS,
  type RegisterStatus,
} from '../data/v38Reference'
import type { CampaignBriefDraft, PlanLine } from '../components/ai/assistantIntents'
import type { Bi, CorrectiveAction, CorrectiveActionKind, Investigation } from '../types'
import { isTopManagementTitle } from '../auth/permissions'
import { useRole } from '../auth/RoleContext'
import { useEnvScope } from './envScope'
import { inEnvScope, envIdFromShort } from '../data/environments'
import { auditEntry, proposedStamp } from '../utils/audit'
import { invId } from '../utils/trace'
import { suggestionSentence, type InsightSuggestion } from '../data/insightSuggestions'

/**
 * Same repository seam as `queries.ts` (each fetch is the call a real API
 * replaces later), for the v38 reference data transcribed in
 * `data/v38Reference.ts` and the assistant's plan / campaign outputs.
 */

const LATENCY_MS = 150

async function read<T>(value: T): Promise<T> {
  await latency(LATENCY_MS)
  return value
}

export const useStandardsRegister = () => useQuery({ queryKey: ['standards-register'], queryFn: () => read(STANDARDS_REGISTER) })
/** v40 (F30): a mutable list (`useMarkReplied` in queriesV40.ts), returned as copies so a change re-renders; narrowed by the environment switch. */
export const usePublicMentions = () => {
  const { env } = useEnvScope()
  return useQuery({
    queryKey: ['public-mentions', env],
    queryFn: () => read(PUBLIC_MENTIONS.filter((m) => env === 'all' || inEnvScope(env, envIdFromShort(m.environment) ?? env)).map((m) => ({ ...m }))),
  })
}
export const useNpsTrend = () => useQuery({ queryKey: ['nps-trend'], queryFn: () => read(NPS_TREND) })
export const useDetractorReasons = () => useQuery({ queryKey: ['detractor-reasons'], queryFn: () => read(DETRACTOR_REASONS) })
export const useSurveyInstruments = () => useQuery({ queryKey: ['survey-instruments'], queryFn: () => read(SURVEY_INSTRUMENTS) })
export const useSurveyDelivery = () => useQuery({ queryKey: ['survey-delivery'], queryFn: () => read(SURVEY_DELIVERY_LAST_MONTH) })
export const useProductSurveyRules = () => useQuery({ queryKey: ['product-survey-rules'], queryFn: () => read(PRODUCT_SURVEY_RULES) })
export const useProductRouting = () => useQuery({ queryKey: ['product-routing'], queryFn: () => read(PRODUCT_ROUTING) })
export const useCrmFields = () => useQuery({ queryKey: ['crm-fields'], queryFn: () => read(CRM_FIELDS) })
/** Copies of the agent job descriptions; `approvalPct` already carries the weekly sample's "wrong" verdicts. */
export const useAgentJobDescriptions = () => useQuery({ queryKey: ['agent-jds'], queryFn: () => read(AGENT_JDS.map((j) => ({ ...j }))) })

/** KB §15: only the CX manager approves a standard for scoring. */
export function useSetRegisterStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { code: string; status: RegisterStatus }) => {
      await latency(LATENCY_MS)
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
      await latency(LATENCY_MS)
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
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { plan: PlanLine[]; scope: Bi }) => {
      await latency(LATENCY_MS)
      const created: CorrectiveAction[] = input.plan.map((line, k) => ({
        id: `ca-${mock.MOCK_CORRECTIVE_ACTIONS.length + 1 + k}`,
        kind: line.kind,
        title: { en: `Fix "${line.fault.en}" for ${input.scope.en}`, ar: `معالجة "${line.fault.ar}" لـ ${input.scope.ar}` },
        owner: line.owner.en,
        dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        status: 'proposed',
        verificationDueAt: new Date(Date.now() + 74 * 86_400_000).toISOString(),
        ...proposedStamp({ product: 're', byRole: role.id, note: { en: 'Proposed from the assistant’s plan', ar: 'اقتُرح من خطة المساعد' } }),
      }))
      mock.MOCK_CORRECTIVE_ACTIONS.push(...created)
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      qc.invalidateQueries({ queryKey: ['home-summary'] })
    },
  })
}

/** KB §6: an AI Insights suggestion becomes a *proposed* corrective action.
 * It is a suggestion a person approves: status starts at "proposed", the
 * receiver is a title (never top management), and nothing is approved here. */
export function useProposeFromInsight() {
  const qc = useQueryClient()
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { insightSubjectId: string; suggestion: InsightSuggestion; environment: string; kind: CorrectiveActionKind; owner: string; dueDate: string }) => {
      await latency(LATENCY_MS)
      if (isTopManagementTitle(input.owner)) throw new Error('The receiver is the person who can fix it, never top management.')
      const exists = mock.MOCK_CORRECTIVE_ACTIONS.find(
        (a) => a.fromInsight?.subjectId === input.insightSubjectId && a.fromInsight.suggestionId === input.suggestion.id,
      )
      if (exists) return exists
      const action: CorrectiveAction = {
        id: `ca-${mock.MOCK_CORRECTIVE_ACTIONS.length + 1}`,
        kind: input.kind,
        title: { en: `${input.suggestion.text.en} (${input.environment})`, ar: `${input.suggestion.text.ar} (${input.environment})` },
        owner: input.owner,
        dueDate: new Date(`${input.dueDate}T12:00:00`).toISOString(),
        status: 'proposed',
        verificationDueAt: new Date(new Date(`${input.dueDate}T12:00:00`).getTime() + 60 * 86_400_000).toISOString(),
        ...proposedStamp({ product: 're', byRole: role.id, note: { en: 'Proposed from an AI Insights suggestion', ar: 'اقتُرح من اقتراح رؤى الذكاء الاصطناعي' } }),
        envId: envIdFromShort(input.environment),
        fromInsight: { subjectId: input.insightSubjectId, suggestionId: input.suggestion.id, recovery: suggestionSentence(input.suggestion) },
      }
      mock.MOCK_CORRECTIVE_ACTIONS.push(action)
      return action
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
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { actionId: string; patternId?: string; environment?: string; reason?: string }) => {
      await latency(LATENCY_MS)
      const action = mock.MOCK_CORRECTIVE_ACTIONS.find((a) => a.id === input.actionId)
      if (!action) throw new Error('Action not found')
      action.decision = undefined
      action.decisionReason = input.reason ? { en: input.reason, ar: input.reason } : undefined
      action.sentToInvestigation = true
      const inv: Investigation = {
        id: `inv-${mock.MOCK_INVESTIGATIONS.length + 1}`,
        patternId: input.patternId,
        kind: 'customer_interviews',
        requestedCount: 5,
        environment: input.environment,
        status: 'requested',
      }
      mock.MOCK_INVESTIGATIONS.push(inv)
      // v40 (F21): the decision to investigate is an audit line too.
      action.auditLog.push(auditEntry(role.id, { en: `Sent to investigation ${invId(inv.id)}`, ar: `أُرسل إلى التحقيق ${invId(inv.id)}` }))
      return inv
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      qc.invalidateQueries({ queryKey: ['investigations'] })
    },
  })
}

export const useTrainingMaterials = () => useQuery({ queryKey: ['training-materials'], queryFn: () => read(TRAINING_MATERIALS) })
export const useTrainingSessions = () => useQuery({ queryKey: ['training-sessions'], queryFn: () => read(TRAINING_SESSIONS) })

// --- Settings: notices and digests (KB §15; prototype "Notices and digests") ---

export type DigestFrequency = 'weekly' | 'daily' | 'off'

export interface HeadNotice {
  productId: 're' | 'af' | 'cl' | 'to' | 'ev'
  /** Titles only, never names. Heads are informed, never given a task. */
  informed: Bi
  digest: DigestFrequency
  /** Immediate alert only for a high-priority case past its SLA, or a pattern. */
  immediateAlert: boolean
}

/** Transcribed from the v38 prototype (`INFORM` and its defaults). PSI Wallet
 * has no row there; it stays "awaiting decision" in the UI. */
const HEAD_NOTICES: HeadNotice[] = [
  { productId: 're', informed: { en: 'Head of Sales', ar: 'رئيس المبيعات' }, digest: 'weekly', immediateAlert: true },
  { productId: 'af', informed: { en: 'Head of After-Sales', ar: 'رئيس ما بعد البيع' }, digest: 'weekly', immediateAlert: true },
  { productId: 'cl', informed: { en: 'Head of Club and Tours', ar: 'رئيس النادي والجولات' }, digest: 'weekly', immediateAlert: true },
  { productId: 'to', informed: { en: 'Head of Club and Tours', ar: 'رئيس النادي والجولات' }, digest: 'weekly', immediateAlert: true },
  { productId: 'ev', informed: { en: 'Head of Events', ar: 'رئيس الفعاليات' }, digest: 'weekly', immediateAlert: true },
]

export const useHeadNotices = () => useQuery({ queryKey: ['head-notices'], queryFn: () => read(HEAD_NOTICES.map((n) => ({ ...n }))) })

/** Only the CX manager changes notices; the page enforces it, and so does this mutation's caller. */
export function useUpdateHeadNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { productId: HeadNotice['productId']; digest?: DigestFrequency; immediateAlert?: boolean }) => {
      await latency(LATENCY_MS)
      const n = HEAD_NOTICES.find((x) => x.productId === input.productId)
      if (!n) throw new Error('Notice not found')
      if (input.digest) n.digest = input.digest
      if (input.immediateAlert !== undefined) n.immediateAlert = input.immediateAlert
      return { ...n }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['head-notices'] }),
  })
}
