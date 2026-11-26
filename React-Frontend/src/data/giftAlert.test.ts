import { describe, expect, it } from 'vitest'
import { giftsTo, giftWhy, recentGiftsTo, type Gift } from './gifts'

const g = (o: Partial<Gift>): Gift =>
  ({ id: 'g1', fullName: 'Layla Nasser', phone: '', contactMethod: 'call', address: '', deliverOn: '2026-09-22', deliverWindow: '', itemId: 'gi-box', qty: 1, reason: 'thanks', requestedBy: 'x', requestedAt: '2026-09-19T08:00:00Z', emailedTo: '', status: 'delivered', ...o }) as Gift

const NOW = new Date('2026-11-26T09:00:00Z')

describe('the six-month gift alert', () => {
  it('finds a gift to the same customer by name when the gift has no person id', () => {
    expect(recentGiftsTo([g({})], { fullName: '  layla   nasser ' }, NOW)).toHaveLength(1)
  })
  it('finds it by person id and never by another customer', () => {
    const all = [g({ id: 'a', personId: 'p1', fullName: 'Someone' }), g({ id: 'b', personId: 'p2', fullName: 'Someone' })]
    expect(recentGiftsTo(all, { personId: 'p1' }, NOW).map((x) => x.id)).toEqual(['a'])
    expect(recentGiftsTo(all, { personId: 'p9', fullName: 'Someone' }, NOW)).toEqual([])
  })
  it('leaves out a gift older than six months, but the history still has it', () => {
    const old = g({ deliveredAt: '2026-03-01T10:00:00Z', deliverOn: '2026-03-01' })
    expect(recentGiftsTo([old], { fullName: 'Layla Nasser' }, NOW)).toEqual([])
    expect(giftsTo([old], { fullName: 'Layla Nasser' })).toHaveLength(1)
  })
  it('follows the window rule: a shorter one leaves an older gift out, a longer one keeps it', () => {
    const sept = g({}) // delivered 22 Sep, 2 months before NOW
    expect(recentGiftsTo([sept], { fullName: 'Layla Nasser' }, NOW, undefined, 1)).toEqual([])
    expect(recentGiftsTo([sept], { fullName: 'Layla Nasser' }, NOW, undefined, 3)).toHaveLength(1)
  })
  it('counts only gifts that were emailed or delivered, and never the request being looked at', () => {
    const all = [g({ id: 'p', status: 'pending' }), g({ id: 'r', status: 'rejected' }), g({ id: 'c', status: 'cancelled' }), g({ id: 'ok', status: 'sent' })]
    expect(recentGiftsTo(all, { fullName: 'Layla Nasser' }, NOW).map((x) => x.id)).toEqual(['ok'])
    expect(recentGiftsTo(all, { fullName: 'Layla Nasser' }, NOW, 'ok')).toEqual([])
  })
  it('says why from the justification, else the case, else the note', () => {
    expect(giftWhy(g({ justification: 'Chased us 3 times' }), 'en')).toBe('Chased us 3 times')
    expect(giftWhy(g({ caseTitle: { en: 'AC ignored', ar: 'مكيف' } }), 'ar')).toBe('مكيف')
    expect(giftWhy(g({ note: 'Gate code 1' }), 'en')).toBe('Gate code 1')
    expect(giftWhy(g({}), 'en')).toBeUndefined()
  })
})
