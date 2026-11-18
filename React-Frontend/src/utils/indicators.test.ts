import { describe, expect, it } from 'vitest'
import type { VocRow } from '@/types'
import { MOCK_VOC_ROWS } from '@/services/mockData'
import { PRODUCTS } from '@/data/products'
import { CES_SAMPLE, NPS_TREND } from '@/data/v38Reference'
import { INDICATOR_THRESHOLDS } from '@/data/indicators'
import { answersOf, csatOf, deltaFromTrend, fmtSigned, indicatorTone, indicatorsFor, liveIndicators, npsOf } from './indicators'

const row = (over: Partial<VocRow>): VocRow => ({ product: 're', channel: 'digital', n: 100, promoters: 50, passives: 32, detractors: 18, csat: 78, ...over })

describe('indicators per product (v40 F03, F09)', () => {
  it('NPS is promoters minus detractors over all answers; CSAT is weighted by answers', () => {
    expect(npsOf([row({})])).toBe(32) // the glossary example: 50% promoters, 18% detractors
    expect(npsOf([row({ n: 100, promoters: 50, detractors: 18 }), row({ n: 300, promoters: 60, detractors: 120 })])).toBe(Math.round(((110 - 138) / 400) * 100))
    expect(csatOf([row({ n: 100, csat: 80 }), row({ n: 300, csat: 60 })])).toBe(65)
    expect(answersOf([row({ n: 120 }), row({ n: 30 })])).toBe(150)
  })

  it('shows nothing with no answers', () => {
    expect(npsOf([])).toBeNull()
    expect(csatOf([])).toBeNull()
    expect(fmtSigned(null)).toBe('–')
    expect(fmtSigned(32)).toBe('+32')
    expect(fmtSigned(-5)).toBe('-5')
    expect(fmtSigned(0)).toBe('0')
  })

  it('the change on last month is the last point of the monthly series minus the one before', () => {
    expect(deltaFromTrend([29, 31, 33, 34, 38, 41])).toBe(3)
    expect(deltaFromTrend([10])).toBeNull()
    expect(deltaFromTrend([])).toBeNull()
    expect(deltaFromTrend(undefined)).toBeNull()
  })

  it('builds one set per live product from the same sources, never a group number', () => {
    const live = PRODUCTS.filter((p) => p.live)
    const sets = liveIndicators(PRODUCTS, MOCK_VOC_ROWS, NPS_TREND, CES_SAMPLE)
    expect(sets.map((s) => s.productId)).toEqual(live.map((p) => p.id))
    const re = sets.find((s) => s.productId === 're')!
    expect(re.nps).toBe(npsOf(MOCK_VOC_ROWS.filter((r) => r.product === 're')))
    expect(re.csat).toBe(csatOf(MOCK_VOC_ROWS.filter((r) => r.product === 're')))
    expect(re.ces).toBe(71)
    expect(re.answers).toBe(MOCK_VOC_ROWS.filter((r) => r.product === 're').reduce((s, r) => s + r.n, 0))
    expect(re.deltaVsLastMonth).toBe(3)
    expect(sets.find((s) => s.productId === 'af')?.ces).toBe(66)
    // A hidden product is not in the live list; asking for it directly gives its own line (no answers means dashes).
    expect(indicatorsFor('wl', MOCK_VOC_ROWS, NPS_TREND, CES_SAMPLE)).toMatchObject({ nps: null, csat: null, answers: 0, deltaVsLastMonth: null })
  })

  it('colours with the [Proposed] thresholds', () => {
    expect(INDICATOR_THRESHOLDS).toEqual({ nps: { good: 30, warn: 0 }, csat: { good: 80, warn: 65 }, ces: { good: 75, warn: 60 } })
    expect([32, 30, 29, 0, -1].map((v) => indicatorTone('nps', v))).toEqual(['good', 'good', 'warn', 'warn', 'crit'])
    expect([80, 79, 65, 64].map((v) => indicatorTone('csat', v))).toEqual(['good', 'warn', 'warn', 'crit'])
    expect([75, 60, 59].map((v) => indicatorTone('ces', v))).toEqual(['good', 'warn', 'crit'])
    expect(indicatorTone('ces', null)).toBe('none')
  })
})
