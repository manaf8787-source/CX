import { describe, expect, it } from 'vitest'
import { DEFAULT_CALENDAR, MON_FRI, addWorkingDays, calendarDaysLeft, isWorkingDay, nextWeekday, nextWorkingDay, startOfDay, toDayKey, workingDaysBetween, workingDaysLeft, type WorkCalendar } from './workingDays'

// 2026-11-16 is a Monday, 20 a Friday, 21 a Saturday, 22 a Sunday, 23 the next Monday.
const key = (d: Date) => toDayKey(d)

describe('working days (v40 F20): Monday to Friday by default, the week is a setting', () => {
  it('knows the default week', () => {
    expect(MON_FRI).toEqual([1, 2, 3, 4, 5])
    expect(DEFAULT_CALENDAR.days).toEqual(MON_FRI)
    expect(isWorkingDay('2026-11-16')).toBe(true)
    expect(isWorkingDay('2026-11-20')).toBe(true) // Friday works under the KB week
    expect(isWorkingDay('2026-11-21')).toBe(false)
    expect(isWorkingDay('2026-11-22')).toBe(false)
  })

  it('counts working days from the start (exclusive) to the end (inclusive)', () => {
    expect(workingDaysBetween('2026-11-16', '2026-11-18')).toBe(2)
    expect(workingDaysBetween('2026-11-20', '2026-11-23')).toBe(1) // Friday to Monday is one working day
    expect(workingDaysBetween('2026-11-16', '2026-11-23')).toBe(5)
    expect(workingDaysBetween('2026-11-17', '2026-11-17')).toBe(0)
    expect(workingDaysBetween('2026-11-21', '2026-11-22')).toBe(0) // across a weekend only
  })

  it('is negative when the end is before the start', () => {
    expect(workingDaysBetween('2026-11-18', '2026-11-16')).toBe(-2)
    expect(workingDaysLeft('2026-11-16', '2026-11-18')).toBe(-2)
    expect(workingDaysLeft('2026-11-20', '2026-11-17')).toBe(3)
  })

  it('adds and subtracts working days across weekends', () => {
    expect(key(addWorkingDays('2026-11-20', 1))).toBe('2026-11-23')
    expect(key(addWorkingDays('2026-11-16', 5))).toBe('2026-11-23')
    expect(key(addWorkingDays('2026-11-23', -1))).toBe('2026-11-20')
    expect(key(addWorkingDays('2026-11-17', 0))).toBe('2026-11-17')
    expect(key(nextWorkingDay('2026-11-20'))).toBe('2026-11-23')
    expect(key(nextWorkingDay('2026-11-17'))).toBe('2026-11-18')
  })

  it('works for another week: Sunday to Thursday (the prototype counts Friday and Saturday off)', () => {
    const sunThu: WorkCalendar = { days: [0, 1, 2, 3, 4] }
    expect(isWorkingDay('2026-11-20', sunThu)).toBe(false)
    expect(key(nextWorkingDay('2026-11-19', sunThu))).toBe('2026-11-22')
    expect(workingDaysBetween('2026-11-19', '2026-11-23', sunThu)).toBe(2)
  })

  it('skips holidays', () => {
    const cal: WorkCalendar = { days: MON_FRI, holidays: ['2026-11-18'] }
    expect(isWorkingDay('2026-11-18', cal)).toBe(false)
    expect(workingDaysBetween('2026-11-16', '2026-11-19', cal)).toBe(2)
    expect(key(addWorkingDays('2026-11-17', 1, cal))).toBe('2026-11-19')
  })

  it('falls back to Monday to Friday for an empty week instead of looping', () => {
    expect(isWorkingDay('2026-11-17', { days: [] })).toBe(true)
    expect(key(nextWorkingDay('2026-11-20', { days: [] }))).toBe('2026-11-23')
  })

  it('reads a YYYY-MM-DD string as a local day, never UTC', () => {
    const d = startOfDay('2026-11-17')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 17])
    expect(toDayKey('2026-11-17T23:30:00')).toBe('2026-11-17')
    expect(toDayKey(new Date(2026, 10, 1, 0, 5))).toBe('2026-11-01')
  })

  it('finds the next Thursday (the weekly sample day), today included', () => {
    expect(nextWeekday('2026-11-17', 4)).toBe('2026-11-19')
    expect(nextWeekday('2026-11-19', 4)).toBe('2026-11-19')
    expect(nextWeekday('2026-11-20', 4)).toBe('2026-11-26')
  })

  it('counts calendar days for the verification and do-the-fix clocks', () => {
    expect(calendarDaysLeft('2026-11-20', '2026-11-17')).toBe(3)
    expect(calendarDaysLeft('2026-11-15', '2026-11-17')).toBe(-2)
  })
})
