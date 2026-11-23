import type { Bi, EnvId } from '../types'
import { AGENTS } from './agents'

/**
 * The lead and opportunity funnel as PSI Marketing's CRM logic guide defines it (shared 23 Nov; summary in the project doc
 * "PSI-CRM-Lead-Logic-Reference"). AI qualifies first (chatbot, AI call); Customer Support joins the chat when the client asks for a
 * person and hands back to the AI; Agent QA decides the leads the AI cannot; only qualified, booked leads become opportunities for a
 * sales agent; an agent's return goes through Return QA.
 *
 * Read by: "Who is leaving" (where people drop out, why, and who had them last) and the AI team page (results and assessment of the
 * AI and QA layers). Prototype: a deterministic sample of about 700 enquiries over the last 90 days; in the real platform every number
 * comes from the CRM's timestamps (lead_created_at, ai_first_response_at, handover_at, agent_first_attempt_at…).
 */

export type LeadSource = 'paid_social' | 'search' | 'portal' | 'website' | 'app' | 'whatsapp' | 'referral' | 'event'
export type Intent = 'genuine' | 'explorer' | 'broker' | 'mystery' | 'researcher' | 'job'
export type Readiness = 'ready' | 'warm' | 'exploring' | 'longterm'
export type LeadOutcome = 'handed_over' | 'nurture' | 'unreachable' | 'junk' | 'non_buyer' | 'merged' | 'open'
export type OppStage = 'assigned' | 'contacted' | 'confirmed' | 'viewing' | 'offer' | 'booking' | 'won'
export type LostReason = 'price' | 'competitor' | 'timing' | 'finance' | 'unresponsive' | 'changed_mind'
export type ReturnReason = 'not_interested' | 'not_ready' | 'funding' | 'different_options' | 'unreachable' | 'not_genuine'
export type QaDecision = 'upheld' | 'overturned' | 'reassigned' | 'redirected' | 'pending'
export type Owner = 'ai' | 'cs' | 'qa' | 'agent' | 'return_qa'

export interface LeadRec {
  id: string
  createdAt: string
  source: LeadSource
  campaignCode?: string
  envId: EnvId
  /** Which humans stepped in before the outcome. */
  cs: boolean
  qa: boolean
  aiFirstResponseMin: number
  aiCallFirstAttemptMin: number
  contacted: boolean
  /** Hours from created to AI-qualified or disqualified; absent while open. */
  aiDecisionH?: number
  csJoinMin?: number
  csHandedBack?: boolean
  qaPickupMin?: number
  qaDecisionH?: number
  intent: Intent
  readiness?: Readiness
  outcome: LeadOutcome
  opp?: Opp
  /** Who had the person last, when they dropped out or now. */
  lastOwner: Owner
  agentId?: string
}

export interface Opp {
  agentId: string
  acceptMin: number
  firstCallMin: number
  reached: OppStage
  confirmed: boolean
  closed: 'won' | 'lost' | null
  lostReason?: LostReason
  returned?: { reason: ReturnReason; decision: QaDecision; decisionH: number }
  /** Days since the last logged activity (open deals). */
  idleDays: number
}

export const SOURCE_LABEL: Record<LeadSource, Bi> = {
  paid_social: { en: 'Paid social', ar: 'إعلانات التواصل' },
  search: { en: 'Search ads', ar: 'إعلانات البحث' },
  portal: { en: 'Portals (Bayut, Property Finder)', ar: 'البوابات (بيوت، بروبرتي فايندر)' },
  website: { en: 'Website', ar: 'الموقع' },
  app: { en: 'App', ar: 'التطبيق' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  referral: { en: 'Referral', ar: 'إحالة' },
  event: { en: 'Event', ar: 'فعالية' },
}
export const OWNER_LABEL: Record<Owner, Bi> = {
  ai: { en: 'AI (chatbot, AI call)', ar: 'الذكاء الاصطناعي (الشات، المكالمة الآلية)' },
  cs: { en: 'Customer Support', ar: 'خدمة العملاء' },
  qa: { en: 'Agent QA', ar: 'Agent QA' },
  agent: { en: 'Sales agent', ar: 'وكيل المبيعات' },
  return_qa: { en: 'Return QA', ar: 'Return QA' },
}
export const STAGE_LABEL: Record<OppStage, Bi> = {
  assigned: { en: 'Handed to an agent', ar: 'سُلّم لوكيل' },
  contacted: { en: 'Agent contacted', ar: 'تواصل الوكيل' },
  confirmed: { en: 'Agent confirmed', ar: 'أكّد الوكيل' },
  viewing: { en: 'Viewing or meeting done', ar: 'تمت المعاينة أو الاجتماع' },
  offer: { en: 'Offer or negotiation', ar: 'عرض أو تفاوض' },
  booking: { en: 'Booking or EOI', ar: 'حجز أو EOI' },
  won: { en: 'Closed won (SPA)', ar: 'مربوحة (SPA)' },
}
export const OPP_STAGES: OppStage[] = ['assigned', 'contacted', 'confirmed', 'viewing', 'offer', 'booking', 'won']

/** Why someone dropped out, in the guide's words. */
export type ExitReason = 'unreachable' | 'nurture' | 'junk' | 'non_buyer' | 'returned' | `lost_${LostReason}` | 'stale'
export const EXIT_LABEL: Record<ExitReason, Bi> = {
  unreachable: { en: 'Unreachable: no answer after 6 attempts in 7 days', ar: 'غير قابل للوصول: لا رد بعد 6 محاولات خلال 7 أيام' },
  nurture: { en: 'Nurture: genuine but not ready (exploring, long term)', ar: 'رعاية: جدّي لكن غير جاهز (يستكشف، بعيد المدى)' },
  junk: { en: 'Junk: fake details, wrong number, spam', ar: 'Junk: بيانات وهمية، رقم خاطئ، رسائل مزعجة' },
  non_buyer: { en: 'Not a buyer: broker, researcher, job seeker', ar: 'ليس مشترياً: وسيط، باحث، باحث عن عمل' },
  returned: { en: 'Returned by the agent (Return QA upheld)', ar: 'أرجعه الوكيل (أيّد Return QA)' },
  lost_price: { en: 'Closed lost: price', ar: 'خسارة: السعر' },
  lost_competitor: { en: 'Closed lost: went to a competitor', ar: 'خسارة: ذهب لمنافس' },
  lost_timing: { en: 'Closed lost: timing', ar: 'خسارة: التوقيت' },
  lost_finance: { en: 'Closed lost: finance or mortgage', ar: 'خسارة: التمويل' },
  lost_unresponsive: { en: 'Closed lost: stopped answering', ar: 'خسارة: توقف عن الرد' },
  lost_changed_mind: { en: 'Closed lost: changed their mind', ar: 'خسارة: غيّر رأيه' },
  stale: { en: 'Deal stuck: no activity for 7 days or more', ar: 'صفقة متوقفة: لا نشاط منذ 7 أيام أو أكثر' },
}

function rng(seed: number) {
  let h = seed >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let x = Math.imul(h ^ (h >>> 15), 1 | h)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
const pickW = <T>(r: () => number, xs: [T, number][]): T => {
  let x = r() * xs.reduce((s, [, w]) => s + w, 0)
  for (const [v, w] of xs) if ((x -= w) < 0) return v
  return xs[xs.length - 1][0]
}

const DAY = 86_400_000
const CODES = ['MKT-2026-031', 'MKT-2026-034', 'MKT-2026-037', 'MKT-2026-040', 'MKT-2026-043']

function build(nowMs: number): LeadRec[] {
  const r = rng(2026_11_23)
  const sales = AGENTS.filter((a) => a.kind === 'sales' && a.crm)
  const out: LeadRec[] = []
  for (let i = 0; i < 720; i++) {
    const created = nowMs - Math.floor(r() * 90 * DAY)
    const ageDays = (nowMs - created) / DAY
    const source = pickW<LeadSource>(r, [
      ['paid_social', 30],
      ['search', 14],
      ['portal', 20],
      ['website', 10],
      ['app', 6],
      ['whatsapp', 8],
      ['referral', 7],
      ['event', 5],
    ])
    const paid = source === 'paid_social' || source === 'search' || source === 'event'
    const campaignCode = paid ? CODES[Math.floor(r() * CODES.length)] : undefined
    const envId = pickW<EnvId>(r, [
      ['dub', 40],
      ['auh', 30],
      ['ast', 18],
      ['ai', 12],
    ])
    // paid social brings more junk and non-buyers; referrals are the best (the guide: optimise by qualification rate, not volume)
    const junkBias = source === 'paid_social' ? 1.6 : source === 'referral' ? 0.4 : 1
    const rec: LeadRec = {
      id: `LD-${10001 + i}`,
      createdAt: new Date(created).toISOString(),
      source,
      campaignCode,
      envId,
      cs: false,
      qa: false,
      aiFirstResponseMin: r() < 0.9 ? Math.round(r() * 8) / 10 + 0.2 : 1 + Math.round(r() * 60) / 10,
      aiCallFirstAttemptMin: r() < 0.82 ? 1 + Math.floor(r() * 4) : 5 + Math.floor(r() * 40),
      contacted: false,
      intent: 'genuine',
      outcome: 'open',
      lastOwner: 'ai',
    }
    // still inside the first days: some enquiries are open with the AI
    if (ageDays < 2 && r() < 0.6) {
      out.push(rec)
      continue
    }
    rec.contacted = r() < 0.64
    if (!rec.contacted) {
      rec.outcome = r() < 0.12 / junkBias ? 'junk' : 'unreachable'
      rec.aiDecisionH = 7 * 24
      out.push(rec)
      continue
    }
    // asked for a person in the chat: Customer Support joins and (usually) hands back
    if (r() < 0.19) {
      rec.cs = true
      rec.csJoinMin = r() < 0.75 ? Math.round(r() * 9) / 10 + 0.2 : 1 + Math.round(r() * 30) / 10
      rec.csHandedBack = r() < 0.74
    }
    rec.intent = pickW<Intent>(r, [
      ['genuine', 80 / junkBias],
      ['explorer', 9],
      ['broker', 5 * junkBias],
      ['mystery', 2],
      ['researcher', 3],
      ['job', 2],
    ])
    // the AI could not determine: Agent QA
    if (r() < 0.16) {
      rec.qa = true
      rec.qaPickupMin = r() < 0.7 ? 5 + Math.floor(r() * 25) : 30 + Math.floor(r() * 150)
      rec.qaDecisionH = r() < 0.72 ? 1 + Math.round(r() * 30) / 10 : 4 + Math.round(r() * 200) / 10
    }
    if (rec.intent === 'broker' || rec.intent === 'researcher' || rec.intent === 'job') {
      rec.outcome = 'non_buyer'
      rec.lastOwner = rec.qa ? 'qa' : 'ai'
      rec.aiDecisionH = 2 + Math.floor(r() * 40)
      out.push(rec)
      continue
    }
    if (r() < 0.05 * junkBias) {
      rec.outcome = 'junk'
      rec.lastOwner = rec.qa ? 'qa' : 'ai'
      rec.aiDecisionH = 1 + Math.floor(r() * 20)
      out.push(rec)
      continue
    }
    rec.readiness = pickW<Readiness>(r, [
      ['ready', 22],
      ['warm', 30],
      ['exploring', 33],
      ['longterm', 15],
    ])
    rec.aiDecisionH = r() < 0.7 ? 2 + Math.floor(r() * 22) : 24 + Math.floor(r() * 70)
    if (rec.intent === 'explorer' || rec.readiness === 'exploring' || rec.readiness === 'longterm') {
      rec.outcome = 'nurture'
      rec.lastOwner = rec.qa ? 'qa' : rec.cs && !rec.csHandedBack ? 'cs' : 'ai'
      out.push(rec)
      continue
    }
    if (r() < 0.03) {
      rec.outcome = 'merged'
      out.push(rec)
      continue
    }
    // handed over: an opportunity for a sales agent
    rec.outcome = 'handed_over'
    const agent = sales.filter((a) => a.envId === envId)[Math.floor(r() * 2)] ?? sales[Math.floor(r() * sales.length)]
    rec.agentId = agent.id
    rec.lastOwner = 'agent'
    const weak = agent.id === 'ag-hadi' || agent.id === 'ag-tariq'
    const opp: Opp = {
      agentId: agent.id,
      acceptMin: r() < (weak ? 0.55 : 0.8) ? 1 + Math.floor(r() * 2) : 3 + Math.floor(r() * 20),
      firstCallMin: r() < (weak ? 0.5 : 0.78) ? 1 + Math.floor(r() * 5) : 6 + Math.floor(r() * 40),
      reached: 'assigned',
      confirmed: false,
      closed: null,
      idleDays: Math.floor(r() * 4),
    }
    rec.opp = opp
    opp.reached = 'contacted'
    // AI accuracy: the agent confirms most; the rest are returned through Return QA
    if (r() < (rec.readiness === 'ready' ? 0.84 : 0.72)) {
      opp.confirmed = true
      opp.reached = 'confirmed'
    } else {
      const reason = pickW<ReturnReason>(r, [
        ['not_interested', 25],
        ['not_ready', 22],
        ['funding', 14],
        ['different_options', 16],
        ['unreachable', 13],
        ['not_genuine', 10],
      ])
      const decision =
        ageDays < 2
          ? 'pending'
          : pickW<QaDecision>(r, [
              ['upheld', weak ? 52 : 70],
              ['overturned', weak ? 30 : 12],
              ['reassigned', 6],
              ['redirected', 12],
            ])
      opp.returned = { reason, decision, decisionH: r() < 0.75 ? 4 + Math.floor(r() * 20) : 24 + Math.floor(r() * 40) }
      if (decision === 'upheld') {
        opp.closed = 'lost'
        rec.lastOwner = 'return_qa'
        out.push(rec)
        continue
      }
      if (decision === 'pending') {
        rec.lastOwner = 'return_qa'
        out.push(rec)
        continue
      }
      if (decision === 'redirected') {
        rec.lastOwner = 'ai'
        out.push(rec)
        continue
      }
      opp.confirmed = true
      opp.reached = 'confirmed'
    }
    const steps: [OppStage, number][] = [
      ['viewing', 0.72],
      ['offer', 0.56],
      ['booking', 0.62],
      ['won', 0.78],
    ]
    for (const [stage, p] of steps) {
      // recent deals have not had the time to move on
      const room = ageDays > 10 + OPP_STAGES.indexOf(stage) * 8
      if (room && r() < p) {
        opp.reached = stage
        continue
      }
      if (!room && r() < 0.7) break
      // stopped here: closed lost with a reason, or left stuck with no activity
      if (r() < 0.7) {
        opp.closed = 'lost'
        opp.lostReason = pickW<LostReason>(r, [
          ['price', 24],
          ['competitor', 18],
          ['timing', 18],
          ['finance', 16],
          ['unresponsive', 16],
          ['changed_mind', 8],
        ])
      } else opp.idleDays = 7 + Math.floor(r() * 20)
      break
    }
    if (opp.reached === 'won') opp.closed = 'won'
    out.push(rec)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

let cache: { day: number; list: LeadRec[] } | null = null
/** The sample, built once per day so it moves with the calendar. */
export function leadSample(nowMs: number): LeadRec[] {
  const day = Math.floor(nowMs / DAY)
  if (!cache || cache.day !== day) cache = { day, list: build(day * DAY) }
  return cache.list
}

export function exitOf(l: LeadRec): ExitReason | null {
  if (l.outcome === 'unreachable' || l.outcome === 'nurture' || l.outcome === 'junk' || l.outcome === 'non_buyer') return l.outcome
  if (l.opp?.returned?.decision === 'upheld') return 'returned'
  if (l.opp?.closed === 'lost' && l.opp.lostReason) return `lost_${l.opp.lostReason}`
  if (l.opp && !l.opp.closed && l.opp.idleDays >= 7) return 'stale'
  return null
}

export const agentName = (id?: string) => AGENTS.find((a) => a.id === id)?.name ?? '–'

// --- the assessment: each check with the guide's healthy / watch / critical bands ---------------------------------------

export type Band = 'healthy' | 'watch' | 'critical' | 'trend'
export interface Check {
  id: string
  label: Bi
  measured: Bi
  value: number | null
  unit: '%' | 'min' | 'h'
  band: Band
  target: Bi
}

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : null)
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 10) / 10
}
/** low = lower is better. */
function band(v: number | null, healthy: number, critical: number, low: boolean): Band {
  if (v === null) return 'trend'
  if (low) return v <= healthy ? 'healthy' : v > critical ? 'critical' : 'watch'
  return v >= healthy ? 'healthy' : v < critical ? 'critical' : 'watch'
}
const T = (en: string, ar: string): Bi => ({ en, ar })

export function assess(list: readonly LeadRec[]) {
  const decided = list.filter((l) => l.outcome !== 'open')
  const contacted = list.filter((l) => l.contacted)
  const handed = list.filter((l) => l.opp)
  const cs = list.filter((l) => l.cs)
  const qa = list.filter((l) => l.qa)
  const returned = handed.filter((l) => l.opp!.returned)
  const reviewed = returned.filter((l) => l.opp!.returned!.decision !== 'pending')
  const overturned = reviewed.filter((l) => ['overturned', 'reassigned'].includes(l.opp!.returned!.decision))
  const confirmed = handed.filter((l) => l.opp!.confirmed)
  const qaQualified = qa.filter((l) => l.opp)
  const ai: Check[] = [
    (() => {
      const v = median(list.map((l) => l.aiFirstResponseMin))
      return {
        id: 'chat',
        label: T('Chatbot first response', 'أول رد للشات بوت'),
        measured: T('Median minutes from the enquiry to the first chatbot message', 'الوسيط بالدقائق من الاستفسار لأول رسالة'),
        value: v,
        unit: 'min',
        band: band(v, 1, 5, true),
        target: T('under 1 min', 'أقل من دقيقة'),
      } as Check
    })(),
    (() => {
      const v = median(list.map((l) => l.aiCallFirstAttemptMin))
      return {
        id: 'call',
        label: T('AI call first attempt', 'أول محاولة للمكالمة الآلية'),
        measured: T('Median minutes from the enquiry to the first AI call', 'الوسيط بالدقائق من الاستفسار لأول مكالمة آلية'),
        value: v,
        unit: 'min',
        band: band(v, 5, 30, true),
        target: T('under 5 min', 'أقل من 5 دقائق'),
      } as Check
    })(),
    (() => {
      const v = pct(contacted.length, decided.length)
      return {
        id: 'contact',
        label: T('Contact rate', 'نسبة الوصول'),
        measured: T('Leads the AI reached ÷ all leads', 'من وصله الذكاء الاصطناعي ÷ كل العملاء المحتملين'),
        value: v,
        unit: '%',
        band: band(v, 60, 40, false),
        target: T('over 60%', 'أكثر من 60%'),
      } as Check
    })(),
    (() => {
      const v = median(decided.filter((l) => l.aiDecisionH != null && l.contacted).map((l) => l.aiDecisionH!))
      return {
        id: 'qualify',
        label: T('Time to qualify', 'زمن التأهيل'),
        measured: T('Median hours from the enquiry to qualified or disqualified', 'الوسيط بالساعات من الاستفسار للتأهيل أو الاستبعاد'),
        value: v,
        unit: 'h',
        band: band(v, 24, 72, true),
        target: T('within 24 h', 'خلال 24 ساعة'),
      } as Check
    })(),
    (() => {
      const v = pct(handed.length, decided.length)
      return {
        id: 'qrate',
        label: T('Qualification rate', 'نسبة التأهيل'),
        measured: T('Leads handed to an agent ÷ all leads', 'من سُلّم لوكيل ÷ كل العملاء المحتملين'),
        value: v,
        unit: '%',
        band: band(v, 15, 8, false),
        target: T('over 15%', 'أكثر من 15%'),
      } as Check
    })(),
    (() => {
      const v = pct(decided.filter((l) => l.outcome === 'junk').length, decided.length)
      return {
        id: 'junk',
        label: T('Junk rate', 'نسبة Junk'),
        measured: T('Junk ÷ all leads', 'Junk ÷ كل العملاء المحتملين'),
        value: v,
        unit: '%',
        band: band(v, 15, 30, true),
        target: T('under 15%', 'أقل من 15%'),
      } as Check
    })(),
    (() => {
      const v = pct(contacted.filter((l) => !l.cs && !l.qa).length, contacted.length)
      return {
        id: 'contain',
        label: T('AI containment', 'احتواء الذكاء الاصطناعي'),
        measured: T('Leads the AI handled to the end with no person stepping in', 'من أنهاه الذكاء الاصطناعي دون تدخّل إنسان'),
        value: v,
        unit: '%',
        band: band(v, 70, 50, false),
        target: T('over 70%', 'أكثر من 70%'),
      } as Check
    })(),
  ]
  const support: Check[] = [
    (() => {
      const v = pct(cs.length, contacted.length)
      return {
        id: 'cs_take',
        label: T('Takeover rate', 'نسبة التدخّل'),
        measured: T('Chats Customer Support joined ÷ all chats', 'المحادثات التي دخلتها خدمة العملاء ÷ كل المحادثات'),
        value: v,
        unit: '%',
        band: band(v, 20, 35, true),
        target: T('under 20%', 'أقل من 20%'),
      } as Check
    })(),
    (() => {
      const v = median(cs.map((l) => l.csJoinMin!))
      return {
        id: 'cs_join',
        label: T('Time to join', 'زمن الانضمام'),
        measured: T('Median minutes from "I want a person" to Customer Support joining', 'الوسيط بالدقائق من طلب إنسان حتى انضمام خدمة العملاء'),
        value: v,
        unit: 'min',
        band: band(v, 1, 2, true),
        target: T('under 1 min', 'أقل من دقيقة'),
      } as Check
    })(),
    (() => {
      const v = pct(cs.filter((l) => l.csHandedBack).length, cs.length)
      return {
        id: 'cs_back',
        label: T('Handed back to the AI', 'أُعيد للذكاء الاصطناعي'),
        measured: T('Chats returned to the AI ÷ chats Customer Support joined', 'المحادثات المعادة للذكاء الاصطناعي ÷ التي دخلتها خدمة العملاء'),
        value: v,
        unit: '%',
        band: band(v, 70, 50, false),
        target: T('over 70%', 'أكثر من 70%'),
      } as Check
    })(),
  ]
  const agentQa: Check[] = [
    (() => {
      const v = pct(qa.length, contacted.length)
      return {
        id: 'qa_rate',
        label: T('Undetermined rate', 'نسبة غير المحسوم'),
        measured: T('Leads the AI sent to Agent QA ÷ leads the AI handled', 'ما أرسله الذكاء الاصطناعي لـ Agent QA ÷ ما تعامل معه'),
        value: v,
        unit: '%',
        band: band(v, 15, 25, true),
        target: T('under 15%', 'أقل من 15%'),
      } as Check
    })(),
    (() => {
      const v = median(qa.map((l) => l.qaPickupMin!))
      return {
        id: 'qa_pick',
        label: T('QA pick-up', 'استلام QA'),
        measured: T('Median minutes from the QA queue to a QA agent opening it', 'الوسيط بالدقائق من الطابور حتى يفتحه موظف QA'),
        value: v,
        unit: 'min',
        band: band(v, 30, 120, true),
        target: T('under 30 min', 'أقل من 30 دقيقة'),
      } as Check
    })(),
    (() => {
      const v = median(qa.map((l) => l.qaDecisionH!))
      return {
        id: 'qa_dec',
        label: T('QA decision', 'قرار QA'),
        measured: T('Median hours from the queue to the decision', 'الوسيط بالساعات من الطابور حتى القرار'),
        value: v,
        unit: 'h',
        band: band(v, 4, 24, true),
        target: T('within 4 working h', 'خلال 4 ساعات عمل'),
      } as Check
    })(),
    (() => {
      const v = pct(qaQualified.filter((l) => l.opp!.confirmed).length, qaQualified.length)
      return {
        id: 'qa_acc',
        label: T('QA accuracy', 'دقة QA'),
        measured: T('QA-qualified opportunities the agent confirmed', 'فرص أهّلها QA وأكدها الوكيل'),
        value: v,
        unit: '%',
        band: band(v, 85, 70, false),
        target: T('over 85%', 'أكثر من 85%'),
      } as Check
    })(),
  ]
  const accuracy: Check[] = [
    (() => {
      const v = pct(confirmed.length, handed.length)
      return {
        id: 'ai_acc',
        label: T('AI qualification accuracy', 'دقة تأهيل الذكاء الاصطناعي'),
        measured: T('Opportunities the agent confirmed ÷ handed over', 'الفرص التي أكدها الوكيل ÷ المسلّمة'),
        value: v,
        unit: '%',
        band: band(v, 80, 60, false),
        target: T('over 80%', 'أكثر من 80%'),
      } as Check
    })(),
    (() => {
      const rw = handed.filter((l) => l.readiness === 'ready' || l.readiness === 'warm')
      const v = pct(rw.filter((l) => l.opp!.confirmed).length, rw.length)
      return {
        id: 'ready_acc',
        label: T('Readiness accuracy', 'دقة الجاهزية'),
        measured: T('Ready and warm handovers the agent confirmed', 'تسليمات "جاهز" و"دافئ" التي أكدها الوكيل'),
        value: v,
        unit: '%',
        band: band(v, 80, 60, false),
        target: T('over 80%', 'أكثر من 80%'),
      } as Check
    })(),
    (() => {
      const v = pct(decided.filter((l) => l.outcome === 'non_buyer').length, decided.length)
      return {
        id: 'nonbuyer',
        label: T('Non-buyer share', 'نسبة غير المشترين'),
        measured: T('Brokers, researchers and job seekers ÷ all leads', 'وسطاء وباحثون وباحثون عن عمل ÷ الكل'),
        value: v,
        unit: '%',
        band: band(v, 10, 20, true),
        target: T('under 10%', 'أقل من 10%'),
      } as Check
    })(),
  ]
  const returnQa: Check[] = [
    (() => {
      const v = pct(returned.length, handed.length)
      return {
        id: 'ret',
        label: T('Return rate', 'نسبة الإرجاع'),
        measured: T('Opportunities the agents returned ÷ handed over', 'الفرص التي أرجعها الوكلاء ÷ المسلّمة'),
        value: v,
        unit: '%',
        band: band(v, 15, 25, true),
        target: T('under 15%', 'أقل من 15%'),
      } as Check
    })(),
    (() => {
      const v = pct(overturned.length, reviewed.length)
      return {
        id: 'over',
        label: T('Overturn rate', 'نسبة النقض'),
        measured: T('Returns QA overturned ÷ returns reviewed', 'الإرجاعات التي نقضها QA ÷ المراجَعة'),
        value: v,
        unit: '%',
        band: band(v, 10, 25, true),
        target: T('under 10%', 'أقل من 10%'),
      } as Check
    })(),
    (() => {
      const v = median(reviewed.map((l) => l.opp!.returned!.decisionH))
      return {
        id: 'ret_dec',
        label: T('Return QA decision time', 'زمن قرار Return QA'),
        measured: T('Median hours from the request to the decision', 'الوسيط بالساعات من الطلب حتى القرار'),
        value: v,
        unit: 'h',
        band: band(v, 24, 48, true),
        target: T('within 24 h', 'خلال 24 ساعة'),
      } as Check
    })(),
  ]
  return {
    ai,
    support,
    agentQa,
    accuracy,
    returnQa,
    counts: { leads: list.length, handed: handed.length, cs: cs.length, qa: qa.length, returned: returned.length },
  }
}
