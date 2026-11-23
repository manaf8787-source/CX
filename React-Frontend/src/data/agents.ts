import { seededRandom } from '../utils/random'
import type { Bi, EnvId, ProductId } from '../types'
import { ymd } from './performance'

/**
 * The CRM agents' performance (owner's request, 22 Nov): two reports, Sales agents and the Excellence team (was Support agents), each filterable by product.
 * The source is the CRM: the lead SLA (first response) and the SLA on every activity for PSI Real Estate and PSI Club; Tour Estate
 * guides are measured on customer feedback linked to their name (needs an API from the product owner); PSI Wallet is mostly the
 * user's own work, so only its front-end support agents (WhatsApp and in-app chat) are measured.
 *
 * Prototype: the roster and the history are sample data, seeded so they stay the same on every load. In the real platform each record
 * is a CRM lead, a CRM activity or a support conversation with its time stamps.
 */
export type AgentKind = 'sales' | 'support'
export type SupportChannel = 'whatsapp' | 'chat'

export interface Agent {
  id: string
  name: string
  kind: AgentKind
  product: ProductId
  /** The environment the agent works in; support agents of a whole product (PSI Wallet) have none, so a single-environment CEO does not see them. */
  envId?: EnvId
  channel?: SupportChannel
  /** True when the CRM measures the agent (lead and activity SLAs); false when only feedback is available (Tour Estate, until the API exists). */
  crm: boolean
}

/** What the sample history for an agent looks like: records a month, how often the SLA is kept, conversion, and the usual score. */
interface Profile {
  perMonth: [number, number]
  sla: number
  convert: number
  score: number
}

export const AGENTS: Agent[] = [
  { id: 'ag-layla', name: 'Layla Haddad', kind: 'sales', product: 're', envId: 'dub', crm: true },
  { id: 'ag-omar', name: 'Omar Saleh', kind: 'sales', product: 're', envId: 'dub', crm: true },
  { id: 'ag-rania', name: 'Rania Khoury', kind: 'sales', product: 're', envId: 'auh', crm: true },
  { id: 'ag-tariq', name: 'Tariq Mansour', kind: 'sales', product: 're', envId: 'auh', crm: true },
  { id: 'ag-hadi', name: 'Hadi Nasser', kind: 'sales', product: 're', envId: 'ast', crm: true },
  { id: 'ag-reem', name: 'Reem Odeh', kind: 'sales', product: 're', envId: 'ai', crm: true },
  { id: 'ag-sara', name: 'Sara Idris', kind: 'sales', product: 'cl', envId: 'dub', crm: true },
  { id: 'ag-yousef', name: 'Yousef Karam', kind: 'sales', product: 'cl', envId: 'auh', crm: true },
  { id: 'ag-khalid', name: 'Khalid Rahman (tour guide)', kind: 'sales', product: 'to', envId: 'dub', crm: false },
  { id: 'ag-mariam', name: 'Mariam Aziz (tour guide)', kind: 'sales', product: 'to', envId: 'auh', crm: false },
  { id: 'ag-noor', name: 'Noor Samir', kind: 'support', product: 'wl', channel: 'whatsapp', crm: false },
  { id: 'ag-ziad', name: 'Ziad Fares', kind: 'support', product: 'wl', channel: 'whatsapp', crm: false },
  { id: 'ag-huda', name: 'Huda Wael', kind: 'support', product: 'wl', channel: 'chat', crm: false },
  { id: 'ag-faris', name: 'Faris Adel', kind: 'support', product: 'wl', channel: 'chat', crm: false },
  { id: 'ag-dalia', name: 'Dalia Younes', kind: 'support', product: 'cl', envId: 'dub', channel: 'whatsapp', crm: false },
  // 23 Nov (owner): an Excellence team in every environment, so each environment's CEO sees their own
  { id: 'ag-lina', name: 'Lina Haddad', kind: 'support', product: 're', envId: 'dub', channel: 'chat', crm: false },
  { id: 'ag-samer', name: 'Samer Aziz', kind: 'support', product: 're', envId: 'auh', channel: 'whatsapp', crm: false },
  { id: 'ag-maya', name: 'Maya Fouad', kind: 'support', product: 're', envId: 'auh', channel: 'chat', crm: false },
  { id: 'ag-karim', name: 'Karim Salem', kind: 'support', product: 'af', envId: 'auh', channel: 'whatsapp', crm: false },
  { id: 'ag-rana', name: 'Rana Jaber', kind: 'support', product: 'af', envId: 'ast', channel: 'whatsapp', crm: false },
  { id: 'ag-bilal', name: 'Bilal Mousa', kind: 'support', product: 'af', envId: 'ast', channel: 'chat', crm: false },
  { id: 'ag-nadine', name: 'Nadine Saad', kind: 'support', product: 're', envId: 'ai', channel: 'chat', crm: false },
  // 23 Nov (owner): "add more": fuller teams, so the comparisons mean something
  { id: 'ag-hala', name: 'Hala Nimer', kind: 'support', product: 're', envId: 'dub', channel: 'whatsapp', crm: false },
  { id: 'ag-tamer', name: 'Tamer Odeh', kind: 'support', product: 'af', envId: 'dub', channel: 'whatsapp', crm: false },
  { id: 'ag-ruba', name: 'Ruba Khalil', kind: 'support', product: 'af', envId: 'dub', channel: 'chat', crm: false },
  { id: 'ag-yara', name: 'Yara Hamdan', kind: 'support', product: 'cl', envId: 'auh', channel: 'whatsapp', crm: false },
  { id: 'ag-fadi', name: 'Fadi Shami', kind: 'support', product: 'af', envId: 'auh', channel: 'chat', crm: false },
  { id: 'ag-mona', name: 'Mona Sabbagh', kind: 'support', product: 're', envId: 'ast', channel: 'whatsapp', crm: false },
  { id: 'ag-zaid', name: 'Zaid Qasem', kind: 'support', product: 'af', envId: 'ast', channel: 'whatsapp', crm: false },
  { id: 'ag-dina-s', name: 'Dina Saleh', kind: 'support', product: 're', envId: 'ai', channel: 'whatsapp', crm: false },
  { id: 'ag-jad', name: 'Jad Halabi', kind: 'support', product: 'af', envId: 'ai', channel: 'chat', crm: false },
  { id: 'ag-ahmad', name: 'Ahmad Zuabi', kind: 'sales', product: 're', envId: 'dub', crm: true },
  { id: 'ag-salma', name: 'Salma Nasr', kind: 'sales', product: 're', envId: 'auh', crm: true },
  { id: 'ag-wael', name: 'Wael Ghanem', kind: 'sales', product: 're', envId: 'ast', crm: true },
  { id: 'ag-lara', name: 'Lara Haddad', kind: 'sales', product: 're', envId: 'ai', crm: true },
  { id: 'ag-nizar', name: 'Nizar Taha', kind: 'sales', product: 'cl', envId: 'ast', crm: true },
]

const PROFILES: Record<string, Profile> = {
  'ag-layla': { perMonth: [34, 44], sla: 0.9, convert: 0.22, score: 4.5 },
  'ag-omar': { perMonth: [28, 40], sla: 0.74, convert: 0.17, score: 4.0 },
  'ag-rania': { perMonth: [30, 40], sla: 0.86, convert: 0.2, score: 4.3 },
  'ag-tariq': { perMonth: [24, 34], sla: 0.68, convert: 0.14, score: 3.7 },
  'ag-hadi': { perMonth: [20, 30], sla: 0.82, convert: 0.19, score: 4.2 },
  'ag-sara': { perMonth: [12, 18], sla: 0.92, convert: 0.31, score: 4.6 },
  'ag-yousef': { perMonth: [10, 16], sla: 0.78, convert: 0.25, score: 4.1 },
  'ag-khalid': { perMonth: [14, 22], sla: 0.9, convert: 0, score: 4.7 },
  'ag-mariam': { perMonth: [12, 20], sla: 0.9, convert: 0, score: 4.2 },
  'ag-noor': { perMonth: [60, 80], sla: 0.88, convert: 0, score: 4.4 },
  'ag-ziad': { perMonth: [50, 70], sla: 0.7, convert: 0, score: 3.8 },
  'ag-huda': { perMonth: [70, 90], sla: 0.92, convert: 0, score: 4.5 },
  'ag-faris': { perMonth: [60, 80], sla: 0.76, convert: 0, score: 3.9 },
  'ag-dalia': { perMonth: [30, 44], sla: 0.84, convert: 0, score: 4.3 },
  'ag-reem': { perMonth: [22, 32], sla: 0.88, convert: 0.21, score: 4.4 },
  'ag-lina': { perMonth: [50, 66], sla: 0.9, convert: 0, score: 4.5 },
  'ag-samer': { perMonth: [44, 60], sla: 0.86, convert: 0, score: 4.3 },
  'ag-maya': { perMonth: [52, 70], sla: 0.72, convert: 0, score: 3.8 },
  'ag-karim': { perMonth: [36, 50], sla: 0.8, convert: 0, score: 4.1 },
  'ag-rana': { perMonth: [40, 56], sla: 0.91, convert: 0, score: 4.6 },
  'ag-bilal': { perMonth: [34, 48], sla: 0.66, convert: 0, score: 3.6 },
  'ag-nadine': { perMonth: [30, 42], sla: 0.94, convert: 0, score: 4.7 },
  'ag-hala': { perMonth: [46, 62], sla: 0.83, convert: 0, score: 4.2 },
  'ag-tamer': { perMonth: [38, 52], sla: 0.69, convert: 0, score: 3.7 },
  'ag-ruba': { perMonth: [42, 58], sla: 0.93, convert: 0, score: 4.6 },
  'ag-yara': { perMonth: [26, 38], sla: 0.87, convert: 0, score: 4.4 },
  'ag-fadi': { perMonth: [34, 48], sla: 0.75, convert: 0, score: 3.9 },
  'ag-mona': { perMonth: [36, 50], sla: 0.85, convert: 0, score: 4.2 },
  'ag-zaid': { perMonth: [32, 46], sla: 0.78, convert: 0, score: 4.0 },
  'ag-dina-s': { perMonth: [28, 40], sla: 0.81, convert: 0, score: 4.1 },
  'ag-jad': { perMonth: [24, 36], sla: 0.7, convert: 0, score: 3.7 },
  'ag-ahmad': { perMonth: [30, 42], sla: 0.84, convert: 0.19, score: 4.2 },
  'ag-salma': { perMonth: [26, 38], sla: 0.92, convert: 0.24, score: 4.6 },
  'ag-wael': { perMonth: [18, 28], sla: 0.71, convert: 0.13, score: 3.7 },
  'ag-lara': { perMonth: [20, 30], sla: 0.86, convert: 0.2, score: 4.3 },
  'ag-nizar': { perMonth: [10, 16], sla: 0.8, convert: 0.27, score: 4.2 },
}

/** One lead (sales) or one conversation (support), with the time stamps the SLAs are checked against. */
export interface AgentRecord {
  agentId: string
  /** The day the lead arrived or the conversation started, YYYY-MM-DD. */
  at: string
  /** Minutes to the first response, and the SLA it is checked against. Absent when the source does not give it (Tour Estate). */
  firstMin?: number
  firstSlaMin?: number
  /** Sales: activities on the lead (calls, meetings, follow-ups), each with its own SLA, and how many were done in time. */
  acts?: number
  actsOnTime?: number
  converted?: boolean
  /** Support: hours to resolve and the SLA, resolved at the first contact, escalated. */
  resolveHrs?: number
  resolveSlaHrs?: number
  fcr?: boolean
  escalated?: boolean
  /** The customer's 1 to 5 score linked to the agent, when the customer gave one. */
  score?: number
  /**
   * 23 Nov (owner): the lead was taken from this agent and given to another because there was no first response within the
   * reassignment window (REASSIGN_AFTER_MIN). The agent lost it; the id is the agent who received it.
   */
  reassignedTo?: string
}

/** Sales: with no first response this many minutes after the lead arrived, the CRM gives the lead to another agent [Proposed]. */
export const REASSIGN_AFTER_MIN = 60

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const cache = new Map<string, AgentRecord[]>()

/** Six months of sample history for one agent, up to yesterday. Stable per agent and day. */
export function agentHistory(agent: Agent, nowMs: number): AgentRecord[] {
  const day = ymd(new Date(nowMs))
  const key = `${agent.id}|${day}`
  const hit = cache.get(key)
  if (hit) return hit
  const p = PROFILES[agent.id]
  const rng = seededRandom(hash(agent.id))
  const rr = seededRandom(hash(`${agent.id}|reassign`))
  const now = new Date(nowMs)
  const out: AgentRecord[] = []
  for (let m = 5; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 0)
    const lastDay = m === 0 ? Math.max(1, now.getDate() - 1) : end.getDate()
    const count = Math.round(p.perMonth[0] + rng() * (p.perMonth[1] - p.perMonth[0]))
    for (let i = 0; i < count; i++) {
      const at = ymd(new Date(start.getFullYear(), start.getMonth(), 1 + Math.floor(rng() * lastDay)))
      const kept = rng() < p.sla
      const rec: AgentRecord = { agentId: agent.id, at }
      if (rng() < 0.55) rec.score = Math.max(1, Math.min(5, Math.round(p.score + (rng() - 0.5) * 2.4)))
      if (agent.kind === 'sales' && agent.crm) {
        // the CRM lead SLA is 30 minutes in working hours; activities carry their own SLA
        rec.firstSlaMin = 30
        rec.firstMin = kept ? Math.round(4 + rng() * 24) : Math.round(36 + rng() * 150)
        rec.acts = 2 + Math.floor(rng() * 4)
        rec.actsOnTime = Math.round(rec.acts * Math.min(1, p.sla + (rng() - 0.5) * 0.3))
        rec.converted = rng() < p.convert
        // its own random stream, so the other figures stay as they were
        if (rec.firstMin > REASSIGN_AFTER_MIN && rr() < 0.8) {
          const peers = AGENTS.filter((a) => a.kind === 'sales' && a.crm && a.id !== agent.id && a.product === agent.product)
          const same = peers.filter((a) => a.envId === agent.envId)
          const pool = same.length ? same : peers
          if (pool.length) {
            rec.reassignedTo = pool[Math.floor(rr() * pool.length)].id
            rec.converted = false
          }
        }
      }
      if (agent.kind === 'support') {
        const whatsapp = agent.channel === 'whatsapp'
        rec.firstSlaMin = whatsapp ? 5 : 2
        rec.firstMin = kept ? Math.round(1 + rng() * (rec.firstSlaMin - 1)) : Math.round(rec.firstSlaMin + 1 + rng() * 14)
        rec.resolveSlaHrs = 24
        rec.resolveHrs = rng() < p.sla ? Math.round(1 + rng() * 22) : Math.round(26 + rng() * 40)
        rec.fcr = rng() < p.sla - 0.1
        rec.escalated = rng() < (1 - p.sla) * 0.6
      }
      out.push(rec)
    }
  }
  cache.set(key, out)
  return out
}

export interface AgentMetrics {
  records: number
  /** Records with a first response measured, those within the SLA, and the average minutes. */
  firstMeasured: number
  firstOnTime: number
  firstOnTimePct: number | null
  avgFirstMin: number | null
  acts: number
  actsOnTime: number
  actsOnTimePct: number | null
  converted: number
  conversionPct: number | null
  resolvedMeasured: number
  resolvedOnTime: number
  resolvedOnTimePct: number | null
  fcrPct: number | null
  escalated: number
  scored: number
  avgScore: number | null
  /** Leads taken from the agent for no first response in time, and their share of the leads received. */
  lostToReassign: number
  lostToReassignPct: number | null
}

const pct = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 100))
const avg = (sum: number, n: number, d = 1) => (n === 0 ? null : Math.round((sum / n) * 10 ** d) / 10 ** d)

export function agentMetrics(list: readonly AgentRecord[]): AgentMetrics {
  let firstMeasured = 0
  let firstOnTime = 0
  let firstSum = 0
  let acts = 0
  let actsOnTime = 0
  let converted = 0
  let convertible = 0
  let resolvedMeasured = 0
  let resolvedOnTime = 0
  let fcr = 0
  let escalated = 0
  let scored = 0
  let scoreSum = 0
  let lost = 0
  for (const r of list) {
    if (r.reassignedTo) lost++
    if (r.firstMin !== undefined && r.firstSlaMin !== undefined) {
      firstMeasured++
      firstSum += r.firstMin
      if (r.firstMin <= r.firstSlaMin) firstOnTime++
    }
    if (r.acts !== undefined) {
      acts += r.acts
      actsOnTime += r.actsOnTime ?? 0
      convertible++
      if (r.converted) converted++
    }
    if (r.resolveHrs !== undefined && r.resolveSlaHrs !== undefined) {
      resolvedMeasured++
      if (r.resolveHrs <= r.resolveSlaHrs) resolvedOnTime++
      if (r.fcr) fcr++
    }
    if (r.escalated) escalated++
    if (r.score !== undefined) {
      scored++
      scoreSum += r.score
    }
  }
  return {
    records: list.length,
    firstMeasured,
    firstOnTime,
    firstOnTimePct: pct(firstOnTime, firstMeasured),
    avgFirstMin: avg(firstSum, firstMeasured),
    acts,
    actsOnTime,
    actsOnTimePct: pct(actsOnTime, acts),
    converted,
    conversionPct: pct(converted, convertible),
    resolvedMeasured,
    resolvedOnTime,
    resolvedOnTimePct: pct(resolvedOnTime, resolvedMeasured),
    fcrPct: pct(fcr, resolvedMeasured),
    escalated,
    scored,
    avgScore: avg(scoreSum, scored),
    lostToReassign: lost,
    lostToReassignPct: pct(lost, list.length),
  }
}

/** Where each product's numbers come from, shown on the report so nobody has to guess. `ready` is false when an API is still to be requested. */
export const PRODUCT_SOURCES: Partial<Record<ProductId, { ready: boolean; text: Bi }>> = {
  re: {
    ready: true,
    text: {
      en: 'PSI Real Estate: the CRM. Lead first response is checked against the CRM lead SLA; every activity on the lead is checked against its own SLA.',
      ar: 'بي إس آي العقارية: نظام CRM. يُقارن أول رد على العميل المحتمل بمهلة CRM، وكل نشاط على العميل بمهلته الخاصة.',
    },
  },
  cl: {
    ready: true,
    text: {
      en: 'PSI Club: the same method as Real Estate, from the CRM lead and activity SLAs.',
      ar: 'نادي بي إس آي: الطريقة نفسها كالعقارية، من مهل العملاء المحتملين والأنشطة في CRM.',
    },
  },
  af: {
    ready: false,
    text: {
      en: 'After-Sales: WhatsApp and in-app chat with owners and tenants (maintenance, handover, service charges). Needs the chat tool’s API; until then the figures are sample data.',
      ar: 'ما بعد البيع: واتساب ودردشة التطبيق مع الملاك والمستأجرين (الصيانة، التسليم، رسوم الخدمة). يحتاج واجهة أداة الدردشة؛ إلى ذلك الحين الأرقام تجريبية.',
    },
  },
  to: {
    ready: false,
    text: {
      en: 'Tour Estate: customer feedback linked to the tour guide’s name. Needs an API from the Tour Estate product owner or developer; until then the figures are sample data.',
      ar: 'تور إستيت: ملاحظات العملاء المرتبطة باسم المرشد السياحي. تحتاج واجهة برمجية من مالك المنتج أو المطوّر؛ إلى ذلك الحين الأرقام تجريبية.',
    },
  },
  wl: {
    ready: false,
    text: {
      en: 'PSI Wallet: the work is mostly the user’s own, so only the Excellence team members on the front line are measured, on WhatsApp and in-app chat. Needs the chat tool’s API; until then the figures are sample data.',
      ar: 'محفظة بي إس آي: العمل يقوم به المستخدم في الغالب، لذا يُقاس فقط أعضاء فريق التميّز في الواجهة عبر واتساب ودردشة التطبيق. يحتاج واجهة أداة الدردشة؛ إلى ذلك الحين الأرقام تجريبية.',
    },
  },
}
