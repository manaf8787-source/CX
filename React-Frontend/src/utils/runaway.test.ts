import { describe, expect, it } from 'vitest'
import type { EffortSummary, Interaction, Person, ProblemFlag } from '@/types'
import { RUNAWAY_LEARNING_ORDER, RUNAWAY_THRESHOLDS, RUNAWAY_TYPE_DEFINITION, RUNAWAY_TYPE_LABEL, buildFaultSummary, classifyRunaway } from './runaway'

function person(over: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    identity: {},
    type: 'lead',
    name: 'Sample',
    segment: 'lead',
    sourceOfLead: 'website',
    consent: { dncr: false, whatsapp: true, sms: true, email: true },
    environment: 'Dubai',
    envId: 'dub',
    products: ['re'],
    unitsOrDeals: 0,
    preferredChannel: 'whatsapp',
    language: 'en',
    vip: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  } as Person
}
const effort = (days: number): EffortSummary => ({ personId: 'p1', interactions: 3, contactsLast90Days: 1, problemsFound: 1, daysSinceLastContact: days })
function withFlags(...flags: ProblemFlag[]): Interaction[] {
  return [{ id: 'i1', personKey: 'p1', sourceRef: 'r', channel: 'whatsapp', direction: 'inbound', occurredAt: '2026-11-01T00:00:00Z', product: 're', environment: 'Dubai', envId: 'dub', language: 'en', problemFlags: flags }]
}
const type = (p: Person, days: number, flags: ProblemFlag[] = []) => classifyRunaway(p, effort(days), withFlags(...flags))?.type ?? null

describe('runaway classification (FR-3.1, Modules KB §5)', () => {
  it('has six types, each with a bilingual label and definition', () => {
    expect(Object.keys(RUNAWAY_TYPE_LABEL)).toHaveLength(6)
    for (const k of Object.keys(RUNAWAY_TYPE_LABEL) as (keyof typeof RUNAWAY_TYPE_LABEL)[]) {
      expect(RUNAWAY_TYPE_LABEL[k].ar).toMatch(/[؀-ۿ]/)
      expect(RUNAWAY_TYPE_DEFINITION[k].en.length).toBeGreaterThan(10)
    }
  })

  it('keeps the agreed learning order: silent leads, then non-renewing tenants, then dormant owners', () => {
    expect(RUNAWAY_LEARNING_ORDER.slice(0, 3)).toEqual(['silent_lead', 'did_not_renew', 'dormant_owner'])
    expect(new Set(RUNAWAY_LEARNING_ORDER).size).toBe(6)
  })

  it('returns null without an effort summary', () => {
    expect(classifyRunaway(person(), undefined, [])).toBeNull()
  })

  it('silent lead: 30 days or more of silence, not 29', () => {
    expect(type(person(), RUNAWAY_THRESHOLDS.silentLeadDays)).toBe('silent_lead')
    expect(type(person(), 29)).toBeNull()
  })

  it('dormant owner: customer with 365+ days and no contact', () => {
    expect(type(person({ type: 'customer', unitsOrDeals: 2 }), 365)).toBe('dormant_owner')
    expect(type(person({ type: 'customer', unitsOrDeals: 2 }), 364)).toBeNull()
  })

  it('did not renew: customer silent 90-364 days with a silence flag', () => {
    const c = person({ type: 'customer', unitsOrDeals: 1 })
    expect(type(c, 90, ['silence'])).toBe('did_not_renew')
    expect(type(c, 89, ['silence'])).toBeNull()
    expect(type(c, 120)).toBeNull()
  })

  it('frozen deal: a lead with a broken promise, 5-29 days', () => {
    expect(type(person(), 5, ['promise_not_kept'])).toBe('frozen_deal')
    expect(type(person(), 4, ['promise_not_kept'])).toBeNull()
  })

  it('went to a competitor: reachable lead that hit a discount or response problem', () => {
    expect(type(person(), 10, ['unapproved_discount'])).toBe('went_to_competitor')
    expect(type(person(), 10, ['slow_reply'])).toBe('went_to_competitor')
  })

  it('complained then left: detractor with 60+ days of no business', () => {
    expect(type(person({ type: 'customer', unitsOrDeals: 1 }), 60, ['detractor'])).toBe('complained_then_left')
    expect(type(person({ type: 'customer', unitsOrDeals: 1 }), 59, ['detractor'])).toBeNull()
  })

  it('applies priority order so a person matches at most one type', () => {
    // A lead with both a competitor signal and a broken promise inside 5-29 days -> competitor wins.
    expect(type(person(), 10, ['slow_reply', 'promise_not_kept'])).toBe('went_to_competitor')
    // A long-silent customer who was also a detractor -> dormant owner before complained-then-left.
    expect(type(person({ type: 'customer', unitsOrDeals: 1 }), 400, ['detractor'])).toBe('dormant_owner')
  })

  it('fault summary counts flags only for classified people, most frequent first', () => {
    const p1 = person({ id: 'p1' })
    const p2 = person({ id: 'p2' })
    const interactions: Interaction[] = [
      ...withFlags('slow_reply', 'silence'),
      { ...withFlags('slow_reply')[0], id: 'i2' },
      { ...withFlags('promise_not_kept')[0], id: 'i3', personKey: 'p2' },
    ]
    const map = new Map([['p1', { type: 'silent_lead' as const, reason: { en: '', ar: '' } }]])
    expect(buildFaultSummary([p1, p2], map, interactions)).toEqual([
      { flag: 'slow_reply', count: 2 },
      { flag: 'silence', count: 1 },
    ])
  })
})
