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
export type CampaignStatus = 'draft' | 'sent'
export type CampaignChannel = 'whatsapp' | 'app' | 'email' | 'sms'

export interface SurveyCampaign {
  id: string
  name: string
  product: ProductId
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
}

const KEY = 'psicx.surveyCampaigns'

function read(): SurveyCampaign[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SurveyCampaign[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* storage unavailable: lasts until reload */
  }
  return []
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
  return useSyncExternalStore(subscribe, () => campaigns, () => campaigns)
}

export function nameTaken(name: string, exceptId?: string): boolean {
  const key = name.trim().toLowerCase()
  return campaigns.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === key)
}

export function createCampaign(input: Omit<SurveyCampaign, 'id' | 'status' | 'archived' | 'createdAt' | 'sentCount' | 'answeredCount' | 'sentAt'>): SurveyCampaign {
  const c: SurveyCampaign = { ...input, name: input.name.trim(), id: `sc-${Date.now().toString(36)}`, status: 'draft', archived: false, createdAt: new Date().toISOString() }
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
  updateCampaign(id, { status: 'sent', sentAt: new Date().toISOString(), sentCount: sent, answeredCount: answered })
}

/** A copy to start the next campaign from: draft, not archived, name "… (copy)". */
export function duplicateCampaign(id: string, createdBy: string): SurveyCampaign | undefined {
  const c = campaigns.find((x) => x.id === id)
  if (!c) return undefined
  let name = `${c.name} (copy)`
  let n = 2
  while (nameTaken(name)) name = `${c.name} (copy ${n++})`
  return createCampaign({ name, product: c.product, basedOn: c.basedOn, questions: c.questions.map((q) => ({ ...q })), audience: c.audience, channel: c.channel, sendOn: c.sendOn, createdBy })
}

