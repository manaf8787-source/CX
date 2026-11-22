import { useSyncExternalStore } from 'react'
import { ACTIONS_TABS, CUSTOMERS_TABS, PRIMARY_NAV, SETTINGS_NAV } from './nav'
import { findUserById } from './users'
import type { Bi, EnvId } from '../types'

/**
 * Custom roles (owner's request, 22 Nov): the super admin does not create another super admin from the list. For anyone else who
 * does not fit a ready-made role, they choose "Other", name the role (for example "Admin") and tick, per screen, No access, View
 * only or Can edit. The role is saved and can be given to more people.
 *
 * Prototype: kept in this browser's localStorage. "No access" and "View only / Can edit" are enforced on screens here: a View-only
 * screen is opened with every button and field switched off. In the real platform each screen's actions are checked on the server.
 */
export type ScreenLevel = 'none' | 'view' | 'edit'

export interface CustomRole {
  id: string
  name: string
  /** Only 'view' and 'edit' are stored; a screen not listed is "No access". */
  screens: Record<string, Exclude<ScreenLevel, 'none'>>
}

export interface ScreenEntry {
  path: string
  label: Bi
}
export interface ScreenGroup {
  label: Bi
  screens: ScreenEntry[]
}

const only = (paths: string[], list: ScreenEntry[]) => list.filter((s) => paths.includes(s.path))

/** The screens the owner can tick, grouped like the menu. */
export const SCREEN_CATALOG: ScreenGroup[] = [
  { label: { en: 'Workspace', ar: 'مساحة العمل' }, screens: only(['/home', '/inbox', '/close-the-loop', '/overview', '/reports', '/agents/sales', '/agents/support'], PRIMARY_NAV[0].items) },
  { label: { en: 'Customers', ar: 'العملاء' }, screens: CUSTOMERS_TABS },
  { label: { en: 'Signals and fixes', ar: 'الإشارات والحلول' }, screens: ACTIONS_TABS },
  { label: { en: 'Settings and reference', ar: 'الإعدادات والمرجع' }, screens: SETTINGS_NAV },
  { label: { en: 'Administration', ar: 'الإدارة' }, screens: only(['/admin/users', '/admin/audit', '/admin/performance'], PRIMARY_NAV[1].items) },
]

const ALL_SCREENS = SCREEN_CATALOG.flatMap((g) => g.screens)

/** The sample custom role behind the demo account "Reporting viewer": read the Workspace screens, edit only My inbox. */
export const SEED_ROLES: CustomRole[] = [
  // 22 Nov (owner): reports only, as counts: no inbox, no incidents waiting for a reply, no names or case details
  { id: 'cr-reporting-viewer', name: 'Reporting viewer', screens: { '/reports': 'view' } },
  // the sales support team: creates and follows up leads, so it reads the sales agents report for every environment (view only)
  { id: 'cr-sales-support', name: 'Sales support', screens: { '/home': 'view', '/agents/sales': 'view' } },
]

const KEY = 'psicx.customRoles'
let roles: CustomRole[] = read()
const listeners = new Set<() => void>()
let rev = 0

function read(): CustomRole[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return [...(parsed as CustomRole[]), ...SEED_ROLES.filter((s) => !(parsed as CustomRole[]).some((r) => r.id === s.id))]
    }
  } catch {
    /* storage unavailable: custom roles last until reload */
  }
  return SEED_ROLES.map((r) => ({ ...r, screens: { ...r.screens } }))
}

function write(next: CustomRole[]) {
  roles = next
  rev++
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function listCustomRoles(): CustomRole[] {
  return roles
}
export function getCustomRole(id: string | undefined): CustomRole | undefined {
  return id ? roles.find((r) => r.id === id) : undefined
}

export function saveCustomRole(input: { id?: string; name: string; screens: CustomRole['screens'] }): CustomRole {
  const role: CustomRole = { id: input.id ?? `cr-${Date.now().toString(36)}`, name: input.name.trim(), screens: input.screens }
  write(input.id ? roles.map((r) => (r.id === input.id ? role : r)) : [...roles, role])
  return role
}

export function deleteCustomRole(id: string) {
  write(roles.filter((r) => r.id !== id))
}

export function useCustomRoles(): CustomRole[] {
  return useSyncExternalStore(subscribe, listCustomRoles, listCustomRoles)
}
/** Changes whenever a custom role or the signed-in person's custom role changes, so role-dependent values recompute. */
export function useCustomRolesRevision(): number {
  return useSyncExternalStore(subscribe, () => rev, () => rev)
}

// --- the signed-in person's custom role -----------------------------------------------------

let activeId: string | undefined = initialActive()
let activeEnv: EnvId | undefined = initialEnv()

function sessionUser() {
  try {
    const s = JSON.parse(localStorage.getItem('psicx.session') ?? 'null') as { userId?: string } | null
    return s?.userId ? findUserById(s.userId) : undefined
  } catch {
    return undefined
  }
}

function initialEnv(): EnvId | undefined {
  return sessionUser()?.envId
}

/** The environment of the signed-in Environment manager (each of the three has their own). */
export function activeEnvId(): EnvId | undefined {
  return activeEnv
}

function initialActive(): string | undefined {
  return sessionUser()?.customRoleId
}

export function setActiveCustomRole(id: string | undefined, envId?: EnvId) {
  activeId = id
  activeEnv = envId
  rev++
  listeners.forEach((l) => l())
}
export function activeCustomRole(): CustomRole | undefined {
  return getCustomRole(activeId)
}

/** The level the signed-in custom role has on a page: the most specific listed screen that contains it. */
export function customLevel(path: string): ScreenLevel {
  const role = activeCustomRole()
  if (!role) return 'none'
  let best: string | undefined
  for (const k of Object.keys(role.screens)) {
    if ((path === k || path.startsWith(`${k}/`)) && (!best || k.length > best.length)) best = k
  }
  return best ? role.screens[best] : 'none'
}

export function customAllowedPaths(): string[] {
  return Object.keys(activeCustomRole()?.screens ?? {})
}

/** First allowed screen in menu order: where a custom role lands after signing in. */
export function customHome(): string {
  const allowed = new Set(customAllowedPaths())
  return ALL_SCREENS.find((s) => allowed.has(s.path))?.path ?? [...allowed][0] ?? '/home'
}

export function customRoleLabel(id: string | undefined): string {
  return getCustomRole(id)?.name ?? 'Custom role'
}


