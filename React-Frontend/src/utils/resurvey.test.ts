import { describe, expect, it } from 'vitest'
import type { DetractorCallItem, VocDetailRow } from '../types'
import type { Gift } from '../data/gifts'
import { npsOf, csatOf, answersOf } from './indicators'
import { applyResurveys, reachedVia, recoverySummary } from './resurvey'

const row = (o: Partial<VocDetailRow> = {}): VocDetailRow => ({ product: 're', channel: 'whatsapp', n: 20, promoters: 8, passives: 4, detractors: 8, csat: 50, milestone: 'sale', envId: 'dub', ...o })
const item = (o: Partial<DetractorCallItem> = {}): DetractorCallItem =>
  ({ id: 'd1', personId: 'p1', product: 're', environment: 'Dubai', envId: 'dub', severity: 'high', firstScore: 2, channel: 'human', attempts: 1, status: 'done', ...o }) as DetractorCallItem
const gift = (o: Partial<Gift> = {}): Gift => ({ personId: 'p1', reason: 'recovery', status: 'sent', ...o }) as Gift

describe('applyResurveys', () => {
  it('moves a detractor to the second rating and the NPS follows at once', () => {
    const rows = [row()]
    const before = npsOf(rows) // (8-8)/20 = 0
    const after = applyResurveys(rows, [item({ secondScore: 9 })])
    expect(before).toBe(0)
    expect(after[0].detractors).toBe(7)
    expect(after[0].promoters).toBe(9)
    expect(npsOf(after)).toBe(10)
    expect(answersOf(after)).toBe(20) // the same person, not a new answer
    expect(rows[0].detractors).toBe(8) // the input is untouched
  })

  it('a passive second rating takes the person out of detractors only', () => {
    const after = applyResurveys([row()], [item({ secondScore: 7 })])
    expect([after[0].promoters, after[0].passives, after[0].detractors]).toEqual([8, 5, 7])
  })

  it('leaves the rows alone when the second rating is in the same group or the item has none', () => {
    const rows = [row()]
    expect(applyResurveys(rows, [item({ secondScore: 5 }), item({ id: 'd2' })])).toEqual(rows)
  })

  it('moves CSAT in and out of the satisfied share', () => {
    const up = applyResurveys([row()], [item({ instrument: 'csat', firstScore: 1, secondScore: 5 })])
    expect(csatOf(up)).toBe(55)
    const down = applyResurveys([row()], [item({ instrument: 'csat', firstScore: 5, secondScore: 1 })])
    expect(csatOf(down)).toBe(45)
  })

  it('uses the matching product and environment, and a row without environment fits any', () => {
    const rows = [row({ envId: 'auh' }), row({ envId: 'dub' }), row({ product: 'af', envId: 'dub' })]
    const out = applyResurveys(rows, [item({ secondScore: 10 })])
    expect(out[0].detractors).toBe(8)
    expect(out[1].detractors).toBe(7)
    expect(out[2].detractors).toBe(8)
    const noEnv = applyResurveys([row({ envId: undefined })], [item({ envId: 'auh', secondScore: 10 })])
    expect(noEnv[0].detractors).toBe(7)
  })

  it('does not invent a move when no row holds a detractor of that product', () => {
    const rows = [row({ detractors: 0, passives: 12 })]
    expect(applyResurveys(rows, [item({ secondScore: 10 })])).toEqual(rows)
  })
})

describe('recoverySummary', () => {
  const items = [
    item({ id: 'a', personId: 'p1', secondScore: 9, resurveyedAt: '2026-11-20', notes: 'Wanted the handover date' }),
    item({ id: 'b', personId: 'p2', secondScore: 5, resurveyedAt: '2026-11-21', attempts: 0 }),
    item({ id: 'c', personId: 'p3', secondScore: 1, resurveyedAt: '2026-11-22' }),
    item({ id: 'd', personId: 'p4' }),
    item({ id: 'e', personId: 'p5', firstScore: 9, secondScore: 10 }), // never a detractor
  ]
  it('counts detractors before and after, and how they moved', () => {
    const s = recoverySummary(items, [gift({ personId: 'p2' })])
    expect(s.before).toBe(4)
    expect(s.reSurveyed).toBe(3)
    expect(s.after).toBe(3)
    expect(s.recovered).toBe(1)
    expect(s.notYet).toBe(1)
    expect(s.movement).toEqual({ noLongerDetractor: 1, betterStill: 1, same: 0, worse: 1 })
    expect(s.averageDelta).toBe(3)
    expect(s.rows[0].item.id).toBe('c') // latest re-survey first
  })
  it('says how each person was reached: call, gift, both or neither', () => {
    const g = [gift({ personId: 'p1' }), gift({ personId: 'p2' })]
    expect(reachedVia(items[0], g)).toBe('call_and_gift')
    expect(reachedVia(items[1], g)).toBe('gift')
    expect(reachedVia(items[2], [])).toBe('call')
    expect(reachedVia(item({ attempts: 0 }), [gift({ status: 'pending' })])).toBe('none')
  })
  it('filters by how reached and the headline follows the filter', () => {
    const s = recoverySummary(items, [gift({ personId: 'p2' })], { via: 'gift' })
    expect(s.before).toBe(1)
    expect(s.after).toBe(1)
    expect(s.recovered).toBe(0)
  })
})
