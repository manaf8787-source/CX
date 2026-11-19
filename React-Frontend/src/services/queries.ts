import { latency, mock } from './mockStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { INTERVIEW_OUTCOME_LABEL, REASON_CODE_LABEL, recoveryStatus } from '../utils/closeTheLoop'
import { scoreChecklist } from '../utils/mysteryShopper'
import { PRODUCTS } from '../data/products'
import { inEnvScope } from '../data/environments'
import { envsOfFix, inScopeAny } from '../utils/envScope'
import { applyApprovalClock, dueFromMatrix } from './fixClockStore'
import { useRole } from '../auth/RoleContext'
import { decisionAudit, proposedStamp, productOfPattern } from '../utils/audit'
import { detectPatternsCached } from '../utils/patterns'
import { rulesFromConfig } from '../utils/ruleValues'
import { invId } from '../utils/trace'
import { useEnvScope } from './envScope'
import type {
  Access,
  AiInterviewCampaign,
  Bi,
  CorrectiveAction,
  CorrectiveActionKind,
  EnvScope,
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

/** Env-aware (v40 F14): the people register narrowed by the environment switch; "all" returns the register itself. */
async function fetchPersons(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  return env === 'all' ? mock.MOCK_PERSONS : mock.MOCK_PERSONS.filter((p) => inEnvScope(env, p.envId))
}

async function fetchPerson(id: string) {
  await latency(LATENCY_MS)
  return mock.MOCK_PERSONS.find((p) => p.id === id) ?? null
}

async function fetchInteractionsForPerson(personId: string) {
  await latency(LATENCY_MS)
  return mock.MOCK_INTERACTIONS.filter((i) => i.personKey === personId)
}

async function fetchEffortSummary(personId: string) {
  await latency(LATENCY_MS)
  return mock.MOCK_EFFORT_SUMMARIES.find((e) => e.personId === personId) ?? null
}

async function fetchSignals(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  return env === 'all' ? mock.MOCK_SIGNALS : mock.MOCK_SIGNALS.filter((s) => inEnvScope(env, s.envId))
}

/** B17: patterns are computed from the rules configuration at read time (memoised), never stored. */
async function fetchPatterns(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
  const signals = env === 'all' ? mock.MOCK_SIGNALS : mock.MOCK_SIGNALS.filter((s) => inEnvScope(env, s.envId))
  return detectPatternsCached(env, signals, rules.patterns)
}

/**
 * The environment switch narrows everything that carries an environment (decided 18 Nov), fixes and the call list included.
 * A fix or an investigation takes the environments of its pattern's signals; one with none known shows everywhere.
 */
function scopeIndex() {
  const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
  const patterns = detectPatternsCached('all', mock.MOCK_SIGNALS, rules.patterns)
  return { patternById: new Map(patterns.map((p) => [p.id, p])), signalById: new Map(mock.MOCK_SIGNALS.map((s) => [s.id, s])) }
}

function scopedFixes(env: EnvScope): CorrectiveAction[] {
  if (env === 'all') return mock.MOCK_CORRECTIVE_ACTIONS
  const { patternById, signalById } = scopeIndex()
  return mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => inScopeAny(env, envsOfFix(f, patternById, signalById)))
}

function scopedLoop(env: EnvScope) {
  return env === 'all' ? mock.MOCK_DETRACTOR_CALL_ITEMS : mock.MOCK_DETRACTOR_CALL_ITEMS.filter((d) => inEnvScope(env, d.envId))
}

async function fetchCorrectiveActions(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  return scopedFixes(env)
}

async function fetchShopperCases(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  return env === 'all' ? mock.MOCK_SHOPPER_CASES : mock.MOCK_SHOPPER_CASES.filter((c) => inEnvScope(env, c.envId))
}

async function fetchInvestigations(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  if (env === 'all') return mock.MOCK_INVESTIGATIONS
  const { patternById, signalById } = scopeIndex()
  return mock.MOCK_INVESTIGATIONS.filter((i) => inScopeAny(env, envsOfFix(i, patternById, signalById)))
}

/** Copies, not the register: the mutations edit the mock rows in place, so a page must not hold the register itself. */
async function fetchDetractorCallItems(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  return scopedLoop(env).map((d) => ({ ...d }))
}

async function fetchAllInteractions() {
  await latency(LATENCY_MS)
  return mock.MOCK_INTERACTIONS
}

async function fetchEffortSummaries() {
  await latency(LATENCY_MS)
  return mock.MOCK_EFFORT_SUMMARIES
}

async function fetchAiJourneyReading(personId: string) {
  await latency(LATENCY_MS)
  return mock.MOCK_AI_JOURNEY_READINGS.find((r) => r.personId === personId) ?? null
}

async function fetchAiCampaigns() {
  await latency(LATENCY_MS)
  return mock.MOCK_AI_CAMPAIGNS
}

async function fetchPersonas() {
  await latency(LATENCY_MS)
  return mock.MOCK_PERSONAS
}

async function fetchCampaignRecommendations() {
  await latency(LATENCY_MS)
  return mock.MOCK_CAMPAIGN_RECOMMENDATIONS
}

async function fetchSurveyTriggers() {
  await latency(LATENCY_MS)
  return mock.MOCK_SURVEY_TRIGGERS
}

async function fetchLeadFunnel() {
  await latency(LATENCY_MS)
  return mock.MOCK_LEAD_FUNNEL
}

async function fetchProductSurveyMoments() {
  await latency(LATENCY_MS)
  return mock.MOCK_PRODUCT_SURVEY_MOMENTS
}

async function fetchAgentDirectory() {
  await latency(LATENCY_MS)
  return mock.MOCK_AGENT_DIRECTORY
}

/** A hand-off is in the environment of its person. */
async function fetchHandoffs(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  if (env === 'all') return mock.MOCK_HANDOFFS
  const personEnv = new Map(mock.MOCK_PERSONS.map((p) => [p.id, p.envId]))
  return mock.MOCK_HANDOFFS.filter((h) => inEnvScope(env, personEnv.get(h.personId) ?? env))
}

async function fetchAiInsights() {
  await latency(LATENCY_MS)
  return mock.MOCK_AI_INSIGHTS
}

async function fetchCorrectiveRationale(actionId: string) {
  await latency(LATENCY_MS)
  return mock.MOCK_CORRECTIVE_RATIONALES[actionId] ?? null
}

async function fetchAgentActivity() {
  await latency(LATENCY_MS)
  return mock.MOCK_AGENT_ACTIVITY
}

// --- Settings and reference fetchers --------------------------------------

async function fetchStandards() {
  await latency(LATENCY_MS)
  return mock.MOCK_STANDARDS
}

async function fetchMsChecklists() {
  await latency(LATENCY_MS)
  return mock.MOCK_MS_CHECKLISTS
}

async function fetchMsScenarios() {
  await latency(LATENCY_MS)
  return mock.MOCK_MS_SCENARIOS
}

async function fetchMsShoppers() {
  await latency(LATENCY_MS)
  return mock.MOCK_MS_SHOPPERS
}

async function fetchMsAssignments() {
  await latency(LATENCY_MS)
  return mock.MOCK_MS_ASSIGNMENTS
}

async function fetchVocRows() {
  await latency(LATENCY_MS)
  return mock.MOCK_VOC_ROWS
}

async function fetchVocComments() {
  await latency(LATENCY_MS)
  return mock.MOCK_VOC_COMMENTS
}

async function fetchRulesConfig() {
  await latency(LATENCY_MS)
  return mock.MOCK_RULES_CONFIG
}

async function fetchAiAccessMatrix() {
  await latency(LATENCY_MS)
  return mock.MOCK_AI_ACCESS_MATRIX
}

async function fetchLdRequests() {
  await latency(LATENCY_MS)
  return mock.MOCK_LD_REQUESTS
}

async function fetchHrPool() {
  await latency(LATENCY_MS)
  return mock.MOCK_HR_POOL
}

async function fetchGlossaryTerms() {
  await latency(LATENCY_MS)
  return mock.MOCK_GLOSSARY_TERMS
}

async function fetchProducts() {
  await latency(LATENCY_MS)
  return PRODUCTS
}

// --- Mutations -----------------------------------------------------------
// In-memory only (no backend yet, IMPLEMENTATION_PLAN.md §4): each mutation
// edits the mock array in place, by id, then the caller invalidates the
// affected query keys so every view re-reads the same updated record.

export interface DecideInput {
  id: string
  decision: 'approved' | 'modified' | 'rejected'
  reason?: string
  /** The role that decided. `useDecideCorrectiveAction` fills it from the signed-in role when absent. */
  byRole?: RoleId
}

/** v40 (F21): every decision writes an audit entry (when, what, by which role). */
async function decideCorrectiveAction(input: DecideInput) {
  await latency(LATENCY_MS)
  const action = mock.MOCK_CORRECTIVE_ACTIONS.find((a) => a.id === input.id)
  if (!action) throw new Error('Corrective action not found')
  action.decision = input.decision
  action.decisionReason = { en: input.reason || '—', ar: input.reason || '—' }
  action.status = input.decision === 'approved' ? 'approved' : action.status
  // Approval starts the due-date clock: the matrix "Resolve (h)" in working hours, Agent 5's 14 days when the cell is empty.
  if (input.decision === 'approved') applyApprovalClock(action)
  action.auditLog.push(decisionAudit(input.decision, input.reason, input.byRole ?? 'system'))
  return action
}

/**
 * A new proposed fix. Its due date is not typed: it comes from the matrix "Resolve (h)" of the fix's product and kind, in
 * working hours (Agent 5's 14 days when the cell is empty), as approval today would give it. Approval later overwrites it
 * and records where it came from (`dueSource`). `dueDate` is an optional override and no caller needs it.
 */
async function createActionFromPattern(input: { pattern: Pattern; kind: CorrectiveActionKind; owner: string; dueDate?: string; byRole?: RoleId }) {
  await latency(LATENCY_MS)
  const product = productOfPattern(input.pattern, mock.MOCK_SIGNALS)
  const action: CorrectiveAction = {
    id: `ca-${mock.MOCK_CORRECTIVE_ACTIONS.length + 1}`,
    kind: input.kind,
    patternId: input.pattern.id,
    title: { en: `Address ${input.pattern.category.replace(/_/g, ' ')} in ${input.pattern.team}`, ar: 'معالجة النمط المرصود لهذا الفريق' },
    owner: input.owner,
    dueDate: input.dueDate ?? dueFromMatrix({ product, kind: input.kind, patternId: input.pattern.id }).dueAt,
    status: 'proposed',
    verificationDueAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    ...proposedStamp({ product, byRole: input.byRole ?? 'system' }),
  }
  mock.MOCK_CORRECTIVE_ACTIONS.push(action)
  return action
}

async function decideShopperCaseAction(input: { caseId: string; n: number; decision: 'confirmed' | 'modified' | 'rejected' }) {
  await latency(LATENCY_MS)
  const c = mock.MOCK_SHOPPER_CASES.find((x) => x.id === input.caseId)
  if (!c) throw new Error('Shopper case not found')
  const line = c.proposedActions.find((p) => p.n === input.n)
  if (line) line.decision = input.decision
  if (input.decision !== 'confirmed') c.status = 'owner_decision'
  return c
}

async function advanceShopperCase(input: { caseId: string; status: ShopperCase['status'] }) {
  await latency(LATENCY_MS)
  const c = mock.MOCK_SHOPPER_CASES.find((x) => x.id === input.caseId)
  if (!c) throw new Error('Shopper case not found')
  const nowIso = new Date().toISOString()
  c.status = input.status
  if (input.status !== 'open' && !c.respondedAt) c.respondedAt = nowIso
  if (input.status === 'closed' && !c.closedAt) c.closedAt = nowIso
  return c
}

async function requestInvestigation(input: { patternId: string; kind: Investigation['kind']; requestedCount?: number; environment?: string; scenario?: string; lookFor?: string }) {
  await latency(LATENCY_MS)
  const inv: Investigation = {
    id: `inv-${mock.MOCK_INVESTIGATIONS.length + 1}`,
    patternId: input.patternId,
    kind: input.kind,
    requestedCount: input.requestedCount,
    environment: input.environment,
    scenario: input.scenario ? { en: input.scenario, ar: input.scenario } : undefined,
    lookFor: input.lookFor ? { en: input.lookFor, ar: input.lookFor } : undefined,
    status: 'requested',
  }
  mock.MOCK_INVESTIGATIONS.push(inv)
  return inv
}

/**
 * v40 (F26): recording the result closes the investigation (done = requested), keeps the result as evidence on
 * the pattern, and, when the investigated pattern has no fix yet, proposes one: Agent 5, from the investigation,
 * kind training gap, owner L&D manager, proposal date today, with an audit line. The returned investigation
 * carries `proposedFixId` when a fix was proposed (the page shows its toast from that).
 */
async function returnInvestigation(input: { id: string; resultSummary: string }) {
  await latency(LATENCY_MS)
  const inv = mock.MOCK_INVESTIGATIONS.find((i) => i.id === input.id)
  if (!inv) throw new Error('Investigation not found')
  const text: Bi = { en: input.resultSummary, ar: input.resultSummary }
  inv.status = 'returned'
  inv.resultSummary = text
  inv.result = text
  inv.doneCount = inv.requestedCount ?? inv.doneCount
  if (inv.patternId && !inv.proposedFixId && !mock.MOCK_CORRECTIVE_ACTIONS.some((a) => a.patternId === inv.patternId)) {
    const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
    const pattern = detectPatternsCached('all', mock.MOCK_SIGNALS, rules.patterns).find((p) => p.id === inv.patternId) ?? mock.MOCK_PATTERNS.find((p) => p.id === inv.patternId)
    const label = pattern ? pattern.category.replace(/_/g, ' ') : 'the investigated issue'
    const team = pattern?.team ?? inv.environment ?? 'the team'
    const fix: CorrectiveAction = {
      id: `ca-${mock.MOCK_CORRECTIVE_ACTIONS.length + 1}`,
      kind: 'training_gap',
      patternId: inv.patternId,
      title: { en: `Act on the evidence from ${invId(inv.id)}: ${label} in ${team}`, ar: `المعالجة بحسب دليل ${invId(inv.id)}: ${team}` },
      owner: 'L&D manager',
      dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      status: 'proposed',
      verificationDueAt: new Date(Date.now() + 74 * 86_400_000).toISOString(),
      source: { investigationId: inv.id },
      proposedBy: { en: 'Agent 5, from the investigation', ar: 'الوكيل 5، من التحقيق' },
      ...proposedStamp({
        product: productOfPattern(pattern, mock.MOCK_SIGNALS),
        byRole: 'system',
        note: { en: `Proposed by Agent 5 from the investigation ${invId(inv.id)}`, ar: `اقترحه الوكيل 5 من التحقيق ${invId(inv.id)}` },
      }),
    }
    mock.MOCK_CORRECTIVE_ACTIONS.push(fix)
    inv.proposedFixId = fix.id
  }
  return inv
}

/** FR-5.3 — records the four-question interview's reason code + outcome
 * against the detractor list item. "Declined" is read as "no retry" at
 * display time (`outcome === 'declined'`), not a separate stored flag. */
async function recordInterview(input: { id: string; reasonCode: ReasonCode; outcome: InterviewOutcome; notes?: string; resurveyOn?: string }) {
  await latency(LATENCY_MS)
  const item = mock.MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === input.id)
  if (!item) throw new Error('Detractor call item not found')
  item.reasonCode = input.reasonCode
  item.notes = input.notes
  item.resurveyOn = input.resurveyOn
  item.outcome = input.outcome
  // v40 (F27): the interview is the call; the row is done.
  item.attempts = Math.max(item.attempts, 1)
  item.status = 'done'
  item.nextAttemptOn = undefined
  // KB §7: the interview sits on the person's timeline.
  mock.MOCK_INTERACTIONS.push({
    id: `i-ctl-${item.id}-${mock.MOCK_INTERACTIONS.length + 1}`,
    personKey: item.personId,
    sourceRef: `close-the-loop-${item.id}`,
    channel: 'call',
    direction: 'outbound',
    occurredAt: new Date().toISOString(),
    product: item.product,
    environment: item.environment,
    envId: item.envId,
    language: mock.MOCK_PERSONS.find((p) => p.id === item.personId)?.language ?? 'en',
    reason: 'Close the loop interview',
    outcome: `${REASON_CODE_LABEL[input.reasonCode].en} · ${INTERVIEW_OUTCOME_LABEL[input.outcome].en}`,
    problemFlags: [],
  })
  return item
}

/** FR-5.4/5.5 — the 7–14 day re-survey's second score. It is a rating event
 * under the recovered rule (Rules and Definitions, Decision 3); `recoveredAt`
 * marks the first recovery event inside the 60-day window. */
async function recordResurvey(input: { id: string; secondScore: number }) {
  await latency(LATENCY_MS)
  const item = mock.MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === input.id)
  if (!item) throw new Error('Detractor call item not found')
  item.secondScore = input.secondScore
  item.resurveyedAt = new Date().toISOString()
  const r = recoveryStatus(item)
  if (!item.recoveredAt && (r.status === 'recovered' || r.provisional === 'recovered')) item.recoveredAt = item.resurveyedAt
  // KB §7: the re-survey sits on the person's timeline too.
  mock.MOCK_INTERACTIONS.push({
    id: `i-rs-${item.id}-${mock.MOCK_INTERACTIONS.length + 1}`,
    personKey: item.personId,
    sourceRef: `re-survey-${item.id}`,
    channel: 'survey',
    direction: 'inbound',
    occurredAt: new Date().toISOString(),
    product: item.product,
    environment: item.environment,
    envId: item.envId,
    language: mock.MOCK_PERSONS.find((p) => p.id === item.personId)?.language ?? 'en',
    reason: 'Re-survey after resolution',
    outcome: `${item.firstScore} → ${input.secondScore}`,
    score: input.secondScore,
    problemFlags: [],
  })
  return item
}

/** FR-5.6 hard rule, enforced here in code (not only in the dialog that
 * collects members): a critical-severity item can never end up a campaign
 * member, even if something upstream passed one in. */
async function createAiCampaign(input: { name: Bi; segmentDescription: Bi; script: Bi; memberIds: string[] }) {
  await latency(LATENCY_MS)
  const safeMemberIds = input.memberIds.filter((id) => mock.MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === id)?.severity !== 'critical')
  const campaign: AiInterviewCampaign = {
    id: `camp-ai-${mock.MOCK_AI_CAMPAIGNS.length + 1}`,
    name: input.name,
    segmentDescription: input.segmentDescription,
    script: input.script,
    status: 'draft',
    memberIds: safeMemberIds,
  }
  mock.MOCK_AI_CAMPAIGNS.push(campaign)
  return campaign
}

/** FR-6.4 — "The CX manager names/approves personas." Mirrors
 * `decideCorrectiveAction`'s shape: approve, or reject with a reason that a
 * persona nobody can act on should carry (even though this mock layer does
 * not go as far as actually dropping the record). */
async function decidePersona(input: { id: string; decision: 'approved' | 'modified' | 'rejected'; reason?: string }) {
  await latency(LATENCY_MS)
  const persona = mock.MOCK_PERSONAS.find((p) => p.id === input.id)
  if (!persona) throw new Error('Persona not found')
  persona.approvedByCxManager = input.decision === 'approved'
  return persona
}

// --- Settings and reference mutations ---------------------------------

/** NFR-4 — the CX manager grows the register's status as each document is
 * written and scored; CX only, per `canEditStandardsRegister` upstream. */
async function updateStandardStatus(input: { id: string; status: StandardStatus }) {
  await latency(LATENCY_MS)
  const std = mock.MOCK_STANDARDS.find((s) => s.id === input.id)
  if (!std) throw new Error('Standard not found')
  std.status = input.status
  return std
}

/** FR "Distribution" — sends a new checklist+scenario to each selected
 * shopper, 3 days out, same shape as the old scaffold's send(). */
async function sendMsAssignments(input: { checklistId: string; scenarioId: string; shopperIds: string[]; via: MsAssignment['via'] }) {
  await latency(LATENCY_MS)
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
  mock.MOCK_MS_ASSIGNMENTS.unshift(...created)
  return created
}

/** FR-4.14 — scores the checklist and files the submission for CX review;
 * the severity-floor rule (<60% ⇒ at least medium) is read off this score by
 * the page, not stored again here. */
async function submitMsAssignment(input: { id: string; checklistId: string; answers: Record<string, number | 'na' | null> }) {
  await latency(LATENCY_MS)
  const assignment = mock.MOCK_MS_ASSIGNMENTS.find((a) => a.id === input.id)
  const checklist = mock.MOCK_MS_CHECKLISTS.find((c) => c.id === input.checklistId)
  if (!assignment || !checklist) throw new Error('Assignment or checklist not found')
  const result = scoreChecklist(checklist, input.answers)
  assignment.status = 'submitted'
  assignment.score = result.score ?? undefined
  assignment.criticalFails = result.criticalFails
  return assignment
}

async function decideMsAssignment(input: { id: string; approve: boolean }) {
  await latency(LATENCY_MS)
  const assignment = mock.MOCK_MS_ASSIGNMENTS.find((a) => a.id === input.id)
  if (!assignment) throw new Error('Assignment not found')
  assignment.status = input.approve ? 'approved' : 'returned'
  return assignment
}

/** Changes one rule. For the working week pass `days` (JS weekdays) or a count in `value` (the first n weekdays from Monday). */
async function updateRuleConfig(input: { id: string; value?: number; days?: number[] }) {
  await latency(LATENCY_MS)
  const rule = mock.MOCK_RULES_CONFIG.find((r) => r.id === input.id)
  if (!rule) throw new Error('Rule not found')
  if (rule.days) {
    const days = input.days ?? (input.value !== undefined ? [1, 2, 3, 4, 5, 6, 0].slice(0, Math.max(1, Math.min(7, Math.trunc(input.value)))) : rule.days)
    rule.days = [...new Set(days)].sort((a, b) => a - b)
    rule.value = rule.days.length
  } else if (input.value !== undefined) {
    rule.value = input.value
  }
  return rule
}

/** The CX manager's "AI Insights access matrix" — cycles one cell through
 * the five-level access vocabulary; changes apply at once (USER_ROLES_AND_
 * PERMISSIONS.md). */
async function updateAiAccessCell(input: { group: string; label: string; roleId: RoleId; value: Access }) {
  await latency(LATENCY_MS)
  const row = mock.MOCK_AI_ACCESS_MATRIX.find((r) => r.group.en === input.group && r.label.en === input.label)
  if (!row) throw new Error('Access row not found')
  row.values[input.roleId] = input.value
  return row
}

async function toggleProductLaunch(input: { id: ProductId }) {
  await latency(LATENCY_MS)
  const product = PRODUCTS.find((p) => p.id === input.id)
  if (!product) throw new Error('Product not found')
  product.live = !product.live
  return product
}

async function fetchHomeSummary(env: EnvScope = 'all') {
  await latency(LATENCY_MS)
  const persons = env === 'all' ? mock.MOCK_PERSONS : mock.MOCK_PERSONS.filter((p) => inEnvScope(env, p.envId))
  const ids = new Set(persons.map((p) => p.id))
  const runawayCount = mock.MOCK_EFFORT_SUMMARIES.filter((e) => ids.has(e.personId) && e.daysSinceLastContact > 30).length
  const openActions = scopedFixes(env).filter((a) => a.status !== 'effective' && a.status !== 'failed').length
  const loop = scopedLoop(env)
  return {
    runawayCount,
    openActions,
    personaCount: mock.MOCK_PERSONAS.length,
    journeysViewed: persons.length,
    toCall: loop.filter((d) => !d.outcome).length || loop.length,
  }
}

// --- Hooks -------------------------------------------------------------

export const useHomeSummary = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['home-summary', env], queryFn: () => fetchHomeSummary(env) })
}
/** Env-aware: the environment switch is part of the key (docs/V40_FOUNDATION_API.md). */
export const usePersons = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['persons', env], queryFn: () => fetchPersons(env) })
}
/** The whole register regardless of the switch (for lookups by id, the inbox, the trace chain). */
export const usePersonsAll = () => useQuery({ queryKey: ['persons', 'all'], queryFn: () => fetchPersons('all') })
export const usePerson = (id: string) => useQuery({ queryKey: ['person', id], queryFn: () => fetchPerson(id), enabled: !!id })
export const usePersonInteractions = (personId: string) =>
  useQuery({ queryKey: ['interactions', personId], queryFn: () => fetchInteractionsForPerson(personId), enabled: !!personId })
export const usePersonEffort = (personId: string) =>
  useQuery({ queryKey: ['effort', personId], queryFn: () => fetchEffortSummary(personId), enabled: !!personId })
export const useSignals = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['signals', env], queryFn: () => fetchSignals(env) })
}
export const useSignalsAll = () => useQuery({ queryKey: ['signals', 'all'], queryFn: () => fetchSignals('all') })

/**
 * Patterns computed from the rules at read time (B17). The key carries the environment only: the rules are read inside
 * the fetch, and `useUpdateRuleConfig` invalidates `['patterns']`, so an edit recomputes. (A rules signature in the key
 * made the page load twice and animate in twice.)
 */
export const usePatterns = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['patterns', env], queryFn: () => fetchPatterns(env) })
}
export const usePatternsAll = () => useQuery({ queryKey: ['patterns', 'all'], queryFn: () => fetchPatterns('all') })
/** Env-aware: narrowed by the environment switch (fixes included, decided 18 Nov). `useCorrectiveActionsAll` ignores the switch. */
export const useCorrectiveActions = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['corrective-actions', env], queryFn: () => fetchCorrectiveActions(env) })
}
export const useCorrectiveActionsAll = () => useQuery({ queryKey: ['corrective-actions', 'all'], queryFn: () => fetchCorrectiveActions('all') })
export const useShopperCases = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['shopper-cases', env], queryFn: () => fetchShopperCases(env) })
}
export const useInvestigations = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['investigations', env], queryFn: () => fetchInvestigations(env) })
}
/** The close-the-loop list, narrowed by the environment switch (decided 18 Nov). A DNCR person is never on it. */
export const useDetractorCallItems = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['detractor-call-items', env], queryFn: () => fetchDetractorCallItems(env) })
}
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
export const useHandoffs = () => {
  const { env } = useEnvScope()
  return useQuery({ queryKey: ['handoffs', env], queryFn: () => fetchHandoffs(env) })
}
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
  const { role } = useRole()
  return useMutation({
    mutationFn: (input: DecideInput) => decideCorrectiveAction({ ...input, byRole: input.byRole ?? role.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrective-actions'] }),
  })
}

export function useCreateActionFromPattern() {
  const qc = useQueryClient()
  const { role } = useRole()
  return useMutation({
    mutationFn: (input: Parameters<typeof createActionFromPattern>[0]) => createActionFromPattern({ ...input, byRole: input.byRole ?? role.id }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investigations'] })
      // Recording the result can propose a fix (F26).
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      qc.invalidateQueries({ queryKey: ['home-summary'] })
    },
  })
}

export function useRecordInterview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordInterview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detractor-call-items'] })
      qc.invalidateQueries({ queryKey: ['interactions'] })
      qc.invalidateQueries({ queryKey: ['interactions-all'] })
    },
  })
}

export function useRecordResurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordResurvey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detractor-call-items'] })
      qc.invalidateQueries({ queryKey: ['interactions'] })
      qc.invalidateQueries({ queryKey: ['interactions-all'] })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules-config'] })
      // "Change them there and every page recomputes" (F16): patterns follow the rules.
      qc.invalidateQueries({ queryKey: ['patterns'] })
    },
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
