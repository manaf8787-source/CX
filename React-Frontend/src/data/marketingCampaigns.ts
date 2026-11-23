import { useSyncExternalStore } from 'react'
import type { Bi, EnvId } from '../types'

/**
 * Marketing campaigns, their results and their audit (owner's and Chairman's request, 23 Nov).
 *
 * Two sources:
 * 1. The marketing platform (where Marketing builds and sends campaigns): name, type, target segment, persona, owner, channels, budget,
 *    dates, and what was sent (messages, emails, clicks).
 * 2. The CRM: every lead a campaign brings carries the campaign's tag (its code, e.g. MKT-2026-031). The portal reads the tagged leads
 *    again and again (every hour) and follows each one until it closes or is lost: contacted or not, answered or not, how, and converted.
 *
 * The dashboard (results) is for Marketing and the Internal Audit and Marketing Lead; the audit (criteria, targets per campaign, verdict)
 * is the Internal Audit and Marketing Lead's only. The audit opens only after a long tracking window, so a campaign is not judged before
 * its leads had time to convert.
 *
 * Prototype: all figures are sample data generated from the campaign code; the audit state sits in this browser's localStorage.
 */

export type CampaignType = 'paid_social' | 'email' | 'whatsapp' | 'sms' | 'google' | 'event'
export const TYPE_LABEL: Record<CampaignType, Bi> = {
  paid_social: { en: 'Paid social (Meta)', ar: 'إعلانات مدفوعة (ميتا)' },
  email: { en: 'Email', ar: 'بريد إلكتروني' },
  whatsapp: { en: 'WhatsApp broadcast', ar: 'بث واتساب' },
  sms: { en: 'SMS', ar: 'رسائل نصية' },
  google: { en: 'Google ads', ar: 'إعلانات Google' },
  event: { en: 'Event or open house', ar: 'فعالية أو يوم مفتوح' },
}

export interface MarketingCampaign {
  id: string
  /** The tag every lead of this campaign carries in the CRM. */
  code: string
  name: string
  type: CampaignType
  product: 're' | 'af' | 'cl'
  segment: string
  persona: string
  owner: string
  channels: string[]
  startDate: string
  endDate: string
  budget: number
  /** From the marketing platform. */
  sent: number
  delivered: number
  opened: number
  clicked: number
  /** Share of recipients who match the segment on the record (from the platform's list against the CRM). */
  segmentMatchPct: number
  /** The CRM environments the campaign's leads land in. One campaign can bring leads to several environments (each has its own CRM). */
  envIds: EnvId[]
  /** Where the campaign came from: the marketing platform's sync, or registered by hand in the portal until the platform is connected. */
  source?: 'platform' | 'manual'
  registeredBy?: string
}

/** What the CRM says about the leads tagged with the campaign code. */
export interface CrmTracking {
  leads: number
  /** Tagged with the code (the rest were matched by phone and source, and flagged). */
  taggedPct: number
  contacted: number
  contactedIn24h: number
  notContacted: number
  noAnswer: number
  inProgress: number
  won: number
  lost: number
  byMethod: { method: Bi; count: number }[]
  avgFirstContactHours: number
  /** Leads won per week since the start. */
  weekly: { week: string; leads: number; won: number }[]
  lastReadAt: string
  /** Share of the budget counted against these leads (1 for the whole campaign, the environment's share for one environment). */
  budgetShare?: number
}

const NOW = Date.parse('2026-11-23T08:00:00Z')
const d = (days: number) => new Date(NOW + days * 86_400_000).toISOString().slice(0, 10)

export const CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'mk-1',
    code: 'MKT-2026-031',
    name: 'Saadiyat Grove launch, Abu Dhabi investors',
    type: 'paid_social',
    product: 're',
    segment: 'Abu Dhabi investors, AED 2M+, off-plan interest',
    persona: 'The yield-focused investor',
    owner: 'Marketing manager',
    channels: ['Facebook', 'Instagram', 'WhatsApp follow-up'],
    startDate: d(-75),
    endDate: d(-45),
    budget: 180_000,
    sent: 410_000,
    delivered: 402_000,
    opened: 0,
    clicked: 9_800,
    segmentMatchPct: 86,
    envIds: ['auh', 'dub'],
  },
  {
    id: 'mk-2',
    code: 'MKT-2026-034',
    name: 'Dubai Hills resale, email to past enquirers',
    type: 'email',
    product: 're',
    segment: 'Dubai enquirers of the last 12 months who did not buy',
    persona: 'The upgrader family',
    owner: 'Marketing executive',
    channels: ['Email'],
    startDate: d(-58),
    endDate: d(-51),
    budget: 12_000,
    sent: 26_400,
    delivered: 25_100,
    opened: 7_900,
    clicked: 1_240,
    segmentMatchPct: 93,
    envIds: ['dub'],
  },
  {
    id: 'mk-3',
    code: 'MKT-2026-037',
    name: 'Rental renewals reminder, PSI Assets tenants',
    type: 'whatsapp',
    product: 'af',
    segment: 'Tenants with a lease ending in 60 days',
    persona: 'The settled tenant',
    owner: 'Marketing executive',
    channels: ['WhatsApp'],
    startDate: d(-40),
    endDate: d(-33),
    budget: 4_500,
    sent: 3_100,
    delivered: 3_020,
    opened: 2_640,
    clicked: 610,
    segmentMatchPct: 97,
    envIds: ['ast'],
  },
  {
    id: 'mk-4',
    code: 'MKT-2026-040',
    name: 'Yas Island open house weekend',
    type: 'event',
    product: 're',
    segment: 'Abu Dhabi and Dubai first-time buyers',
    persona: 'The first-time buyer',
    owner: 'Events lead',
    channels: ['SMS invite', 'Instagram', 'Walk-in'],
    startDate: d(-21),
    endDate: d(-19),
    budget: 95_000,
    sent: 18_000,
    delivered: 17_200,
    opened: 0,
    clicked: 2_100,
    segmentMatchPct: 71,
    envIds: ['auh', 'dub', 'ai'],
  },
  {
    id: 'mk-5',
    code: 'MKT-2026-043',
    name: 'Google search, ready villas in Dubai',
    type: 'google',
    product: 're',
    segment: 'People searching for ready villas in Dubai',
    persona: 'The relocating professional',
    owner: 'Digital marketing lead',
    channels: ['Google search'],
    startDate: d(-12),
    endDate: d(18),
    budget: 60_000,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 5_300,
    segmentMatchPct: 0,
    envIds: ['dub', 'ai'],
  },
]

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
}

/** Sample CRM picture of one campaign, the same on every load. */
export function trackingOf(c: MarketingCampaign): CrmTracking {
  const r = rng(c.code)
  const fromClicks = c.type === 'email' ? c.clicked * 0.35 : c.type === 'whatsapp' ? c.clicked * 0.6 : c.type === 'event' ? c.clicked * 0.55 : c.clicked * 0.18
  // a campaign registered by hand has no platform numbers yet: in the real platform its leads still come from the CRM tag
  const base = fromClicks || c.budget / 150
  const leads = Math.round(base * (0.8 + r() * 0.4))
  const notContacted = Math.round(leads * (0.04 + r() * 0.14))
  const contacted = leads - notContacted
  const noAnswer = Math.round(contacted * (0.12 + r() * 0.15))
  const reached = contacted - noAnswer
  const won = Math.round(reached * (c.type === 'whatsapp' ? 0.3 : 0.02 + r() * 0.05))
  const lost = Math.round((reached - won) * (0.3 + r() * 0.25))
  const inProgress = reached - won - lost
  const contactedIn24h = Math.round(contacted * (0.7 + r() * 0.25))
  const call = Math.round(contacted * (0.45 + r() * 0.15))
  const wa = Math.round((contacted - call) * (0.6 + r() * 0.2))
  const email = Math.round((contacted - call - wa) * 0.7)
  const started = Date.parse(c.startDate)
  const weeks = Math.max(1, Math.min(12, Math.ceil((NOW - started) / (7 * 86_400_000))))
  const w = Array.from({ length: weeks }, (_, i) => Math.exp(-i * 0.35) * (0.8 + r() * 0.4))
  const sum = w.reduce((s, x) => s + x, 0)
  const wonW = Array.from({ length: weeks }, (_, i) => (i === 0 ? 0.2 : 0.6 + r()) * Math.exp(-Math.abs(i - 3) * 0.3))
  const sumWon = wonW.reduce((s, x) => s + x, 0)
  return {
    leads,
    taggedPct: Math.round(88 + r() * 11),
    contacted,
    contactedIn24h,
    notContacted,
    noAnswer,
    inProgress,
    won,
    lost,
    byMethod: [
      { method: { en: 'Phone call', ar: 'مكالمة' }, count: call },
      { method: { en: 'WhatsApp', ar: 'واتساب' }, count: wa },
      { method: { en: 'Email', ar: 'بريد إلكتروني' }, count: email },
      { method: { en: 'Visit or meeting', ar: 'زيارة أو اجتماع' }, count: contacted - call - wa - email },
    ],
    avgFirstContactHours: Math.round((4 + r() * 30) * 10) / 10,
    weekly: w.map((x, i) => ({ week: `W${i + 1}`, leads: Math.round((x / sum) * leads), won: Math.round((wonW[i] / sumWon) * won) })),
    lastReadAt: new Date(NOW - Math.floor(r() * 50) * 60_000).toISOString(),
  }
}

/**
 * How a campaign's leads split over its environments (each environment's CRM is read on its own). The real split comes from which CRM
 * each tagged lead sits in; here it is a fixed sample share per environment.
 */
export function envShares(c: MarketingCampaign): { envId: EnvId; share: number }[] {
  const ids = c.envIds?.length ? c.envIds : (['dub'] as EnvId[])
  const r = rng(`${c.code}-env`)
  const w = ids.map((_, i) => (i === 0 ? 1.6 : 0.5 + r()))
  const sum = w.reduce((a, b) => a + b, 0)
  return ids.map((envId, i) => ({ envId, share: w[i] / sum }))
}

/** The CRM picture of a campaign in one environment (or in all of them). */
export function trackingIn(c: MarketingCampaign, env: EnvId | 'all'): CrmTracking {
  const all = trackingOf(c)
  if (env === 'all') return all
  const share = envShares(c).find((x) => x.envId === env)?.share ?? 0
  const k = (n: number) => Math.round(n * share)
  return {
    ...all,
    budgetShare: share,
    leads: k(all.leads),
    contacted: k(all.contacted),
    contactedIn24h: k(all.contactedIn24h),
    notContacted: k(all.notContacted),
    noAnswer: k(all.noAnswer),
    inProgress: k(all.inProgress),
    won: k(all.won),
    lost: k(all.lost),
    byMethod: all.byMethod.map((m) => ({ ...m, count: k(m.count) })),
    weekly: all.weekly.map((w) => ({ ...w, leads: k(w.leads), won: k(w.won) })),
  }
}

export const conversionPct = (t: CrmTracking) => (t.leads ? Math.round((t.won / t.leads) * 1000) / 10 : 0)
/** Budget per lead; in one environment, that environment's share of the budget. */
export const costPerLead = (c: MarketingCampaign, t: CrmTracking) => (t.leads ? Math.round((c.budget * (t.budgetShare ?? 1)) / t.leads) : 0)

// --- Audit ----------------------------------------------------------------------------------------------------------

/** A criterion is measured from the data (`metric`) or marked by the auditor (`manual`). */
export type Metric = 'conversion' | 'contact24' | 'notContacted' | 'cpl' | 'segment' | 'tagged'
export interface Criterion {
  id: string
  name: Bi
  /** How it is judged, in words. */
  rule: Bi
  metric?: Metric
  /** "at least" or "at most" the target. */
  dir?: 'min' | 'max'
  /** The default target; each campaign can set its own. */
  target?: number
  unit?: '%' | 'AED'
}

export const METRIC_LABEL: Record<Metric, Bi> = {
  conversion: { en: 'Conversion rate (won ÷ leads)', ar: 'نسبة التحويل (المغلق ÷ الليدز)' },
  contact24: { en: 'Leads contacted within 24 hours', ar: 'ليدز تم التواصل معها خلال 24 ساعة' },
  notContacted: { en: 'Leads nobody contacted', ar: 'ليدز لم يتواصل معها أحد' },
  cpl: { en: 'Cost per lead', ar: 'التكلفة لكل ليد' },
  segment: { en: 'Recipients matching the segment', ar: 'المستلمون المطابقون للشريحة' },
  tagged: { en: 'Leads tagged with the campaign code in the CRM', ar: 'ليدز موسومة برمز الحملة في CRM' },
}

const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: 'cr-conv',
    name: { en: 'Converts', ar: 'تحقق تحويلاً' },
    rule: { en: 'Won leads as a share of all the leads the campaign brought', ar: 'الليدز المغلقة كنسبة من كل الليدز التي جلبتها الحملة' },
    metric: 'conversion',
    dir: 'min',
    target: 2,
    unit: '%',
  },
  {
    id: 'cr-speed',
    name: { en: 'Leads were followed up fast', ar: 'تمت متابعة الليدز بسرعة' },
    rule: { en: 'Share of the contacted leads reached within 24 hours of arriving', ar: 'نسبة الليدز التي تم التواصل معها خلال 24 ساعة من وصولها' },
    metric: 'contact24',
    dir: 'min',
    target: 85,
    unit: '%',
  },
  {
    id: 'cr-gap',
    name: { en: 'No lead was left behind', ar: 'لم تُترك ليدز بلا متابعة' },
    rule: { en: 'Share of leads nobody contacted', ar: 'نسبة الليدز التي لم يتواصل معها أحد' },
    metric: 'notContacted',
    dir: 'max',
    target: 10,
    unit: '%',
  },
  {
    id: 'cr-cost',
    name: { en: 'Within the cost limit', ar: 'ضمن حد التكلفة' },
    rule: { en: 'Budget divided by the leads it brought', ar: 'الميزانية مقسومة على الليدز التي جلبتها' },
    metric: 'cpl',
    dir: 'max',
    target: 400,
    unit: 'AED',
  },
  {
    id: 'cr-people',
    name: { en: 'Reached the right people', ar: 'وصلت للأشخاص الصحيحين' },
    rule: { en: 'Recipients who match the target segment on the record', ar: 'المستلمون المطابقون للشريحة المستهدفة في السجل' },
    metric: 'segment',
    dir: 'min',
    target: 80,
    unit: '%',
  },
  {
    id: 'cr-tag',
    name: { en: 'Traceable in the CRM', ar: 'قابلة للتتبع في CRM' },
    rule: { en: 'Leads carrying the campaign code, so they can be followed to the end', ar: 'الليدز التي تحمل رمز الحملة لتُتابع حتى النهاية' },
    metric: 'tagged',
    dir: 'min',
    target: 95,
    unit: '%',
  },
  {
    id: 'cr-msg',
    name: { en: 'Message as approved', ar: 'الرسالة كما اعتُمدت' },
    rule: { en: 'What was sent matches the approved content; nothing promised beyond it', ar: 'ما أُرسل يطابق المحتوى المعتمد؛ لا وعود خارجه' },
  },
]

export interface CampaignAudit {
  /** Targets set for this campaign, by criterion id (else the criterion's default). */
  targets: Record<string, number>
  /** Criteria switched off for this campaign. */
  skipped: string[]
  /** The auditor's marks on manual criteria. */
  manual: Record<string, boolean>
  verdict?: 'success' | 'fail'
  note?: string
  decidedAt?: string
}

/** One verdict, frozen at the moment it was given: the numbers and each criterion as they stood, so it reads the same a year later. */
export interface AuditRecord {
  id: string
  campaignId: string
  code: string
  name: string
  product: string
  type: CampaignType
  startDate: string
  endDate: string
  decidedAt: string
  decidedBy: string
  verdict: 'success' | 'fail'
  note?: string
  met: number
  total: number
  snapshot: { leads: number; won: number; conversion: number; costPerLead: number; notContacted: number }
  criteria: { name: Bi; measured?: number; target?: number; unit?: '%' | 'AED'; dir?: 'min' | 'max'; pass?: boolean }[]
  sample?: boolean
}

export interface AuditSettings {
  /** Days the CRM keeps being read after the campaign ends. */
  trackingDays: number
  /** Days after the end before the audit opens. */
  auditOpensAfterDays: number
  /** Days the auditor has once the audit opens. */
  auditDueDays: number
  refresh: 'hourly' | 'daily'
}

interface State {
  criteria: Criterion[]
  audits: Record<string, CampaignAudit>
  settings: AuditSettings
  /** Every verdict ever given, newest last. A campaign judged twice has two records. */
  history: AuditRecord[]
  /** Campaigns registered by hand in the portal (until the marketing platform is connected). */
  custom: MarketingCampaign[]
}

/** Two audits of last year, so the history shows what a year of records looks like (sample data). */
const SAMPLE_HISTORY: AuditRecord[] = [
  {
    id: 'ar-2025-1',
    campaignId: 'mk-2025-1',
    code: 'MKT-2025-012',
    name: 'Ramadan offers, Dubai off-plan',
    product: 're',
    type: 'paid_social',
    startDate: '2025-03-01',
    endDate: '2025-03-30',
    decidedAt: '2025-05-12',
    decidedBy: 'audit@psi.sample',
    verdict: 'success',
    note: 'Strong conversion; follow-up speed to improve.',
    met: 5,
    total: 7,
    snapshot: { leads: 1840, won: 61, conversion: 3.3, costPerLead: 98, notContacted: 7 },
    criteria: [
      { name: { en: 'Converts', ar: 'تحقق تحويلاً' }, measured: 3.3, target: 2, unit: '%', dir: 'min', pass: true },
      { name: { en: 'Leads were followed up fast', ar: 'تمت متابعة الليدز بسرعة' }, measured: 74, target: 85, unit: '%', dir: 'min', pass: false },
      { name: { en: 'No lead was left behind', ar: 'لم تُترك ليدز بلا متابعة' }, measured: 7, target: 10, unit: '%', dir: 'max', pass: true },
      { name: { en: 'Within the cost limit', ar: 'ضمن حد التكلفة' }, measured: 98, target: 400, unit: 'AED', dir: 'max', pass: true },
      { name: { en: 'Reached the right people', ar: 'وصلت للأشخاص الصحيحين' }, measured: 82, target: 80, unit: '%', dir: 'min', pass: true },
      { name: { en: 'Traceable in the CRM', ar: 'قابلة للتتبع في CRM' }, measured: 90, target: 95, unit: '%', dir: 'min', pass: false },
      { name: { en: 'Message as approved', ar: 'الرسالة كما اعتُمدت' }, pass: true },
    ],
    sample: true,
  },
  {
    id: 'ar-2025-2',
    campaignId: 'mk-2025-2',
    code: 'MKT-2025-027',
    name: 'Summer rentals, PSI Assets SMS',
    product: 'af',
    type: 'sms',
    startDate: '2025-06-10',
    endDate: '2025-06-24',
    decidedAt: '2025-08-04',
    decidedBy: 'audit@psi.sample',
    verdict: 'fail',
    note: 'A third of the leads were never called.',
    met: 2,
    total: 6,
    snapshot: { leads: 420, won: 4, conversion: 1, costPerLead: 21, notContacted: 33 },
    criteria: [
      { name: { en: 'Converts', ar: 'تحقق تحويلاً' }, measured: 1, target: 2, unit: '%', dir: 'min', pass: false },
      { name: { en: 'Leads were followed up fast', ar: 'تمت متابعة الليدز بسرعة' }, measured: 51, target: 85, unit: '%', dir: 'min', pass: false },
      { name: { en: 'No lead was left behind', ar: 'لم تُترك ليدز بلا متابعة' }, measured: 33, target: 10, unit: '%', dir: 'max', pass: false },
      { name: { en: 'Within the cost limit', ar: 'ضمن حد التكلفة' }, measured: 21, target: 400, unit: 'AED', dir: 'max', pass: true },
      { name: { en: 'Reached the right people', ar: 'وصلت للأشخاص الصحيحين' }, measured: 88, target: 80, unit: '%', dir: 'min', pass: true },
      { name: { en: 'Traceable in the CRM', ar: 'قابلة للتتبع في CRM' }, measured: 79, target: 95, unit: '%', dir: 'min', pass: false },
    ],
    sample: true,
  },
]

/** Campaign codes found on leads in the CRM that no campaign in the list carries (sample): someone must register them. */
export const UNKNOWN_CRM_TAGS: { code: string; leads: number; firstSeen: string }[] = [{ code: 'MKT-2026-045', leads: 37, firstSeen: '2026-11-18' }]

const KEY = 'psicx.marketingAudit'
const DEFAULT_STATE: State = {
  criteria: DEFAULT_CRITERIA,
  audits: {},
  settings: { trackingDays: 90, auditOpensAfterDays: 30, auditDueDays: 14, refresh: 'hourly' },
  history: SAMPLE_HISTORY,
  custom: [],
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      const history = parsed.history ?? SAMPLE_HISTORY
      const custom = parsed.custom ?? []
      // a verdict given before the history existed (23 Nov): keep it as a record, with the numbers as they read now
      for (const [id, a] of Object.entries(parsed.audits ?? {})) {
        if (!a.verdict || history.some((r) => r.campaignId === id)) continue
        const c = [...CAMPAIGNS, ...custom].find((x) => x.id === id)
        if (!c) continue
        const tr = trackingOf(c)
        history.push({
          id: `ar-${id}`,
          campaignId: id,
          code: c.code,
          name: c.name,
          product: c.product,
          type: c.type,
          startDate: c.startDate,
          endDate: c.endDate,
          decidedAt: a.decidedAt ?? '',
          decidedBy: '',
          verdict: a.verdict,
          note: a.note,
          met: 0,
          total: 0,
          snapshot: {
            leads: tr.leads,
            won: tr.won,
            conversion: conversionPct(tr),
            costPerLead: costPerLead(c, tr),
            notContacted: tr.leads ? Math.round((tr.notContacted / tr.leads) * 100) : 0,
          },
          criteria: [],
        })
      }
      return { ...DEFAULT_STATE, ...parsed, history, custom }
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_STATE
}

let state = read()
const listeners = new Set<() => void>()
function write(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAuditState(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

/** The current audit state, outside React (the inbox reads it). */
export const readAuditState = (): State => state

/** The campaigns: from the marketing platform (here the sample list) plus the ones registered by hand. */
export const listCampaigns = (): MarketingCampaign[] => [...CAMPAIGNS, ...state.custom]
export function useCampaignList(): MarketingCampaign[] {
  const st = useAuditState()
  return [...CAMPAIGNS, ...st.custom]
}

export function registerCampaign(c: MarketingCampaign) {
  write({ ...state, custom: [...state.custom, c] })
}

export const codeTaken = (code: string) => listCampaigns().some((c) => c.code.trim().toLowerCase() === code.trim().toLowerCase())

/** Freezes the verdict with its numbers into the history and marks the campaign judged. */
export function recordVerdict(rec: AuditRecord) {
  write({
    ...state,
    history: [...state.history, rec],
    audits: { ...state.audits, [rec.campaignId]: { ...auditOf(rec.campaignId), verdict: rec.verdict, decidedAt: rec.decidedAt, note: rec.note } },
  })
}

/** The latest verdict of a campaign, if any. */
export const latestRecord = (history: AuditRecord[], campaignId: string) => [...history].reverse().find((r) => r.campaignId === campaignId)

export const auditOf = (id: string): CampaignAudit => state.audits[id] ?? { targets: {}, skipped: [], manual: {} }

export function updateAudit(id: string, patch: Partial<CampaignAudit>) {
  write({ ...state, audits: { ...state.audits, [id]: { ...auditOf(id), ...patch } } })
}

export function saveCriterion(c: Criterion) {
  write({ ...state, criteria: state.criteria.some((x) => x.id === c.id) ? state.criteria.map((x) => (x.id === c.id ? c : x)) : [...state.criteria, c] })
}

export function removeCriterion(id: string) {
  write({ ...state, criteria: state.criteria.filter((x) => x.id !== id) })
}

export function saveSettings(s: AuditSettings) {
  write({ ...state, settings: s })
}

export function resetCriteria() {
  write({ ...state, criteria: DEFAULT_CRITERIA })
}

/** The measured value of a metric criterion for a campaign. */
export function measure(metric: Metric, c: MarketingCampaign, t: CrmTracking): number {
  switch (metric) {
    case 'conversion':
      return conversionPct(t)
    case 'contact24':
      return t.contacted ? Math.round((t.contactedIn24h / t.contacted) * 100) : 0
    case 'notContacted':
      return t.leads ? Math.round((t.notContacted / t.leads) * 100) : 0
    case 'cpl':
      return costPerLead(c, t)
    case 'segment':
      return c.segmentMatchPct
    case 'tagged':
      return t.taggedPct
  }
}

/** Where a campaign is in time: still running, being tracked, audit open, or audit overdue. */
export function auditWindow(
  c: MarketingCampaign,
  s: AuditSettings,
): { phase: 'running' | 'tracking' | 'open' | 'overdue'; opensOn: string; dueOn: string; trackUntil: string } {
  const end = Date.parse(c.endDate)
  const opens = end + s.auditOpensAfterDays * 86_400_000
  const due = opens + s.auditDueDays * 86_400_000
  const until = end + s.trackingDays * 86_400_000
  const phase = NOW < end ? 'running' : NOW < opens ? 'tracking' : NOW <= due ? 'open' : 'overdue'
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  return { phase, opensOn: iso(opens), dueOn: iso(due), trackUntil: iso(until) }
}

export const CAMPAIGN_NOW = NOW

