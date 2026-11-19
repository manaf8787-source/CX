import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import * as mock from '@/services/mockData'
import type { AiInterviewCampaign, RoleId } from '@/types'
import { buildAuditCampaigns, CHECK_IDS, type AuditCampaign, type CampaignStage } from '@/data/campaignAudit'
import { CampaignAuditError, createCampaignAuditStore, type CampaignAuditStore } from './mockCampaignAudit'

/** A draft AI interview campaign, the kind the CX team creates in Close the loop. */
const draft: AiInterviewCampaign = {
  id: 'camp-ai-test',
  name: { en: 'Test campaign', ar: 'حملة اختبار' },
  segmentDescription: { en: 'Segment', ar: 'شريحة' },
  script: { en: 'Hello', ar: 'مرحباً' },
  status: 'draft',
  memberIds: ['a', 'b', 'c', 'd'],
}

let ai: AiInterviewCampaign[]
let onStage: Mock<(c: AuditCampaign, s: CampaignStage) => void>
let store: CampaignAuditStore

beforeEach(() => {
  ai = [...mock.MOCK_AI_CAMPAIGNS.map((c) => ({ ...c })), { ...draft }]
  onStage = vi.fn()
  store = createCampaignAuditStore(() => buildAuditCampaigns(mock.MOCK_PERSONAS, ai), { onStage, now: () => new Date('2026-11-19T09:00:00Z') })
})

const view = (id: string) => store.list().find((c) => c.id === id)!
const passAll = (id: string, by: RoleId = 'auditmkt') => CHECK_IDS.forEach((check) => store.setCheck({ id, check, value: true, by }))
const code = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(CampaignAuditError)
    return (e as CampaignAuditError).code
  }
  return undefined
}

describe('the campaign audit register (v42.1 F33)', () => {
  it('seeds the campaigns that run or finished as cleared, and the others as waiting for clearance with nothing marked', () => {
    for (const c of store.list()) {
      if (c.seedStage === 'before') {
        expect(c, c.id).toMatchObject({ stage: 'before', clearance: 'waiting', verdict: undefined, checks: {}, failed: [], results: null })
      } else {
        expect(c, c.id).toMatchObject({ stage: c.seedStage, clearance: 'cleared', verdict: 'ok', decidedBy: 'auditmkt', failed: [] })
        expect(CHECK_IDS.every((id) => c.checks[id] === true), c.id).toBe(true)
        expect(c.results, c.id).not.toBeNull()
      }
    }
    expect(view('MC-103').clearance).toBe('waiting')
    expect(view('MC-101').stage).toBe('running')
    expect(view('MC-105').stage).toBe('after')
    expect(view('camp-ai-test').stage).toBe('before')
  })

  it('marks a check ✓ or ✗ and clears the mark again', () => {
    store.setCheck({ id: 'MC-103', check: 'people', value: true, by: 'auditmkt' })
    store.setCheck({ id: 'MC-103', check: 'money', value: false, by: 'auditmkt' })
    expect(view('MC-103').checks).toEqual({ people: true, money: false })
    expect(view('MC-103').failed).toEqual(['money'])
    store.setCheck({ id: 'MC-103', check: 'money', value: null, by: 'auditmkt' })
    expect(view('MC-103').checks).toEqual({ people: true })
    expect(view('MC-103').failed).toEqual([])
  })

  it('lists the failed checks in the order of the five, whatever order they were marked in', () => {
    for (const check of ['money', 'people', 'chan'] as const) store.setCheck({ id: 'MC-103', check, value: false, by: 'auditmkt' })
    expect(view('MC-103').failed).toEqual(['people', 'chan', 'money'])
  })

  it('only the Internal Audit and Marketing Lead and the CX manager may mark checks or decide', () => {
    for (const by of ['auditmkt', 'cxmgr'] as RoleId[]) expect(code(() => store.setCheck({ id: 'MC-103', check: 'people', value: true, by })), by).toBeUndefined()
    for (const by of ['cxteam', 'marketing', 'exec', 'envmgmt', 'ld', 'hrmgr'] as RoleId[]) {
      expect(code(() => store.setCheck({ id: 'MC-104', check: 'people', value: true, by })), by).toBe('not_allowed')
      expect(code(() => store.setVerdict({ id: 'MC-104', verdict: 'back', by })), by).toBe('not_allowed')
    }
    expect(view('MC-104').checks).toEqual({})
  })

  it('"Cleared to run" needs all five checks passed', () => {
    store.setCheck({ id: 'MC-103', check: 'people', value: true, by: 'auditmkt' })
    expect(code(() => store.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' }))).toBe('checks_incomplete')
    for (const check of CHECK_IDS.slice(1, 4)) store.setCheck({ id: 'MC-103', check, value: true, by: 'auditmkt' })
    store.setCheck({ id: 'MC-103', check: 'money', value: false, by: 'auditmkt' })
    expect(code(() => store.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' }))).toBe('checks_incomplete')
    store.setCheck({ id: 'MC-103', check: 'money', value: true, by: 'auditmkt' })
    const cleared = store.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' })
    expect(cleared).toMatchObject({ verdict: 'ok', clearance: 'cleared', decidedBy: 'auditmkt', decidedAt: '2026-11-19', stage: 'before', failed: [] })
  })

  it('"Send back" needs at least one failed check and keeps the failed checks on the record', () => {
    passAll('MC-104')
    expect(code(() => store.setVerdict({ id: 'MC-104', verdict: 'back', by: 'auditmkt' }))).toBe('no_failed_check')
    store.setCheck({ id: 'MC-104', check: 'msg', value: false, by: 'cxmgr' })
    store.setCheck({ id: 'MC-104', check: 'money', value: false, by: 'cxmgr' })
    const back = store.setVerdict({ id: 'MC-104', verdict: 'back', by: 'cxmgr' })
    expect(back).toMatchObject({ verdict: 'back', clearance: 'sent_back', failed: ['msg', 'money'], decidedBy: 'cxmgr', stage: 'before' })
    expect(view('MC-104').failed).toEqual(['msg', 'money'])
  })

  it('a changed check withdraws the verdict: the campaign waits for clearance again', () => {
    passAll('MC-103')
    store.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' })
    expect(view('MC-103').clearance).toBe('cleared')
    store.setCheck({ id: 'MC-103', check: 'chan', value: false, by: 'auditmkt' })
    expect(view('MC-103')).toMatchObject({ clearance: 'waiting', verdict: undefined, decidedAt: undefined, decidedBy: undefined })
  })

  it('the checks and the verdict are closed once the campaign runs or finished', () => {
    for (const id of ['MC-101', 'MC-105']) {
      expect(code(() => store.setCheck({ id, check: 'people', value: false, by: 'auditmkt' })), id).toBe('locked')
      expect(code(() => store.setVerdict({ id, verdict: 'back', by: 'auditmkt' })), id).toBe('locked')
      expect(view(id).clearance).toBe('cleared')
    }
  })

  it('refuses an unknown campaign', () => {
    expect(code(() => store.setCheck({ id: 'MC-999', check: 'people', value: true, by: 'auditmkt' }))).toBe('not_found')
    expect(code(() => store.start({ id: 'MC-999', by: 'marketing' }))).toBe('not_found')
  })

  it('THE GATE: a campaign that is not cleared cannot start, whoever asks, and nothing changes', () => {
    // waiting
    expect(code(() => store.start({ id: 'MC-103', by: 'marketing' }))).toBe('not_cleared')
    expect(code(() => store.start({ id: 'MC-103', by: 'cxmgr' }))).toBe('not_cleared')
    expect(code(() => store.start({ id: 'camp-ai-test', by: 'cxteam' }))).toBe('not_cleared')
    // half marked
    store.setCheck({ id: 'MC-103', check: 'people', value: true, by: 'auditmkt' })
    expect(code(() => store.start({ id: 'MC-103', by: 'marketing' }))).toBe('not_cleared')
    // sent back
    store.setCheck({ id: 'MC-104', check: 'money', value: false, by: 'auditmkt' })
    store.setVerdict({ id: 'MC-104', verdict: 'back', by: 'auditmkt' })
    expect(code(() => store.start({ id: 'MC-104', by: 'marketing' }))).toBe('not_cleared')
    for (const id of ['MC-103', 'MC-104', 'camp-ai-test']) expect(view(id).stage, id).toBe('before')
    expect(onStage).not.toHaveBeenCalled()
  })

  it('moves a cleared campaign before -> running -> after, and tells the caller each stage', () => {
    passAll('MC-103')
    store.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' })
    expect(view('MC-103').results).toBeNull()
    const running = store.start({ id: 'MC-103', by: 'marketing' })
    expect(running).toMatchObject({ stage: 'running', clearance: 'cleared' })
    expect(running.results).not.toBeNull()
    expect(onStage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'MC-103' }), 'running')
    const after = store.finish({ id: 'MC-103', by: 'marketing' })
    expect(after.stage).toBe('after')
    expect(onStage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'MC-103' }), 'after')
    expect(onStage).toHaveBeenCalledTimes(2)
  })

  it('refuses a stage out of order: start twice, finish before start, start after the run', () => {
    passAll('MC-103')
    store.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' })
    expect(code(() => store.finish({ id: 'MC-103', by: 'marketing' }))).toBe('wrong_stage')
    store.start({ id: 'MC-103', by: 'marketing' })
    expect(code(() => store.start({ id: 'MC-103', by: 'marketing' }))).toBe('wrong_stage')
    store.finish({ id: 'MC-103', by: 'marketing' })
    expect(code(() => store.start({ id: 'MC-103', by: 'marketing' }))).toBe('wrong_stage')
    expect(code(() => store.finish({ id: 'MC-103', by: 'marketing' }))).toBe('wrong_stage')
  })

  it('who runs what: Marketing and the CX manager a persona campaign, the CX manager and the CX team an AI campaign, never the audit role', () => {
    for (const id of ['MC-103', 'camp-ai-test']) {
      passAll(id)
      store.setVerdict({ id, verdict: 'ok', by: 'auditmkt' })
    }
    for (const by of ['auditmkt', 'exec', 'cxteam', 'envmgmt'] as RoleId[]) expect(code(() => store.start({ id: 'MC-103', by })), `persona ${by}`).toBe('not_allowed')
    for (const by of ['auditmkt', 'exec', 'marketing'] as RoleId[]) expect(code(() => store.start({ id: 'camp-ai-test', by })), `ai ${by}`).toBe('not_allowed')
    expect(view('MC-103').stage).toBe('before')
    expect(code(() => store.start({ id: 'MC-103', by: 'marketing' }))).toBeUndefined()
    expect(code(() => store.start({ id: 'camp-ai-test', by: 'cxteam' }))).toBeUndefined()
    expect(view('camp-ai-test').stage).toBe('running')
  })

  it('a campaign created later shows up waiting for clearance, and an AI campaign’s stage is mirrored to its own register by the caller', () => {
    const created: AiInterviewCampaign = { ...draft, id: 'camp-ai-new', memberIds: ['a'] }
    const listed = () => store.list().find((c) => c.id === 'camp-ai-new')
    expect(listed()).toBeUndefined()
    ai.push(created)
    expect(listed()).toMatchObject({ kind: 'ai', stage: 'before', clearance: 'waiting' })
    passAll('camp-ai-new', 'cxmgr')
    store.setVerdict({ id: 'camp-ai-new', verdict: 'ok', by: 'cxmgr' })
    store.start({ id: 'camp-ai-new', by: 'cxmgr' })
    expect(onStage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'camp-ai-new', kind: 'ai', sourceId: 'camp-ai-new' }), 'running')
  })

  it('reset puts the sample back', () => {
    store.setCheck({ id: 'MC-103', check: 'people', value: false, by: 'auditmkt' })
    store.reset()
    expect(view('MC-103').checks).toEqual({})
  })
})
