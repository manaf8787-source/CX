import type { ContactTouch, TouchChannel, TouchedContact } from '../data/contactTouches'

export interface RepeatFilter {
  from: string
  to: string
  env: string
  /** 'all' or one BrightCall campaign. */
  campaign: string
  /** Campaigns counted (the customer campaigns by default). */
  campaigns: ReadonlySet<string>
}

export interface RepeatRow {
  contact: TouchedContact
  touches: ContactTouch[]
  total: number
  calls: number
  byChannel: Record<TouchChannel, number>
  /** Attempts per campaign, largest first. */
  perCampaign: [string, number][]
  /** The most attempts inside one campaign. */
  maxInOne: number
  last: string
}

/** Each customer's attempts inside the filter, with the counts the Repeat contacts tab shows. */
export function repeatRows(contacts: readonly TouchedContact[], f: RepeatFilter): RepeatRow[] {
  const rows: RepeatRow[] = []
  for (const c of contacts) {
    if (f.env !== 'all' && c.envId !== f.env) continue
    const touches = c.touches.filter((t) => {
      const d = t.at.slice(0, 10)
      return d >= f.from && d <= f.to && f.campaigns.has(t.campaign) && (f.campaign === 'all' || t.campaign === f.campaign)
    })
    if (!touches.length) continue
    const byChannel: Record<TouchChannel, number> = { ai_call: 0, whatsapp: 0, sms: 0, email: 0 }
    const per = new Map<string, number>()
    for (const t of touches) {
      byChannel[t.channel]++
      per.set(t.campaign, (per.get(t.campaign) ?? 0) + 1)
    }
    const perCampaign = [...per.entries()].sort((a, z) => z[1] - a[1])
    rows.push({
      contact: c,
      touches,
      total: touches.length,
      calls: byChannel.ai_call,
      byChannel,
      perCampaign,
      maxInOne: perCampaign[0][1],
      last: touches[touches.length - 1].at,
    })
  }
  return rows.sort((a, z) => z.total - a.total || z.last.localeCompare(a.last))
}

export interface RepeatSummary {
  customers: number
  /** Contacted 2 or more times inside one campaign. */
  repeatedInOne: number
  /** Contacted by 2 or more campaigns. */
  multiCampaign: number
  /** Contacted 3 or more campaigns. */
  threePlus: number
  mostTouches: number
  attempts: number
}

export function repeatSummary(rows: readonly RepeatRow[]): RepeatSummary {
  return {
    customers: rows.length,
    repeatedInOne: rows.filter((r) => r.maxInOne >= 2).length,
    multiCampaign: rows.filter((r) => r.perCampaign.length >= 2).length,
    threePlus: rows.filter((r) => r.perCampaign.length >= 3).length,
    mostTouches: rows.reduce((m, r) => Math.max(m, r.total), 0),
    attempts: rows.reduce((s, r) => s + r.total, 0),
  }
}

/** Per campaign: customers contacted 2 or more times by that campaign. */
export function repeatsByCampaign(rows: readonly RepeatRow[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) for (const [c, n] of r.perCampaign) if (n >= 2) m.set(c, (m.get(c) ?? 0) + 1)
  return m
}
