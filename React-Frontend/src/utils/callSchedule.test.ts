import { describe, expect, it } from 'vitest'
import { CALL_COPY, attemptLine, callRulesFrom, isInsideCallingHours, isOpenCall, recordNoAnswer, type CallRules } from './callSchedule'
import { DEFAULT_RULES_BAG } from './ruleValues'

const rules: CallRules = callRulesFrom(DEFAULT_RULES_BAG)

describe('close the loop calling rules (v40 F27)', () => {
  it('reads hours, tries and the working week from the rules, [Proposed] defaults 09:00 to 18:00 and 3', () => {
    expect(rules).toMatchObject({ from: 9, to: 18, tries: 3 })
    expect(rules.calendar.days).toEqual([1, 2, 3, 4, 5])
  })

  it('calls only on a working day between the start and the end hour', () => {
    expect(isInsideCallingHours(new Date(2026, 10, 17, 9, 0), rules)).toBe(true)
    expect(isInsideCallingHours(new Date(2026, 10, 17, 17, 59), rules)).toBe(true)
    expect(isInsideCallingHours(new Date(2026, 10, 17, 18, 0), rules)).toBe(false)
    expect(isInsideCallingHours(new Date(2026, 10, 17, 8, 59), rules)).toBe(false)
    expect(isInsideCallingHours(new Date(2026, 10, 21, 11, 0), rules)).toBe(false) // Saturday
    expect(isInsideCallingHours(new Date(2026, 10, 17, 19, 0), { ...rules, to: 20 })).toBe(true) // the KB's 20:00 placeholder is a setting
  })

  it('"no answer": attempts + 1, the next attempt the following working day', () => {
    const tue = new Date(2026, 10, 17, 10, 0)
    expect(recordNoAnswer({ attempts: 0 }, tue, rules)).toEqual({ attempts: 1, status: 'no_answer', nextAttemptOn: '2026-11-18', whatsappSent: false, needsHuman: false })
    // Friday: the next attempt is Monday, not Saturday.
    expect(recordNoAnswer({ attempts: 1 }, new Date(2026, 10, 20, 10, 0), rules).nextAttemptOn).toBe('2026-11-23')
  })

  it('after the last attempt a WhatsApp message goes out and the row needs a human (still open)', () => {
    const r = recordNoAnswer({ attempts: 2 }, new Date(2026, 10, 17, 10, 0), rules)
    expect(r).toEqual({ attempts: 3, status: 'needs_human', whatsappSent: true, needsHuman: true })
    expect(r.nextAttemptOn).toBeUndefined()
    expect(isOpenCall({ status: 'needs_human' })).toBe(true)
    expect(isOpenCall({ status: 'done' })).toBe(false)
    // A different number of tries is a setting.
    expect(recordNoAnswer({ attempts: 1 }, new Date(2026, 10, 17), { ...rules, tries: 2 }).needsHuman).toBe(true)
  })

  it('shows "attempt n+1 of N" only for a row with an attempt and one still to go', () => {
    expect(attemptLine({ attempts: 0, status: 'to_do' }, rules)).toBeNull()
    expect(attemptLine({ attempts: 1, status: 'no_answer', nextAttemptOn: '2026-11-18' }, rules)).toEqual({ attempt: 2, of: 3, next: '2026-11-18' })
    expect(attemptLine({ attempts: 3, status: 'needs_human' }, rules)).toBeNull()
    expect(attemptLine({ attempts: 1, status: 'done' }, rules)).toBeNull()
  })

  it('has the verbatim copy in both languages, with the configured numbers', () => {
    expect(CALL_COPY.hint(rules).en).toContain('Calls only between 09:00 and 18:00 UAE time, up to 3 attempts')
    expect(CALL_COPY.hint(rules).ar).toContain('09:00')
    expect(CALL_COPY.hint(rules).ar).toMatch(/[؀-ۿ]/)
    expect(CALL_COPY.rowSuffix(2, 3, '2026-11-18').en).toBe('attempt 2 of 3 · next 2026-11-18')
    expect(CALL_COPY.noAnswerLast(3).en).toBe('No answer after 3 attempts: WhatsApp sent, flagged "needs a human".')
    expect(CALL_COPY.noAnswerMore('2026-11-18').en).toBe('No answer. Next attempt 2026-11-18 within calling hours.')
  })
})
