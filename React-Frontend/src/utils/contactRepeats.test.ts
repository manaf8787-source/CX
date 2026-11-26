import { describe, expect, it } from 'vitest'
import type { TouchedContact } from '../data/contactTouches'
import { repeatRows, repeatSummary, repeatsByCampaign } from './contactRepeats'

const c = (id: string, touches: [string, string, 'ai_call' | 'whatsapp'][]): TouchedContact => ({
  crmId: id,
  name: id,
  envId: 'auh',
  persona: 'p',
  touches: touches.map(([at, campaign, channel]) => ({ at, campaign, channel, status: channel === 'ai_call' ? 'No Answer' : 'delivered' })),
})
const data = [
  c('A', [
    ['2026-11-01T08:00:00Z', 'X', 'ai_call'],
    ['2026-11-02T08:00:00Z', 'X', 'ai_call'],
    ['2026-11-03T08:00:00Z', 'Y', 'whatsapp'],
    ['2026-11-04T08:00:00Z', 'Z', 'ai_call'],
  ]),
  c('B', [['2026-11-05T08:00:00Z', 'X', 'ai_call']]),
]
const all = new Set(['X', 'Y', 'Z'])

describe('repeat contacts', () => {
  it('counts attempts per customer, per channel and per campaign', () => {
    const [a] = repeatRows(data, { from: '2026-11-01', to: '2026-11-30', env: 'all', campaign: 'all', campaigns: all })
    expect(a.total).toBe(4)
    expect(a.byChannel).toEqual({ ai_call: 3, whatsapp: 1, sms: 0, email: 0 })
    expect(a.perCampaign[0]).toEqual(['X', 2])
    expect(a.maxInOne).toBe(2)
  })
  it('summarises repeats in one campaign and across campaigns', () => {
    const rows = repeatRows(data, { from: '2026-11-01', to: '2026-11-30', env: 'all', campaign: 'all', campaigns: all })
    expect(repeatSummary(rows)).toMatchObject({ customers: 2, repeatedInOne: 1, multiCampaign: 1, threePlus: 1, mostTouches: 4 })
    expect(repeatsByCampaign(rows).get('X')).toBe(1)
  })
  it('respects the dates and the campaign set', () => {
    const rows = repeatRows(data, { from: '2026-11-03', to: '2026-11-30', env: 'all', campaign: 'all', campaigns: new Set(['X', 'Y']) })
    expect(rows.map((r) => [r.contact.crmId, r.total])).toEqual([
      ['B', 1],
      ['A', 1],
    ])
  })
})
