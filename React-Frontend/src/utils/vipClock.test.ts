import { describe, expect, it } from 'vitest'
import { buildMatrix } from '@/data/escalationDefaults'
import { addInformed, applyVipRule, dueHours, effectiveCells, patternHasVip, scaleHours } from './vipClock'
import { fixDue } from './fixClock'
import { rulesFromConfig } from './ruleValues'
import * as mock from '@/services/mockData'
import type { Bi, MatrixCellRow, MatrixRuleRow } from '@/types'

const rule = (buildMatrix().re.find((r) => r.kind === 'vip') as MatrixRuleRow).rule
const row = (product: 're' | 'af' | 'cl' | 'wl', kind: string) => buildMatrix()[product].find((r) => r.kind === kind) as MatrixCellRow
const head: Bi = { en: 'Head of the environment', ar: 'رئيس البيئة' }

describe('the VIP rule (v42 F30): which fix is VIP-related', () => {
  const signals = [
    { id: 's1', personId: 'p-1' },
    { id: 's2', personId: 'p-2' },
    { id: 's3', personId: undefined },
    { id: 's4', personId: 'p-3' },
  ]
  const persons = [
    { id: 'p-1', vip: false },
    { id: 'p-2', vip: true },
    { id: 'p-3', vip: false },
  ]

  it('is VIP-related when one signal of the pattern belongs to a person tagged VIP', () => {
    expect(patternHasVip({ signalIds: ['s1', 's2'] }, signals, persons)).toBe(true)
    expect(patternHasVip({ signalIds: ['s2'] }, signals, persons)).toBe(true)
  })

  it('is not when the VIP person is not in the pattern, or no one in it is a VIP', () => {
    expect(patternHasVip({ signalIds: ['s1', 's4'] }, signals, persons)).toBe(false)
    expect(patternHasVip({ signalIds: ['s1', 's3'] }, signals, persons)).toBe(false)
    expect(patternHasVip({ signalIds: [] }, signals, persons)).toBe(false)
  })

  it('a signal with no person (a public mention, an unidentified customer) never counts, and no pattern is never VIP', () => {
    expect(patternHasVip({ signalIds: ['s3'] }, signals, persons)).toBe(false)
    expect(patternHasVip(undefined, signals, persons)).toBe(false)
    expect(patternHasVip({ signalIds: ['s2'] }, signals, [])).toBe(false)
  })
})

describe('the VIP rule: the clocks, the informed list and the backup', () => {
  it('halves both clocks and keeps an empty one empty', () => {
    expect(scaleHours(27, 0.5)).toBe(13.5)
    expect(scaleHours(9, 0.5)).toBe(4.5)
    expect(scaleHours(1, 0.5)).toBe(0.5)
    expect(scaleHours(null, 0.5)).toBeNull()
  })

  it('adds the head of the environment to "informed" at once: first, once, and alone when nobody was informed', () => {
    expect(addInformed(null, head)).toEqual(head)
    const cx: Bi = { en: 'CX manager', ar: 'مدير تجربة العملاء' }
    expect(addInformed(cx, head)).toEqual({ en: 'Head of the environment · CX manager', ar: 'رئيس البيئة · مدير تجربة العملاء' })
    const already: Bi = { en: 'Head of the environment', ar: 'رئيس البيئة' }
    expect(addInformed(already, head)).toBe(already)
    const two: Bi = { en: 'Legal · Head of the environment', ar: 'القانونية · رئيس البيئة' }
    expect(addInformed(two, head)).toBe(two)
  })

  it('applies the rule to a Real Estate service row: same receiver, head informed, CX manager backup, 2 h and 13.5 h', () => {
    const service = row('re', 'service').cells
    expect(service).toMatchObject({ respondH: 4, resolveH: 27 })
    const v = applyVipRule(service, rule)
    expect(v.receiver).toEqual(service.receiver) // the receiver does not change
    expect(v.informed?.en).toBe('Head of the environment') // it was already the head: not repeated
    expect(v.backup).toEqual({ en: 'CX manager', ar: 'مدير تجربة العملاء' })
    expect(v.respondH).toBe(2)
    expect(v.resolveH).toBe(13.5)
  })

  it('applies it to a row that informs someone else, and one that has no backup', () => {
    const club = applyVipRule(row('cl', 'legal').cells, rule)
    expect(club.informed?.en).toBe('Head of the environment · Information Security lead · CX manager · Head of PSI Club')
    expect(club.backup?.en).toBe('CX manager') // the Club's legal row had no backup
    expect(club.respondH).toBe(0.5)
    expect(club.resolveH).toBe(4.5)
    const emp = applyVipRule(row('wl', 'employee').cells, rule)
    expect(emp.informed?.en).toBe('Head of the environment') // "–" becomes the head
    expect(emp.backup?.en).toBe('CX manager') // it was the head of Investor Relations
    expect(emp.respondH).toBe(2)
    expect(emp.resolveH).toBeNull() // no resolve clock to halve
  })

  it('writes the added title in Arabic too', () => {
    expect(applyVipRule(row('af', 'process').cells, rule).informed?.ar).toBe('رئيس البيئة · رئيس ما بعد البيع')
  })

  it('a clock written in days is hours again once the rule applies (half of one day is not "0.5 day")', () => {
    const base = row('re', 'shopper_critical').cells
    expect(base.asDays).toBeDefined()
    const v = applyVipRule(base, rule)
    expect(v.asDays).toBeUndefined()
    expect(v.respondH).toBe(4.5)
    expect(v.resolveH).toBe(22.5)
  })

  it('effectiveCells returns the row itself for a fix that is not VIP-related', () => {
    const cells = row('re', 'service').cells
    expect(effectiveCells(cells, rule, false)).toBe(cells)
    expect(effectiveCells(cells, rule, true).resolveH).toBe(13.5)
  })

  it('does not change the row it reads', () => {
    const cells = row('re', 'service').cells
    const before = JSON.stringify(cells)
    applyVipRule(cells, rule)
    expect(JSON.stringify(cells)).toBe(before)
  })
})

describe('the VIP rule: the due date', () => {
  const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
  const monday10 = new Date(2026, 10, 16, 10, 0) // Monday 16 Nov 2026, 10:00

  it('due hours are the Resolve (h), halved for a VIP, none when there is no clock', () => {
    expect(dueHours(45, rule, false)).toBe(45)
    expect(dueHours(45, rule, true)).toBe(22.5)
    expect(dueHours(null, rule, true)).toBeNull()
    expect(dueHours(null, rule, false)).toBeNull()
  })

  it('approval time + half the Resolve (h) in working hours: 45 h from Monday 10:00 is Monday 10:00 + five days, 22.5 h is two and a half', () => {
    const full = new Date(fixDue(monday10, dueHours(45, rule, false), rules).dueAt)
    const half = new Date(fixDue(monday10, dueHours(45, rule, true), rules).dueAt)
    expect(full.getDay()).toBe(1) // the next Monday, 10:00
    expect(half.getDay()).toBe(3) // Wednesday ...
    expect(half.getHours() + half.getMinutes() / 60).toBe(14.5) // ... 14:30 (10:00 + 22.5 working hours)
    expect(half.getTime()).toBeLessThan(full.getTime())
  })

  it('a row with no resolve clock falls back to Agent 5’s 14 days, VIP or not (halving nothing)', () => {
    const due = fixDue(monday10, dueHours(null, rule, true), rules)
    expect(due.source).toBe('fallback')
    expect(Math.round((Date.parse(due.dueAt) - monday10.getTime()) / 86_400_000)).toBe(14)
  })
})
