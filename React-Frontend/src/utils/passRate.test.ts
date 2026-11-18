import { describe, expect, it } from 'vitest'
import type { SupervisorTest, WeeklySampleItem } from '@/types'
import { AGENT_JDS, type AgentJobDescription } from '@/data/v38Reference'
import { agentPassRates, passRate, supervisorTestFor, syncSampleEffects } from './passRate'

const item = (id: number, agent: number, verdict: boolean | null = null): WeeklySampleItem => ({
  id: `ws-${id}`,
  agent,
  kind: { en: 'Classification', ar: 'تصنيف' },
  text: { en: `Output ${id}`, ar: `مخرج ${id}` },
  ref: `SG-${id}`,
  verdict,
})

describe('a wrong lowers the agent\'s pass rate (decided 18 Nov) [Proposed formula]', () => {
  it('takes the wrong share of the agent\'s sampled outputs off its pass rate', () => {
    expect(passRate(94, 18, 0)).toBe(94)
    expect(passRate(94, 18, 1)).toBe(89) // one wrong of 18
    expect(passRate(88, 5, 1)).toBe(70)
    expect(passRate(100, 4, 4)).toBe(0)
    expect(passRate(100, 4, 9)).toBe(0) // never below zero
    expect(passRate(null, 5, 2)).toBeNull() // an agent that is not running stays "not running"
    expect(passRate(90, 0, 3)).toBe(90)
  })

  it('computes the rate per agent that has outputs in the week', () => {
    const sample = [item(1, 2, true), item(2, 2, false), item(3, 2), item(4, 2), item(5, 3, false)]
    const rates = agentPassRates(sample, { 2: 94, 3: 96 })
    expect(rates.map((r) => r.agent)).toEqual([2, 3])
    expect(rates[0]).toMatchObject({ base: 94, sampled: 4, wrong: 1, tests: 1, current: 71 })
    expect(rates[1]).toMatchObject({ base: 96, sampled: 1, wrong: 1, current: 0 })
  })

  it('a wrong becomes a supervisor test, and changing the verdict gives the test and the points back', () => {
    const jds: AgentJobDescription[] = [{ ...AGENT_JDS[1], baseApprovalPct: 94, approvalPct: 94 }]
    const tests: SupervisorTest[] = []
    const sample = [item(1, 2), item(2, 2), item(3, 2), item(4, 2)]
    syncSampleEffects(sample, tests, jds)
    expect(tests).toEqual([])
    expect(jds[0].approvalPct).toBe(94)

    sample[1].verdict = false
    syncSampleEffects(sample, tests, jds, '2026-11-18T09:00:00.000Z')
    expect(tests).toHaveLength(1)
    expect(tests[0]).toMatchObject({ id: 'st-ws-2', fromSampleId: 'ws-2', agent: 2 })
    expect(jds[0]).toMatchObject({ approvalPct: 71, wrongThisWeek: 1, supervisorTests: 1, baseApprovalPct: 94 })

    // Idempotent.
    syncSampleEffects(sample, tests, jds)
    expect(tests).toHaveLength(1)

    sample[1].verdict = true
    syncSampleEffects(sample, tests, jds)
    expect(tests).toEqual([])
    expect(jds[0]).toMatchObject({ approvalPct: 94, wrongThisWeek: 0, supervisorTests: 0 })
  })

  it('leaves an agent that is not in the sample, or not running, alone', () => {
    const jds: AgentJobDescription[] = [
      { ...AGENT_JDS[3], baseApprovalPct: null, approvalPct: null }, // Agent 4, phase 2
      { ...AGENT_JDS[0], baseApprovalPct: 97, approvalPct: 97 },
    ]
    syncSampleEffects([item(1, 4, false)], [], jds)
    expect(jds[0].approvalPct).toBeNull()
    expect(jds[1].approvalPct).toBe(97)
  })

  it('writes the test in both languages without a customer name', () => {
    const t = supervisorTestFor(item(7, 2, false), '2026-11-18T09:00:00.000Z')
    expect(t.text.en).toBe('Catch this: Output 7')
    expect(t.text.ar).toMatch(/[؀-ۿ]/)
    expect(t.createdAt).toBe('2026-11-18T09:00:00.000Z')
  })
})
