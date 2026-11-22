import { useSyncExternalStore } from 'react'
import type { EnvId, RoleId } from '../types'

/**
 * The user directory (owner's request, 19 Nov): nobody picks a role on the sign-in screen any more. A super admin invites people by
 * email and gives each one a role; the invited person opens the invitation, sets a password and is signed in with that role.
 *
 * Prototype only: the directory lives in this browser's localStorage, no email is sent (the admin copies the invitation link) and
 * the password is not stored or checked. In the real platform this is the company sign-in and the directory behind it.
 */
export type UserStatus = 'invited' | 'active' | 'disabled'

export interface PortalUser {
  id: string
  email: string
  name: string
  roleId: RoleId
  /** Set when `roleId` is 'custom': which custom role (data/customRoles.ts). */
  customRoleId?: string
  /** Set for an Environment manager: which of the three environments is theirs. */
  envId?: EnvId
  status: UserStatus
  /** ISO date of the invitation. */
  invitedAt: string
  /** ISO date the invitation was accepted (the first sign-in). */
  activatedAt?: string
  /** The invitation code in the link; cleared once accepted. */
  inviteToken?: string
  /** Who sent the invitation (a user id). */
  invitedBy?: string
}

const STORAGE_KEY = 'psicx.users'

/** The sample directory on first run: one super admin plus one account per main role, so the demo still works end to end. */
const SEED_DATE = '2026-11-19T07:00:00.000Z'
const ADDED_SEED_IDS = ['u-cxteam2', 'u-cxteam3', 'u-admin2', 'u-viewer', 'u-env2', 'u-env3', 'u-salessupport']

export const SEED_USERS: PortalUser[] = [
  { id: 'u-admin', email: 'admin@psi.sample', name: 'Super admin', roleId: 'admin', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE },
  { id: 'u-admin2', email: 'admin2@psi.sample', name: 'Admin', roleId: 'useradmin', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-viewer', email: 'reporting.viewer@psi.sample', name: 'Reporting viewer', roleId: 'custom', customRoleId: 'cr-reporting-viewer', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-cxmgr', email: 'cx.manager@psi.sample', name: 'CX manager', roleId: 'cxmgr', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-cxteam', email: 'cx.team@psi.sample', name: 'Abeer', roleId: 'cxteam', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-cxteam2', email: 'cx.team2@psi.sample', name: 'Muhannad', roleId: 'cxteam', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-cxteam3', email: 'cx.team3@psi.sample', name: 'Dina', roleId: 'cxteam', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-env', email: 'env.manager@psi.sample', name: 'Dubai CEO', roleId: 'envmgmt', envId: 'dub', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-env2', email: 'env.manager.auh@psi.sample', name: 'Firas', roleId: 'envmgmt', envId: 'auh', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-env3', email: 'env.manager.assets@psi.sample', name: 'Niveen', roleId: 'envmgmt', envId: 'ast', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-salessupport', email: 'sales.support@psi.sample', name: 'Sales support', roleId: 'custom', customRoleId: 'cr-sales-support', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-mkt', email: 'marketing@psi.sample', name: 'Marketing manager', roleId: 'marketing', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-ld', email: 'ld@psi.sample', name: 'L&D manager', roleId: 'ld', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  { id: 'u-audit', email: 'audit@psi.sample', name: 'Internal Audit and Marketing Lead', roleId: 'auditmkt', status: 'active', invitedAt: SEED_DATE, activatedAt: SEED_DATE, invitedBy: 'u-admin' },
  // one open invitation, so the admin page shows what an invited (not yet active) person looks like
  { id: 'u-aslead', email: 'aftersales.lead@psi.sample', name: 'After-Sales team lead', roleId: 'aslead', status: 'invited', invitedAt: SEED_DATE, inviteToken: 'inv-sample-aslead', invitedBy: 'u-admin' },
]

let users: PortalUser[] = read()
const listeners = new Set<() => void>()

function read(): PortalUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PortalUser[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        // sample people added after a browser first stored the directory (the extra CX team members for the call assignments)
        const extra = SEED_USERS.filter((u) => ADDED_SEED_IDS.includes(u.id) && !parsed.some((x) => x.id === u.id)).map((u) => ({ ...u }))
        // the three CX team members carry names now (they were "CX team member" in an earlier version of the sample directory)
        const NAMES: Record<string, [string, string]> = { 'u-cxteam': ['CX team member', 'Abeer'], 'u-cxteam2': ['Second CX team member', 'Muhannad'], 'u-cxteam3': ['Third CX team member', 'Dina'], 'u-env': ['Environment manager', 'Dubai CEO'], 'u-env2': ['Abu Dhabi environment manager', 'Firas'], 'u-env3': ['PSI Assets environment manager', 'Niveen'] }
        const renamed = parsed.map((u) => (NAMES[u.id] && u.name === NAMES[u.id][0] ? { ...u, name: NAMES[u.id][1] } : u))
        return [...renamed, ...extra]
      }
    }
  } catch {
    /* storage unavailable: the seed lasts until reload */
  }
  return SEED_USERS.map((u) => ({ ...u }))
}

function write(next: PortalUser[]) {
  users = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listUsers(): PortalUser[] {
  return users
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function findUserByEmail(email: string): PortalUser | undefined {
  const key = normaliseEmail(email)
  return users.find((u) => u.email === key)
}

export function findUserByToken(token: string): PortalUser | undefined {
  return users.find((u) => u.inviteToken === token)
}

export function findUserById(id: string): PortalUser | undefined {
  return users.find((u) => u.id === id)
}

function token(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let out = 'inv-'
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export type InviteResult = { ok: true; user: PortalUser } | { ok: false; reason: 'exists' | 'invalid' }

/** Creates an invited user. The email must be new. */
export function inviteUser(input: { email: string; name: string; roleId: RoleId; customRoleId?: string; envId?: EnvId; invitedBy?: string }): InviteResult {
  const email = normaliseEmail(input.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'invalid' }
  if (users.some((u) => u.email === email)) return { ok: false, reason: 'exists' }
  const user: PortalUser = {
    id: `u-${Date.now().toString(36)}`,
    email,
    name: input.name.trim(),
    roleId: input.roleId,
    customRoleId: input.customRoleId,
    envId: input.roleId === 'envmgmt' ? (input.envId ?? 'dub') : undefined,
    status: 'invited',
    invitedAt: new Date().toISOString(),
    inviteToken: token(),
    invitedBy: input.invitedBy,
  }
  write([...users, user])
  return { ok: true, user }
}

/** A new invitation code for someone who has not accepted yet (the old link stops working). */
export function reissueInvite(id: string): PortalUser | undefined {
  let out: PortalUser | undefined
  write(
    users.map((u) => {
      if (u.id !== id || u.status === 'active') return u
      out = { ...u, status: 'invited', inviteToken: token(), invitedAt: new Date().toISOString() }
      return out
    }),
  )
  return out
}

export function setUserRole(id: string, roleId: RoleId, customRoleId?: string, envId?: EnvId) {
  write(users.map((u) => (u.id === id ? { ...u, roleId, customRoleId: roleId === 'custom' ? customRoleId : undefined, envId: roleId === 'envmgmt' ? (envId ?? u.envId ?? 'dub') : undefined } : u)))
}

export function setUserStatus(id: string, status: 'active' | 'disabled') {
  write(users.map((u) => (u.id === id ? { ...u, status } : u)))
}

/** The invited person accepted: active from now on, the invitation code is spent. */
export function acceptInvite(id: string, name?: string): PortalUser | undefined {
  let out: PortalUser | undefined
  write(
    users.map((u) => {
      if (u.id !== id) return u
      out = { ...u, status: 'active', activatedAt: new Date().toISOString(), inviteToken: undefined, name: name?.trim() || u.name }
      return out
    }),
  )
  return out
}

export function removeUser(id: string) {
  write(users.filter((u) => u.id !== id))
}

/** Back to the sample directory (the admin page's "Reset sample users"). */
export function resetUsers() {
  write(SEED_USERS.map((u) => ({ ...u })))
}

/** The invitation link for an invited user, on this origin. */
export function inviteLink(user: PortalUser): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/login?invite=${user.inviteToken ?? ''}`
}

/** Live view of the directory for components. */
export function useUsers(): PortalUser[] {
  return useSyncExternalStore(subscribe, listUsers, listUsers)
}

