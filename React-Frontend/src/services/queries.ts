import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MOCK_AGENT_ACTIVITY,
  MOCK_AGENT_DIRECTORY,
  MOCK_AI_CAMPAIGNS,
  MOCK_AI_INSIGHTS,
  MOCK_AI_JOURNEY_READINGS,
  MOCK_CAMPAIGN_RECOMMENDATIONS,
  MOCK_CORRECTIVE_ACTIONS,
  MOCK_CORRECTIVE_RATIONALES,
  MOCK_DETRACTOR_CALL_ITEMS,
  MOCK_EFFORT_SUMMARIES,
  MOCK_HANDOFFS,
  MOCK_INTERACTIONS,
  MOCK_INVESTIGATIONS,
  MOCK_LEAD_FUNNEL,
  MOCK_PATTERNS,
  MOCK_PERSONAS,
  MOCK_PERSONS,
  MOCK_PRODUCT_SURVEY_MOMENTS,
  MOCK_SHOPPER_CASES,
  MOCK_SIGNALS,
  MOCK_SURVEY_TRIGGERS,
} from './mockData'
import { sleep } from '../utils/random'
import { isRecovered } from '../utils/closeTheLoop'
import type { AiInterviewCampaign, Bi, CorrectiveAction, CorrectiveActionKind, InterviewOutcome, Investigation, Pattern, ReasonCode, ShopperCase } from '../types'

/**
 * Repository-style fetch functions — each one is the exact seam a real API
 * call will replace later (IMPLEMENTATION_PLAN.md §4: "a clean
 * repository/adapter interface over a tightly-coupled mock"). Nothing above
 * this file should import `mockData.ts` directly; components call the
 * `use*` hooks below instead, so the data source is swappable without
 * touching a single component.
 */

const LATENCY_MS = 180

async function fetchPersons() {
  await sleep(LATENCY_MS)
  return MOCK_PERSONS
}

async function fetchPerson(id: string) {
  await sleep(LATENCY_MS)
  return MOCK_PERSONS.find((p) => p.id === id) ?? null
}

async function fetchInteractionsForPerson(personId: string) {
  await sleep(LATENCY_MS)
  return MOCK_INTERACTIONS.filter((i) => i.personKey === personId)
}

async function fetchEffortSummary(personId: string) {
  await sleep(LATENCY_MS)
  return MOCK_EFFORT_SUMMARIES.find((e) => e.personId === personId) ?? null
}

async function fetchSignals() {
  await sleep(LATENCY_MS)
  return MOCK_SIGNALS
}

async function fetchPatterns() {
  await sleep(LATENCY_MS)
  return MOCK_PATTERNS
}

async function fetchCorrectiveActions() {
  await sleep(LATENCY_MS)
  return MOCK_CORRECTIVE_ACTIONS
}

async function fetchShopperCases() {
  await sleep(LATENCY_MS)
  return MOCK_SHOPPER_CASES
}

async function fetchInvestigations() {
  await sleep(LATENCY_MS)
  return MOCK_INVESTIGATIONS
}

async function fetchDetractorCallItems() {
  await sleep(LATENCY_MS)
  return MOCK_DETRACTOR_CALL_ITEMS
}

async function fetchAllInteractions() {
  await sleep(LATENCY_MS)
  return MOCK_INTERACTIONS
}

async function fetchEffortSummaries() {
  await sleep(LATENCY_MS)
  return MOCK_EFFORT_SUMMARIES
}

async function fetchAiJourneyReading(personId: string) {
  await sleep(LATENCY_MS)
  return MOCK_AI_JOURNEY_READINGS.find((r) => r.personId === personId) ?? null
}

async function fetchAiCampaigns() {
  await sleep(LATENCY_MS)
  return MOCK_AI_CAMPAIGNS
}

async function fetchPersonas() {
  await sleep(LATENCY_MS)
  return MOCK_PERSONAS
}

async function fetchCampaignRecommendations() {
  await sleep(LATENCY_MS)
  return MOCK_CAMPAIGN_RECOMMENDATIONS
}

async function fetchSurveyTriggers() {
  await sleep(LATENCY_MS)
  return MOCK_SURVEY_TRIGGERS
}

async function fetchLeadFunnel() {
  await sleep(LATENCY_MS)
  return MOCK_LEAD_FUNNEL
}

async function fetchProductSurveyMoments() {
  await sleep(LATENCY_MS)
  return MOCK_PRODUCT_SURVEY_MOMENTS
}

async function fetchAgentDirectory() {
  await sleep(LATENCY_MS)
  return MOCK_AGENT_DIRECTORY
}

async function fetchHandoffs() {
  await sleep(LATENCY_MS)
  return MOCK_HANDOFFS
}

async function fetchAiInsights() {
  await sleep(LATENCY_MS)
  return MOCK_AI_INSIGHTS
}

async function fetchCorrectiveRationale(actionId: string) {
  await sleep(LATENCY_MS)
  return MOCK_CORRECTIVE_RATIONALES[actionId] ?? null
}

async function fetchAgentActivity() {
  await sleep(LATENCY_MS)
  return MOCK_AGENT_ACTIVITY
}

// --- Mutations -----------------------------------------------------------
// In-memory only (no backend yet, IMPLEMENTATION_PLAN.md §4): each mutation
// edits the mock array in place, by id, then the caller invalidates the
// affected query keys so every view re-reads the same updated record.

async function decideCorrectiveAction(input: { id: string; decision: 'approved' | 'modified' | 'rejected'; reason?: string }) {
  await sleep(LATENCY_MS)
  const action = MOCK_CORRECTIVE_ACTIONS.find((a) => a.id === input.id)
  if (!action) throw new Error('Corrective action not found')
  action.decision = input.decision
  action.decisionReason = { en: input.reason || '—', ar: input.reason || '—' }
  action.status = input.decision === 'approved' ? 'approved' : action.status
  return action
}

async function createActionFromPattern(input: { pattern: Pattern; kind: CorrectiveActionKind; owner: string; dueDate: string }) {
  await sleep(LATENCY_MS)
  const action: CorrectiveAction = {
    id: `ca-${MOCK_CORRECTIVE_ACTIONS.length + 1}`,
    kind: input.kind,
    patternId: input.pattern.id,
    title: { en: `Address ${input.pattern.category.replace(/_/g, ' ')} in ${input.pattern.team}`, ar: 'معالجة النمط المرصود لهذا الفريق' },
    owner: input.owner,
    dueDate: input.dueDate,
    status: 'proposed',
    verificationDueAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
  }
  MOCK_CORRECTIVE_ACTIONS.push(action)
  return action
}

async function decideShopperCaseAction(input: { caseId: string; n: number; decision: 'confirmed' | 'modified' | 'rejected' }) {
  await sleep(LATENCY_MS)
  const c = MOCK_SHOPPER_CASES.find((x) => x.id === input.caseId)
  if (!c) throw new Error('Shopper case not found')
  const line = c.proposedActions.find((p) => p.n === input.n)
  if (line) line.decision = input.decision
  if (input.decision !== 'confirmed') c.status = 'owner_decision'
  return c
}

async function advanceShopperCase(input: { caseId: string; status: ShopperCase['status'] }) {
  await sleep(LATENCY_MS)
  const c = MOCK_SHOPPER_CASES.find((x) => x.id === input.caseId)
  if (!c) throw new Error('Shopper case not found')
  c.status = input.status
  return c
}

async function requestInvestigation(input: { patternId: string; kind: Investigation['kind']; requestedCount?: number; environment?: string; scenario?: string }) {
  await sleep(LATENCY_MS)
  const inv: Investigation = {
    id: `inv-${MOCK_INVESTIGATIONS.length + 1}`,
    patternId: input.patternId,
    kind: input.kind,
    requestedCount: input.requestedCount,
    environment: input.environment,
    scenario: input.scenario ? { en: input.scenario, ar: input.scenario } : undefined,
    status: 'requested',
  }
  MOCK_INVESTIGATIONS.push(inv)
  return inv
}

async function returnInvestigation(input: { id: string; resultSummary: string }) {
  await sleep(LATENCY_MS)
  const inv = MOCK_INVESTIGATIONS.find((i) => i.id === input.id)
  if (!inv) throw new Error('Investigation not found')
  inv.status = 'returned'
  inv.resultSummary = { en: input.resultSummary, ar: input.resultSummary }
  return inv
}

/** FR-5.3 — records the four-question interview's reason code + outcome
 * against the detractor list item. "Declined" is read as "no retry" at
 * display time (`outcome === 'declined'`), not a separate stored flag. */
async function recordInterview(input: { id: string; reasonCode: ReasonCode; outcome: InterviewOutcome }) {
  await sleep(LATENCY_MS)
  const item = MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === input.id)
  if (!item) throw new Error('Detractor call item not found')
  item.reasonCode = input.reasonCode
  item.outcome = input.outcome
  return item
}

/** FR-5.4/5.5 — the 7–14 day re-survey's second score; sets `recoveredAt`
 * the moment `isRecovered` is met, so the recovery delta is derivable
 * straight from the record afterwards. */
async function recordResurvey(input: { id: string; secondScore: number }) {
  await sleep(LATENCY_MS)
  const item = MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === input.id)
  if (!item) throw new Error('Detractor call item not found')
  item.secondScore = input.secondScore
  if (isRecovered(item)) item.recoveredAt = new Date().toISOString()
  return item
}

/** FR-5.6 hard rule, enforced here in code (not only in the dialog that
 * collects members): a critical-severity item can never end up a campaign
 * member, even if something upstream passed one in. */
async function createAiCampaign(input: { name: Bi; segmentDescription: Bi; script: Bi; memberIds: string[] }) {
  await sleep(LATENCY_MS)
  const safeMemberIds = input.memberIds.filter((id) => MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === id)?.severity !== 'critical')
  const campaign: AiInterviewCampaign = {
    id: `camp-ai-${MOCK_AI_CAMPAIGNS.length + 1}`,
    name: input.name,
    segmentDescription: input.segmentDescription,
    script: input.script,
    status: 'draft',
    memberIds: safeMemberIds,
  }
  MOCK_AI_CAMPAIGNS.push(campaign)
  return campaign
}

/** FR-6.4 — "The CX manager names/approves personas." Mirrors
 * `decideCorrectiveAction`'s shape: approve, or reject with a reason that a
 * persona nobody can act on should carry (even though this mock layer does
 * not go as far as actually dropping the record). */
async function decidePersona(input: { id: string; decision: 'approved' | 'modified' | 'rejected'; reason?: string }) {
  await sleep(LATENCY_MS)
  const persona = MOCK_PERSONAS.find((p) => p.id === input.id)
  if (!persona) throw new Error('Persona not found')
  persona.approvedByCxManager = input.decision === 'approved'
  return persona
}

async function fetchHomeSummary() {
  await sleep(LATENCY_MS)
  const runawayCount = MOCK_EFFORT_SUMMARIES.filter((e) => e.daysSinceLastContact > 30).length
  const openActions = MOCK_CORRECTIVE_ACTIONS.filter((a) => a.status !== 'effective' && a.status !== 'failed').length
  return {
    runawayCount,
    openActions,
    personaCount: MOCK_PERSONAS.length,
    journeysViewed: MOCK_PERSONS.length,
    toCall: MOCK_DETRACTOR_CALL_ITEMS.filter((d) => !d.outcome).length || MOCK_DETRACTOR_CALL_ITEMS.length,
  }
}

// --- Hooks -------------------------------------------------------------

export const useHomeSummary = () => useQuery({ queryKey: ['home-summary'], queryFn: fetchHomeSummary })
export const usePersons = () => useQuery({ queryKey: ['persons'], queryFn: fetchPersons })
export const usePerson = (id: string) => useQuery({ queryKey: ['person', id], queryFn: () => fetchPerson(id), enabled: !!id })
export const usePersonInteractions = (personId: string) =>
  useQuery({ queryKey: ['interactions', personId], queryFn: () => fetchInteractionsForPerson(personId), enabled: !!personId })
export const usePersonEffort = (personId: string) =>
  useQuery({ queryKey: ['effort', personId], queryFn: () => fetchEffortSummary(personId), enabled: !!personId })
export const useSignals = () => useQuery({ queryKey: ['signals'], queryFn: fetchSignals })
export const usePatterns = () => useQuery({ queryKey: ['patterns'], queryFn: fetchPatterns })
export const useCorrectiveActions = () => useQuery({ queryKey: ['corrective-actions'], queryFn: fetchCorrectiveActions })
export const useShopperCases = () => useQuery({ queryKey: ['shopper-cases'], queryFn: fetchShopperCases })
export const useInvestigations = () => useQuery({ queryKey: ['investigations'], queryFn: fetchInvestigations })
export const useDetractorCallItems = () => useQuery({ queryKey: ['detractor-call-items'], queryFn: fetchDetractorCallItems })
export const useAllInteractions = () => useQuery({ queryKey: ['interactions-all'], queryFn: fetchAllInteractions })
export const useEffortSummaries = () => useQuery({ queryKey: ['effort-summaries'], queryFn: fetchEffortSummaries })
export const useAiJourneyReading = (personId: string) =>
  useQuery({ queryKey: ['ai-journey-reading', personId], queryFn: () => fetchAiJourneyReading(personId), enabled: !!personId })
export const useAiCampaigns = () => useQuery({ queryKey: ['ai-campaigns'], queryFn: fetchAiCampaigns })
export const usePersonas = () => useQuery({ queryKey: ['personas'], queryFn: fetchPersonas })
export const useCampaignRecommendations = () => useQuery({ queryKey: ['campaign-recommendations'], queryFn: fetchCampaignRecommendations })
export const useSurveyTriggers = () => useQuery({ queryKey: ['survey-triggers'], queryFn: fetchSurveyTriggers })
export const useLeadFunnel = () => useQuery({ queryKey: ['lead-funnel'], queryFn: fetchLeadFunnel })
export const useProductSurveyMoments = () => useQuery({ queryKey: ['product-survey-moments'], queryFn: fetchProductSurveyMoments })
export const useAgentDirectory = () => useQuery({ queryKey: ['agent-directory'], queryFn: fetchAgentDirectory })
export const useHandoffs = () => useQuery({ queryKey: ['handoffs'], queryFn: fetchHandoffs })
export const useAiInsights = () => useQuery({ queryKey: ['ai-insights'], queryFn: fetchAiInsights })
export const useCorrectiveRationale = (actionId: string) =>
  useQuery({ queryKey: ['corrective-rationale', actionId], queryFn: () => fetchCorrectiveRationale(actionId), enabled: !!actionId })
export const useAgentActivity = () => useQuery({ queryKey: ['agent-activity'], queryFn: fetchAgentActivity })

// --- Mutation hooks --------------------------------------------------------

export function useDecideCorrectiveAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: decideCorrectiveAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrective-actions'] }),
  })
}

export function useCreateActionFromPattern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createActionFromPattern,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      qc.invalidateQueries({ queryKey: ['home-summary'] })
    },
  })
}

export function useDecideShopperCaseAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: decideShopperCaseAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopper-cases'] }),
  })
}

export function useAdvanceShopperCase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: advanceShopperCase,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopper-cases'] }),
  })
}

export function useRequestInvestigation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: requestInvestigation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investigations'] }),
  })
}

export function useReturnInvestigation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: returnInvestigation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investigations'] }),
  })
}

export function useRecordInterview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordInterview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['detractor-call-items'] }),
  })
}

export function useRecordResurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordResurvey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['detractor-call-items'] }),
  })
}

export function useDecidePersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: decidePersona,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personas'] }),
  })
}

export function useCreateAiCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAiCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-campaigns'] }),
  })
}
