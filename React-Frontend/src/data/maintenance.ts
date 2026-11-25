import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * Maintenance follow-up (owner, 25 Nov): how the PSI property-management follow-up team (the checkers who log a repair, chase it and
 * check it after the vendor) and the outsourced maintenance vendors perform against the service levels of the Property Management
 * module (PropX CRM, "PM BRD 4 · SLA and Alerts", v3.1, 25 Nov 2026).
 *
 * The clocks follow the BRD as written: calendar time (weekends and holidays count), no pauses, one set of targets for every agreement.
 *   Respond (first response): Emergency 2 h · Urgent 24 h · Normal 48 h (SL-01, AL-01)
 *   Complete: Emergency 24 h · Urgent 72 h · Normal 168 h (AL-02)
 *   Escalation: 24 h after a request became late (AL-03)
 *   Vendor quotation: answer in 5 days, else "stale" (TL-04); owner decision link 14 days (TL-02)
 *   "Is the job done?": vendor asked at 08:00 on the due date; from the 2nd "not done yet" staff are alerted (AL-05, AL-06)
 *   Sign-off by the tenant or owner: link valid 7 days (TL-01, AL-09); a rejected sign-off sends the job back (SL-08)
 *   AMC visit: "late" from the next day, "missed" on the 8th day (FL-05, AL-19)
 *
 * The evaluation of the vendor is new (not in the BRD): after the work is signed off, the customer (tenant or owner) and the PSI staff
 * member who followed the job each fill a short form. Both feed the vendor's score.
 *
 * Real source: the PropX maintenance requests (logged, priority, first response, completed, cancelled, escalated), the vendor jobs and
 * their "Is the job done?" answers, the sign-off links, the AMC visits, and the new evaluation form. Sample data below, the same on
 * every load; vendors are invented names.
 */

function rng(seed: number) {
  let h = seed >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let x = Math.imul(h ^ (h >>> 15), 1 | h)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
const HOUR = 3_600_000
const DAY = 24 * HOUR
/** Fixed reference "now", the same as the portal's data stamp: 25 Nov 2026, 06:40 Gulf time. */
export const MAINT_NOW = Date.parse('2026-11-25T02:40:00Z')

export type Priority = 'emergency' | 'urgent' | 'normal'
export const PRIORITY: Record<Priority, { label: Bi; respondH: number; completeH: number }> = {
  emergency: { label: { en: 'Emergency', ar: 'طارئ' }, respondH: 2, completeH: 24 },
  urgent: { label: { en: 'Urgent', ar: 'عاجل' }, respondH: 24, completeH: 72 },
  normal: { label: { en: 'Normal', ar: 'عادي' }, respondH: 48, completeH: 168 },
}
export const ESCALATE_AFTER_H = 24
export const SIGNOFF_DAYS = 7
export const QUOTE_STALE_DAYS = 5

export const CATEGORY: Record<string, Bi> = {
  ac: { en: 'Air conditioning', ar: 'التكييف' },
  plumbing: { en: 'Plumbing', ar: 'السباكة' },
  electrical: { en: 'Electrical', ar: 'الكهرباء' },
  carpentry: { en: 'Doors and carpentry', ar: 'الأبواب والنجارة' },
  painting: { en: 'Painting', ar: 'الدهان' },
  pest: { en: 'Pest control', ar: 'مكافحة الحشرات' },
}

/** The PSI follow-up team: property-management staff who log, chase and check the job. A title and a reference, no names (NFR-2). */
export const CHECKERS = [
  { id: 'pm-01', name: { en: 'Property manager · PM-01', ar: 'مدير عقار · PM-01' } },
  { id: 'pm-02', name: { en: 'Property manager · PM-02', ar: 'مدير عقار · PM-02' } },
  { id: 'pm-03', name: { en: 'Maintenance coordinator · MC-03', ar: 'منسق صيانة · MC-03' } },
  { id: 'pm-04', name: { en: 'Maintenance coordinator · MC-04', ar: 'منسق صيانة · MC-04' } },
  { id: 'pm-05', name: { en: 'Field checker · FC-05', ar: 'مدقق ميداني · FC-05' } },
] as const

/** Outsourced vendors (invented names); `quality` drives the sample only. */
export const VENDORS = [
  { id: 'v-cool', name: 'CoolBreeze Technical Services', trade: 'ac', quality: 0.85 },
  { id: 'v-flow', name: 'FlowFix Plumbing', trade: 'plumbing', quality: 0.7 },
  { id: 'v-volt', name: 'BrightVolt Electrical', trade: 'electrical', quality: 0.9 },
  { id: 'v-wood', name: 'Oakline Carpentry', trade: 'carpentry', quality: 0.6 },
  { id: 'v-hue', name: 'TrueHue Painting', trade: 'painting', quality: 0.8 },
  { id: 'v-pest', name: 'ShieldPest Control', trade: 'pest', quality: 0.5 },
] as const
export type VendorId = (typeof VENDORS)[number]['id']
export type CheckerId = (typeof CHECKERS)[number]['id']

/** The request stages as the PropX CRM shows them (Maintenance requests page, read 25 Nov on dev.psi-revamp). */
export const STAGES = ['logged', 'quotation', 'owner_approval', 'owner_approved', 'owner_refused', 'work_order', 'completed', 'cancelled'] as const
export type Stage = (typeof STAGES)[number]
export const STAGE_LABEL: Record<Stage, Bi> = {
  logged: { en: 'Request logged', ar: 'سُجّل الطلب' },
  quotation: { en: 'Quotation', ar: 'عرض السعر' },
  owner_approval: { en: 'Awaiting owner approval', ar: 'بانتظار موافقة المالك' },
  owner_approved: { en: 'Owner approved', ar: 'وافق المالك' },
  owner_refused: { en: 'Owner refused', ar: 'رفض المالك' },
  work_order: { en: 'Work order', ar: 'أمر العمل' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },
}

export type SignOff = 'none' | 'waiting' | 'signed' | 'rejected' | 'expired'
export interface MaintRequest {
  id: string
  unit: string
  category: keyof typeof CATEGORY
  priority: Priority
  checker: CheckerId
  vendor: VendorId
  stage: Stage
  /** who reported it, as in the CRM's "Reported by" */
  reportedBy: 'tenant' | 'pm'
  loggedAt: number
  respondedAt?: number
  completedAt?: number
  cancelled?: boolean
  /** set when the request became late and stayed late 24 h (AL-03) */
  escalatedAt?: number
  /** a quotation was asked and no answer came in 5 days (TL-04) */
  quoteStale?: boolean
  /** how many times the vendor answered "not done yet" on the due date (AL-05/06) */
  notDoneYet: number
  signOff: SignOff
  /** the sign-off link went out after completion: days until it was sent (the checker's chase) */
  signOffSentAfterDays?: number
  /** the job was sent back to the vendor after a rejected sign-off */
  rework?: boolean
}

export interface AmcVisit {
  id: string
  vendor: VendorId
  plannedFor: number
  doneAt?: number
}

function build(): { requests: MaintRequest[]; visits: AmcVisit[] } {
  const r = rng(4242)
  const pri: Priority[] = ['emergency', 'urgent', 'urgent', 'normal', 'normal', 'normal']
  const requests: MaintRequest[] = []
  for (let i = 0; i < 220; i++) {
    const v = VENDORS[Math.floor(r() * VENDORS.length)]
    const checker = CHECKERS[Math.floor(r() * CHECKERS.length)].id
    const p = pri[Math.floor(r() * pri.length)]
    const { respondH, completeH } = PRIORITY[p]
    const loggedAt = MAINT_NOW - Math.floor(r() * 62 * DAY) - Math.floor(r() * 20) * HOUR
    // the checker's own discipline: PM-03 and FC-05 are the strongest, PM-02 the weakest
    const chase = { 'pm-01': 0.8, 'pm-02': 0.55, 'pm-03': 0.92, 'pm-04': 0.75, 'pm-05': 0.88 }[checker]
    const good = (v.quality + chase) / 2
    const respondFactor = r() < good ? 0.2 + r() * 0.7 : 1.1 + r() * 1.5
    const respondedAt = loggedAt + respondFactor * respondH * HOUR
    const completeFactor = r() < v.quality ? 0.3 + r() * 0.65 : 1.05 + r() * 1.2
    const completedAt = loggedAt + completeFactor * completeH * HOUR
    const cancelled = r() < 0.03
    const req: MaintRequest = {
      id: `MR-${String(5200 + i)}`,
      unit: `${['Al Reem', 'Saadiyat', 'Yas', 'Al Raha', 'Masdar'][Math.floor(r() * 5)]} · ${100 + Math.floor(r() * 900)}`,
      category: v.trade,
      priority: p,
      checker,
      vendor: v.id,
      stage: 'logged',
      reportedBy: r() < 0.7 ? 'tenant' : 'pm',
      loggedAt,
      notDoneYet: 0,
      signOff: 'none',
    }
    if (respondedAt <= MAINT_NOW) req.respondedAt = respondedAt
    if (cancelled) req.cancelled = true
    else if (completedAt <= MAINT_NOW) {
      req.completedAt = completedAt
      req.signOffSentAfterDays = r() < chase ? (r() < 0.7 ? 0 : 1) : 2 + Math.floor(r() * 5)
      const sentAt = completedAt + req.signOffSentAfterDays * DAY
      const roll = r()
      req.signOff =
        sentAt + SIGNOFF_DAYS * DAY > MAINT_NOW && roll < 0.5
          ? 'waiting'
          : roll < v.quality * 0.95
            ? 'signed'
            : roll < v.quality * 0.95 + 0.12
              ? 'rejected'
              : 'expired'
      if (req.signOff === 'rejected') req.rework = true
    }
    const dueAt = loggedAt + completeH * HOUR
    if (dueAt < (req.completedAt ?? MAINT_NOW)) req.notDoneYet = r() < 0.6 ? 1 + Math.floor(r() * 3) : 0
    const lateAt = Math.min(
      req.respondedAt && req.respondedAt <= loggedAt + respondH * HOUR ? Infinity : loggedAt + respondH * HOUR,
      (req.completedAt ?? MAINT_NOW) > dueAt ? dueAt : Infinity,
    )
    if (lateAt + ESCALATE_AFTER_H * HOUR < (req.completedAt ?? MAINT_NOW)) req.escalatedAt = lateAt + ESCALATE_AFTER_H * HOUR
    if (r() < 0.3) req.quoteStale = r() > v.quality
    req.stage = req.cancelled
      ? 'cancelled'
      : req.completedAt
        ? 'completed'
        : (['logged', 'quotation', 'quotation', 'owner_approval', 'owner_approved', 'owner_refused', 'work_order', 'work_order', 'work_order'] as const)[
            Math.floor(r() * 9)
          ]
    requests.push(req)
  }
  const visits: AmcVisit[] = []
  for (let i = 0; i < 60; i++) {
    const v = VENDORS[Math.floor(r() * VENDORS.length)]
    const plannedFor = MAINT_NOW - Math.floor(r() * 60 * DAY) + 5 * DAY
    const done = r() < v.quality + 0.1
    visits.push({ id: `AMC-${700 + i}`, vendor: v.id, plannedFor, doneAt: done && plannedFor < MAINT_NOW ? plannedFor + Math.floor(r() * 3) * DAY : undefined })
  }
  return { requests, visits }
}

const DATA = build()
export const MAINT_REQUESTS = DATA.requests
export const AMC_VISITS = DATA.visits

// --- Clocks -----------------------------------------------------------------------------------------------------------

export const respondDue = (x: MaintRequest) => x.loggedAt + PRIORITY[x.priority].respondH * HOUR
export const completeDue = (x: MaintRequest) => x.loggedAt + PRIORITY[x.priority].completeH * HOUR
export const respondedOnTime = (x: MaintRequest) => x.respondedAt != null && x.respondedAt <= respondDue(x)
export const completedOnTime = (x: MaintRequest) => x.completedAt != null && x.completedAt <= completeDue(x)
export const isOpen = (x: MaintRequest) => !x.completedAt && !x.cancelled
/** Open and past a target now: no first response by the respond-by time, or not completed by the complete-by time (the BRD's "Breached"). */
export const isBreached = (x: MaintRequest, now = MAINT_NOW) =>
  isOpen(x) && ((!x.respondedAt && now > respondDue(x)) || (x.respondedAt != null && x.respondedAt > respondDue(x)) || now > completeDue(x))
/** AMC visit: "late" from the day after; "missed" when still not done more than 7 days after (FL-05, AL-19). */
export const visitMissed = (v: AmcVisit, now = MAINT_NOW) => !v.doneAt && now > v.plannedFor + 7 * DAY

// --- Evaluations (new: the customer's and the checker's form) ------------------------------------------------------------

export type Rater = 'customer' | 'checker'
export const CRITERIA = ['time', 'quality', 'clean', 'conduct'] as const
export type Criterion = (typeof CRITERIA)[number]
export const CRITERION_LABEL: Record<Criterion, { label: Bi; hint: Bi }> = {
  time: {
    label: { en: 'Came on time', ar: 'الحضور في الموعد' },
    hint: { en: 'Arrived in the agreed window, or called ahead', ar: 'وصل في الموعد المتفق أو اتصل مسبقاً' },
  },
  quality: {
    label: { en: 'Quality of the work', ar: 'جودة العمل' },
    hint: { en: 'The problem is solved and the finish is good', ar: 'حُلّت المشكلة والتشطيب جيد' },
  },
  clean: {
    label: { en: 'Left the place clean', ar: 'ترك المكان نظيفاً' },
    hint: { en: 'Removed waste, protected furniture and floors', ar: 'أزال المخلفات وحمى الأثاث والأرضيات' },
  },
  conduct: { label: { en: 'Behaviour and communication', ar: 'السلوك والتواصل' }, hint: { en: 'Polite, explained what was done', ar: 'مهذب وشرح ما تم' } },
}
export const RATER_LABEL: Record<Rater, Bi> = {
  customer: { en: 'Customer (tenant or owner)', ar: 'العميل (المستأجر أو المالك)' },
  checker: { en: 'PSI follow-up (checker)', ar: 'متابع PSI (المدقق)' },
}

export interface Evaluation {
  id: string
  requestId: string
  vendor: VendorId
  rater: Rater
  /** the checker who filled it, for a checker's form */
  by?: CheckerId
  scores: Record<Criterion, number>
  fixedFirstTime: boolean
  comment?: string
  at: number
}

function seedEvaluations(): Evaluation[] {
  const r = rng(777)
  const out: Evaluation[] = []
  for (const x of MAINT_REQUESTS) {
    if (!x.completedAt || x.signOff === 'waiting') continue
    const v = VENDORS.find((y) => y.id === x.vendor)!
    const score = () => Math.max(1, Math.min(5, Math.round(v.quality * 5 + (r() - 0.5) * 2.2)))
    const make = (rater: Rater): Evaluation => ({
      id: `ev-${x.id}-${rater}`,
      requestId: x.id,
      vendor: x.vendor,
      rater,
      by: rater === 'checker' ? x.checker : undefined,
      scores: { time: score(), quality: score(), clean: score(), conduct: score() },
      fixedFirstTime: !x.rework && r() < v.quality + 0.1,
      at: Math.min(MAINT_NOW, x.completedAt! + (1 + Math.floor(r() * 3)) * DAY),
    })
    if (r() < 0.55) out.push(make('customer'))
    const chase = { 'pm-01': 0.7, 'pm-02': 0.35, 'pm-03': 0.9, 'pm-04': 0.6, 'pm-05': 0.95 }[x.checker]
    if (r() < chase) out.push(make('checker'))
  }
  return out
}

const KEY = 'psicx.maintEvaluations'
let added: Evaluation[] = read()
let snapshot = [...seedEvaluations(), ...added]
const listeners = new Set<() => void>()
function read(): Evaluation[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Evaluation[]) : []
  } catch {
    return []
  }
}
export function addEvaluation(e: Omit<Evaluation, 'id' | 'at'>) {
  const ev: Evaluation = { ...e, id: `ev-${Date.now()}`, at: Date.now() }
  added = [...added.filter((x) => !(x.requestId === e.requestId && x.rater === e.rater)), ev]
  try {
    localStorage.setItem(KEY, JSON.stringify(added))
  } catch {
    /* private window: keep it for this session */
  }
  snapshot = [...seedEvaluations().filter((x) => !added.some((a) => a.requestId === x.requestId && a.rater === x.rater)), ...added]
  listeners.forEach((l) => l())
}
export function useEvaluations(): Evaluation[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
  )
}

export const avgScore = (e: Evaluation) => CRITERIA.reduce((s, k) => s + e.scores[k], 0) / CRITERIA.length

/**
 * The vendor's score out of 100 (proposed weights, to confirm with PSI Assets): 40 on the clocks (accepted on time and done on time,
 * half each), 30 on the customer's forms, 30 on the checker's forms. A part with no data is left out and the rest re-weighted.
 */
export const VENDOR_WEIGHTS = { clocks: 40, customer: 30, checker: 30 }
export function vendorScore(onTimePct: number | null, customerAvg: number | null, checkerAvg: number | null): number | null {
  const parts: [number, number][] = []
  if (onTimePct != null) parts.push([onTimePct, VENDOR_WEIGHTS.clocks])
  if (customerAvg != null) parts.push([(customerAvg / 5) * 100, VENDOR_WEIGHTS.customer])
  if (checkerAvg != null) parts.push([(checkerAvg / 5) * 100, VENDOR_WEIGHTS.checker])
  const w = parts.reduce((s, [, x]) => s + x, 0)
  return w ? Math.round(parts.reduce((s, [v, x]) => s + v * x, 0) / w) : null
}
