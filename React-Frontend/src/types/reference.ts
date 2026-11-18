import type { Bi, ProductId } from './common'
import type { Access, RoleId } from './roles'

// --- Standards register (Settings and reference §C) -----------------------

export type StandardSource = 'platform_rule' | 'ld_document'
export type StandardStatus = 'not_started' | 'drafted' | 'legal_review' | 'approved_scored'

/** One row of the standards register. `code` (M-01…) is [Proposed] — the
 * source documents number by title, not by code; this register adds a code
 * so the mystery-shopper checklist and signal rules have something short to
 * point to (APPLICATION_MODULES.md §C, "needs to grow to a numbered register"). */
export interface Standard {
  id: string
  code: string
  source: StandardSource
  group: Bi
  title: Bi
  writer: Bi
  readBy: Bi
  environmentVariant?: Bi
  /** 1 = before the first shopper wave … 5 = "then, everything else"
   * (Standards-Documentation-List-for-LD.docx §7) — only set for `ld_document` rows. */
  priorityTier?: 1 | 2 | 3 | 4 | 5
  owner: string
  linkedItems: number
  status: StandardStatus
}

// --- Mystery shopper (Settings and reference §C) ---------------------------

export type MsItemType = 'passfail' | 'scale' | 'text'
export type MsEvidence = 'none' | 'optional' | 'required'

export interface MsChecklistItem {
  id: string
  text: Bi
  section: string
  weight: number
  type: MsItemType
  critical: boolean
  evidence: MsEvidence
}

export interface MsChecklist {
  id: string
  name: Bi
  product: ProductId
  channel: string
  status: 'draft' | 'published'
  version: number
  items: MsChecklistItem[]
}

export interface MsScenario {
  id: string
  title: Bi
  tests: Bi
}

export interface MsShopper {
  id: string
  name: string
  type: 'internal' | 'external'
  agency?: string
  email: string
  shopsCompleted: number
  reliability: number
  active: boolean
}

export type MsAssignmentStatus = 'sent' | 'opened' | 'progress' | 'submitted' | 'review' | 'approved' | 'returned' | 'overdue'

/** FR-4.14 — a visit scoring under 60% is at least medium severity regardless
 * of individual item results; any critical-item fail opens a shopper case the
 * same day. This record stays the task/distribution record; once scored, the
 * severity rule is evaluated and — for a critical outcome — the existing
 * Actions → Shopper cases register is where the case itself lives (not
 * duplicated here, see `pages/settings/MysteryShopper.tsx`). */
export interface MsAssignment {
  id: string
  checklistId: string
  scenarioId: string
  shopperId: string
  via: 'email' | 'wa' | 'sms'
  sentAt: string
  dueAt: string
  status: MsAssignmentStatus
  score?: number
  criticalFails?: number
}

// --- Voice of Customer (Settings and reference §C) -------------------------

export interface VocRow {
  product: ProductId
  channel: string
  n: number
  promoters: number
  passives: number
  detractors: number
  csat: number
}

export interface VocComment {
  product: ProductId
  channel: string
  sentiment: 'positive' | 'neutral' | 'negative'
  theme: Bi
  text: Bi
}

// --- Surveys (reference) — legacy question-type vocabulary -----------------

export type LegacyQuestionType = 'nps' | 'rating' | 'choice' | 'yesno' | 'open'

export interface LegacySurveyQuestion {
  id: string
  type: LegacyQuestionType
  text: Bi
}

export interface LegacySurvey {
  id: string
  name: Bi
  product: ProductId
  questions: LegacySurveyQuestion[]
}

export interface LegacyCampaignBatch {
  id: string
  name: Bi
  audienceSize: number
  surveyId: string
  status: 'scheduled' | 'running' | 'closed'
  responseRate: number
}

export interface LegacyCampaign {
  id: string
  name: Bi
  product: ProductId
  batches: LegacyCampaignBatch[]
}

// --- Rules as configuration (NFR-4) -----------------------------------------

export interface RuleConfigItem {
  id: string
  area: Bi
  label: Bi
  /** The numeric value. For `days` rules (the working week) it is the number of working days. */
  value: number
  unit: Bi
  /** Which functional requirement this threshold backs, for traceability. */
  source: string
  /** v40: set for the working-week rule only: JS weekdays that count (0 = Sunday ... 6 = Saturday). `value` always equals `days.length`. */
  days?: number[]
  /** v40: a default or prototype choice the owner has not confirmed; show it with the [Proposed] badge. */
  proposed?: boolean
}

// --- AI Insights access matrix (CX-manager-editable, NFR per §2) -----------
// Reuses `Access` (types/roles.ts) — the same five-level vocabulary the v38
// RoleDef type already names, so this matrix and any future per-role check
// read one access vocabulary, not two.

export interface AiAccessRow {
  group: Bi
  label: Bi
  values: Record<RoleId, Access>
}

// --- L&D: training & materials (net-new page) -------------------------------

export type LdRequestStatus = 'requested' | 'scheduled' | 'delivered'

export interface LdRequest {
  id: string
  title: Bi
  requestedBy: string
  environment?: string
  status: LdRequestStatus
  linkedStandardId?: string
}

export interface HrPoolMember {
  title: string
  email: string
  mobile: string
  assignedCases: number
  lateCases: number
}

// --- Glossary (NFR-6) --------------------------------------------------------

export interface GlossaryTerm {
  term: Bi
  definition: Bi
}
