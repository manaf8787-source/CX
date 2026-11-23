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
}

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
  for (const r of list) {
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

