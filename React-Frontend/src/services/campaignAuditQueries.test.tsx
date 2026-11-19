import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { CHECK_IDS } from '@/data/campaignAudit'
import type { RoleId } from '@/types'
import { useBriefInputs, useInbox } from './queriesV40'
import { CampaignAuditError } from './mockCampaignAudit'
import {
  campaignAuditStore,
  useCampaignAudit,
  useCampaignAuditSummary,
  useCampaignGate,
  useFinishCampaign,
  useSetCampaignCheck,
  useSetCampaignVerdict,
  useStartCampaign,
} from './campaignAuditQueries'

vi.setConfig({ testTimeout: 20_000 })

const T = { timeout: 8000 }

beforeEach(() => campaignAuditStore.reset())
afterEach(() => campaignAuditStore.reset())

/** The audit hooks together, signed in as `role`. */
function audit(role: RoleId) {
  return renderHookWithProviders(
    () => ({ list: useCampaignAudit(), check: useSetCampaignCheck(), verdict: useSetCampaignVerdict(), start: useStartCampaign(), finish: useFinishCampaign() }),
    { role },
  )
}

/** The two mutations the audit lead uses. */
const useLead = () => ({ check: useSetCampaignCheck(), verdict: useSetCampaignVerdict() })

const passAll = async (h: ReturnType<typeof audit>, id: string) => {
  for (const check of CHECK_IDS) await act(() => h.result.current.check.mutateAsync({ id, check, value: true }))
}

describe('campaign audit hooks (v42.1 F33)', () => {
  it('lists every campaign: one per persona and the AI interview campaigns', async () => {
    const h = audit('auditmkt')
    await waitFor(() => expect(h.result.current.list.data).toBeDefined(), T)
    const ids = h.result.current.list.data!.map((c) => c.id)
    expect(ids).toEqual(['MC-101', 'MC-102', 'MC-103', 'MC-104', 'MC-105', 'MC-106', ...mock.MOCK_AI_CAMPAIGNS.map((c) => c.id)])
  })

  it('keeps the marks and the verdict in the register, so they survive leaving the page and coming back', async () => {
    const first = audit('auditmkt')
    await waitFor(() => expect(first.result.current.list.data).toBeDefined(), T)
    await act(() => first.result.current.check.mutateAsync({ id: 'MC-103', check: 'msg', value: false }))
    // the cache is told at once; the observer renders on the next tick
    await waitFor(() => expect(first.result.current.list.data!.find((c) => c.id === 'MC-103')!.checks).toEqual({ msg: false }), T)
    await act(() => first.result.current.verdict.mutateAsync({ id: 'MC-103', verdict: 'back' }))
    first.unmount()
    // a new mount (another page visit, another query client) reads the same register
    const again = audit('marketing')
    await waitFor(() => expect(again.result.current.list.data).toBeDefined(), T)
    expect(again.result.current.list.data!.find((c) => c.id === 'MC-103')).toMatchObject({ clearance: 'sent_back', failed: ['msg'], verdict: 'back' })
  })

  it('refuses a role that may only read', async () => {
    const h = audit('marketing')
    await waitFor(() => expect(h.result.current.list.data).toBeDefined(), T)
    const err = await act(() => h.result.current.check.mutateAsync({ id: 'MC-103', check: 'people', value: true }).catch((e: unknown) => e))
    expect(err).toBeInstanceOf(CampaignAuditError)
    expect((err as CampaignAuditError).code).toBe('not_allowed')
    expect(campaignAuditStore.list().find((c) => c.id === 'MC-103')!.checks).toEqual({})
  })

  it('the CX manager edits as well as the audit lead', async () => {
    const h = audit('cxmgr')
    await waitFor(() => expect(h.result.current.list.data).toBeDefined(), T)
    await act(() => h.result.current.check.mutateAsync({ id: 'MC-104', check: 'proj', value: true }))
    await waitFor(() => expect(h.result.current.list.data!.find((c) => c.id === 'MC-104')!.checks).toEqual({ proj: true }), T)
  })

  it('THE GATE through the hooks: a start that is not cleared rejects with not_cleared and changes nothing; cleared, it runs; finished, it is after the run', async () => {
    const h = audit('marketing')
    await waitFor(() => expect(h.result.current.list.data).toBeDefined(), T)
    const refused = await act(() => h.result.current.start.mutateAsync({ id: 'MC-103' }).catch((e: unknown) => e))
    expect((refused as CampaignAuditError).code).toBe('not_cleared')
    expect(h.result.current.list.data!.find((c) => c.id === 'MC-103')!.stage).toBe('before')
    // the audit lead clears it (outside this role's hooks: the register is shared)
    const lead = audit('auditmkt')
    await waitFor(() => expect(lead.result.current.list.data).toBeDefined(), T)
    await passAll(lead, 'MC-103')
    await act(() => lead.result.current.verdict.mutateAsync({ id: 'MC-103', verdict: 'ok' }))
    const started = await act(() => h.result.current.start.mutateAsync({ id: 'MC-103' }))
    expect(started).toMatchObject({ stage: 'running', clearance: 'cleared' })
    await waitFor(() => expect(h.result.current.list.data!.find((c) => c.id === 'MC-103')!.stage).toBe('running'), T)
    const done = await act(() => h.result.current.finish.mutateAsync({ id: 'MC-103' }))
    expect(done.stage).toBe('after')
  })

  it('starting an AI interview campaign sets its own status in Close the loop; a draft stays a draft while it is not cleared', async () => {
    const created = { id: 'camp-ai-hook', name: { en: 'Hook', ar: 'خطاف' }, segmentDescription: { en: 'S', ar: 'ش' }, script: { en: 's', ar: 'ص' }, status: 'draft' as const, memberIds: ['a', 'b'] }
    mock.MOCK_AI_CAMPAIGNS.push(created)
    try {
      const h = audit('cxteam')
      await waitFor(() => expect(h.result.current.list.data?.some((c) => c.id === 'camp-ai-hook')).toBe(true), T)
      const refused = await act(() => h.result.current.start.mutateAsync({ id: 'camp-ai-hook' }).catch((e: unknown) => e))
      expect((refused as CampaignAuditError).code).toBe('not_cleared')
      expect(created.status).toBe('draft')
      const lead = audit('cxmgr')
      await waitFor(() => expect(lead.result.current.list.data).toBeDefined(), T)
      await passAll(lead, 'camp-ai-hook')
      await act(() => lead.result.current.verdict.mutateAsync({ id: 'camp-ai-hook', verdict: 'ok' }))
      await act(() => h.result.current.start.mutateAsync({ id: 'camp-ai-hook' }))
      expect(created.status).toBe('running')
      await act(() => h.result.current.finish.mutateAsync({ id: 'camp-ai-hook' }))
      expect(created.status).toBe('closed')
    } finally {
      mock.MOCK_AI_CAMPAIGNS.splice(mock.MOCK_AI_CAMPAIGNS.indexOf(created), 1)
    }
  })

  it('reads one campaign by its source id (the persona id, the AI campaign id)', async () => {
    const h = renderHookWithProviders(() => ({ persona: useCampaignGate(mock.MOCK_PERSONAS[2].id), ai: useCampaignGate(mock.MOCK_AI_CAMPAIGNS[0].id), none: useCampaignGate(undefined) }), { role: 'cxmgr' })
    await waitFor(() => expect(h.result.current.persona.campaign).toBeDefined(), T)
    expect(h.result.current.persona.campaign).toMatchObject({ id: 'MC-103', clearance: 'waiting' })
    expect(h.result.current.ai.campaign).toMatchObject({ kind: 'ai', stage: 'running', clearance: 'cleared' })
    expect(h.result.current.none.campaign).toBeUndefined()
  })

  it('the summary only loads when asked, and counts what waits and finished', async () => {
    const off = renderHookWithProviders(() => useCampaignAuditSummary({ enabled: false }), { role: 'cxmgr' })
    expect(off.result.current.data).toBeUndefined()
    expect(off.result.current.isLoading).toBe(false)
    const on = renderHookWithProviders(() => useCampaignAuditSummary(), { role: 'auditmkt' })
    await waitFor(() => expect(on.result.current.data).toBeDefined(), T)
    expect(on.result.current.data).toMatchObject({ waiting: 2, finished: 2, running: 3 })
  })
})

describe('the audit lead’s inbox and brief read the register (v42.1 F33)', () => {
  it('"Clear or send back" counts down as campaigns are cleared or sent back, and the brief line follows', async () => {
    const h = renderHookWithProviders(() => ({ inbox: useInbox(), brief: useBriefInputs(), lead: useLead() }), { role: 'auditmkt' })
    await waitFor(() => expect(h.result.current.inbox.data).toBeDefined(), T)
    await waitFor(() => expect(h.result.current.brief.data).toBeDefined(), T)
    expect(h.result.current.inbox.data!.find((i) => i.kind === 'caud')!.text.en).toBe('Clear or send back: 2 campaigns waiting before they run')
    expect(h.result.current.brief.data!.campaigns).toEqual({ waiting: 2, runningReachedPct: [71, 71, 71] })
    // send MC-103 back
    await act(() => h.result.current.lead.check.mutateAsync({ id: 'MC-103', check: 'money', value: false }))
    await act(() => h.result.current.lead.verdict.mutateAsync({ id: 'MC-103', verdict: 'back' }))
    await waitFor(() => expect(h.result.current.inbox.data!.find((i) => i.kind === 'caud')?.text.en).toBe('Clear or send back: 1 campaign waiting before it runs'), T)
    expect(h.result.current.brief.data!.campaigns!.waiting).toBe(1)
    // clear MC-104: nothing is left waiting, so the row goes
    for (const check of CHECK_IDS) await act(() => h.result.current.lead.check.mutateAsync({ id: 'MC-104', check, value: true }))
    await act(() => h.result.current.lead.verdict.mutateAsync({ id: 'MC-104', verdict: 'ok' }))
    await waitFor(() => expect(h.result.current.inbox.data!.some((i) => i.kind === 'caud')).toBe(false), T)
    expect(h.result.current.inbox.data!.some((i) => i.kind === 'caud2')).toBe(true)
  })

  it('no other role waits for the audit, gets the rows or gets the brief input', async () => {
    const h = renderHookWithProviders(() => ({ inbox: useInbox(), brief: useBriefInputs() }), { role: 'cxmgr' })
    await waitFor(() => expect(h.result.current.inbox.data).toBeDefined(), T)
    await waitFor(() => expect(h.result.current.brief.data).toBeDefined(), T)
    expect(h.result.current.inbox.data!.some((i) => i.kind === 'caud' || i.kind === 'caud2')).toBe(false)
    expect(h.result.current.brief.data!.campaigns).toBeUndefined()
  })
})
