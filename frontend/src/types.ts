// Bilingual string: every user-facing label in the data layer carries both
// languages so the UI can switch instantly without a translation round-trip.
export interface Bi {
  en: string
  ar: string
}

export type ProductId = 're' | 'af' | 'cl' | 'to' | 'ev'
export type ChannelId = 'digital' | 'call' | 'branch' | 'app' | 'event'

export interface Product {
  id: ProductId
  colorVar: string // CSS custom property, e.g. --p-re
  name: Bi
  blurb: Bi
  live: boolean
}

export interface Channel {
  id: ChannelId
  name: Bi
  short: Bi
}

// One row of Voice-of-Customer aggregate for a product x channel pair.
export interface VocRow {
  product: ProductId
  channel: ChannelId
  n: number
  promoters: number
  passives: number
  detractors: number
  csat: number // percent
}

export type AlertLevel = 'crit' | 'warn' | 'good'
export interface AlertItem {
  level: AlertLevel
  product: ProductId
  text: Bi
}

// --- Roles & authority matrix -------------------------------------------

export type RoleId =
  | 'cxmgr'
  | 'cxteam'
  | 'envmgmt'
  | 'teamlead'
  | 'aslead'
  | 'asagent'
  | 'hrspec'
  | 'hrmgr'
  | 'clevel'
  | 'tourscx'
  | 'exec'
  | 'shopper'

export type Access = 'full' | 'own' | 'view' | 'informed' | 'approve' | 'none'

export interface RoleDef {
  id: RoleId
  name: Bi
  description: Bi
  home: string // route path
  product?: ProductId // for single-product scoped roles
}

export type CapabilityKey =
  | 'dashboards'
  | 'voc'
  | 'insights'
  | 'insightsApprove'
  | 'monthlyPack'
  | 'glossary'
  | 'caseView'
  | 'caseTriage'
  | 'caseProposeActions'
  | 'caseRespond'
  | 'caseConfirmActions'
  | 'caseReviewHr'
  | 'caseApproveRejected'
  | 'caseVerifyClose'
  | 'caseInformed'
  | 'hrTeamPerf'
  | 'configSla'
  | 'configSettings'
  | 'surveyBuilder'
  | 'whatsappTemplates'
  | 'mysteryShopperProgramme'
  | 'mysteryShopperImport'
  | 'mysteryShopperFillOwn'
  | 'afDeskQueue'
  | 'callCenterDashboard'
  | 'suggestionsLog'
  | 'standardsLibrary'

// --- Complaints / SLA ------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low'

export interface ComplaintType {
  id: string
  product: ProductId | '*'
  name: Bi
  priority: Priority
  respondHours: number
  resolveHours: number
  // Keys into the people directory (data/directory.ts) — these are titles,
  // not the 12 portal RoleIds, since routing targets are specific jobs
  // (e.g. "developer liaison") not portal access levels.
  owner: string
  backup: string
  manager: string
  head: string
  byEnvironment: boolean
}

export type IncidentStatus = 'open' | 'progress' | 'waiting' | 'resolved' | 'closed'
export type IncidentSource = 'survey' | 'ai' | 'shopper' | 'staff' | 'ticket' | 'insight'

export interface TimelineEntry {
  at: string // ISO
  // A RoleId for portal-side actions, or a directory key (data/directory.ts)
  // when the actor is a routing target rather than a portal sign-in role
  // (e.g. "dev_liaison"). Resolve for display with lib/people.ts#actorLabel.
  role: RoleId | string
  text: Bi
}

export interface ProposedAction {
  n: number
  text: string
  decision: 'pending' | 'confirmed' | 'modified' | 'rejected'
  note?: string
}

export interface Incident {
  id: string
  typeId: string
  product: ProductId
  channel: ChannelId
  source: IncidentSource
  environment?: string
  title: Bi
  openedAt: string
  firstResponseAt?: string
  status: IncidentStatus
  pausedMinutes: number
  pauseStartedAt?: string
  manualEscalationLevel: number
  rootCauseCategory?: 'people' | 'process' | 'system' | 'information' | 'third_party' | 'expectation'
  rootCauseExplanation?: string
  correctiveAction?: string
  preventiveActionRequired: boolean
  preventiveAction?: string
  preventiveActionOwner?: string
  preventiveActionDue?: string
  proposedActions: ProposedAction[]
  managerReviewState: 'n/a' | 'pending' | 'approved'
  resolvedAt?: string
  timeline: TimelineEntry[]
}

// --- Surveys ---------------------------------------------------------------

export type QuestionType = 'nps' | 'rating' | 'choice' | 'yesno' | 'open'

export interface SurveyQuestion {
  id: string
  type: QuestionType
  entityTag?: string
  text: Bi
  options?: Bi[]
}

export interface Survey {
  id: string
  name: Bi
  product: ProductId
  questions: SurveyQuestion[]
}

export type DeliveryChannel = 'wa_link' | 'wa_chat' | 'sms' | 'email'
export type BatchStatus = 'draft' | 'scheduled' | 'running'

export interface Batch {
  id: string
  name: Bi
  audienceSize: number
  surveyId: string
  deliveryChannel: DeliveryChannel | null
  status: BatchStatus
  responseRate: number
}

export interface Campaign {
  id: string
  name: Bi
  product: ProductId
  batches: Batch[]
}

// --- Mystery shopper --------------------------------------------------------

export type ChecklistItemType = 'passfail' | 'scale' | 'text'
export type EvidenceRequirement = 'none' | 'optional' | 'required'
export type EvidenceKind = 'photo' | 'audio' | 'screenshot'

export interface ChecklistItem {
  id: string
  text: Bi
  section: string
  weight: number
  type: ChecklistItemType
  critical: boolean
  evidence: EvidenceRequirement
  evidenceKinds: EvidenceKind[]
}

export type ChecklistStatus = 'draft' | 'published'

export interface Checklist {
  id: string
  name: Bi
  channel: ChannelId
  product: ProductId
  status: ChecklistStatus
  version: number
  items: ChecklistItem[]
}

export interface Scenario {
  id: string
  channel: ChannelId
  title: Bi
  tests: Bi
}

export type ShopperType = 'internal' | 'external'
export interface Shopper {
  id: string
  name: string
  type: ShopperType
  agency?: string
  email: string
  mobile: string
  languages: string[]
  shopsCompleted: number
  reliability: number
  active: boolean
}

export type AssignmentStatus =
  | 'sent'
  | 'opened'
  | 'progress'
  | 'submitted'
  | 'review'
  | 'approved'
  | 'returned'
  | 'overdue'

export interface Assignment {
  id: string
  checklistId: string
  scenarioId: string
  shopperId: string
  via: 'email' | 'wa' | 'sms'
  sentAt: string
  dueAt: string
  status: AssignmentStatus
  score?: number
  criticalFails?: number
}

// --- After-Sales desk --------------------------------------------------------

export type UnitStatus = 'ready' | 'offplan' | 'rental'
export type CallOutcome = 'reached' | 'no_answer' | 'busy' | 'callback' | 'wrong_number' | 'declined'

export interface AfterSalesQueueItem {
  id: string
  customerName: string
  mobileMasked: string
  unitStatus: UnitStatus
  surveyId: string
  assignedAgent: string
  tries: number
  maxTries: number
  dueAt: string
  nextTryAt?: string
  status: 'queued' | 'in_progress' | 'done' | 'exhausted'
  lastOutcome?: CallOutcome
}

// --- Standards -----------------------------------------------------------

export type StandardStatus = 'awaiting' | 'legal' | 'drafted'
export interface Standard {
  id: string
  name: Bi
  owner: string
  linkedItems: number
  status: StandardStatus
}

// --- Action effectiveness --------------------------------------------------

export interface EffectivenessRecord {
  typeId: string
  action: string
  startedMonth: number // index into series where the action took effect
  series: number[] // complaints per 100 customers, monthly
  reopenedBefore: number
  reopenedAfter: number
  satisfactionBefore: number
  satisfactionAfter: number
}
