import type { Bi, EnvId } from '../types'
import { seededRandom, intBetween, pick } from '../utils/random'
import { BRIGHTCALL_CAMPAIGNS } from './brightcall'

/**
 * Every time a campaign reached out to a customer (26 Nov, owner): AI calls from BrightCall, and WhatsApp, SMS and email from the
 * marketing platform for the same campaign. A compact index, one line per attempt (no recordings, no transcripts, no message text), so
 * the portal can show who was contacted again and again, by which campaigns and how. It feeds the Repeat contacts tab and, later, the
 * personas (how a person responds to each channel).
 */
export type TouchChannel = 'ai_call' | 'whatsapp' | 'sms' | 'email'
export const CHANNEL_LABEL: Record<TouchChannel, Bi> = {
  ai_call: { en: 'AI call', ar: 'مكالمة ذكاء اصطناعي' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  sms: { en: 'SMS', ar: 'رسالة نصية' },
  email: { en: 'Email', ar: 'بريد إلكتروني' },
}

/** For a message: what the platform reported. For an AI call: the BrightCall outcome code. */
export const MESSAGE_STATUS: Record<string, Bi> = {
  delivered: { en: 'Delivered', ar: 'وصلت' },
  read: { en: 'Read', ar: 'قُرئت' },
  replied: { en: 'Replied', ar: 'ردّ' },
  failed: { en: 'Failed', ar: 'فشلت' },
}

export interface ContactTouch {
  at: string
  campaign: string
  channel: TouchChannel
  /** BrightCall outcome for a call; delivered / read / replied / failed for a message. */
  status: string
  /** Talk time for a call, in seconds. */
  durationSec?: number
}

export interface TouchedContact {
  crmId: string
  name: string
  envId: EnvId
  persona: string
  touches: ContactTouch[]
}

const FIRST = ['Omar', 'Sara', 'Khaled', 'Lina', 'Yousef', 'Maya', 'Tariq', 'Rana', 'Fadi', 'Noura', 'James', 'Emma', 'Raj', 'Priya', 'Ali', 'Hala']
const LAST = ['Haddad', 'Nasser', 'Smith', 'Saleh', 'Al Hashimi', 'Odeh', 'Kamal', 'Petrov', 'Sharma', 'Aziz', 'Barakat', 'Mansour']
const PERSONAS = ['The yield-focused investor', 'The upgrader family', 'The settled tenant', 'The first-time buyer', 'The relocating professional']
const CALL_OUTCOMES: [string, number, [number, number]][] = [
  ['No Answer', 46, [0, 0]],
  ['Voicemail', 8, [0, 0]],
  ['Busy', 6, [0, 0]],
  ['Dropped Calls', 9, [2, 18]],
  ['Not Interested', 10, [15, 70]],
  ['Call Back Later', 5, [10, 40]],
  ['No Dialogue', 4, [3, 12]],
  ['Interested, Follow Up Later', 4, [60, 240]],
  ['Interested', 3, [60, 300]],
  ['Scheduled Meeting', 2, [90, 360]],
  ['Angry Bird', 1, [10, 60]],
]
const MSG_STATUS: [string, number][] = [
  ['delivered', 45],
  ['read', 35],
  ['replied', 8],
  ['failed', 12],
]
function weighted<T>(rng: () => number, mix: [T, number, ...unknown[]][]): [T, ...unknown[]] {
  let x = rng() * mix.reduce((s, m) => s + (m[1] as number), 0)
  return (mix.find((m) => (x -= m[1] as number) < 0) ?? mix[0]) as [T, ...unknown[]]
}

const NOW = Date.parse('2026-11-26T06:40:00Z')
const CUSTOMER_CAMPAIGNS = BRIGHTCALL_CAMPAIGNS.filter((c) => !['Recruitment campaign', 'Dashboard Webhook Test'].includes(c.name))

function build(): TouchedContact[] {
  const rng = seededRandom(14_014)
  const out: TouchedContact[] = []
  for (let i = 0; i < 420; i++) {
    const envCamps = pick(rng, [
      CUSTOMER_CAMPAIGNS.filter((c) => c.env === 'auh'),
      CUSTOMER_CAMPAIGNS.filter((c) => c.env === 'dub'),
      CUSTOMER_CAMPAIGNS.filter((c) => c.env === 'ast'),
    ])
    const env = envCamps[0].env
    // most people sit in one campaign; a tail sits in three or more and is called again and again
    const r = rng()
    const nCamps = r < 0.55 ? 1 : r < 0.85 ? 2 : r < 0.96 ? 3 : 4
    const camps = [...envCamps].sort(() => rng() - 0.5).slice(0, Math.min(nCamps, envCamps.length))
    const touches: ContactTouch[] = []
    for (const c of camps) {
      const calls = rng() < 0.45 ? 1 : rng() < 0.12 ? intBetween(rng, 6, 10) : intBetween(rng, 2, 4)
      for (let k = 0; k < calls; k++) {
        const [code, , dur] = weighted(rng, CALL_OUTCOMES) as [string, number, [number, number]]
        touches.push({ at: at(rng), campaign: c.name, channel: 'ai_call', status: code, durationSec: dur[1] ? intBetween(rng, dur[0], dur[1]) : 0 })
      }
      const msgs = rng() < 0.6 ? intBetween(rng, 0, 1) : intBetween(rng, 1, 3)
      for (let k = 0; k < msgs; k++) {
        const ch: TouchChannel = rng() < 0.7 ? 'whatsapp' : rng() < 0.5 ? 'sms' : 'email'
        touches.push({ at: at(rng), campaign: c.name, channel: ch, status: weighted(rng, MSG_STATUS)[0] as string })
      }
    }
    if (!touches.length) continue
    out.push({
      crmId: `C-${300_000 + i}`,
      name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      envId: env,
      persona: pick(rng, PERSONAS),
      touches: touches.sort((a, z) => a.at.localeCompare(z.at)),
    })
  }
  return out
}

function at(rng: () => number) {
  const d = new Date(NOW - intBetween(rng, 0, 89) * 86_400_000)
  d.setUTCHours(intBetween(rng, 5, 15), intBetween(rng, 0, 59), 0, 0)
  return d.toISOString()
}

export const CONTACT_TOUCHES: TouchedContact[] = build()
