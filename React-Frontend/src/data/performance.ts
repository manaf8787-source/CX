import { useMemo } from 'react'
import { ENVIRONMENTS } from './environments'
import { seededRandom } from '../utils/random'
import type { CorrectiveAction, DetractorCallItem } from '../types'
import type { PortalUser } from './users'
import type { CallAssignment } from './callAssignments'
import type { PublicMention } from './v38Reference'

/**
 * Performance of the people who receive work in the portal (owner's request, 22 Nov): the CX manager sees his own team for appraisal,
 * the Admin and Super admin see every user, so a late owner (the L&D manager on a fix the CX manager approved) shows up.
 *
 * One record per piece of work a person received ("a case"): a close-the-loop call, or a corrective action they own. From the records:
 * received, closed on time, breached (closed late, or still open past its date), response rate (the first reply happened), resolving
 * rate (closed and the problem solved), escalated, and the average hours to the first reply.
 *
 * Prototype: the portal holds only the current month of work, so the earlier months of the three CX team members are a deterministic
 * sample (the same on every reload), and today's work is read live (assignments on Close the loop, the fixes register). In the real
 * platform every number comes from the timestamps on the case record: received, first reply, closed, due.
 */
/** 23 Nov (owner): 'mention' is a public comment on Facebook, Instagram, LinkedIn or Google the member had to reply to. */
export type CaseKind = 'call' | 'fix' | 'mention'

export interface PerfCase {
  id: string
  userId: string
  kind: CaseKind
  /** A readable reference for the export (the call row id or the fix id). */
  ref: string
  receivedAt: string
  dueAt: string
  /** The first reply happened (a call was attempted, a fix was started). */
  responded: boolean
  /** Hours from received to the first reply; absent when nobody replied yet. */
  responseHours?: number
  closedAt?: string
  resolved?: boolean
  escalated?: boolean
  /** Sample history (true) or read from today's live registers (false). */
  sample: boolean
}

export interface PerfMetrics {
  received: number
  open: number
  closed: number
  closedOnTime: number
  /** Closed after the date, plus still open past the date. */
  breached: number
  breachedOpen: number
  onTimeRate: number | null
  responseRate: number | null
  resolveRate: number | null
  escalated: number
  avgResponseHours: number | null
}

const DAY = 86_400_000
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null)

export function computeMetrics(cases: readonly PerfCase[], nowMs: number): PerfMetrics {
  const closed = cases.filter((c) => c.closedAt)
  const open = cases.filter((c) => !c.closedAt)
  const closedOnTime = closed.filter((c) => c.closedAt! <= c.dueAt).length
  const breachedClosed = closed.length - closedOnTime
  const breachedOpen = open.filter((c) => new Date(c.dueAt).getTime() < nowMs).length
  const hours = cases.map((c) => c.responseHours).filter((h): h is number => h !== undefined)
  return {
    received: cases.length,
    open: open.length,
    closed: closed.length,
    closedOnTime,
    breached: breachedClosed + breachedOpen,
    breachedOpen,
    onTimeRate: pct(closedOnTime, closed.length),
    responseRate: pct(cases.filter((c) => c.responded).length, cases.length),
    resolveRate: pct(closed.filter((c) => c.resolved).length, closed.length),
    escalated: cases.filter((c) => c.escalated).length,
    avgResponseHours: hours.length ? Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 10) / 10 : null,
  }
}

/** The days of a range as ISO bounds: from the start of `from` to the end of `to` (both YYYY-MM-DD, inclusive). */
export function inRange(c: PerfCase, from: string, to: string): boolean {
  const day = c.receivedAt.slice(0, 10)
  return day >= from && day <= to
}

// --- sample history for the three CX team members ------------------------------------------------------------------

interface Profile {
  perMonth: [number, number]
  onTime: number
  respond: number
  resolve: number
  escalate: number
  /** Typical hours to the first reply. */
  hours: number
}

const PROFILES: Record<string, Profile> = {
  'u-cxteam': { perMonth: [26, 34], onTime: 0.93, respond: 0.97, resolve: 0.74, escalate: 0.05, hours: 3.5 },
  'u-cxteam2': { perMonth: [22, 30], onTime: 0.8, respond: 0.9, resolve: 0.62, escalate: 0.09, hours: 7 },
  'u-cxteam3': { perMonth: [18, 26], onTime: 0.66, respond: 0.82, resolve: 0.5, escalate: 0.15, hours: 12 },
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Five earlier months of sample work for one CX team member, ending the day before the current month starts. */
export function sampleHistory(userId: string, nowMs: number): PerfCase[] {
  const p = PROFILES[userId]
  if (!p) return []
  const rng = seededRandom(hashSeed(userId))
  const out: PerfCase[] = []
  const now = new Date(nowMs)
  for (let m = 5; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 0)
    const lastDay = m === 0 ? Math.max(1, now.getDate() - 1) : end.getDate()
    // a seasonal wobble so the trend is not flat
    const count = Math.round(p.perMonth[0] + rng() * (p.perMonth[1] - p.perMonth[0]) + Math.sin((start.getMonth() / 12) * Math.PI * 2) * 2)
    for (let i = 0; i < count; i++) {
      const received = new Date(start.getFullYear(), start.getMonth(), 1 + Math.floor(rng() * lastDay), 8 + Math.floor(rng() * 9))
      const due = new Date(received.getTime() + 5 * DAY)
      const responded = rng() < p.respond
      const respHours = responded ? Math.max(0.5, Math.round(p.hours * (0.4 + rng() * 1.4) * 10) / 10) : undefined
      // work from the current month may still be open; older work is closed
      const stillOpen = due.getTime() > nowMs && rng() < 0.55
      const wasOnTime = rng() < p.onTime
      const closedAt =
        stillOpen || !responded ? undefined : new Date(wasOnTime ? received.getTime() + (1 + rng() * 3.8) * DAY : due.getTime() + (0.5 + rng() * 4) * DAY)
      const closed = closedAt && closedAt.getTime() <= nowMs ? closedAt : undefined
      out.push({
        id: `s-${userId}-${m}-${i}`,
        userId,
        kind: 'call',
        ref: `S-${userId.replace('u-', '')}-${String(m)}${String(i).padStart(2, '0')}`,
        receivedAt: received.toISOString(),
        dueAt: due.toISOString(),
        responded,
        responseHours: respHours,
        closedAt: closed?.toISOString(),
        resolved: closed ? rng() < p.resolve / (p.respond || 1) : undefined,
        escalated: rng() < p.escalate,
        sample: true,
      })
    }
  }
  return out
}

// --- live work -----------------------------------------------------------------------------------------------------------

/** Close-the-loop calls the manager has given to team members (the live assignments of the prototype). */
export function liveCalls(items: readonly DetractorCallItem[], assignments: Record<string, CallAssignment>, nowMs: number): PerfCase[] {
  const out: PerfCase[] = []
  for (const i of items) {
    const a = assignments[i.id]
    if (!a) continue
    const done = i.status === 'done' || !!i.outcome
    const due = i.dueOn ? new Date(`${i.dueOn}T23:59:59`).toISOString() : new Date(new Date(a.at).getTime() + 5 * DAY).toISOString()
    out.push({
      id: `live-${i.id}`,
      userId: a.userId,
      kind: 'call',
      ref: i.id,
      receivedAt: a.at,
      dueAt: due,
      responded: i.attempts > 0 || done,
      responseHours: i.attempts > 0 || done ? Math.max(0.5, Math.round(((nowMs - new Date(a.at).getTime()) / 3_600_000) * 10) / 10) : undefined,
      closedAt: done ? new Date(Math.min(nowMs, new Date(a.at).getTime() + DAY)).toISOString() : undefined,
      resolved: done ? i.outcome === 'resolved_on_call' || i.outcome === 'reached' : undefined,
      escalated: i.status === 'needs_human',
      sample: false,
    })
  }
  return out
}

/**
 * Public comments (owner, 23 Nov): each is a case for the CX team member it is assigned to. Due = posted + the reply SLA (48 h by default);
 * closed when replied; past the SLA with no reply it is breached and escalated to the CX manager.
 */
export function mentionCases(mentions: readonly PublicMention[], slaHours: number, nowMs: number): PerfCase[] {
  return mentions
    .filter((m) => m.assignee)
    .map((m) => {
      const received = Date.parse(`${m.date}T09:00:00`)
      const due = received + slaHours * 3_600_000
      const closed = m.replied ? Math.min(nowMs, received + (m.replyHours ?? 1) * 3_600_000) : undefined
      return {
        id: `mention-${m.id}`,
        userId: m.assignee!,
        kind: 'mention' as const,
        ref: m.id,
        receivedAt: new Date(received).toISOString(),
        dueAt: new Date(due).toISOString(),
        responded: m.replied,
        responseHours: m.replied ? (m.replyHours ?? undefined) : undefined,
        closedAt: closed ? new Date(closed).toISOString() : undefined,
        resolved: m.replied ? m.sentiment >= 0 || m.becameIdentified : undefined,
        escalated: m.replied ? (m.replyHours ?? 0) > slaHours : nowMs > due,
        sample: false,
      }
    })
}

/** Who a fix's owner title maps to in the directory: by the role the title names. Anything else is an owner with no portal user yet. */
export function fixOwnerKey(owner: string, users: readonly PortalUser[]): { key: string; label: string; external: boolean } {
  const byRole = (roleId: string) => users.find((u) => u.roleId === roleId && u.status === 'active')
  const pick = (roleId: string) => {
    const u = byRole(roleId)
    return u ? { key: u.id, label: u.name, external: false } : { key: `ext:${owner}`, label: owner, external: true }
  }
  if (/L&D/i.test(owner)) return pick('ld')
  if (/environment manager|^Direct manager/i.test(owner)) {
    // "Direct manager (PSI Assets environment manager)" and "Abu Dhabi environment manager": the CEO of that environment
    const short = /\((.+) environment manager\)/i.exec(owner)?.[1] ?? /^(.+) environment manager$/i.exec(owner)?.[1]
    const env = ENVIRONMENTS.find((e) => e.short.toLowerCase() === (short ?? '').toLowerCase())
    const u = env && users.find((x) => x.roleId === 'envmgmt' && x.envId === env.id && x.status === 'active')
    if (u) return { key: u.id, label: u.name, external: false }
    return pick('envmgmt')
  }
  if (/Internal Audit/i.test(owner)) return pick('auditmkt')
  if (/^Marketing/i.test(owner)) return pick('marketing')
  return { key: `ext:${owner}`, label: owner, external: true }
}

/** Corrective actions the CX manager approved (or modified): the owner has until the due date to carry them out. */
export function fixCases(fixes: readonly CorrectiveAction[], users: readonly PortalUser[], nowMs: number): PerfCase[] {
  const out: PerfCase[] = []
  for (const f of fixes) {
    if (f.status === 'proposed' || f.decision === 'rejected') continue
    const finished = f.status === 'verification' || f.status === 'effective' || f.status === 'partial' || f.status === 'failed'
    const lastLog = f.auditLog.length ? f.auditLog[f.auditLog.length - 1].at : f.proposedAt
    out.push({
      id: `fix-${f.id}`,
      userId: fixOwnerKey(f.owner, users).key,
      kind: 'fix',
      ref: f.id,
      receivedAt: f.proposedAt,
      dueAt: new Date(f.dueDate).toISOString(),
      responded: f.status !== 'approved',
      responseHours: f.status !== 'approved' ? 24 : undefined,
      closedAt: finished ? (lastLog <= new Date(nowMs).toISOString() ? lastLog : new Date(nowMs).toISOString()) : undefined,
      resolved: finished ? f.status === 'effective' || f.status === 'verification' : undefined,
      escalated: false,
      sample: false,
    })
  }
  return out
}

/** Every record the report can use, for the people it covers. */
export function useAllPerfCases(args: {
  users: readonly PortalUser[]
  items: readonly DetractorCallItem[] | undefined
  assignments: Record<string, CallAssignment>
  fixes: readonly CorrectiveAction[] | undefined
  mentions?: readonly PublicMention[]
  replySlaHours?: number
  nowMs: number
}): PerfCase[] {
  const { users, items, assignments, fixes, mentions, replySlaHours = 48, nowMs } = args
  return useMemo(() => {
    const team = users.filter((u) => u.roleId === 'cxteam')
    return [
      ...team.flatMap((u) => sampleHistory(u.id, nowMs)),
      ...liveCalls(items ?? [], assignments, nowMs),
      ...fixCases(fixes ?? [], users, nowMs),
      ...mentionCases(mentions ?? [], replySlaHours, nowMs),
    ]
  }, [users, items, assignments, fixes, mentions, replySlaHours, nowMs])
}

// --- date range helpers shared by the two pages ----------------------------------------------------------------------

export type RangePreset = 'month' | 'last_month' | 'last_90' | 'ytd' | 'custom'

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function presetRange(p: Exclude<RangePreset, 'custom'>, nowMs: number): { from: string; to: string } {
  const now = new Date(nowMs)
  if (p === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) }
  if (p === 'last_month') return { from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) }
  if (p === 'last_90') return { from: ymd(new Date(nowMs - 89 * DAY)), to: ymd(now) }
  return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) }
}
