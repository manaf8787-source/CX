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

/** Agent names: CX, plus the agent's own line management. Environment
 * management / team leads / After-Sales lead are "own management" for their
 * product; HR, L&D, Marketing, Audit, executives and the shopper sign-in
 * never see a real name, only a title. */
const AGENT_NAME_ROLES: ReadonlySet<RoleId> = new Set(['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead'])

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
const TOP_MANAGEMENT_TITLE = /\b(head of|chief|ceo|coo|cfo|cto|c-level|chairman|board|managing director|general manager|vice president|vp)\b|رئيس|المدير العام|الرئيس التنفيذي|مجلس الإدارة/i

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
  return role === 'cxmgr'
}

/** FR-6.4 — "the Internal Audit and Marketing Lead audits personas and
 * campaign criteria." Read-only for everyone else; the CX manager can also
 * see the audit note alongside their own approval decision. */
export function canViewPersonaAudit(role: RoleId): boolean {
  return role === 'auditmkt' || role === 'cxmgr'
}

/** v40 (F35): the CRM mapping and the escalation matrix are filled by the CX manager and the Internal Audit and Marketing Lead; everyone else reads. Feeds are read-only for everyone. */
export function canEditCrmMapping(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'auditmkt'
}

export function canEditEscalationMatrix(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'auditmkt'
}

/** v40 (F31) [Proposed]: the weekly sample is judged by the CX manager, the CX team and the Internal Audit and Marketing Lead; Executive reads. */
export function canJudgeSample(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam' || role === 'auditmkt'
}

/** v40 (F31) [Proposed]: customer names in the weekly sample only for the CX manager and the CX team; everyone else sees the reference (`P-005`), never a name. */
export function canViewNamesInSample(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam'
}

/** v40 (F30): "Mark replied" on a public mention: CX roles and Marketing. */
export function canMarkMentionReplied(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam' || role === 'marketing'
}

/** v40 (F27): recording a call attempt ("No answer") is a CX action. */
export function canRecordCallAttempt(role: RoleId): boolean {
  return role === 'cxmgr' || role === 'cxteam'
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
