import type { Bi, ChannelId, EnvId, ProductId } from './common'
import type { CorrectiveActionStatus, SignalKind } from './domain'

/**
 * Types added for prototype v39/v40 (docs/V40_DELTA.md). Foundation owns this file;
 * workstreams A, B, C import from `@/types` and never edit it.
 */

// --- Six-step line (F02, F07) ------------------------------------------------

export type StepId = 'ev' | 'sg' | 'pt' | 'ca' | 'vr' | 'rp'

export interface StepDef {
  id: StepId
  n: 1 | 2 | 3 | 4 | 5 | 6
  /** e.g. "1 Listen" / "1 نسمع" */
  name: Bi
  /** e.g. "Every contact from every source lands on one person" */
  title: Bi
  /** Route the step opens (and an optional hash, e.g. the patterns section). */
  to: string
  hash?: string
}

// --- Trace (F10, F11, F12) ---------------------------------------------------

export type TraceKind = 'event' | 'signal' | 'pattern' | 'fix' | 'check' | 'report'

export interface TraceEventRef {
  id: string
  /** `EV-n` */
  traceId: string
  channel: ChannelId
  occurredAt: string
  personId: string
}

export interface TraceSignalRef {
  id: string
  /** `SG-n`, or `PUB-3nn` for a public mention */
  traceId: string
  occurredAt: string
  kind: SignalKind
}

export interface TracePatternRef {
  id: string
  /** `PT-nnn` */
  traceId: string
  signalCount: number
}

export interface TraceFixRef {
  id: string
  /** `CA-2nn` */
  traceId: string
  status: CorrectiveActionStatus
}

export interface TraceCheckRef {
  /** `VR-n` (the fix number) */
  traceId: string
  fixId: string
  dueAt: string
  status: CorrectiveActionStatus
}

export interface TraceReportRef {
  /** `RP-2026-11` */
  traceId: string
  label: Bi
}

/** The id chain EV, SG, PT, CA, VR, RP, walkable from any record. Empty arrays and
 * undefined cells mean "none linked" / "under the line" / "none yet" / "not yet". */
export interface TraceChain {
  /** Which record the chain was started from. */
  from: { kind: TraceKind; id: string }
  events: TraceEventRef[]
  signals: TraceSignalRef[]
  pattern?: TracePatternRef
  fix?: TraceFixRef
  check?: TraceCheckRef
  report?: TraceReportRef
  /** True when the chain starts from a public mention: no person, no events. */
  publicMention: boolean
}

// --- Data feeds (F13, F14) ---------------------------------------------------

export type FeedStatus = 'ok' | 'late' | 'down'

export interface DataFeed {
  id: string
  /** Absent for a shared feed. */
  env?: EnvId
  name: Bi
  /** When the last file arrived (ISO). */
  receivedAt: string
  /** Whether the last file is today's, yesterday's, or missing. */
  status: FeedStatus
  /** Records in the last file. */
  rows: number
  note: Bi
}

/** What the "Data as of" bar needs. */
export interface FeedScope {
  /** The latest `receivedAt` among the feeds in scope (ISO), or null with no feeds. */
  asOf: string | null
  /** Feeds in scope whose status is not 'ok'. */
  lateCount: number
  /** Shared feeds plus the CRM feeds of the selected environment (or all three). */
  feeds: DataFeed[]
}

// --- CRM mapping (F15) -------------------------------------------------------

export type MappingKind = 'src' | 'stg' | 'act'

export interface MappingOption {
  id: string
  label: Bi
}

export interface MappingRow {
  kind: MappingKind
  /** The value as the CRM spells it (not translated). */
  crmValue: string
  /** Id of a MappingOption of the same kind ('ignore' is always an option). */
  portalValue: string
  /**
   * The CRM owner has confirmed this row. Absent or false = still `[Proposed]` (the data default: nothing is confirmed
   * until the owner says so). Changing the portal value clears it again.
   */
  confirmed?: boolean
}

export interface CrmMapping {
  rows: MappingRow[]
  options: Record<MappingKind, MappingOption[]>
}

// --- Escalation matrix (F22) -------------------------------------------------

/** The twelve rows of the matrix (v42, set 19 Nov): eight fix kinds, two case types, a data-exposure row, and `vip`, which is a rule and not a receiver. */
export type MatrixKind =
  | 'employee'
  | 'service'
  | 'training'
  | 'process'
  | 'product'
  | 'environment'
  | 'legal'
  | 'marketing'
  | 'shopper_critical'
  | 'legal_case'
  | 'infosec'
  | 'vip'

/** The eleven rows that hold cells (everything but the `vip` rule row). */
export type MatrixCellKind = Exclude<MatrixKind, 'vip'>

export type MatrixField = 'receiver' | 'informed' | 'backup' | 'respondH' | 'resolveH'

/** The two clock fields. */
export type MatrixClockField = 'respondH' | 'resolveH'

/** Titles only, never names. `null` = nobody ("–"). Hours are working hours (9 = one working day, 45 = one week). */
export interface MatrixCells {
  receiver: Bi | null
  informed: Bi | null
  backup: Bi | null
  respondH: number | null
  resolveH: number | null
  /** A clock the document writes in working days ("1 day", "5 days"): the value stays hours (1 day = 9 h) and only the display changes. Absent = hours. An edit clears it. */
  asDays?: Partial<Record<MatrixClockField, true>>
}

/** One row with cells. `edited` marks a cell someone changed after the 19 Nov set (a seeded cell is false). */
export interface MatrixCellRow {
  kind: MatrixCellKind
  label: Bi
  cells: MatrixCells
  edited: Record<MatrixField, boolean>
}

/**
 * The VIP rule (a person tagged VIP in the CRM: Club member, investor, portfolio owner): both clocks are multiplied by `factor`, the
 * head of the environment is added to "informed" at once, the CX manager becomes the backup. A rule, not a receiver and not a number of hours.
 */
export interface VipRule {
  factor: number
  /** Shown in the table: "Same receiver, clocks halved". */
  receiver: Bi
  /** Shown in the table: "Head of the environment at once". */
  informed: Bi
  /** The title added to "informed": "Head of the environment". */
  informedTitle: Bi
  /** The backup title: "CX manager". */
  backup: Bi
}

export interface MatrixRuleRow {
  kind: 'vip'
  label: Bi
  rule: VipRule
}

export type MatrixRow = MatrixCellRow | MatrixRuleRow

/** Where the fix's matrix line comes from (F22): the fix's product, else its first signal's product, else Real Estate. */
export interface FixMatrixLine {
  product: ProductId
  kind: MatrixCellKind
  row: MatrixCellRow
  /** The product's VIP rule (the `vip` row). */
  rule: VipRule
}

// --- Survey questions (F23) --------------------------------------------------

export interface SurveyQuestionSet {
  product: ProductId
  id: string
  name: Bi
  when: Bi
  questions: Bi[]
  /** Wording not confirmed by the owner or product owners (PSI Club, Tour Estate, PSI Events are not launched). */
  proposed?: boolean
}

// --- My inbox (F20) ----------------------------------------------------------

export type InboxKind = 'approve' | 'do' | 'verify' | 'call' | 'inv' | 'sample'

export interface InboxItem {
  id: string
  kind: InboxKind
  text: Bi
  /** Days left (negative = late); null when the item has no date. */
  daysLeft: number | null
  /** 'wd' = working days, 'd' = calendar days. */
  unit: 'wd' | 'd'
  /** Who it is with (an owner title, "Agent 6", "AI campaign camp-ai-1", "CX team"); null when nobody. */
  who: Bi | null
  /** 0 normal, 1 attention, 2 urgent. Higher first, then fewest days left, items without a date last. */
  priority: 0 | 1 | 2
  /** Route that opens the record, e.g. `/actions/corrective?fix=CA-201`. */
  target: string
  critical?: boolean
}

export type DayChipState = 'overdue' | 'late' | 'today' | 'soon' | 'ok' | 'none'

// --- Weekly sample (F31) -----------------------------------------------------

export interface WeeklySampleItem {
  id: string
  /** Agent number 1..10. */
  agent: number
  kind: Bi
  /** What the agent produced, in one line (v41.1 F29). Never contains a customer name (see `personId`). */
  text: Bi
  /** What the agent saw: the input it worked from, in one line (v41.1 F29). Built from structured facts; never a customer or agent name and never conversation text. */
  saw: Bi
  /** Trace id of the record the output is about (SG-, CA-, EV-, or a person id). */
  ref: string
  /** Where the "Open" button goes, for CX roles only: a trace record the trace host opens, or a route. Absent when there is nothing to open. */
  open?: { traceKind: TraceKind; id: string } | { to: string }
  /** Set when the output is about a person; resolve the name only for roles allowed to see names. */
  personId?: string
  /** true = right, false = wrong (a wrong verdict becomes a test), null = not read yet. */
  verdict: boolean | null
  judgedAt?: string
}

// --- Fix clocks (decided 18 Nov) -------------------------------------------------

export interface FixDue {
  /** ISO. */
  dueAt: string
  /** 'matrix' = the matrix "Resolve (h)" in working hours from approval; 'fallback' = Agent 5's 14 days (the cell was empty). */
  source: 'matrix' | 'fallback'
  /** The working hours used, when the matrix gave them. */
  hours?: number
}

// --- Weekly sample effect on the supervisor (decided 18 Nov) ------------------------

/** A "wrong" verdict becomes a test case for the supervisor. */
export interface SupervisorTest {
  id: string
  /** The sample item that failed. */
  fromSampleId: string
  agent: number
  text: Bi
  createdAt: string
}

export interface AgentPassRate {
  agent: number
  /** The pass rate before the week's verdicts (the sample figure on the agents page); null = not running. */
  base: number | null
  /** After the week's "wrong" verdicts. */
  current: number | null
  /** Outputs of this agent in the week's sample. */
  sampled: number
  wrong: number
  tests: number
}

// --- Indicators and brief inputs (F03, F09) ---------------------------------

export interface IndicatorSet {
  productId: ProductId
  /** Signed NPS, null with no answers. */
  nps: number | null
  /** Average satisfied %, null with no answers. */
  csat: number | null
  /** Share who answered 4 or 5, from the CES sample table; null = not asked yet. */
  ces: number | null
  answers: number
  /** NPS points against last month, from the monthly series; null when there is no series. */
  deltaVsLastMonth: number | null
}

/** Numbers the Daily brief (Agent 9) reads: the same registers the pages show. */
export interface BriefInputs {
  windowDays: number
  signals: { inWindow: number; patternsOverLine: number; patternsWaitingForFix: number }
  fixes: { proposed: number; inProgress: number; late: number; effective: number; failed: number }
  shopper: { open: number; late: number }
  loop: { open: number; critical: number; recoveredByPhonePct: number | null; recoveredByAiPct: number | null }
  people: { drifting: number; total: number }
  /** `overdue` = mentions with no reply past the reply clock: CX raises a signal for each (decided 18 Nov). */
  publicMentions: { last30: number; overdue: number; negativePct: number | null; avgReplyHours: number | null; target: number }
  ldFixes: number
  conductNotes: number
  sample: { toRead: number; read: number }
}

// --- Next-step helper (F07) ---------------------------------------------------

export interface NextStep {
  step: StepId
  text: Bi
  /** "within 5 working days", "at 60 days", ... */
  due?: Bi
}
