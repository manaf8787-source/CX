import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MOCK_AGENT_ACTIVITY,
  MOCK_AGENT_DIRECTORY,
  MOCK_AI_ACCESS_MATRIX,
  MOCK_AI_CAMPAIGNS,
  MOCK_AI_INSIGHTS,
  MOCK_AI_JOURNEY_READINGS,
  MOCK_CAMPAIGN_RECOMMENDATIONS,
  MOCK_CORRECTIVE_ACTIONS,
  MOCK_CORRECTIVE_RATIONALES,
  MOCK_DETRACTOR_CALL_ITEMS,
  MOCK_EFFORT_SUMMARIES,
  MOCK_GLOSSARY_TERMS,
  MOCK_HANDOFFS,
  MOCK_HR_POOL,
  MOCK_INTERACTIONS,
  MOCK_INVESTIGATIONS,
  MOCK_LD_REQUESTS,
  MOCK_LEAD_FUNNEL,
  MOCK_MS_ASSIGNMENTS,
  MOCK_MS_CHECKLISTS,
  MOCK_MS_SCENARIOS,
  MOCK_MS_SHOPPERS,
  MOCK_PATTERNS,
  MOCK_PERSONAS,
  MOCK_PERSONS,
  MOCK_PRODUCT_SURVEY_MOMENTS,
  MOCK_RULES_CONFIG,
  MOCK_SHOPPER_CASES,
  MOCK_SIGNALS,
  MOCK_STANDARDS,
  MOCK_SURVEY_TRIGGERS,
  MOCK_VOC_COMMENTS,
  MOCK_VOC_ROWS,
} from './mockData'
import { sleep } from '../utils/random'
import { isRecovered } from '../utils/closeTheLoop'
import { scoreChecklist } from '../utils/mysteryShopper'
import { PRODUCTS } from '../data/products'
import type {
  Access,
  AiInterviewCampaign,
  Bi,
  CorrectiveAction,
  CorrectiveActionKind,
  InterviewOutcome,
  Investigation,
  MsAssignment,
  Pattern,
  ProductId,
  ReasonCode,
  RoleId,
  ShopperCase,
  StandardStatus,
} from '../types'

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

// --- Settings and reference fetchers --------------------------------------

async function fetchStandards() {
  await sleep(LATENCY_MS)
  return MOCK_STANDARDS
}

async function fetchMsChecklists() {
  await sleep(LATENCY_MS)
  return MOCK_MS_CHECKLISTS
}

async function fetchMsScenarios() {
  await sleep(LATENCY_MS)
  return MOCK_MS_SCENARIOS
}

async function fetchMsShoppers() {
  await sleep(LATENCY_MS)
  return MOCK_MS_SHOPPERS
}

async function fetchMsAssignments() {
  await sleep(LATENCY_MS)
  return MOCK_MS_ASSIGNMENTS
}

async function fetchVocRows() {
  await sleep(LATENCY_MS)
  return MOCK_VOC_ROWS
}

async function fetchVocComments() {
  await sleep(LATENCY_MS)
  return MOCK_VOC_COMMENTS
}

async function fetchRulesConfig() {
  await sleep(LATENCY_MS)
  return MOCK_RULES_CONFIG
}

async function fetchAiAccessMatrix() {
  await sleep(LATENCY_MS)
  return MOCK_AI_ACCESS_MATRIX
}

async function fetchLdRequests() {
  await sleep(LATENCY_MS)
  return MOCK_LD_REQUESTS
}

async function fetchHrPool() {
  await sleep(LATENCY_MS)
  return MOCK_HR_POOL
}

async function fetchGlossaryTerms() {
  await sleep(LATENCY_MS)
  return MOCK_GLOSSARY_TERMS
}

async function fetchProducts() {
  await sleep(LATENCY_MS)
  return PRODUCTS
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
  const nowIso = new Date().toISOString()
  c.status = input.status
  if (input.status !== 'open' && !c.respondedAt) c.respondedAt = nowIso
  if (input.status === 'closed' && !c.closedAt) c.closedAt = nowIso
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

// --- Settings and reference mutations ---------------------------------

/** NFR-4 — the CX manager grows the register's status as each document is
 * written and scored; CX only, per `canEditStandardsRegister` upstream. */
async function updateStandardStatus(input: { id: string; status: StandardStatus }) {
  await sleep(LATENCY_MS)
  const std = MOCK_STANDARDS.find((s) => s.id === input.id)
  if (!std) throw new Error('Standard not found')
  std.status = input.status
  return std
}

/** FR "Distribution" — sends a new checklist+scenario to each selected
 * shopper, 3 days out, same shape as the old scaffold's send(). */
async function sendMsAssignments(input: { checklistId: string; scenarioId: string; shopperIds: string[]; via: MsAssignment['via'] }) {
  await sleep(LATENCY_MS)
  const now = new Date().toISOString()
  const due = new Date(Date.now() + 3 * 86_400_000).toISOString()
  const created = input.shopperIds.map((shopperId, i) => ({
    id: `asg-new-${Date.now()}-${i}`,
    checklistId: input.checklistId,
    scenarioId: input.scenarioId,
    shopperId,
    via: input.via,
    sentAt: now,
    dueAt: due,
    status: 'sent' as const,
  }))
  MOCK_MS_ASSIGNMENTS.unshift(...created)
  return created
}

/** FR-4.14 — scores the checklist and files the submission for CX review;
 * the severity-floor rule (<60% ⇒ at least medium) is read off this score by
 * the page, not stored again here. */
async function submitMsAssignment(input: { id: string; checklistId: string; answers: Record<string, number | 'na' | null> }) {
  await sleep(LATENCY_MS)
  const assignment = MOCK_MS_ASSIGNMENTS.find((a) => a.id === input.id)
  const checklist = MOCK_MS_CHECKLISTS.find((c) => c.id === input.checklistId)
  if (!assignment || !checklist) throw new Error('Assignment or checklist not found')
  const result = scoreChecklist(checklist, input.answers)
  assignment.status = 'submitted'
  assignment.score = result.score ?? undefined
  assignment.criticalFails = result.criticalFails
  return assignment
}

async function decideMsAssignment(input: { id: string; approve: boolean }) {
  await sleep(LATENCY_MS)
  const assignment = MOCK_MS_ASSIGNMENTS.find((a) => a.id === input.id)
  if (!assignment) throw new Error('Assignment not found')
  assignment.status = input.approve ? 'approved' : 'returned'
  return assignment
}

async function updateRuleConfig(input: { id: string; value: number }) {
  await sleep(LATENCY_MS)
  const rule = MOCK_RULES_CONFIG.find((r) => r.id === input.id)
  if (!rule) throw new Error('Rule not found')
  rule.value = input.value
  return rule
}

/** The CX manager's "AI Insights access matrix" — cycles one cell through
 * the five-level access vocabulary; changes apply at once (USER_ROLES_AND_
 * PERMISSIONS.md). */
async function updateAiAccessCell(input: { group: string; label: string; roleId: RoleId; value: Access }) {
  await sleep(LATENCY_MS)
  const row = MOCK_AI_ACCESS_MATRIX.find((r) => r.group.en === input.group && r.label.en === input.label)
  if (!row) throw new Error('Access row not found')
  row.values[input.roleId] = input.value
  return row
}

async function toggleProductLaunch(input: { id: ProductId }) {
  await sleep(LATENCY_MS)
  const product = PRODUCTS.find((p) => p.id === input.id)
  if (!product) throw new Error('Product not found')
  product.live = !product.live
  return product
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

// --- Settings and reference hooks -----------------------------------------
export const useStandards = () => useQuery({ queryKey: ['standards'], queryFn: fetchStandards })
export const useMsChecklists = () => useQuery({ queryKey: ['ms-checklists'], queryFn: fetchMsChecklists })
export const useMsScenarios = () => useQuery({ queryKey: ['ms-scenarios'], queryFn: fetchMsScenarios })
export const useMsShoppers = () => useQuery({ queryKey: ['ms-shoppers'], queryFn: fetchMsShoppers })
export const useMsAssignments = () => useQuery({ queryKey: ['ms-assignments'], queryFn: fetchMsAssignments })
export const useVocRows = () => useQuery({ queryKey: ['voc-rows'], queryFn: fetchVocRows })
export const useVocComments = () => useQuery({ queryKey: ['voc-comments'], queryFn: fetchVocComments })
export const useRulesConfig = () => useQuery({ queryKey: ['rules-config'], queryFn: fetchRulesConfig })
export const useAiAccessMatrix = () => useQuery({ queryKey: ['ai-access-matrix'], queryFn: fetchAiAccessMatrix })
export const useLdRequests = () => useQuery({ queryKey: ['ld-requests'], queryFn: fetchLdRequests })
export const useHrPool = () => useQuery({ queryKey: ['hr-pool'], queryFn: fetchHrPool })
export const useGlossaryTerms = () => useQuery({ queryKey: ['glossary-terms'], queryFn: fetchGlossaryTerms })
export const useProducts = () => useQuery({ queryKey: ['products'], queryFn: fetchProducts })

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

// --- Settings and reference mutation hooks ---------------------------------

export function useUpdateStandardStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateStandardStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standards'] }),
  })
}

export function useSendMsAssignments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sendMsAssignments,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ms-assignments'] }),
  })
}

export function useSubmitMsAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: submitMsAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ms-assignments'] }),
  })
}

export function useDecideMsAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: decideMsAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ms-assignments'] }),
  })
}

export function useUpdateRuleConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRuleConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules-config'] }),
  })
}

export function useUpdateAiAccessCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateAiAccessCell,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-access-matrix'] }),
  })
}

export function useToggleProductLaunch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleProductLaunch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
