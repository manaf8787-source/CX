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
 */
const ROLE_PATHS: Record<RoleId, string[] | null> = {
  cxmgr: null,
  cxteam: null,
  envmgmt: ['/home', '/customers', '/runaway', '/actions', '/products/re'],
  teamlead: ['/home', '/customers', '/actions'],
  aslead: ['/home', '/customers', '/actions', '/settings/voc', '/products/af'],
  ld: ['/actions', '/settings/standards', '/settings/ld'],
  hrspec: ['/actions', '/settings/hr-team'],
  hrmgr: ['/settings/hr-team'],
  marketing: ['/home', '/customers', '/runaway', '/personas'],
  auditmkt: [
    '/settings/overview',
    '/intelligent-cx-team',
    '/personas',
    '/runaway',
    '/settings/standards',
    '/settings/monthly-pack',
    '/settings/rules',
  ],
  exec: ['/home', '/customers', '/runaway', '/actions', '/personas', '/settings/overview', '/settings/monthly-pack'],
  shopper: ['/settings/mystery-shopper'],
}

const OPEN_TO_ALL = ['/settings/glossary']

function matches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function canAccessPath(role: RoleId, path: string): boolean {
  const allowed = ROLE_PATHS[role]
  if (allowed === null) return true
  if (OPEN_TO_ALL.some((p) => matches(path, p))) return true
  // A parent route (e.g. '/settings') is reachable when any child is.
  if (allowed.some((p) => matches(path, p) || matches(p, path))) return true
  return false
}

/** True only for an exact page or a child of one — '/settings' alone is not a page. */
export function canOpenPage(role: RoleId, path: string): boolean {
  const allowed = ROLE_PATHS[role]
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
