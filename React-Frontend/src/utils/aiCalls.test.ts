import { describe, expect, it } from 'vitest'
import { AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, BRIGHTCALL_OUTCOMES } from '../data/brightcall'
import { summarizeAiCalls } from './aiCalls'

describe('summarizeAiCalls', () => {
  const all = summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, BRIGHTCALL_OUTCOMES, { env: 'all', campaign: 'all', from: '2000-01-01' })
  it('splits every counted call into answered, not answered or dropped', () => {
    expect(all.byGroup.answered + all.byGroup.no_answer + all.byGroup.dropped).toBe(all.calls)
  })
  it('leaves blocked and test outcomes out of the calls', () => {
    const blocked = AI_CALL_DAILY.filter((r) =>
      ['DNCR UAE Blocked', 'Test Call', 'Not Existing Contact on CRM', 'No DNCR Status on CRM'].includes(r.outcome),
    ).reduce((s, r) => s + r.calls, 0)
    const total = AI_CALL_DAILY.reduce((s, r) => s + r.calls, 0)
    expect(all.calls).toBe(total - blocked)
  })
  it('narrows to one environment', () => {
    const auh = summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, BRIGHTCALL_OUTCOMES, { env: 'auh', campaign: 'all', from: '2000-01-01' })
    expect(auh.calls).toBeLessThan(all.calls)
    expect(auh.campaigns.every((c) => c.envId === 'auh')).toBe(true)
  })
  it('maps every BrightCall outcome once', () => {
    expect(new Set(BRIGHTCALL_OUTCOMES.map((o) => o.code)).size).toBe(BRIGHTCALL_OUTCOMES.length)
  })
})
