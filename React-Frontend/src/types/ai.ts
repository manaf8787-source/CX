import type { Bi } from './common'

/** The AI-agent output envelope, transcribed field-for-field from
 * `CX-Portal-AI-Agents-Specification.docx` so every agent's output — and the
 * mock layer standing in for it today — shares one shape end-to-end. This is
 * also the shape a real API will eventually return (docs/analysis/
 * IMPLEMENTATION_PLAN.md §4), so nothing here should be simplified away. */
export interface EvidenceRef {
  /** e.g. "interaction", "survey_response", "shopper_assignment", "crm_note" */
  sourceType: string
  sourceId: string
  occurredAt: string // ISO
  summary: Bi
}

/** FR-4.10/4.11 — AI Insights payload: one pattern per category+environment
 * with a service/time band, a recovery figure and a small-sample warning.
 * Reads *scored* records (surveys, shopper scores, app ratings, call
 * reviews) — a separate register from Signals (FR-4.13). */
export interface AiInsightPayload {
  category: string
  environment: string
  serviceTimeBand: Bi
  recoveryFigure: Bi
  sampleSize: number
  chartSeries: { label: string; value: number }[]
  /** FR-4.12 hard constraint — only set when a shopper case shares this category. */
  sendToCaseEligibleCaseId?: string
}

export interface AgentOutputEnvelope<Payload = unknown> {
  agentId: string
  runId: string
  subjectType: string
  subjectId: string
  payload: Payload
  evidence: EvidenceRef[]
  /** 0–1. Low-confidence or thin-evidence output routes to Investigations (FR-4.16) instead of a proposed action. */
  confidence: number
  /** Config keys that fired, e.g. "signals.same_issue", "ms.visit_floor" — see IMPLEMENTATION_PLAN.md §5. */
  rulesApplied: string[]
  model: string
  lang: 'en' | 'ar'
  supervisorVerdict: 'approved' | 'blocked' | 'pending'
  createdAt: string // ISO
}

/** Static reference profile for one of the ten agents or the supervisor —
 * transcribed from `CX-Portal-AI-Agents-Specification.docx`, not generated.
 * Rendered on the Intelligent CX team page (APPLICATION_MODULES.md §E). */
export interface AgentProfile {
  /** 1–10 for a worker, 'supervisor' for the one supervisor. */
  id: number | 'supervisor'
  /** Matches `AgentOutputEnvelope.agentId`'s family, e.g. "intake", "classify", "actions". */
  key: string
  name: Bi
  task: Bi
  trigger: Bi
  runsOn: Bi
  escalatesTo: Bi
  mustNot: Bi
  /** Set only when the spec states the agent isn't built in phase one (Agent 4). */
  phaseNote?: Bi
}

/** One row of "Routing of corrective actions by classification"
 * (AI Agents Specification) — keyed by the same 8-kind union the Actions
 * page already uses (`CorrectiveActionKind`), so the two pages describe one
 * classification scheme, not two. */
export interface RoutingRow {
  typicalSignal: Bi
  path: Bi
  receiver: Bi
  whatTheyReceive: Bi
  whatComesBack: Bi
}

/** A lightweight activity-feed entry — not a full envelope, just enough to
 * show "who ran, on what, with what verdict" on the Intelligent CX team
 * page's run log. Derived from the same seeded mock arrays everything else
 * reads, or carried over from an existing `AgentOutputEnvelope` where one
 * already exists (Agents 4/5). */
export interface AgentActivityEntry {
  id: string
  agentKey: string
  runId: string
  subjectSummary: Bi
  supervisorVerdict: 'approved' | 'returned' | 'escalated'
  createdAt: string
}
