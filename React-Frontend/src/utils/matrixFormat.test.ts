import { describe, expect, it } from 'vitest'
import { HOURS_PER_DAY, formatClock, formatClockWithUnit, formatDays, formatFactor, formatHours } from './matrixFormat'

describe('how the escalation matrix writes a clock', () => {
  it('a day cell holds hours and shows days: 9 is "1 day", 45 is "5 days"', () => {
    expect(HOURS_PER_DAY).toBe(9)
    expect(formatClock(9, { asDays: true })).toBe('1 day')
    expect(formatClock(45, { asDays: true })).toBe('5 days')
    expect(formatClock(18, { asDays: true })).toBe('2 days')
  })

  it('the same hours without the day flag are hours: 9 is "9", 45 is "45"', () => {
    expect(formatClock(9)).toBe('9')
    expect(formatClock(45)).toBe('45')
    expect(formatClock(1)).toBe('1')
    expect(formatClock(90)).toBe('90')
  })

  it('no clock is "–", for hours and for days', () => {
    expect(formatClock(null)).toBe('–')
    expect(formatClock(null, { asDays: true })).toBe('–')
    expect(formatClockWithUnit(null)).toBe('–')
  })

  it('a day flag on a value that is not whole days falls back to hours (an edited cell is hours again)', () => {
    expect(formatClock(10, { asDays: true })).toBe('10')
    expect(formatClock(0, { asDays: true })).toBe('0')
  })

  it('half an hour is "½", other fractions are decimals (a VIP halves the clocks)', () => {
    expect(formatHours(0.5)).toBe('½')
    expect(formatClock(0.5)).toBe('½')
    expect(formatHours(4.5)).toBe('4.5')
    expect(formatHours(13.5)).toBe('13.5')
    expect(formatHours(22.5)).toBe('22.5')
    expect(formatHours(2)).toBe('2')
  })

  it('the VIP rule is a factor, shown as "½", never as hours', () => {
    expect(formatFactor(0.5)).toBe('½')
    expect(formatFactor(0.25)).toBe('×0.25')
  })

  it('reads in a sentence with its unit: "4 h", "½ h", "1 day", "–"', () => {
    expect(formatClockWithUnit(4)).toBe('4 h')
    expect(formatClockWithUnit(0.5)).toBe('½ h')
    expect(formatClockWithUnit(22.5)).toBe('22.5 h')
    expect(formatClockWithUnit(9, { asDays: true })).toBe('1 day')
    expect(formatClockWithUnit(45, { asDays: true })).toBe('5 days')
    expect(formatClockWithUnit(null)).toBe('–')
  })

  it('writes days in Arabic', () => {
    expect(formatDays(1, 'ar')).toBe('يوم واحد')
    expect(formatDays(2, 'ar')).toBe('يومان')
    expect(formatDays(5, 'ar')).toBe('5 أيام')
    expect(formatDays(11, 'ar')).toBe('11 يوماً')
    expect(formatClock(45, { asDays: true, lang: 'ar' })).toBe('5 أيام')
    expect(formatClockWithUnit(9, { asDays: true, lang: 'ar' })).toBe('يوم واحد')
    // hours stay Latin digits in Arabic, as everywhere in the app
    expect(formatClock(27, { lang: 'ar' })).toBe('27')
  })
})
