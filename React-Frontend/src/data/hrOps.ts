import type { Bi, EnvId } from '../types'

/**
 * HR performance data (Chairman's request, 22 Nov): three feeds the HR team is measured on, besides the conduct cases.
 *
 * 1. IVR callbacks: a caller to the call center chooses "talk to HR" in the IVR; HR must call them back. We measure when.
 *    Real source: the call center / IVR platform (an API or a daily export of the "HR callback" queue: call id, time, caller number,
 *    option chosen, and the callback time when HR calls back).
 * 2. Recruitment: candidates moving through the stages in Odoo Recruitment (models hr.job and hr.applicant, read over Odoo's
 *    JSON-RPC / XML-RPC API with an API key for a read-only user).
 * 3. Operations: HR operational requests (residency visa, contract, salary certificate, leave, onboarding, exit) and how long
 *    each takes against its target. Real source to be confirmed with HR (Odoo HR or another system).
 *
 * Prototype: everything below is generated sample data, the same on every load. Callers and candidates are shown by reference,
 * never by name, and the caller's number is masked.
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
const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
const HOUR = 3_600_000
const DAY = 24 * HOUR
const ENVS: EnvId[] = ['dub', 'auh', 'ast', 'ai']
/** Fixed reference "now" so the sample does not drift between loads: the seed is 22 Nov 2026, 12:00 Gulf time. */
const NOW = Date.parse('2026-11-22T08:00:00Z')

// --- IVR callbacks --------------------------------------------------------------------------------------------------

export const IVR_REASON: Record<string, Bi> = {
  salary: { en: 'Salary or payslip', ar: 'الراتب أو قسيمة الراتب' },
  leave: { en: 'Leave', ar: 'الإجازات' },
  visa: { en: 'Visa or residency', ar: 'التأشيرة أو الإقامة' },
  job: { en: 'Job application', ar: 'طلب توظيف' },
  complaint: { en: 'Complaint about a manager', ar: 'شكوى على مدير' },
  other: { en: 'Something else', ar: 'أمر آخر' },
}

/** The callback target: within 4 working hours of the call [Proposed, HR to confirm]. */
export const IVR_TARGET_HOURS = 4

export interface IvrRequest {
  id: string
  receivedAt: string
  /** Masked, e.g. +971 50 *** 4821. */
  caller: string
  reason: keyof typeof IVR_REASON
  envId: EnvId
  /** The HR specialist the callback went to (a title, NFR-2). */
  assignedTo: string
  calledBackAt?: string
  /** How many times HR tried before reaching the caller. */
  attempts: number
  outcome?: 'reached' | 'no_answer'
}

function buildIvr(): IvrRequest[] {
  const r = rng(2026_11_22)
  const out: IvrRequest[] = []
  for (let i = 0; i < 140; i++) {
    const received = NOW - Math.floor(r() * 60 * DAY) - Math.floor(r() * 9) * HOUR
    const recent = NOW - received < 1.5 * DAY
    const waiting = recent ? r() < 0.55 : r() < 0.06
    // most callbacks land within the target; a tail runs late (a day or more)
    const delayH = r() < 0.7 ? 0.3 + r() * 3.6 : 4 + r() * (r() < 0.4 ? 40 : 14)
    const calledBack = waiting ? undefined : Math.min(NOW - HOUR, received + delayH * HOUR)
    out.push({
      id: `ivr-${String(1000 + i)}`,
      receivedAt: new Date(received).toISOString(),
      caller: `+971 5${Math.floor(r() * 9)} *** ${String(1000 + Math.floor(r() * 8999))}`,
      reason: pick(r, Object.keys(IVR_REASON)),
      envId: pick(r, ENVS),
      assignedTo: r() < 0.5 ? 'HR specialist 1' : 'HR specialist 2',
      calledBackAt: calledBack ? new Date(calledBack).toISOString() : undefined,
      attempts: calledBack ? 1 + Math.floor(r() * (r() < 0.8 ? 1.4 : 3)) : Math.floor(r() * 2),
      outcome: calledBack ? (r() < 0.9 ? 'reached' : 'no_answer') : undefined,
    })
  }
  return out.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

// --- Recruitment (Odoo) ---------------------------------------------------------------------------------------------

export const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'refused'] as const
export type Stage = (typeof STAGES)[number]
export const STAGE_LABEL: Record<Stage, Bi> = {
  new: { en: 'New', ar: 'جديد' },
  screening: { en: 'Screening', ar: 'الفرز' },
  interview: { en: 'Interview', ar: 'المقابلة' },
  offer: { en: 'Offer', ar: 'العرض' },
  hired: { en: 'Hired', ar: 'تم التعيين' },
  refused: { en: 'Refused', ar: 'مرفوض' },
}

export interface JobOpening {
  id: string
  title: Bi
  department: Bi
  envId: EnvId
  openedAt: string
  target: number
}

export interface Candidate {
  /** Odoo applicant reference, never a name here. */
  ref: string
  jobId: string
  stage: Stage
  appliedAt: string
  /** When the candidate entered the current stage. */
  stageSince: string
  source: Bi
}

const JOBS: Omit<JobOpening, 'openedAt'>[] = [
  { id: 'job-1', title: { en: 'Property consultant', ar: 'مستشار عقاري' }, department: { en: 'Sales', ar: 'المبيعات' }, envId: 'dub', target: 6 },
  { id: 'job-2', title: { en: 'Property consultant', ar: 'مستشار عقاري' }, department: { en: 'Sales', ar: 'المبيعات' }, envId: 'auh', target: 4 },
  { id: 'job-3', title: { en: 'Call center agent', ar: 'موظف مركز اتصال' }, department: { en: 'Call center', ar: 'مركز الاتصال' }, envId: 'dub', target: 5 },
  {
    id: 'job-4',
    title: { en: 'After-Sales coordinator', ar: 'منسق ما بعد البيع' },
    department: { en: 'After-Sales', ar: 'ما بعد البيع' },
    envId: 'auh',
    target: 2,
  },
  { id: 'job-5', title: { en: 'Leasing officer', ar: 'موظف تأجير' }, department: { en: 'Leasing', ar: 'التأجير' }, envId: 'ast', target: 2 },
  { id: 'job-6', title: { en: 'HR officer', ar: 'موظف موارد بشرية' }, department: { en: 'HR', ar: 'الموارد البشرية' }, envId: 'dub', target: 1 },
]
const SOURCES: Bi[] = [
  { en: 'LinkedIn', ar: 'لينكدإن' },
  { en: 'Referral', ar: 'ترشيح' },
  { en: 'Company website', ar: 'موقع الشركة' },
  { en: 'Agency', ar: 'وكالة' },
]

function buildRecruitment(): { jobs: JobOpening[]; candidates: Candidate[] } {
  const r = rng(77)
  const jobs = JOBS.map((j) => ({ ...j, openedAt: new Date(NOW - (10 + Math.floor(r() * 70)) * DAY).toISOString() }))
  const candidates: Candidate[] = []
  let n = 1
  for (const j of jobs) {
    const count = 6 + Math.floor(r() * 14)
    for (let i = 0; i < count; i++) {
      const applied = Date.parse(j.openedAt) + Math.floor(r() * (NOW - Date.parse(j.openedAt)))
      const x = r()
      const stage: Stage = x < 0.25 ? 'new' : x < 0.45 ? 'screening' : x < 0.62 ? 'interview' : x < 0.7 ? 'offer' : x < 0.8 ? 'hired' : 'refused'
      const since = applied + Math.floor(r() * (NOW - applied))
      candidates.push({
        ref: `APL-${String(4000 + n++)}`,
        jobId: j.id,
        stage,
        appliedAt: new Date(applied).toISOString(),
        stageSince: new Date(since).toISOString(),
        source: pick(r, SOURCES),
      })
    }
  }
  return { jobs, candidates }
}

/** A candidate is stuck when they sit in an open stage longer than this. */
export const STUCK_DAYS = 10

// --- Operations -----------------------------------------------------------------------------------------------------

export const OPS_TYPE: Record<string, { label: Bi; targetDays: number }> = {
  visa: { label: { en: 'Residency visa', ar: 'تأشيرة الإقامة' }, targetDays: 14 },
  contract: { label: { en: 'Contract or offer letter', ar: 'العقد أو خطاب العرض' }, targetDays: 3 },
  certificate: { label: { en: 'Salary certificate', ar: 'شهادة راتب' }, targetDays: 2 },
  leave: { label: { en: 'Leave request', ar: 'طلب إجازة' }, targetDays: 2 },
  onboarding: { label: { en: 'Onboarding a new joiner', ar: 'تهيئة موظف جديد' }, targetDays: 5 },
  exit: { label: { en: 'Exit and final settlement', ar: 'إنهاء الخدمة والتسوية' }, targetDays: 10 },
}

export interface OpsRequest {
  id: string
  type: keyof typeof OPS_TYPE
  envId: EnvId
  openedAt: string
  closedAt?: string
  owner: string
}

function buildOps(): OpsRequest[] {
  const r = rng(4242)
  const out: OpsRequest[] = []
  for (let i = 0; i < 120; i++) {
    const type = pick(r, Object.keys(OPS_TYPE))
    const target = OPS_TYPE[type].targetDays
    const opened = NOW - Math.floor(r() * 60 * DAY)
    const took = target * (r() < 0.72 ? 0.3 + r() * 0.7 : 1 + r() * 1.2) * DAY
    const closed = opened + took < NOW && r() < 0.88 ? opened + took : undefined
    out.push({
      id: `hrop-${200 + i}`,
      type,
      envId: pick(r, ENVS),
      openedAt: new Date(opened).toISOString(),
      closedAt: closed ? new Date(closed).toISOString() : undefined,
      owner: r() < 0.5 ? 'HR specialist 1' : 'HR specialist 2',
    })
  }
  return out.sort((a, b) => b.openedAt.localeCompare(a.openedAt))
}

export const HR_NOW = NOW
export const IVR_REQUESTS = buildIvr()
export const RECRUITMENT = buildRecruitment()
export const OPS_REQUESTS = buildOps()

/** Hours between two ISO times, or from `from` to the sample's "now". */
export const hoursBetween = (from: string, to?: string) => ((to ? Date.parse(to) : NOW) - Date.parse(from)) / HOUR
export const daysBetween = (from: string, to?: string) => hoursBetween(from, to) / 24

