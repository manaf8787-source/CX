import { useSyncExternalStore } from 'react'
import type { ProductId } from '../types'
import type { EditableQuestion } from './surveyEditor'

/**
 * Survey campaigns (owner's request, 22 Nov): a survey the team sends on purpose to its own people, as opposed to the fixed surveys that
 * go out by themselves at a moment (a signed deal, a closed ticket). Each campaign is saved under the name the team gave it, keeps a
 * copy of the questions as they were when it was made, and stays findable afterwards: search by name, archive when finished, reuse it
 * as the start of the next one.
 *
 * Prototype only: kept in this browser's localStorage and nothing is sent; "Send" marks the campaign sent and fills sample results. In
 * the real platform the survey agent sends it on the channel chosen, and the results come from the answers.
 */
/** A campaign can belong to a product, or to none ("general"): for example a survey to all investors, or to staff. */
export type CampaignProduct = ProductId | 'general'
export type CampaignStatus = 'draft' | 'sent'
/** `app` is the pop-up notification shown inside the PSI app; `push` is the phone notification outside the app. */
export type CampaignChannel = 'whatsapp' | 'app' | 'push' | 'email' | 'sms' | 'call' | 'link'

export interface SurveyCampaign {
  id: string
  name: string
  product: CampaignProduct
  /** The question set it started from (for the record) and a copy of the questions as they were. */
  basedOn: string
  questions: EditableQuestion[]
  /** Who it goes to, in words, for example "Dubai clients who viewed a unit in October". */
  audience: string
  channel: CampaignChannel
  /** ISO date it is meant to go out or went out. */
  sendOn: string
  status: CampaignStatus
  archived: boolean
  createdAt: string
  createdBy: string
  sentCount?: number
  answeredCount?: number
  sentAt?: string
  /** One of the example campaigns that ship with the prototype so the Dashboard has something to show. */
  sample?: boolean
}

const KEY = 'psicx.surveyCampaigns'

const SEEDED_KEY = 'psicx.surveyCampaignsSeeded'

const q = (en: string, ar: string, kind: string) => ({ en, ar, kind })
const Q_NPS = [
  q('How likely are you to recommend PSI to a friend or colleague? (0 to 10)', 'ما مدى احتمال أن توصي بـ PSI لصديق أو زميل؟ (0 إلى 10)', 'nps'),
  q('What is the main reason for your score?', 'ما السبب الرئيسي لتقييمك؟', 'open'),
]
const Q_VIEWING = [
  q('How satisfied were you with your viewing? (1 to 5)', 'ما مدى رضاك عن المعاينة؟ (1 إلى 5)', 'rating'),
  q('How easy was it to get what you needed? (1 to 5)', 'كم كان من السهل الحصول على ما تحتاجه؟ (1 إلى 5)', 'rating'),
  q('Would you like an agent to call you? (yes / no)', 'هل تريد أن يتصل بك وكيل؟ (نعم / لا)', 'yesno'),
]
const Q_WALLET = [
  q('How easy was it to find your portfolio in the Wallet? (1 to 5)', 'كم كان من السهل إيجاد محفظتك في المحفظة؟ (1 إلى 5)', 'rating'),
  q(
    'What would you like to see first? (balance · statements · payouts · documents · other)',
    'ما الذي تريد رؤيته أولاً؟ (الرصيد · الكشوف · الدفعات · المستندات · أخرى)',
    'choice',
  ),
  q('Anything we should change?', 'هل هناك ما يجب أن نغيّره؟', 'open'),
]

/** The example campaigns (clearly marked sample): four sent and one draft, so the Dashboard can be tried before real ones exist. */
function seedCampaigns(): SurveyCampaign[] {
  const base = {
    archived: false,
    createdBy: 'CX manager',
    sample: true as const,
    status: 'sent' as const,
  }
  return [
    {
      ...base,
      id: 'sc-sample-1',
      name: 'Dubai viewings, October',
      product: 're',
      basedOn: 'tx',
      questions: Q_VIEWING,
      audience: 'Dubai clients who viewed a unit in October',
      channel: 'whatsapp',
      sendOn: '2026-10-14',
      createdAt: '2026-10-12T08:00:00.000Z',
      sentAt: '2026-10-14T09:00:00.000Z',
      sentCount: 412,
      answeredCount: 168,
    },
    {
      ...base,
      id: 'sc-sample-2',
      name: 'Handover experience, Q3 buyers',
      product: 'af',
      basedOn: 'nps',
      questions: Q_NPS,
      audience: 'Buyers who received keys in July to September',
      channel: 'email',
      sendOn: '2026-09-22',
      createdAt: '2026-09-20T08:00:00.000Z',
      sentAt: '2026-09-22T09:00:00.000Z',
      sentCount: 286,
      answeredCount: 97,
    },
    {
      ...base,
      id: 'sc-sample-3',
      name: 'PSI Wallet first look',
      product: 'wl',
      basedOn: 'wallet',
      questions: Q_WALLET,
      audience: 'Investors who opened the Wallet demo',
      channel: 'app',
      sendOn: '2026-11-03',
      createdAt: '2026-11-01T08:00:00.000Z',
      sentAt: '2026-11-03T09:00:00.000Z',
      sentCount: 540,
      answeredCount: 261,
    },
    {
      ...base,
      id: 'sc-sample-4',
      name: 'Renewal follow-up',
      product: 'af',
      basedOn: 'nps',
      questions: Q_NPS,
      audience: 'Tenants who renewed in October',
      channel: 'sms',
      sendOn: '2026-11-12',
      createdAt: '2026-11-10T08:00:00.000Z',
      sentAt: '2026-11-12T09:00:00.000Z',
      sentCount: 198,
      answeredCount: 49,
    },
    {
      ...base,
      id: 'sc-sample-5',
      name: 'Abu Dhabi off-plan investors',
      product: 're',
      basedOn: 'nps',
      questions: Q_NPS,
      audience: 'Abu Dhabi investors in off-plan projects',
      channel: 'whatsapp',
      sendOn: '2026-12-01',
      createdAt: '2026-11-20T08:00:00.000Z',
      status: 'draft',
    },
  ]
}

function read(): SurveyCampaign[] {
  let stored: SurveyCampaign[] = []
  let seeded = false
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SurveyCampaign[]
      if (Array.isArray(parsed)) stored = parsed
    }
    seeded = localStorage.getItem(SEEDED_KEY) === '1'
    if (!seeded) {
      localStorage.setItem(SEEDED_KEY, '1')
      stored = [...stored, ...seedCampaigns().filter((c) => !stored.some((x) => x.id === c.id))]
      localStorage.setItem(KEY, JSON.stringify(stored))
    }
  } catch {
    /* storage unavailable: lasts until reload */
    if (!stored.length) stored = seedCampaigns()
  }
  return stored
}

let campaigns: SurveyCampaign[] = read()
const listeners = new Set<() => void>()

function write(next: SurveyCampaign[]) {
  campaigns = next
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

export function useCampaigns(): SurveyCampaign[] {
  return useSyncExternalStore(
    subscribe,
    () => campaigns,
    () => campaigns,
  )
}

export function nameTaken(name: string, exceptId?: string): boolean {
  const key = name.trim().toLowerCase()
  return campaigns.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === key)
}

export function createCampaign(
  input: Omit<SurveyCampaign, 'id' | 'status' | 'archived' | 'createdAt' | 'sentCount' | 'answeredCount' | 'sentAt'>,
): SurveyCampaign {
  const c: SurveyCampaign = {
    ...input,
    name: input.name.trim(),
    id: `sc-${Date.now().toString(36)}`,
    status: 'draft',
    archived: false,
    createdAt: new Date().toISOString(),
  }
  write([c, ...campaigns])
  return c
}

export function updateCampaign(id: string, patch: Partial<SurveyCampaign>) {
  write(campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)))
}

export function setArchived(id: string, archived: boolean) {
  updateCampaign(id, { archived })
}

/** Prototype "send": marks it sent and fills deterministic sample results. */
export function markSent(id: string) {
  const c = campaigns.find((x) => x.id === id)
  if (!c) return
  let h = 0
  for (const ch of c.id + c.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const sent = 80 + (h % 220)
  const answered = Math.round(sent * (0.28 + ((h >>> 5) % 30) / 100))
  updateCampaign(id, {
    status: 'sent',
    sentAt: new Date().toISOString(),
    sentCount: sent,
    answeredCount: answered,
  })
}

/** A copy to start the next campaign from: draft, not archived, name "… (copy)". */
export function duplicateCampaign(id: string, createdBy: string): SurveyCampaign | undefined {
  const c = campaigns.find((x) => x.id === id)
  if (!c) return undefined
  let name = `${c.name} (copy)`
  let n = 2
  while (nameTaken(name)) name = `${c.name} (copy ${n++})`
  return createCampaign({
    name,
    product: c.product,
    basedOn: c.basedOn,
    questions: c.questions.map((q) => ({ ...q })),
    audience: c.audience,
    channel: c.channel,
    sendOn: c.sendOn,
    createdBy,
  })
}

