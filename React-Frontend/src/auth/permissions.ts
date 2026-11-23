import type { RoleId } from '../types'

/**
 * Actions-scoped, data-layer role gating (NFR-2): conversation text, agent
 * names, and "who owns vs. who is only informed" on a case/action. This is
 * deliberately narrower than the full sitewide authority matrix (the role x
 * capability grid under Settings → "AI Insights access matrix" is later,
 * separate page-content work — APPLICATION_MODULES.md §C) — it only encodes
 * the three things FUNCTIONAL_REQUIREMENTS.md names specifically for Actions.
 */

/** Conversation/interaction text: CX team + CX manager only. */
const CONVERSATION_TEXT_ROLES: ReadonlySet<RoleId> = new Set(['cxmgr', 'cxteam'])

export function canViewConversationText(role: RoleId): boolean {
  return CONVERSATION_TEXT_ROLES.has(role)
}

/** Agent names (owner's decision, 22 Nov: every signed-in person sees them, so a repeat on one agent can be traced; only the external mystery shopper sign-in does not). Before this: CX, plus the agent's own line management. Environment
 * management / team leads / After-Sales lead are "own management" for their
 * product; HR, L&D, Marketing, Audit, executives and the shopper sign-in
 * never see a real name, only a title. */
const AGENT_NAME_ROLES: ReadonlySet<RoleId> = new Set([
  'cxmgr',
  'cxteam',
  'envmgmt',
  'teamlead',
  'aslead',
  'ld',
  'hrspec',
  'hrmgr',
  'marketing',
  'auditmkt',
  'exec',
  'custom',
])

export function canViewAgentNames(role: RoleId): boolean {
  return AGENT_NAME_ROLES.has(role)
}

/** Top management / heads / C-level are informed only — never the owner of
 * a case or action, never in the approval chain. */
const INFORMED_ONLY_ROLES: ReadonlySet<RoleId> = new Set(['exec', 'hrmgr', 'auditmkt'])

export function isInformedOnly(role: RoleId): boolean {
  return INFORMED_ONLY_ROLES.has(role)
}

/** KB §1 / §17: the receiver of a case or action is the person who can fix
 * it, never top management — heads and C-level are informed only. Used to
 * refuse an owner title that names a head, a chief or the board. */
const TOP_MANAGEMENT_TITLE =
  /\b(head of|chief|ceo|coo|cfo|cto|c-level|chairman|board|managing director|general manager|vice president|vp)\b|رئيس|المدير العام|الرئيس التنفيذي|مجلس الإدارة/i

export function isTopManagementTitle(title: string): boolean {
  return TOP_MANAGEMENT_TITLE.test(title)
}

/** FR-4.3 — an "employee" kind action is always a management note to the
 * direct manager only: never a case, never HR, never a name outside that
 * line. Everyone else sees it purely as "informed", nobody outside CX/the
 * line manager can act on it. */
const EMPLOYEE_NOTE_ACTOR_ROLES: ReadonlySet<RoleId> = new Set(['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead'])

export function canActOnCorrectiveAction(role: RoleId, kind: string): boolean {
  if (kind === 'employee') return EMPLOYEE_NOTE_ACTOR_ROLES.has(role) && role !== 'exec'
  if (isInformedOnly(role)) return false
  return role === 'cxmgr' || role === 'cxteam' || role === 'envmgmt' || role === 'teamlead' || role === 'aslead'
}

/**
 * v40.1 — the 60-day check is closed by a person in CX, never by the receiver of the fix (prototype `isCX()`: the CX manager and the
 * CX team): the verdict (effective, partial, failed) and, after a partial or failed one, decision 3 (a second step, an investigation,
 * or accept as is). The automatic readout is only the evidence. Everyone else, the owner included, reads the result and sees no button.
 */
export function canRecordFixVerdict(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam'
}

/** FR-4.15 — conduct issues route through the HR pool; the agent's direct
 * manager reviews HR's actions. HR specialists write, HR managers are
 * informed-only, so they never get a decision control either. */
export function canActOnShopperCase(role: RoleId): boolean {
  if (isInformedOnly(role)) return false
  return role === 'cxmgr' || role === 'cxteam' || role === 'hrspec' || role === 'envmgmt' || role === 'teamlead' || role === 'aslead'
}

/** FR-6.4 — "The CX manager names/approves personas." Marketing only
 * receives personas and campaign recommendations; it does not approve them. */
export function canApprovePersona(role: RoleId): boolean {
  // 22 Nov (owner): naming and approving personas is not CX's job; it is the Internal Audit and Marketing Lead's.
  return role === 'auditmkt'
}

/** FR-6.4 — "the Internal Audit and Marketing Lead audits personas and
 * campaign criteria." Read-only for everyone else; the CX manager can also
 * see the audit note alongside their own approval decision. */
export function canViewPersonaAudit(role: RoleId): boolean {
  return role === 'auditmkt'
}

/** 22 Nov (owner): the team performance report is the CX manager's (his own team); the user performance dashboard is the Admin's and the Super admin's. Export: the Super admin and the CX manager. */
export function canViewTeamPerformance(role: RoleId): boolean {
  return role === 'cxmgr'
}
export function canViewUserPerformance(role: RoleId): boolean {
  return role === 'admin' || role === 'useradmin'
}
export function canExportPerformance(role: RoleId): boolean {
  return role === 'admin' || role === 'cxmgr'
}

/** v40 (F35): the CRM mapping and the escalation matrix are filled by the CX manager and the Internal Audit and Marketing Lead; everyone else reads. Feeds are read-only for everyone. */
export function canEditCrmMapping(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'auditmkt'
}

export function canEditEscalationMatrix(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'auditmkt'
}

/** v40 (F31): the weekly sample is judged by the CX manager, the CX team and the Internal Audit and Marketing Lead (the spec: "the CX team and the Internal Audit and Marketing Lead"); Executive reads. */
export function canJudgeSample(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam' || role === 'auditmkt'
}

/** v41.1 (F29): the "Open" button on a weekly-sample row takes a reader to the record (a fix, a signal, a customer): CX roles only. Everyone else reads ids and titles. */
export function canOpenSampleRecord(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam'
}

/**
 * v42.1 (F32): the weekly sample is split by reader. The Internal Audit and Marketing Lead reads the audit rows (routing, classification, counts,
 * access, targeting); every other role that opens the page reads the content rows (proposed fixes, interview briefs, journey readings): the
 * CX manager and the CX team judge them, the Executive only reads. This is the prototype's `wsReader`, keyed by role.
 */
export function sampleReaderOf(role: RoleId): 'cx' | 'audit' {
  return role === 'auditmkt' ? 'audit' : 'cx'
}

/**
 * Customer names (decided 18 Nov: "no customer names to Internal Audit"): every role that works with people may see them,
 * except the Internal Audit and Marketing Lead, who sees aggregates and the reference (`P-005`) instead. The Customers list,
 * Who is leaving, the weekly sample and the exports all follow this one rule (`personLabel` in `utils/peopleExport.ts`).
 */
const CUSTOMER_NAME_ROLES: ReadonlySet<RoleId> = new Set(['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'marketing', 'exec'])

export function canViewCustomerNames(role: RoleId): boolean {
  return CUSTOMER_NAME_ROLES.has(role)
}

/** Decided 18 Nov: exports show mobiles only to roles that may see names. */
export function canViewMobiles(role: RoleId): boolean {
  return canViewCustomerNames(role)
}

/** Names in the weekly sample follow the customer-names rule: not for the Internal Audit and Marketing Lead. */
export function canViewNamesInSample(role: RoleId): boolean {
  return canViewCustomerNames(role)
}

/** v40 (F30): "Mark replied" on a public mention: CX roles and Marketing. */
/** 23 Nov (owner): a human from the CX team replies to public comments (the human touch first; the AI does not reply). Marketing reads. */
export function canMarkMentionReplied(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam'
}

/** 23 Nov: the reply scripts and common questions of Public mentions are edited by the CX manager only; everyone who opens the page reads them. */
export function canEditReplyLibrary(role: RoleId): boolean {
  return role === 'cxmgr'
}

/** v40 (F27): recording a call attempt ("No answer") is a CX action. */
export function canRecordCallAttempt(role: RoleId): boolean {
  // 22 Nov (owner): the CX manager does not make the calls; the CX team does (and the manager decides who).
  return role === 'cxteam'
}

/** 22 Nov (owner): the CX manager gives a close-the-loop case to a CX team member, or asks for another call. */
export function canAssignCalls(role: RoleId): boolean {
  return role === 'cxmgr'
}

/**
 * v42.1 (F33, Decision 4): the Internal Audit and Marketing Lead and the CX manager mark the five checks and clear a campaign or send it
 * back; everyone else who can open the page (the CX team, the Marketing manager, Executive) reads the marks and the verdict.
 * The audit role audits and never approves a fix (Decision 2): `canActOnCorrectiveAction` stays false for it.
 */
export function canEditCampaignAudit(role: RoleId): boolean {
  // 22 Nov (owner): the campaign audit belongs to the Internal Audit and Marketing Lead, not to CX.
  return role === 'auditmkt'
}

/**
 * v42.1 (F33) [Proposed]: who starts a cleared campaign (and marks it finished). Neither flow had a start action before: an AI interview
 * campaign is created by the CX manager and the CX team (Close the loop), a persona campaign is Marketing's ("Marketing runs it"), with the
 * CX manager as backup. The audit role never starts one: it audits what others run.
 */
export function canStartCampaign(role: RoleId, kind: 'persona' | 'ai'): boolean {
  return kind === 'ai' ? role === 'cxmgr' || role === 'cxteam' : role === 'marketing' || role === 'cxmgr'
}

export interface AgentDisplay {
  visible: boolean
  label: string
}

/** Resolve an agent reference to either a real display name (role allowed)
 * or a safe fallback — the direct manager's title, never the bare ref. */
export function resolveAgentDisplay(
  agentRef: string | undefined,
  role: RoleId,
  directory: { agentRef: string; displayName: string; directManagerTitle: string; visibleTo: RoleId[] }[],
  fallback: { en: string; ar: string },
  lang: 'en' | 'ar',
): AgentDisplay {
  if (!agentRef) return { visible: false, label: fallback[lang] }
  const entry = directory.find((d) => d.agentRef === agentRef)
  if (!entry) return { visible: false, label: fallback[lang] }
  if (canViewAgentNames(role) && entry.visibleTo.includes(role)) return { visible: true, label: entry.displayName }
  return { visible: false, label: entry.directManagerTitle }
}
