import { useSyncExternalStore } from 'react'
import type { Bi, EnvId } from '../types'

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
/**
 * The PSI follow-up team per environment: property-management staff who log, chase and check the job after the vendor. Example names
 * (25 Nov, owner: show the staff member's name, as the CX side and the environment's own management see agent names).
 * `chase` drives the sample only.
 */
export const CHECKERS = [
  { id: 'pm-01', envId: 'dub', name: { en: 'Omar Khalil', ar: 'عمر خليل' }, title: { en: 'Property manager', ar: 'مدير عقار' }, chase: 0.8 },
  { id: 'pm-02', envId: 'dub', name: { en: 'Sara Nasser', ar: 'سارة ناصر' }, title: { en: 'Maintenance coordinator', ar: 'منسقة صيانة' }, chase: 0.55 },
  { id: 'pm-03', envId: 'auh', name: { en: 'Yousef Haddad', ar: 'يوسف حداد' }, title: { en: 'Property manager', ar: 'مدير عقار' }, chase: 0.92 },
  { id: 'pm-04', envId: 'auh', name: { en: 'Lina Saleh', ar: 'لينا صالح' }, title: { en: 'Field checker', ar: 'مدققة ميدانية' }, chase: 0.75 },
  { id: 'pm-05', envId: 'ast', name: { en: 'Rami Odeh', ar: 'رامي عودة' }, title: { en: 'Property manager', ar: 'مدير عقار' }, chase: 0.88 },
  { id: 'pm-06', envId: 'ast', name: { en: 'Hiba Mansour', ar: 'هبة منصور' }, title: { en: 'Maintenance coordinator', ar: 'منسقة صيانة' }, chase: 0.7 },
  { id: 'pm-07', envId: 'ast', name: { en: 'Khaled Fares', ar: 'خالد فارس' }, title: { en: 'Field checker', ar: 'مدقق ميداني' }, chase: 0.62 },
  { id: 'pm-08', envId: 'ai', name: { en: 'Nour Aziz', ar: 'نور عزيز' }, title: { en: 'Property manager', ar: 'مديرة عقار' }, chase: 0.85 },
  { id: 'pm-09', envId: 'ai', name: { en: 'Tariq Saad', ar: 'طارق سعد' }, title: { en: 'Maintenance coordinator', ar: 'منسق صيانة' }, chase: 0.6 },
] as const satisfies readonly { id: string; envId: EnvId; name: Bi; title: Bi; chase: number }[]

/** Outsourced vendors (sub-contractors; invented company names) and the environments each one works in; `quality` drives the sample only. */
export const VENDORS = [
  { id: 'v-cool', name: 'CoolBreeze Technical Services', trade: 'ac', envs: ['dub', 'auh'], quality: 0.85 },
  { id: 'v-arctic', name: 'Arctic Line HVAC', trade: 'ac', envs: ['ast', 'ai'], quality: 0.72 },
  { id: 'v-flow', name: 'FlowFix Plumbing', trade: 'plumbing', envs: ['dub', 'ast'], quality: 0.7 },
  { id: 'v-aqua', name: 'AquaPro Plumbing Works', trade: 'plumbing', envs: ['auh', 'ai'], quality: 0.82 },
  { id: 'v-volt', name: 'BrightVolt Electrical', trade: 'electrical', envs: ['dub', 'auh', 'ast'], quality: 0.9 },
  { id: 'v-spark', name: 'Spark Point Electro-Mechanical', trade: 'electrical', envs: ['ai'], quality: 0.66 },
  { id: 'v-wood', name: 'Oakline Carpentry', trade: 'carpentry', envs: ['ast', 'auh'], quality: 0.6 },
  { id: 'v-door', name: 'Gulf Doors & Joinery', trade: 'carpentry', envs: ['dub', 'ai'], quality: 0.78 },
  { id: 'v-hue', name: 'TrueHue Painting', trade: 'painting', envs: ['dub', 'auh', 'ast', 'ai'], quality: 0.8 },
  { id: 'v-pest', name: 'ShieldPest Control', trade: 'pest', envs: ['auh', 'ast'], quality: 0.5 },
  { id: 'v-green', name: 'GreenGuard Pest Services', trade: 'pest', envs: ['dub', 'ai'], quality: 0.76 },
] as const satisfies readonly { id: string; name: string; trade: string; envs: readonly EnvId[]; quality: number }[]
export type VendorId = (typeof VENDORS)[number]['id']
export type CheckerId = (typeof CHECKERS)[number]['id']
export const vendorById = (id: VendorId) => VENDORS.find((v) => v.id === id)!
export const checkerById = (id: CheckerId) => CHECKERS.find((c) => c.id === id)!

/** What the customer reported, per trade (examples). */
const PROBLEMS: Record<string, Bi[]> = {
  ac: [
    { en: 'AC in the master bedroom is blowing warm air', ar: 'المكيف في غرفة النوم الرئيسية يخرج هواءً دافئاً' },
    { en: 'Water dripping from the AC unit in the living room', ar: 'تسرب ماء من وحدة التكييف في الصالة' },
    { en: 'AC thermostat not responding', ar: 'منظم حرارة المكيف لا يستجيب' },
  ],
  plumbing: [
    { en: 'Kitchen sink is blocked', ar: 'مغسلة المطبخ مسدودة' },
    { en: 'Leak under the bathroom basin', ar: 'تسرب تحت مغسلة الحمام' },
    { en: 'No hot water in the main bathroom', ar: 'لا توجد مياه ساخنة في الحمام الرئيسي' },
  ],
  electrical: [
    { en: 'Power keeps tripping in the kitchen', ar: 'الكهرباء تفصل باستمرار في المطبخ' },
    { en: 'Two ceiling lights not working in the hall', ar: 'إنارتان في السقف لا تعملان في الممر' },
    { en: 'Burning smell from a socket in the bedroom', ar: 'رائحة احتراق من مقبس في غرفة النوم' },
  ],
  carpentry: [
    { en: 'Wardrobe door came off its hinge', ar: 'باب الخزانة خرج من مفصلته' },
    { en: 'Main door lock is stuck', ar: 'قفل الباب الرئيسي عالق' },
    { en: 'Kitchen cabinet drawer broken', ar: 'درج خزانة المطبخ مكسور' },
  ],
  painting: [
    { en: 'Damp patch and peeling paint on the bedroom wall', ar: 'بقعة رطوبة وتقشر دهان على جدار غرفة النوم' },
    { en: 'Touch-up painting after the move-out inspection', ar: 'ترميم الدهان بعد فحص الإخلاء' },
  ],
  pest: [
    { en: 'Cockroaches in the kitchen', ar: 'صراصير في المطبخ' },
    { en: 'Ants near the balcony door', ar: 'نمل قرب باب الشرفة' },
  ],
}
const TENANTS = ['Ahmed R.', 'Maria L.', 'Faisal K.', 'Priya S.', 'John D.', 'Hessa A.', 'Ali M.', 'Elena P.', 'Saeed N.', 'Rana H.', 'Mark T.', 'Noura B.']
const CUSTOMER_GOOD: Bi[] = [
  { en: 'Technician came on time and fixed it quickly. Thank you.', ar: 'الفني حضر في الموعد وأصلح المشكلة بسرعة. شكراً.' },
  { en: 'Good job, very polite team.', ar: 'عمل جيد وفريق مهذب جداً.' },
  { en: 'All fine now, they cleaned after the work.', ar: 'كل شيء جيد الآن، ونظفوا بعد العمل.' },
]
const CUSTOMER_BAD: Bi[] = [
  { en: 'They came two days late and I had to call three times.', ar: 'تأخروا يومين واضطررت للاتصال ثلاث مرات.' },
  { en: 'Problem came back the next day.', ar: 'عادت المشكلة في اليوم التالي.' },
  { en: 'Left dust and debris everywhere.', ar: 'تركوا غباراً ومخلفات في كل مكان.' },
]
const CHECKER_GOOD: Bi[] = [
  { en: 'Checked on site: fixed, area clean, tenant satisfied.', ar: 'تم التحقق في الموقع: أُصلح، المكان نظيف، المستأجر راضٍ.' },
  { en: 'Called the tenant: confirmed working.', ar: 'اتصلت بالمستأجر: أكد أنه يعمل.' },
]
const CHECKER_BAD: Bi[] = [
  {
    en: 'Visited after the vendor: part replaced is second-hand, asked the vendor to return.',
    ar: 'زرت بعد المقاول: القطعة المستبدلة مستعملة، طلبت من المقاول العودة.',
  },
  { en: 'Vendor missed the agreed window twice; escalated to the vendor supervisor.', ar: 'المقاول فوّت الموعد المتفق مرتين؛ صعّدت لمشرف المقاول.' },
]

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
  /** the environment that owns the managed unit: its owner (CEO or environment manager) sees it */
  envId: EnvId
  unit: string
  category: keyof typeof CATEGORY
  priority: Priority
  checker: CheckerId
  vendor: VendorId
  stage: Stage
  /** what the customer reported */
  problem: Bi
  /** the tenant (or owner) who reported it */
  customer: string
  /** comments on the job, as the CRM keeps them (customer on sign-off, PSI follow-up after checking) */
  customerComment?: Bi
  checkerComment?: Bi
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
  envId: EnvId
  vendor: VendorId
  plannedFor: number
  doneAt?: number
}

/** Every environment has managed units (25 Nov, owner: the page is for every environment's owner, CEO or manager). */
const MAINT_ENVS: EnvId[] = ['dub', 'auh', 'ast', 'ast', 'ai']
const UNIT_AREAS: Record<EnvId, string[]> = {
  dub: ['Dubai Marina', 'JVC', 'Business Bay'],
  auh: ['Al Reem', 'Saadiyat', 'Yas'],
  ast: ['Al Raha', 'Masdar', 'Khalifa City'],
  ai: ['Al Reef', 'Mohammed Bin Zayed City', 'Al Ghadeer'],
}

function build(): { requests: MaintRequest[]; visits: AmcVisit[] } {
  const r = rng(4242)
  const pri: Priority[] = ['emergency', 'urgent', 'urgent', 'normal', 'normal', 'normal']
  const requests: MaintRequest[] = []
  for (let i = 0; i < 220; i++) {
    const envId = MAINT_ENVS[Math.floor(r() * MAINT_ENVS.length)]
    const inEnv = VENDORS.filter((x) => (x.envs as readonly EnvId[]).includes(envId))
    const v = inEnv[Math.floor(r() * inEnv.length)]
    const staff = CHECKERS.filter((c) => c.envId === envId)
    const c = staff[Math.floor(r() * staff.length)]
    const checker = c.id
    const p = pri[Math.floor(r() * pri.length)]
    const { respondH, completeH } = PRIORITY[p]
    const loggedAt = MAINT_NOW - Math.floor(r() * 62 * DAY) - Math.floor(r() * 20) * HOUR
    const chase = c.chase
    const good = (v.quality + chase) / 2
    const respondFactor = r() < good ? 0.2 + r() * 0.7 : 1.1 + r() * 1.5
    const respondedAt = loggedAt + respondFactor * respondH * HOUR
    const completeFactor = r() < v.quality ? 0.3 + r() * 0.65 : 1.05 + r() * 1.2
    const completedAt = loggedAt + completeFactor * completeH * HOUR
    const cancelled = r() < 0.03
    const probs = PROBLEMS[v.trade]
    const req: MaintRequest = {
      id: `MR-${String(5200 + i)}`,
      envId,
      unit: `${UNIT_AREAS[envId][Math.floor(r() * 3)]} · ${100 + Math.floor(r() * 900)}`,
      category: v.trade,
      priority: p,
      checker,
      vendor: v.id,
      stage: 'logged',
      problem: probs[Math.floor(r() * probs.length)],
      customer: TENANTS[Math.floor(r() * TENANTS.length)],
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
    if (req.completedAt) {
      const ok = !req.rework && completedAt <= dueAt
      if (r() < 0.7) req.customerComment = (ok ? CUSTOMER_GOOD : CUSTOMER_BAD)[Math.floor(r() * 3)]
      if (r() < chase) req.checkerComment = (ok ? CHECKER_GOOD : CHECKER_BAD)[Math.floor(r() * 2)]
    }
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
    const venv = MAINT_ENVS[Math.floor(r() * MAINT_ENVS.length)]
    const pool = VENDORS.filter((x) => (x.envs as readonly EnvId[]).includes(venv))
    const v = pool[Math.floor(r() * pool.length)]
    const plannedFor = MAINT_NOW - Math.floor(r() * 60 * DAY) + 5 * DAY
    const done = r() < v.quality + 0.1
    visits.push({
      id: `AMC-${700 + i}`,
      envId: venv,
      vendor: v.id,
      plannedFor,
      doneAt: done && plannedFor < MAINT_NOW ? plannedFor + Math.floor(r() * 3) * DAY : undefined,
    })
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
      comment: rater === 'customer' ? x.customerComment?.en : x.checkerComment?.en,
      at: Math.min(MAINT_NOW, x.completedAt! + (1 + Math.floor(r() * 3)) * DAY),
    })
    if (r() < 0.55) out.push(make('customer'))
    const chase = checkerById(x.checker).chase
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
