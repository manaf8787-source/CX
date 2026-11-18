import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES_BAG } from './ruleValues'
import { approvalDaysLeft, approvalDeadline, fixDue, verificationDue } from './fixClock'
import { MON_FRI, addWorkingHours, toDayKey, type WorkCalendar } from './workingDays'

const rules = DEFAULT_RULES_BAG
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)
const iso = (d: Date) => d.toISOString()
const local = (isoString: string) => {
  const d = new Date(isoString)
  return `${toDayKey(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 2026-11-16 is a Monday, 17 Tuesday, 20 Friday, 21 Saturday, 23 the next Monday.
describe('working hours (09:00 to 18:00, Monday to Friday)', () => {
  const cal: WorkCalendar = { days: MON_FRI, startHour: 9, endHour: 18 }
  const lc = (d: Date) => local(iso(d))

  it('9 hours are one working day, 45 are five', () => {
    expect(lc(addWorkingHours(at(2026, 11, 16, 9), 9, cal))).toBe('2026-11-16 18:00') // Monday 09:00 + one working day ends Monday 18:00
    expect(lc(addWorkingHours(at(2026, 11, 17, 12), 9, cal))).toBe('2026-11-18 12:00') // Tuesday noon + 9 h = Wednesday noon
    expect(lc(addWorkingHours(at(2026, 11, 16, 9), 45, cal))).toBe('2026-11-20 18:00') // five working days
    expect(lc(addWorkingHours(at(2026, 11, 16, 9), 90, cal))).toBe('2026-11-27 18:00') // ten working days
  })

  it('skips the weekend and counts from the next opening when approved outside working time', () => {
    expect(lc(addWorkingHours(at(2026, 11, 20, 16), 4, cal))).toBe('2026-11-23 11:00')
    expect(lc(addWorkingHours(at(2026, 11, 21, 11), 2, cal))).toBe('2026-11-23 11:00') // Saturday starts Monday 09:00
    expect(lc(addWorkingHours(at(2026, 11, 17, 19), 1, cal))).toBe('2026-11-18 10:00') // after 18:00 starts tomorrow
    expect(lc(addWorkingHours(at(2026, 11, 17, 7), 1, cal))).toBe('2026-11-17 10:00') // before 09:00 starts at 09:00
  })

  it('follows the configured week and day', () => {
    expect(lc(addWorkingHours(at(2026, 11, 19, 16), 4, { days: [0, 1, 2, 3, 4], startHour: 9, endHour: 18 }))).toBe('2026-11-22 11:00') // Sunday to Thursday week
    expect(lc(addWorkingHours(at(2026, 11, 17, 8), 4, { days: MON_FRI, startHour: 8, endHour: 16 }))).toBe('2026-11-17 12:00')
  })
})

describe('a fix is due from approval by the matrix "Resolve (h)" (decided 18 Nov)', () => {
  it('uses the matrix hours in working time: 45 h from Monday 10:00 is Monday of the next week', () => {
    const d = fixDue(at(2026, 11, 16, 10), 45, rules)
    expect(d).toMatchObject({ source: 'matrix', hours: 45 })
    // Monday 10:00 + 8 h today, then 4 full days (36 h), 1 h left: Friday 18:00 is 5 working days from Monday 09:00; from 10:00 it ends Monday 10:00 next week.
    expect(local(d.dueAt)).toBe('2026-11-23 10:00')
  })

  it('9 h is one working day later; 18 h two', () => {
    expect(local(fixDue(at(2026, 11, 17, 11), 9, rules).dueAt)).toBe('2026-11-18 11:00')
    expect(local(fixDue(at(2026, 11, 17, 11), 18, rules).dueAt)).toBe('2026-11-19 11:00')
  })

  it('an empty cell falls back to Agent 5\'s 14 days (calendar days)', () => {
    for (const empty of [null, undefined, 0]) {
      const d = fixDue(at(2026, 11, 16, 10), empty, rules)
      expect(d.source).toBe('fallback')
      expect(d.hours).toBeUndefined()
      expect(toDayKey(d.dueAt)).toBe('2026-11-30')
    }
    expect(toDayKey(fixDue(at(2026, 11, 16, 10), null, { ...rules, fixFallbackDays: 7 }).dueAt)).toBe('2026-11-23') // the fallback is a setting
  })

  it('follows a changed working week', () => {
    const sunThu = { ...rules, workingDays: [0, 1, 2, 3, 4] }
    expect(local(fixDue(at(2026, 11, 19, 16), 4, sunThu).dueAt)).toBe('2026-11-22 11:00')
  })
})

describe('the other two clocks', () => {
  it('approval: 5 working days from the proposal', () => {
    expect(toDayKey(approvalDeadline(at(2026, 11, 13), rules))).toBe('2026-11-20') // Friday + 5 working days = next Friday
    expect(toDayKey(approvalDeadline(at(2026, 11, 16), rules))).toBe('2026-11-23')
    expect(approvalDaysLeft(at(2026, 11, 13), at(2026, 11, 17), rules)).toBe(3)
    expect(approvalDaysLeft(at(2026, 11, 10), at(2026, 11, 17), rules)).toBe(0)
    expect(approvalDaysLeft(at(2026, 11, 3), at(2026, 11, 17), rules)).toBe(-5)
    expect(approvalDaysLeft(at(2026, 11, 13), at(2026, 11, 17), { ...rules, approveDays: 10 })).toBe(8)
  })

  it('verification: 60 days from "done", not from approval or the due date', () => {
    expect(toDayKey(verificationDue(at(2026, 11, 17, 10), rules))).toBe('2027-01-16')
    expect(toDayKey(verificationDue(at(2026, 11, 17, 10), { ...rules, verifyDays: 30 }))).toBe('2026-12-17')
  })
})
