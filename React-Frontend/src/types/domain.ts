import type { Bi, ChannelId, ConsentFlags, EnvId, LeadSource, PersonSegment, ProductId, Severity } from './common'
import type { RoleId } from './roles'

// --- Identity / Customers (the journey) ------------------------------------

export type CustomerType = 'lead' | 'customer'

/** One record per person — the centerpiece of the v38 rebuild (FR-2).
 * Identity is stitched by mobile/email/Emirates ID/CRM contact id; nothing
 * else in the UI should carry a second, competing notion of "who this is". */
export interface Person {
  id: string
  identity: {
    mobile?: string
    email?: string
    emiratesId?: string
    crmContactId?: string
  }
  type: CustomerType
  /** v40 (F29): six types for the customers list; `type` is kept for existing code (lead | customer). */
  segment: PersonSegment
  /** v40 (F29): where the lead originally came from. */
  sourceOfLead: LeadSource
  /** v40 (F24): consent and DNCR as held by the CRM. A DNCR person is never callable and never surveyed by call. */
  consent: ConsentFlags
  name: string
  /** Short English label ('Dubai', 'Abu Dhabi', 'PSI Assets'); `envId` is the canonical id. */
  environment: string
  envId: EnvId
  products: ProductId[]
  unitsOrDeals: number
  residence?: string
  workplace?: string
  incomeSource?: string
  preferredChannel: ChannelId
  language: 'en' | 'ar'
  personaId?: string
  vip: boolean // PSI Club
  createdAt: string // ISO
}

/** FR-2.3 — the four effort tiles, pre-aggregated for display. */
export interface EffortSummary {
  personId: string
  interactions: number
  contactsLast90Days: number
  problemsFound: number
  daysSinceLastContact: number
}

export type RunawayType =
  | 'went_to_competitor'
  | 'silent_lead'
  | 'frozen_deal'
  | 'did_not_renew'
  | 'dormant_owner'
  | 'complained_then_left'

/** FR-2.4 — exactly four parts, every sentence citing a dated timeline event via `evidence`. */
export interface AiJourneyReading {
  personId: string
  whoHowLongChannels: Bi
  whatWentWrong: Bi
  verdict: 'healthy' | 'high_effort' | RunawayType
  whatToDoNext: Bi
  evidence: { eventId: string; occurredAt: string }[]
}

/** FR-2.6 — problem flags highlighted on the timeline. */
export type ProblemFlag =
  | 'promise_not_kept'
  | 'forced_channel_switch'
  | 'repeat_contact'
  | 'slow_reply'
  | 'wrong_language'
  | 'hand_off'
  | 'ivr_complaint_not_logged'
  | 'unapproved_discount'
  | 'silence'
  | 'detractor'

/** The unified interaction record, field names kept close to the Phase One
 * Integration Plan's target schema (`person_key, source_ref, channel,
 * direction, occurred_at, product, environment, agent, reason, outcome,
 * promise, language, score, text`) so swapping the mock fetch for a real feed
 * later is a data-source change, not a type change (IMPLEMENTATION_PLAN.md §4). */
export interface Interaction {
  id: string
  personKey: string
  sourceRef: string
  channel: ChannelId
  direction: 'inbound' | 'outbound'
  occurredAt: string // ISO
  product: ProductId
  environment: string
  envId: EnvId
  /** CRM agent id — resolve to a display name only through a role-gated lookup (NFR-2), never read this field directly for display. */
  agentRef?: string
  reason?: string
  outcome?: string
  promiseKept?: boolean
  /** KB §4: any promise with its due time. */
  promiseDueAt?: string
  language: 'en' | 'ar'
  score?: number
  /** Conversation text. Readable by CX team + CX manager only (NFR-2) — the mock layer carries it so the access-gate itself is testable, never omit it to fake compliance. */
  text?: string
  problemFlags: ProblemFlag[]
}

// --- Signals, patterns, corrective actions (Actions tab group) -------------

export type SignalKind = 'complaint' | 'low_score' | 'breach' | 'public_mention' | 'legal_privacy_safety'

/** FR-4.5 — every signal is counted, not worked one by one. */
export interface Signal {
  id: string
  kind: SignalKind
  /** Absent for a public mention (FR-4.8): invariant `kind === 'public_mention'` implies no personId, no eventIds, isPublic. */
  personId?: string
  product: ProductId
  environment: string
  envId: EnvId
  category: string
  occurredAt: string
  agentRef?: string
  /** True exactly when `kind === 'public_mention'`. */
  isPublic: boolean
  /** v40 trace (F10): the interactions (events) that produced this signal. Empty for a public mention. */
  eventIds: string[]
  /** Public-reply SLA clock, FR-4.8 — only set when `isPublic`. */
  publicReplyDueAt?: string
}

/** FR-4.6 — which of the three threshold rules a pattern crossed. */
export type PatternThresholdKind = 'same_agent' | 'same_issue' | 'environment_concentration'

/** FR-4.6 — a group of signals past threshold (same agent x3, same issue x5, or >=50% one environment, 30-day window, sample >=10). */
export interface Pattern {
  /** Stable across recomputations (equals `key`), so fixes and investigations keep pointing at the same pattern when a threshold changes. */
  id: string
  /** Stable key: `same_issue:<category>`, `same_agent:<agentRef>` or `environment_concentration:<category>:<env>`. */
  key: string
  /** Display id `PT-nnn` (hash of the key, collision-free within one result set). */
  traceId: string
  signalIds: string[]
  team: string
  category: string
  windowDays: number
  sampleSize: number
  aiSuggestion: Bi
  /** Full-sentence recovery figure, e.g. "tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%" (FR-4.2). */
  recoveryFigure: Bi
  thresholdKind: PatternThresholdKind
  /** same_agent: count of occurrences; same_issue: count; environment_concentration: percent (0-100). */
  thresholdTarget: number
  currentValue: number
  /** Set only for a same_agent pattern — the agent whose signals formed it (role-gated for display, NFR-2). */
  agentRef?: string
  /** Minimum sample for the AI to propose a fix with confidence (Rules and Definitions Decision 1). Below it, Investigations should offer evidence-gathering instead of a guess (FR-4.16). */
  hasMinimumSample: boolean
}

export type CorrectiveActionKind =
  | 'employee'
  | 'service_behaviour'
  | 'training_gap'
  | 'product_app'
  | 'process'
  | 'environment'
  | 'legal_privacy'
  | 'marketing'

export type CorrectiveActionStatus =
  | 'proposed'
  | 'approved'
  | 'in_progress'
  | 'verification'
  | 'effective'
  | 'partial'
  | 'failed'

/** FR-4.1/4.4 — one proposed fix, never auto-applied; the responsible manager must say yes. */
/** v40 (F21): one line of a fix's audit trail. `byRole` is a role, never a person; 'system' when no role acted. */
export interface AuditEntry {
  at: string // ISO
  what: Bi
  byRole: RoleId | 'system'
}

export interface CorrectiveAction {
  id: string
  kind: CorrectiveActionKind
  patternId?: string
  title: Bi
  owner: string // a title, never a name directly on the record (NFR-2)
  dueDate: string
  status: CorrectiveActionStatus
  decision?: 'approved' | 'modified' | 'rejected'
  decisionReason?: Bi
  /** 60-day effectiveness check (FR-4.1, FR-5.5's "effective" definition). */
  verificationDueAt: string
  verificationResult?: 'effective' | 'partial' | 'failed'
  /** Monthly signal-count series feeding the before/after effectiveness calc
   * (utils/effectiveness.ts), and the month index the action started in. */
  monthlySignalSeries?: number[]
  startedMonthIndex?: number
  /** KB §6: the manager asked for an investigation before deciding. */
  sentToInvestigation?: boolean
  /** KB §6: "suggestions become proposed corrective actions" — the AI Insights suggestion this came from. */
  fromInsight?: { subjectId: string; suggestionId: string; recovery: Bi }
  /** v40 (F20/F21): when the fix was proposed; the 5-working-day approval window counts from here. */
  proposedAt: string // ISO
  /** v40 (F22): the product whose escalation matrix applies. */
  product: ProductId
  /** v40 (F21): every status change and decision, oldest first in storage (UIs show newest first). Nothing is deleted. */
  auditLog: AuditEntry[]
  /** v40 (F26): set when the fix was proposed from a returned investigation. */
  source?: { investigationId: string }
  /** v40 (F26): who proposed it when it was not the standard flow, e.g. "Agent 5, from the investigation". */
  proposedBy?: Bi
  /** v40 (decided 18 Nov): where the due date came from once the fix was approved: the matrix "Resolve (h)" in working hours from approval, or Agent 5's 14 days when that cell is empty. Absent while the date is still the proposal's own. */
  dueSource?: 'matrix' | 'fallback'
  /** v40: the environment of a fix that has no pattern (an AI Insights proposal). A fix with a pattern takes the environments of the pattern's signals. Absent and without a pattern = every environment. */
  envId?: EnvId
  /** v40.1 (decision 3): the fix this one is the second step of, after a partial or failed 60-day check. Same pattern, kind, owner and product. */
  parentFixId?: string
  /** v40.1: the verdict on the parent when the second step was requested (kept, because the parent may be accepted as is afterwards). */
  parentOutcome?: 'partial' | 'failed'
}

/** FR-4.2 — "How the AI found this", one per corrective action: sources,
 * the rule that fired, where, why this team, why this action, and what the
 * AI did not do. Shaped as an AgentOutputEnvelope (NFR-7) so the frontend's
 * data contract is the same one a real agent output will fill later. */
export interface CorrectiveRationale {
  whyThisTeam: Bi
  whatAiDidNotDo: Bi
}

/** FR-4.9 — one-customer fixes owned by another system; status tracked,
 * no SLA clock runs here. */
export type HandoffKind = 'crm_do_not_call' | 'recovery_call' | 'club_member_recovery'

export interface HandoffItem {
  id: string
  kind: HandoffKind
  personId: string
  ownerSystem: Bi
  status: 'open' | 'done'
  createdAt: string
}

export type ShopperCaseStatus = 'open' | 'triaged' | 'owner_decision' | 'hr_review' | 'closed'

/** FR-4.14/4.15 — critical opens same-day; medium becomes a signal; low is an L&D statistic. */
export interface ShopperCase {
  id: string
  severity: Severity
  assignmentId: string
  product: ProductId
  environment: string
  envId: EnvId
  openedAt: string
  respondDueAt: string
  resolveDueAt: string
  status: ShopperCaseStatus
  proposedActions: { n: number; text: Bi; decision: 'pending' | 'confirmed' | 'modified' | 'rejected' }[]
  /** Checklist category, e.g. "greeting", "pricing_disclosure" — used by
   * FR-4.12's hard constraint: an AI Insight may "send to a case" only when
   * a case in the same category is open. */
  category: string
  visitScorePct: number
  /** A title, never a name directly on the record (NFR-2) — who owns the
   * next decision, e.g. "Environment manager". */
  ownerTitle: string
  isConductIssue: boolean
  /** Stops the respond clock. Set once the case leaves `open`. */
  respondedAt?: string
  /** Stops the resolve clock. Set when the case is closed. */
  closedAt?: string
}

/** FR-4.16 — when evidence is thin, request evidence instead of guessing a fix. */
export interface Investigation {
  id: string
  patternId?: string
  kind: 'customer_interviews' | 'mystery_shopper_check'
  requestedCount?: number // for customer_interviews
  environment?: string
  scenario?: Bi // for mystery_shopper_check
  /** KB §6 "investigate-form": what the shopper should look for. */
  lookFor?: Bi
  status: 'requested' | 'in_progress' | 'returned'
  resultSummary?: Bi
  /** v40 (F26): the recorded result (same text as `resultSummary`), kept as evidence on the pattern. */
  result?: Bi
  /** v40 (F26): interviews done; equals `requestedCount` once the result is recorded. */
  doneCount?: number
  /** v40 (F26): the fix proposed when the result was recorded, if the pattern had none. */
  proposedFixId?: string
  /** v40: environment of an investigation without a pattern. With a pattern it takes the environments of the pattern's signals. */
  envId?: EnvId
  /** v40.1: why it was opened when it was not the standard request, e.g. "Requested from CA-201 after a partial result." */
  note?: Bi
}

// --- Close the loop ----------------------------------------------------

/** The ten reason codes, verbatim from Modules KB §7. */
export type ReasonCode =
  | 'slow_or_no_reply'
  | 'promise_not_kept'
  | 'wrong_information'
  | 'attitude'
  | 'paperwork_handoff'
  | 'app_website'
  | 'price_payment'
  | 'nothing_suitable'
  | 'switched_channels'
  | 'other'

export type InterviewOutcome = 'reached' | 'resolved_on_call' | 'declined' | 'callback_requested'

/** v40 (F27): where a close-the-loop row stands. 'needs_human' still counts as open. */
export type CallStatus = 'to_do' | 'no_answer' | 'needs_human' | 'done'

/** FR-5.1/5.3 — the monthly detractor call list, one row per person. */
export interface DetractorCallItem {
  id: string
  personId: string
  product: ProductId
  environment: string
  envId: EnvId
  severity: Severity
  firstScore: number
  channel: 'human' | 'ai_campaign'
  outcome?: InterviewOutcome
  reasonCode?: ReasonCode
  /** Caller's notes from the interview (KB §7 interview form). */
  notes?: string
  /** Re-survey date set at the interview, 7 to 14 days after resolution. */
  resurveyOn?: string
  secondScore?: number // re-survey, FR-5.4
  /** When the re-survey answer came back (counts as a rating event under the recovered rule). */
  resurveyedAt?: string
  recoveredAt?: string // the first recovery event inside the 60-day window, if any
  /** The instrument the first score came from: NPS 0-10, CSAT and CES 1-5 (default NPS). */
  instrument?: FeedbackInstrument
  /** When the incident (the detractor answer or complaint) happened; the 60-day window starts here. */
  incidentAt?: string
  /** What the person did after the incident, read from the timeline (Rules and Definitions, Decision 3). */
  followUps?: RecoveryEvent[]
  /** v40 (F27): calls attempted so far (0 = none). */
  attempts: number
  /** v40 (F27): date (YYYY-MM-DD) of the next attempt, a working day inside calling hours. */
  nextAttemptOn?: string
  /** v40 (F27): date (YYYY-MM-DD) the first call is due (within 5 working days of listing). */
  dueOn?: string
  /** v40 (F27): derived and kept in step by the mutations: to_do, no_answer, needs_human, done. */
  status: CallStatus
}

export type FeedbackInstrument = 'nps' | 'csat' | 'ces'

/** Rules and Definitions, Decision 3: the events that decide "recovered". */
export type RecoveryEventKind = 'rating' | 'transaction' | 'renewal' | 'new_lead' | 'contact' | 'cancel'

export interface RecoveryEvent {
  at: string
  kind: RecoveryEventKind
  /** For a rating. */
  instrument?: FeedbackInstrument
  score?: number
  /** For a contact: whether it carried a complaint. */
  complaint?: boolean
}

export type AiCampaignStatus = 'draft' | 'running' | 'closed'

/** FR-5.6 — CX-created, segment + bilingual script + hand-off rules.
 * Critical detractors are never a member — enforced in the mock mutation
 * (`createAiCampaign`), not just assumed from how this type is used. */
export interface AiInterviewCampaign {
  id: string
  name: Bi
  segmentDescription: Bi
  script: Bi
  status: AiCampaignStatus
  memberIds: string[]
}

// --- Personas and campaigns ----------------------------------------------

export type PersonaKey =
  | 'overseas_investor'
  | 'first_time_expat_buyer'
  | 'local_family_renter'
  | 'portfolio_owner'
  | 'comparison_shopper'
  | 'referral_driven_member'

/** FR-6.1/6.2 — exactly six personas, each with a Marketing recommendation. */
export interface Persona {
  id: PersonaKey
  name: Bi
  who: Bi
  mainPain: Bi
  channelsUsed: ChannelId[]
  segmentSize: number
  runawayCount: number
  recommendation: {
    targetWho: Bi
    channelAndWhen: Bi
    campaignType: Bi
    whatNotToDo: Bi
  }
  approvedByCxManager: boolean
  /** FR-6.4 — the Internal Audit and Marketing Lead's note on this persona's
   * criteria, independent of the CX manager's approve/reject decision.
   * Absent = not yet reviewed. */
  auditNote?: Bi
}

export interface CampaignRecommendation {
  id: string
  personaId: PersonaKey
  rank: number
  title: Bi
  summary: Bi
}

// --- Surveys and triggers --------------------------------------------------

export type SurveyInstrument = 'nps' | 'csat_ces' | 'what_stopped_you' | 'abandoned_ces' | 're_survey'
export type LeadFunnelStage = 'enquiry' | 'contacted' | 'viewing' | 'offer' | 'signed'

/** FR-7.1/7.2 — which instrument, trigger and cap applies for a product. */
export interface SurveyTrigger {
  id: string
  product: ProductId
  instrument: SurveyInstrument
  triggerDescription: Bi
  capDays: number | null // null = exempt from caps (re-survey)
}

/** FR-7.1 — "each stage shows its source split ... and the reasons people
 * stopped" (Modules KB §9). The funnel is framed around PSI Real Estate's
 * enquiry-to-signed journey, the only product with these five stages. */
export interface LeadFunnelPoint {
  product: ProductId
  stage: LeadFunnelStage
  count: number
  sourceSplit: { label: Bi; count: number }[]
  whyTheyStopped?: { reason: Bi; count: number }[]
}

/** FR-7.4 — "per product, no group number": each product's own moments,
 * free text rather than forced into the five-instrument shape, since a
 * product like PSI Events has no NPS at all (Modules KB §9, "Per product,
 * no group number"). */
export interface ProductSurveyMoments {
  product: ProductId
  momentsSummary: Bi
  hasNps: boolean
}

// --- Roles / people (for role-gated name resolution, NFR-2) ----------------

/** The role allowed to view an agent's real name, alongside the agent's own management. */
export interface AgentDirectoryEntry {
  agentRef: string
  displayName: string
  directManagerTitle: string
  visibleTo: RoleId[]
}
