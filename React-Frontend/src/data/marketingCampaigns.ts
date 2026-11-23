import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

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
  const base = c.type === 'email' ? c.clicked * 0.35 : c.type === 'whatsapp' ? c.clicked * 0.6 : c.type === 'event' ? c.clicked * 0.55 : c.clicked * 0.18
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

export const conversionPct = (t: CrmTracking) => (t.leads ? Math.round((t.won / t.leads) * 1000) / 10 : 0)
export const costPerLead = (c: MarketingCampaign, t: CrmTracking) => (t.leads ? Math.round(c.budget / t.leads) : 0)

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
}

const KEY = 'psicx.marketingAudit'
const DEFAULT_STATE: State = {
  criteria: DEFAULT_CRITERIA,
  audits: {},
  settings: { trackingDays: 90, auditOpensAfterDays: 30, auditDueDays: 14, refresh: 'hourly' },
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw) as State) }
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

