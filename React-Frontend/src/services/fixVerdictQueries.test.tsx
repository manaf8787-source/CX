import { describe, expect, it } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '@/test/render'
import * as mock from './mockData'
import { useSetFixStatus } from './queriesV40'
import { useAcceptFixAsIs, useInvestigateFromFix, useRequestSecondStep, useSecondSteps } from './fixVerdictQueries'
import { useCorrectiveActionsAll, useInvestigations } from './queries'
import type { CorrectiveAction } from '@/types'

/** A throwaway fix on the seeded sample (the mock registers are shared inside this file; each test makes its own). */
function makeFix(over: Partial<CorrectiveAction>): CorrectiveAction {
  const base = mock.MOCK_CORRECTIVE_ACTIONS[0]
  const n = mock.MOCK_CORRECTIVE_ACTIONS.length + 1
  const fix: CorrectiveAction = {
    ...base,
    id: `ca-${n}`,
    status: 'verification',
    verificationResult: undefined,
    auditLog: [],
    ...over,
  }
  mock.MOCK_CORRECTIVE_ACTIONS.push(fix)
  return fix
}

describe('the verdict: useSetFixStatus with effective, partial or failed (v40.1)', () => {
  for (const verdict of ['effective', 'partial', 'failed'] as const) {
    it(`${verdict}: sets the status and verificationResult and writes an audit line by the signed-in role`, async () => {
      const fix = makeFix({ status: 'verification' })
      const { result } = renderHookWithProviders(() => useSetFixStatus(), { role: 'cxteam' })
      await act(() => result.current.mutateAsync({ id: fix.id, status: verdict }))
      expect(fix.status).toBe(verdict)
      expect(fix.verificationResult).toBe(verdict)
      expect(fix.auditLog).toHaveLength(1)
      expect(fix.auditLog[0]).toMatchObject({ byRole: 'cxteam', what: { en: `Verdict: ${verdict}` } })
    })
  }
})

describe('useRequestSecondStep: ask for a second step', () => {
  it('creates a NEW proposed fix on the same pattern, linked to its parent, and writes an audit line on both fixes', async () => {
    const parent = makeFix({ status: 'partial', verificationResult: 'partial', owner: 'Direct manager (Dubai environment manager)', kind: 'employee' })
    const count = mock.MOCK_CORRECTIVE_ACTIONS.length
    const { result } = renderHookWithProviders(() => useRequestSecondStep(), { role: 'cxmgr' })
    const child = await act(() => result.current.mutateAsync({ parentId: parent.id }))

    // the new id continues the sample numbering: the last was ca-N, so ca-(N+1), shown CA-2(N+1)
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(count + 1)
    expect(child.id).toBe(`ca-${count + 1}`)
    expect(mock.MOCK_CORRECTIVE_ACTIONS.at(-1)).toBe(child)
    // same pattern, kind, owner and product, proposed now, by a person
    expect(child).toMatchObject({ status: 'proposed', patternId: parent.patternId, kind: 'employee', owner: parent.owner, product: parent.product, parentFixId: parent.id, parentOutcome: 'partial' })
    expect(Date.now() - Date.parse(child.proposedAt)).toBeLessThan(10_000)
    expect(child.title.en).toBe(`Second step on CA-${200 + Number(parent.id.slice(3))}: ${parent.title.en}`)
    expect(child.title.ar).toMatch(/^خطوة ثانية على CA-2\d+: /)
    expect(child.proposedBy?.en).toBe('CX manager, after a partial result')
    // the 5-working-day approval window starts now: a new proposal, no decision
    expect(child.decision).toBeUndefined()
    // audit on both
    expect(parent.auditLog.at(-1)).toMatchObject({ byRole: 'cxmgr', what: { en: `Second step requested: CA-2${String(count + 1).padStart(2, '0')}` } })
    expect(child.auditLog).toHaveLength(1)
    expect(child.auditLog[0]).toMatchObject({ byRole: 'cxmgr', what: { en: expect.stringMatching(/^Second step requested after CA-2\d+/) } })
    // the parent keeps its verdict
    expect(parent.status).toBe('partial')
  })

  it('a failed fix gets one too, and says "after a failed result"', async () => {
    const parent = makeFix({ status: 'failed', verificationResult: 'failed' })
    const { result } = renderHookWithProviders(() => useRequestSecondStep(), { role: 'cxmgr' })
    const child = await act(() => result.current.mutateAsync({ parentId: parent.id }))
    expect(child.parentOutcome).toBe('failed')
    expect(child.proposedBy?.en).toBe('CX manager, after a failed result')
  })

  it('the second step shows up in the register and under its parent (useSecondSteps)', async () => {
    const parent = makeFix({ status: 'partial', verificationResult: 'partial' })
    const { result } = renderHookWithProviders(() => ({ ask: useRequestSecondStep(), all: useCorrectiveActionsAll(), steps: useSecondSteps(parent.id) }), { role: 'cxmgr' })
    await waitFor(() => expect(result.current.all.data).toBeDefined())
    expect(result.current.steps).toEqual([])
    const child = await act(() => result.current.ask.mutateAsync({ parentId: parent.id }))
    await waitFor(() => expect(result.current.steps.map((s) => s.id)).toEqual([child.id]))
    expect(result.current.all.data?.some((f) => f.id === child.id)).toBe(true)
  })

  it('refuses a second request while one is open, a fix that is not partial or failed, and a role outside CX', async () => {
    const parent = makeFix({ status: 'partial', verificationResult: 'partial' })
    const { result } = renderHookWithProviders(() => useRequestSecondStep(), { role: 'cxmgr' })
    await act(() => result.current.mutateAsync({ parentId: parent.id }))
    await expect(act(() => result.current.mutateAsync({ parentId: parent.id }))).rejects.toThrow(/already has an open second step/)
    const open = makeFix({ status: 'verification' })
    await expect(act(() => result.current.mutateAsync({ parentId: open.id }))).rejects.toThrow(/partial or failed/)

    const other = makeFix({ status: 'partial', verificationResult: 'partial' })
    const count = mock.MOCK_CORRECTIVE_ACTIONS.length
    const { result: env } = renderHookWithProviders(() => useRequestSecondStep(), { role: 'envmgmt' })
    await expect(act(() => env.current.mutateAsync({ parentId: other.id }))).rejects.toThrow(/Only the CX manager and the CX team/)
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(count)
  })
})

describe('useInvestigateFromFix: investigate first (5 interviews)', () => {
  it('opens an investigation on the fix\'s pattern: interviews, 5, running, with the note and an audit line on the fix', async () => {
    const fix = makeFix({ status: 'failed', verificationResult: 'failed' })
    const count = mock.MOCK_INVESTIGATIONS.length
    const { result } = renderHookWithProviders(() => ({ go: useInvestigateFromFix(), list: useInvestigations() }), { role: 'cxmgr' })
    await waitFor(() => expect(result.current.list.data).toBeDefined())
    const inv = await act(() => result.current.go.mutateAsync({ fixId: fix.id, environment: 'PSI Assets team' }))

    expect(inv.id).toBe(`inv-${count + 1}`)
    expect(mock.MOCK_INVESTIGATIONS).toHaveLength(count + 1)
    expect(inv).toMatchObject({ patternId: fix.patternId, kind: 'customer_interviews', requestedCount: 5, doneCount: 0, status: 'in_progress', environment: 'PSI Assets team' })
    expect(inv.note?.en).toMatch(/^Requested from CA-2\d+ after a failed result\.$/)
    expect(fix.auditLog.at(-1)).toMatchObject({ byRole: 'cxmgr', what: { en: `Investigation requested: 5 interviews (INV-${count + 1})` } })
    // the fix keeps its verdict; it is not "sent to investigation" (that is the proposal-stage flow)
    expect(fix.status).toBe('failed')
    expect(fix.sentToInvestigation).toBeUndefined()
    // and the Investigations list shows it
    await waitFor(() => expect(result.current.list.data?.some((i) => i.id === inv.id)).toBe(true))
  })

  it('refuses a fix with no pattern and a role outside CX', async () => {
    const noPattern = makeFix({ status: 'partial', verificationResult: 'partial', patternId: undefined })
    const { result } = renderHookWithProviders(() => useInvestigateFromFix(), { role: 'cxteam' })
    await expect(act(() => result.current.mutateAsync({ fixId: noPattern.id }))).rejects.toThrow(/no pattern/)
    const fix = makeFix({ status: 'partial', verificationResult: 'partial' })
    const { result: hr } = renderHookWithProviders(() => useInvestigateFromFix(), { role: 'hrspec' })
    await expect(act(() => hr.current.mutateAsync({ fixId: fix.id }))).rejects.toThrow(/Only the CX manager and the CX team/)
  })
})

describe('useAcceptFixAsIs: accept as is', () => {
  it('a partial fix ends effective, with an audit line that says it was accepted after a partial result', async () => {
    const fix = makeFix({ status: 'partial', verificationResult: 'partial' })
    const { result } = renderHookWithProviders(() => useAcceptFixAsIs(), { role: 'cxmgr' })
    await act(() => result.current.mutateAsync({ id: fix.id }))
    expect(fix.status).toBe('effective')
    expect(fix.verificationResult).toBe('effective')
    expect(fix.auditLog).toHaveLength(1)
    expect(fix.auditLog[0]).toMatchObject({ byRole: 'cxmgr', what: { en: 'Accepted as is after a partial result' } })
  })

  it('a failed fix too, and only partial or failed, only by CX', async () => {
    const fix = makeFix({ status: 'failed', verificationResult: 'failed' })
    const { result } = renderHookWithProviders(() => useAcceptFixAsIs(), { role: 'cxteam' })
    await act(() => result.current.mutateAsync({ id: fix.id }))
    expect(fix.status).toBe('effective')
    expect(fix.auditLog.at(-1)?.what.en).toBe('Accepted as is after a failed result')

    const open = makeFix({ status: 'verification' })
    await expect(act(() => result.current.mutateAsync({ id: open.id }))).rejects.toThrow(/partial or failed/)
    const other = makeFix({ status: 'partial', verificationResult: 'partial' })
    const { result: lead } = renderHookWithProviders(() => useAcceptFixAsIs(), { role: 'teamlead' })
    await expect(act(() => lead.current.mutateAsync({ id: other.id }))).rejects.toThrow(/Only the CX manager and the CX team/)
    expect(other.status).toBe('partial')
  })
})
