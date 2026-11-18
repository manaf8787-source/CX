import { describe, expect, it } from 'vitest'
import { AGENT_REGISTRY } from './agentRegistry'
import { AGENT_JDS } from './v38Reference'

describe('agent registry (v40 F36)', () => {
  it('still has ten workers and one supervisor', () => {
    expect(AGENT_REGISTRY.filter((a) => typeof a.id === 'number')).toHaveLength(10)
    expect(AGENT_REGISTRY.filter((a) => a.id === 'supervisor')).toHaveLength(1)
  })

  it('Agent 9 runs daily at 07:00 for the brief, monthly for the pack, and on demand, in both languages', () => {
    const nine = AGENT_REGISTRY.find((a) => a.id === 9)!
    expect(nine.runsOn.en).toBe('Daily 07:00 for the brief; first working day of the month for the pack; on demand.')
    expect(nine.runsOn.ar).toContain('يومياً 07:00 للموجز')
    expect(nine.trigger.en).toMatch(/07:00/)
    expect(nine.trigger.en).toMatch(/first working day of the month/)
    expect(nine.trigger.ar).toMatch(/07:00/)
    // Task, escalation and the rule that nothing is sent automatically are unchanged.
    expect(nine.escalatesTo.en).toMatch(/nothing is sent automatically/)
  })

  it('Agent 9 job description names the daily brief as its output and shows it on Home and on each role’s landing page', () => {
    const jd = AGENT_JDS.find((j) => j.id === 9)!
    expect(jd.output.en).toMatch(/daily brief per role/i)
    expect(jd.showsOn.en).toMatch(/Daily brief on Home/)
    expect(jd.approvalPct).toBe(100)
    expect(jd.stage).toBe('shadow')
  })
})
