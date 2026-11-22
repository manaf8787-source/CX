import type { RoleId } from '../types'

/**
 * Which pages each role may open — Modules KB §2 ("Each role sees one to
 * five pages, inside its authority and its specialty. Only the CX manager has
 * the full view"). Paths are prefixes: '/actions' covers every Actions tab.
 * `null` means every page (CX manager and CX team).
 *
 * Mapping notes, kept literal to the §2 table:
 * - "Settings" for the Internal Audit and Marketing Lead is read as the
 *   Rules-as-configuration sub-page (KB §12 names it "Settings").
 * - "Training" for L&D is the L&D sub-page; "HR team" is HR team performance.
 * - The glossary ("What the terms mean") is open to everyone — KB §14 puts a
 *   button for it on every page.
 *
 * v40 changes (docs/V40_DELTA.md F35, derived from the prototype code; confirm with the owner):
 * - `/inbox` for every role that has Customers or Who is leaving (not L&D, HR, shopper).
 * - `/overview` ("6 · CX indicators", moved out of Settings) for CX, Executive and Internal Audit and Marketing Lead.
 *   The old `/settings/overview` is a redirect (see `legacyRedirect`), not a page of its own.
 * - Internal Audit and Marketing Lead gains `/customers` (it had Runaway and Personas); flagged: its role is "aggregates only".
 * - Data feeds, CRM mapping, Escalation matrix, Survey questions, Weekly sample, Public mentions for CX (all pages),
 *   Internal Audit and Marketing Lead and Executive; Public mentions also for Marketing.
 * - Surveys and triggers moved to `/settings/surveys`; Executive, Internal Audit and Marketing Lead, After-Sales lead and
 *   environment management keep it (the KB open item on Marketing stays open).
 */
const REGISTER_PAGES = [
  '/settings/feeds',
  '/settings/crm-mapping',
  '/settings/escalation-matrix',
  '/settings/weekly-sample',
  '/settings/public-mentions',
]

/**
 * v42 (F31): "Watch the AI team work" is open to the CX manager, the CX team (everything), environment management, Marketing, the
 * Internal Audit and Marketing Lead and Executive: the spec's list, which also holds every role that can open the agents page
 * (`/intelligent-cx-team`). The prototype adds it for every role that sees its agents page, which there includes the team lead and the
 * After-Sales lead; here those two cannot open the agents page, so they do not get it [Proposed].
 */
const WATCH_PAGE = '/settings/watch-ai-team'

/**
 * v42.1 (F33): the campaign audit is open to the Internal Audit and Marketing Lead and the CX manager (who mark the checks and decide, see
 * `canEditCampaignAudit`), the CX team (which creates the AI interview campaigns it gates, and reads), the Marketing manager and Executive (read).
 */
const CAMPAIGN_AUDIT_PAGE = '/settings/campaign-audit'

/** v43 (19 Nov): the user directory. The super admin edits it; the CX manager (every page) reads it. */
export const USERS_PAGE = '/admin/users'
/** v43: who opened what, when. The super admin only [Proposed]. */
export const AUDIT_PAGE = '/admin/audit'
/** 22 Nov: the CX manager's own team report (not the CX team's), and the all-users dashboard (the Admin and Super admin's, not CX's). */
export const TEAM_PERFORMANCE_PAGE = '/performance'
export const USER_PERFORMANCE_PAGE = '/admin/performance'

import { customAllowedPaths } from '../data/customRoles'

export const ROLE_PATHS: Record<RoleId, string[] | null> = {
  cxmgr: null,
  cxteam: null,
  envmgmt: ['/home', '/customers', '/runaway', '/actions', '/products/re', '/inbox', '/settings/surveys', WATCH_PAGE, '/agents'],
  teamlead: ['/home', '/customers', '/actions', '/inbox'],
  aslead: ['/home', '/customers', '/actions', '/settings/voc', '/products/af', '/inbox', '/settings/surveys'],
  ld: ['/actions', '/settings/standards', '/settings/ld'],
  hrspec: ['/actions', '/settings/hr-team'],
  hrmgr: ['/settings/hr-team'],
  marketing: ['/home', '/customers', '/runaway', '/personas', '/inbox', '/settings/public-mentions', WATCH_PAGE, CAMPAIGN_AUDIT_PAGE],
  auditmkt: [
    '/overview',
    '/customers',
    '/intelligent-cx-team',
    '/personas',
    '/runaway',
    '/inbox',
    '/settings/standards',
    '/settings/monthly-pack',
    '/settings/rules',
    '/settings/surveys',
    WATCH_PAGE,
    CAMPAIGN_AUDIT_PAGE,
    ...REGISTER_PAGES,
  ],
  exec: ['/home', '/customers', '/runaway', '/actions', '/personas', '/overview', '/settings/monthly-pack', '/inbox', '/settings/surveys', WATCH_PAGE, CAMPAIGN_AUDIT_PAGE, ...REGISTER_PAGES],
  shopper: ['/settings/mystery-shopper'],
  // v43: the super admin runs the user directory and nothing else.
  admin: [USERS_PAGE, AUDIT_PAGE, USER_PERFORMANCE_PAGE],
  // v43.2: the Admin runs the user list; the audit log stays with the super admin.
  useradmin: [USERS_PAGE, USER_PERFORMANCE_PAGE],
  // v43.1: a custom role's pages come from the role the super admin built (data/customRoles.ts), read live.
  custom: [],
}

const pathsFor = (role: RoleId) => (role === 'custom' ? customAllowedPaths() : ROLE_PATHS[role])

const OPEN_TO_ALL = ['/settings/glossary']

function matches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/** 22 Nov (owner): the campaign audit is not CX's: the Internal Audit and Marketing Lead owns it, so CX (who otherwise open every page) do not. */
const NOT_FOR_CX = [CAMPAIGN_AUDIT_PAGE]
const isCx = (role: RoleId) => role === 'cxmgr' || role === 'cxteam'

/** Pages a role may not open although its page list says "every page". */
function blocked(role: RoleId, path: string): boolean {
  if (isCx(role) && NOT_FOR_CX.some((p) => matches(path, p))) return true
  if (isCx(role) && matches(path, USER_PERFORMANCE_PAGE)) return true
  // the counts-only CX reports page is for custom roles (the Reporting viewer); the other roles have the full pages
  if (role !== 'custom' && matches(path, '/reports')) return true
  // the agent reports are the CX manager's and the environment CEOs'; the CX team does not open them
  if (role === 'cxteam' && matches(path, '/agents')) return true
  return role === 'cxteam' && matches(path, TEAM_PERFORMANCE_PAGE)
}

export function canAccessPath(role: RoleId, path: string): boolean {
  if (blocked(role, path)) return false
  const allowed = pathsFor(role)
  if (allowed === null) return true
  if (OPEN_TO_ALL.some((p) => matches(path, p))) return true
  // A parent route (e.g. '/settings') is reachable when any child is.
  if (allowed.some((p) => matches(path, p) || matches(p, path))) return true
  return false
}

/** True only for an exact page or a child of one — '/settings' alone is not a page. */
export function canOpenPage(role: RoleId, path: string): boolean {
  if (blocked(role, path)) return false
  const allowed = pathsFor(role)
  if (allowed === null) return true
  if (OPEN_TO_ALL.some((p) => matches(path, p))) return true
  return allowed.some((p) => matches(path, p))
}

/** First page under `section` this role may open, e.g. the first Settings sub-page. */
export function firstAllowedUnder(role: RoleId, section: string, candidates: string[]): string | undefined {
  return candidates.find((c) => matches(c, section) && canOpenPage(role, c))
}

/** KB §13: "The assistant is a button on every page for CX, Marketing,
 * executives and environment managers." */
const ASSISTANT_ROLES: ReadonlySet<RoleId> = new Set(['cxmgr', 'cxteam', 'marketing', 'exec', 'envmgmt'])

export function canUseAssistant(role: RoleId): boolean {
  return ASSISTANT_ROLES.has(role)
}

/** Who can invite, re-invite, change a role or deactivate: the super admin only. The CX manager sees the list [Proposed]. */
export function canManageUsers(role: RoleId): boolean {
  return role === 'admin' || role === 'useradmin'
}

/** Only the super admin creates, changes or deactivates an Admin or another super admin. */
export function canManageAdmins(role: RoleId): boolean {
  return role === 'admin'
}

