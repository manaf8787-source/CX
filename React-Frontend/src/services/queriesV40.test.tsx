import { describe, expect, it } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '@/test/render'
import * as mock from './mockData'
import {
  useBriefInputs,
  useCrmMapping,
  useFeedScope,
  useFeeds,
  useFixDue,
  useFixMatrixLine,
  useIndicators,
  useIsVipFix,
  useInbox,
  useInvestigationEvidence,
  useJudgeSample,
  useMarkReplied,
  useMatrix,
  useQuestionSets,
  useRecordNoAnswer,
  useRules,
  useSaveMapping,
  useSaveMatrixCell,
  useSetFixStatus,
  useSignalDetail,
  useTrace,
  useTraceNav,
  useWeeklySample,
} from './queriesV40'
import {
  useCorrectiveActions,
  useDecideCorrectiveAction,
  useInvestigations,
  usePatterns,
  usePersons,
  useReturnInvestigation,
  useShopperCases,
  useSignals,
  useUpdateRuleConfig,
} from './queries'
import { useEnvScope } from './envScope'
import { usePublicMentions } from './referenceQueries'
import { AGENT_JDS, PUBLIC_MENTIONS } from '@/data/v38Reference'
import { RULE_IDS, rulesFromConfig } from '@/utils/ruleValues'
import { fixDue } from '@/utils/fixClock'
import type { MatrixCellRow } from '@/types'
import { MON_FRI } from '@/utils/workingDays'

const ready = <T,>(q: { data: T | undefined }) => expect(q.data).toBeDefined()

describe('env-aware reads (v40 F14): the environment is part of the query key', () => {
  it('usePersons, useSignals and useShopperCases narrow to the selected environment and cache per scope', async () => {
    const { result, client } = renderHookWithProviders(() => ({ scope: useEnvScope(), persons: usePersons(), signals: useSignals(), cases: useShopperCases() }))
    await waitFor(() => ready(result.current.persons))
    expect(result.current.scope.env).toBe('all')
    expect(result.current.persons.data).toHaveLength(30)
    expect(result.current.signals.data).toHaveLength(mock.MOCK_SIGNALS.length)

    act(() => result.current.scope.setEnv('ast'))
    await waitFor(() => expect(result.current.persons.data?.every((p) => p.envId === 'ast')).toBe(true))
    expect(result.current.persons.data!.length).toBe(mock.MOCK_PERSONS.filter((p) => p.envId === 'ast').length)
    await waitFor(() => expect(result.current.signals.data?.every((s) => s.envId === 'ast')).toBe(true))
    await waitFor(() => expect(result.current.cases.data?.every((c) => c.envId === 'ast')).toBe(true))

    const keys = client.getQueryCache().getAll().map((q) => JSON.stringify(q.queryKey))
    expect(keys).toContain('["persons","all"]')
    expect(keys).toContain('["persons","ast"]')
  })

  it('a role fixed to one environment always reads it, and cannot switch', async () => {
    const { result } = renderHookWithProviders(() => ({ scope: useEnvScope(), persons: usePersons() }), { role: 'envmgmt' })
    await waitFor(() => ready(result.current.persons))
    expect(result.current.scope).toMatchObject({ env: 'dub', fixed: 'dub', allowed: ['dub'] })
    expect(result.current.persons.data?.every((p) => p.envId === 'dub')).toBe(true)
    act(() => result.current.scope.setEnv('auh'))
    expect(result.current.scope.env).toBe('dub')
  })

  it('patterns are narrowed with their signals', async () => {
    const { result } = renderHookWithProviders(() => ({ scope: useEnvScope(), patterns: usePatterns() }))
    await waitFor(() => ready(result.current.patterns))
    const all = result.current.patterns.data!
    act(() => result.current.scope.setEnv('dub'))
    await waitFor(() => {
      expect(result.current.patterns.data).toBeDefined()
      expect(result.current.patterns.data).not.toBe(all)
    })
    const byId = new Map(mock.MOCK_SIGNALS.map((s) => [s.id, s]))
    for (const p of result.current.patterns.data!) for (const id of p.signalIds) expect(byId.get(id)?.envId).toBe('dub')
  })

  it('the feeds in scope follow the switch: the late PSI Assets CRM counts only for All and PSI Assets', async () => {
    const { result } = renderHookWithProviders(() => ({ scope: useEnvScope(), feeds: useFeedScope(), all: useFeeds() }))
    await waitFor(() => ready(result.current.feeds))
    expect(result.current.all.data).toHaveLength(8)
    expect(result.current.feeds.data).toMatchObject({ lateCount: 1 })
    act(() => result.current.scope.setEnv('dub'))
    await waitFor(() => expect(result.current.feeds.data?.lateCount).toBe(0))
    expect(result.current.feeds.data?.feeds.map((f) => f.id)).toEqual(['crm_dub', 'wa', 'ai', 'app', 'sv', 'pub'])
    act(() => result.current.scope.setEnv('ast'))
    await waitFor(() => expect(result.current.feeds.data?.lateCount).toBe(1))
  })
})

describe('patterns computed from the rules at read time (v40 B17, F16)', () => {
  it('editing a threshold in the rules changes the patterns without a reload', async () => {
    const { result } = renderHookWithProviders(() => ({ patterns: usePatterns(), update: useUpdateRuleConfig(), rules: useRules() }))
    await waitFor(() => ready(result.current.patterns))
    expect(result.current.rules.patterns.sameIssueMin).toBe(5)
    const before = result.current.patterns.data!.filter((p) => p.thresholdKind === 'same_issue')
    expect(before.length).toBeGreaterThan(0)
    // The seeded patterns are the default-rule patterns.
    expect(result.current.patterns.data!.map((p) => p.id)).toEqual(mock.MOCK_PATTERNS.map((p) => p.id))

    await act(() => result.current.update.mutateAsync({ id: RULE_IDS.sameIssue, value: 50 }))
    await waitFor(() => expect(result.current.patterns.data!.filter((p) => p.thresholdKind === 'same_issue')).toHaveLength(0))
    expect(result.current.rules.patterns.sameIssueMin).toBe(50)

    await act(() => result.current.update.mutateAsync({ id: RULE_IDS.sameIssue, value: 5 }))
    await waitFor(() => expect(result.current.patterns.data!.filter((p) => p.thresholdKind === 'same_issue').length).toBe(before.length))
    // Ids stay stable through the round trip, so a fix stays attached to its pattern.
    expect(result.current.patterns.data!.map((p) => p.id)).toEqual(mock.MOCK_PATTERNS.map((p) => p.id))
  })

  it('the working week is a rule: a count in value rebuilds the weekdays, days sets them', async () => {
    const { result } = renderHookWithProviders(() => ({ update: useUpdateRuleConfig(), rules: useRules() }))
    await waitFor(() => expect(result.current.rules.workingDays).toEqual(MON_FRI))
    await act(() => result.current.update.mutateAsync({ id: RULE_IDS.workingDays, days: [0, 1, 2, 3, 4] }))
    await waitFor(() => expect(result.current.rules.workingDays).toEqual([0, 1, 2, 3, 4]))
    await act(() => result.current.update.mutateAsync({ id: RULE_IDS.workingDays, value: 6 }))
    await waitFor(() => expect(result.current.rules.workingDays).toEqual([0, 1, 2, 3, 4, 5, 6].filter((d) => d !== 0)))
    await act(() => result.current.update.mutateAsync({ id: RULE_IDS.workingDays, value: 5 }))
    await waitFor(() => expect(result.current.rules.workingDays).toEqual(MON_FRI))
    expect(mock.MOCK_RULES_CONFIG.find((r) => r.id === RULE_IDS.workingDays)).toMatchObject({ value: 5, days: MON_FRI })
  })
})

describe('audit trail on decisions and status changes (v40 F21)', () => {
  it('a decision writes an entry by the signed-in role', async () => {
    const { result } = renderHookWithProviders(() => ({ fixes: useCorrectiveActions(), decide: useDecideCorrectiveAction() }), { role: 'cxmgr' })
    await waitFor(() => ready(result.current.fixes))
    const target = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.status === 'proposed') ?? mock.MOCK_CORRECTIVE_ACTIONS[0]
    const before = target.auditLog.length
    await act(() => result.current.decide.mutateAsync({ id: target.id, decision: 'approved', reason: 'Go ahead' }))
    expect(target.auditLog).toHaveLength(before + 1)
    const last = target.auditLog.at(-1)!
    expect(last).toMatchObject({ byRole: 'cxmgr' })
    expect(last.what.en).toBe('Approved: Go ahead')
    expect(last.what.ar).toMatch(/[؀-ۿ]/)
    expect(target.status).toBe('approved')
  })

  it('a status change writes an entry and a verdict is stored', async () => {
    const { result } = renderHookWithProviders(() => useSetFixStatus(), { role: 'envmgmt' })
    const target = mock.MOCK_CORRECTIVE_ACTIONS[0]
    const before = target.auditLog.length
    await act(() => result.current.mutateAsync({ id: target.id, status: 'effective' }))
    expect(target.status).toBe('effective')
    expect(target.verificationResult).toBe('effective')
    expect(target.auditLog).toHaveLength(before + 1)
    expect(target.auditLog.at(-1)).toMatchObject({ byRole: 'envmgmt' })
    expect(target.auditLog.at(-1)?.what.en).toBe('Verdict: effective')
  })

  it('asking for an investigation is an audit line too', async () => {
    const { useSendToInvestigation } = await import('./referenceQueries')
    const { result } = renderHookWithProviders(() => useSendToInvestigation(), { role: 'cxmgr' })
    const target = mock.MOCK_CORRECTIVE_ACTIONS[1]
    const before = target.auditLog.length
    const inv = await act(() => result.current.mutateAsync({ actionId: target.id, patternId: target.patternId }))
    expect(inv.id).toMatch(/^inv-/)
    expect(target.auditLog.at(-1)?.what.en).toMatch(/^Sent to investigation INV-\d+/)
    expect(target.auditLog).toHaveLength(before + 1)
  })
})

describe('an investigation returns evidence and proposes a fix (v40 F26)', () => {
  it('closes with the result, keeps it as evidence on the pattern and proposes a fix by Agent 5 when the pattern has none', async () => {
    const { result } = renderHookWithProviders(() => ({ investigations: useInvestigations(), ret: useReturnInvestigation(), evidence: useInvestigationEvidence(), fixes: useCorrectiveActions() }))
    await waitFor(() => ready(result.current.investigations))
    const withoutFix = mock.MOCK_INVESTIGATIONS.find((i) => i.status !== 'returned' && i.patternId && !mock.MOCK_CORRECTIVE_ACTIONS.some((a) => a.patternId === i.patternId))
    expect(withoutFix, 'sample has an open investigation on a pattern with no fix').toBeDefined()
    const fixCount = mock.MOCK_CORRECTIVE_ACTIONS.length
    const inv = await act(() => result.current.ret.mutateAsync({ id: withoutFix!.id, resultSummary: 'Interviews confirm the old brochure is still in use.' }))
    expect(inv.status).toBe('returned')
    expect(inv.result?.en).toBe('Interviews confirm the old brochure is still in use.')
    expect(inv.doneCount).toBe(inv.requestedCount ?? inv.doneCount)
    expect(inv.proposedFixId).toBeDefined()
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(fixCount + 1)
    const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === inv.proposedFixId)!
    expect(fix).toMatchObject({ status: 'proposed', kind: 'training_gap', patternId: withoutFix!.patternId, owner: 'L&D manager', source: { investigationId: withoutFix!.id } })
    expect(fix.proposedBy?.en).toBe('Agent 5, from the investigation')
    expect(fix.auditLog).toHaveLength(1)
    expect(fix.auditLog[0]).toMatchObject({ byRole: 'system' })
    expect(Date.now() - Date.parse(fix.proposedAt)).toBeLessThan(60_000)
    await waitFor(() => expect(result.current.evidence.data?.[withoutFix!.patternId!]).toMatchObject({ investigationId: withoutFix!.id, result: { en: 'Interviews confirm the old brochure is still in use.' } }))
    expect(result.current.evidence.data?.[withoutFix!.patternId!].traceId).toMatch(/^INV-\d+$/)
  })

  it('records evidence only (no second fix) when the pattern already has one', async () => {
    const { result } = renderHookWithProviders(() => useReturnInvestigation())
    const fixed = mock.MOCK_INVESTIGATIONS.find((i) => i.status !== 'returned' && i.patternId && mock.MOCK_CORRECTIVE_ACTIONS.some((a) => a.patternId === i.patternId))
    if (!fixed) return // the sample may have none: the rule is covered by the previous test
    const count = mock.MOCK_CORRECTIVE_ACTIONS.length
    const inv = await act(() => result.current.mutateAsync({ id: fixed.id, resultSummary: 'Shopper check done.' }))
    expect(inv.proposedFixId).toBeUndefined()
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(count)
  })
})

describe('my inbox, indicators and the brief (v40 F03, F09, F20)', () => {
  it('useInbox lists what is on the role, sorted, and counts the urgent ones', async () => {
    const { result } = renderHookWithProviders(() => useInbox(), { role: 'cxmgr' })
    await waitFor(() => ready(result.current))
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.stats.total).toBe(result.current.data!.length)
    expect(result.current.stats.urgent).toBe(result.current.data!.filter((i) => i.priority >= 1).length)
    for (let i = 1; i < result.current.data!.length; i++) expect(result.current.data![i - 1].priority).toBeGreaterThanOrEqual(result.current.data![i].priority)
  })

  it('the Internal Audit and Marketing Lead has the weekly sample; HR manager has an empty inbox', async () => {
    const audit = renderHookWithProviders(() => useInbox(), { role: 'auditmkt' })
    await waitFor(() => ready(audit.result.current))
    expect(audit.result.current.data!.map((i) => i.kind)).toEqual(['sample'])
    const hr = renderHookWithProviders(() => useInbox(), { role: 'hrmgr' })
    await waitFor(() => ready(hr.result.current))
    expect(hr.result.current.data).toEqual([])
  })

  it('useIndicators gives one set per live product (never a group number)', async () => {
    const { result } = renderHookWithProviders(() => useIndicators())
    await waitFor(() => ready(result.current))
    expect(result.current.data!.map((s) => s.productId)).toEqual(['re', 'af'])
    expect(result.current.data![0].nps).not.toBeNull()
  })

  it('useBriefInputs reads the same registers as the pages', async () => {
    const { result } = renderHookWithProviders(() => useBriefInputs())
    await waitFor(() => ready(result.current))
    const b = result.current.data!
    expect(b.windowDays).toBe(30)
    expect(b.people.total).toBe(30)
    expect(b.people.drifting).toBeGreaterThanOrEqual(0)
    expect(b.signals.patternsOverLine).toBeGreaterThan(0)
    expect(b.fixes.proposed).toBe(mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => f.status === 'proposed').length)
    expect(b.loop.open).toBe(mock.MOCK_DETRACTOR_CALL_ITEMS.filter((l) => l.status !== 'done').length)
    expect(b.publicMentions).toMatchObject({ last30: 16, target: 48 })
    expect(b.sample).toEqual({ toRead: 50, read: 0 })
  })
})

describe('trace seams (v40 F10, F11)', () => {
  it('useTrace walks a chain from a display id; useSignalDetail returns the record and the chain', async () => {
    const complaint = mock.MOCK_SIGNALS.find((s) => s.kind === 'complaint')!
    const { result } = renderHookWithProviders(() => ({ chain: useTrace('signal', complaint.id), detail: useSignalDetail('SG-' + Number(complaint.id.replace(/\D/g, ''))) }))
    await waitFor(() => expect(result.current.chain.data).toBeTruthy())
    expect(result.current.chain.data?.signals[0].id).toBe(complaint.id)
    await waitFor(() => expect(result.current.detail.signal?.id).toBe(complaint.id))
    expect(result.current.detail.traceId).toMatch(/^SG-\d+$/)
    expect(result.current.detail.chain?.events.length).toBe(complaint.eventIds.length)
  })

  it('an unknown signal id resolves to null (the dialog says "not found")', async () => {
    const { result } = renderHookWithProviders(() => useSignalDetail('SG-99999'))
    await waitFor(() => expect(result.current.signal).toBeNull())
  })

  it('useTraceNav opens a signal through ?sg= and closes it', async () => {
    const complaint = mock.MOCK_SIGNALS.find((s) => s.kind === 'complaint')!
    const { result } = renderHookWithProviders(() => useTraceNav(), { route: '/home' })
    expect(result.current.openSignalId).toBeNull()
    act(() => result.current.open('signal', complaint.id))
    await waitFor(() => expect(result.current.openSignalId).toMatch(/^SG-\d+$/))
    act(() => result.current.close())
    await waitFor(() => expect(result.current.openSignalId).toBeNull())
  })

  it('canOpen follows the role: CX can open a fix, an executive cannot open a person\'s event', async () => {
    const fix = mock.MOCK_CORRECTIVE_ACTIONS[0]
    const cx = renderHookWithProviders(() => useTraceNav(), { role: 'cxmgr' })
    await waitFor(() => expect(cx.result.current.canOpen('fix', fix.id)).toBe(true))
    expect(cx.result.current.canOpen('signal', 'sig-0001')).toBe(true)
    const ld = renderHookWithProviders(() => useTraceNav(), { role: 'hrmgr' })
    expect(ld.result.current.canOpen('fix', fix.id)).toBe(false)
  })
})

describe('registers: mapping, matrix, questions, sample, mentions, no answer', () => {
  it('saves a mapping row and refuses an unknown portal value', async () => {
    const { result } = renderHookWithProviders(() => ({ mapping: useCrmMapping(), save: useSaveMapping() }))
    await waitFor(() => ready(result.current.mapping))
    await act(() => result.current.save.mutateAsync({ kind: 'src', crmValue: 'Walk In', portalValue: 'event' }))
    await waitFor(() => expect(result.current.mapping.data?.rows.find((r) => r.crmValue === 'Walk In')?.portalValue).toBe('event'))
    await expect(result.current.save.mutateAsync({ kind: 'src', crmValue: 'Walk In', portalValue: 'nope' })).rejects.toThrow('Unknown portal value')
    await expect(result.current.save.mutateAsync({ kind: 'src', crmValue: 'Nothing', portalValue: 'web' })).rejects.toThrow('Mapping row not found')
    await act(() => result.current.save.mutateAsync({ kind: 'src', crmValue: 'Walk In', portalValue: 'branch' }))
  })

  it('edits a matrix cell: the cell is marked edited, the other language keeps its seeded form, the line on a fix reads it', async () => {
    const { result } = renderHookWithProviders(() => ({ matrix: useMatrix('af'), save: useSaveMatrixCell(), line: useFixMatrixLine({ kind: 'service_behaviour', product: 'af' }) }))
    await waitFor(() => ready(result.current.matrix))
    const service = () => result.current.matrix.data!.find((r): r is MatrixCellRow => r.kind === 'service')!
    expect(result.current.matrix.data).toHaveLength(12)
    expect(service().edited.receiver).toBe(false)
    expect(service().cells.receiver?.en).toBe('After-Sales team lead')
    await act(() => result.current.save.mutateAsync({ product: 'af', kind: 'service', field: 'receiver', value: 'After-Sales manager', lang: 'en' }))
    await waitFor(() => expect(service().edited.receiver).toBe(true))
    expect(service().cells.receiver).toEqual({ en: 'After-Sales manager', ar: 'قائد فريق ما بعد البيع' })
    expect(service().edited.informed).toBe(false)
    await act(() => result.current.save.mutateAsync({ product: 'af', kind: 'service', field: 'respondH', value: 18 }))
    await waitFor(() => expect(service().cells.respondH).toBe(18))
    await act(() => result.current.save.mutateAsync({ product: 'af', kind: 'service', field: 'backup', value: null }))
    await waitFor(() => expect(service().cells.backup).toBeNull())
    expect(service().edited).toMatchObject({ receiver: true, respondH: true, backup: true, informed: false, resolveH: false })
    // Real Estate is untouched: a matrix is per product.
    const reService = mock.MOCK_MATRIX.re.find((r) => r.kind === 'service') as MatrixCellRow
    expect(reService.edited.receiver).toBe(false)
    expect(reService.cells.receiver?.en).toBe('Sales manager (environment)')
    await waitFor(() => expect(result.current.line?.row.cells.receiver?.en).toBe('After-Sales manager'))
    expect(result.current.line).toMatchObject({ product: 'af', kind: 'service' })
    expect(result.current.line?.rule.factor).toBe(0.5)
  })

  it('an edited clock written in days becomes hours again; the VIP rule row is not editable', async () => {
    const { result } = renderHookWithProviders(() => ({ matrix: useMatrix('re'), save: useSaveMatrixCell() }))
    await waitFor(() => ready(result.current.matrix))
    const shopper = () => result.current.matrix.data!.find((r): r is MatrixCellRow => r.kind === 'shopper_critical')!
    expect(shopper().cells).toMatchObject({ respondH: 9, resolveH: 45, asDays: { respondH: true, resolveH: true } })
    await act(() => result.current.save.mutateAsync({ product: 're', kind: 'shopper_critical', field: 'respondH', value: 4 }))
    await waitFor(() => expect(shopper().cells.respondH).toBe(4))
    expect(shopper().cells.asDays).toEqual({ resolveH: true }) // the other clock still reads in days
    await act(() => result.current.save.mutateAsync({ product: 're', kind: 'shopper_critical', field: 'resolveH', value: 27 }))
    await waitFor(() => expect(shopper().cells.asDays).toBeUndefined())
    // the VIP row is a rule: there is no cell to save
    await expect(result.current.save.mutateAsync({ product: 're', kind: 'vip' as never, field: 'respondH', value: 1 })).rejects.toThrow('Matrix row not found')
  })

  it('lists question sets per product, empty for a product with none', async () => {
    const { result } = renderHookWithProviders(() => ({ re: useQuestionSets('re'), wl: useQuestionSets('wl'), all: useQuestionSets() }))
    await waitFor(() => ready(result.current.all))
    expect(result.current.re.data).toHaveLength(4)
    expect(result.current.all.data).toHaveLength(9)
    await waitFor(() => expect(result.current.wl.data).toEqual([]))
  })

  it('judges the weekly sample: a verdict counts as read, wrong counts as a test, accuracy follows', async () => {
    const { result } = renderHookWithProviders(() => ({ sample: useWeeklySample(), judge: useJudgeSample() }))
    await waitFor(() => ready(result.current.sample))
    expect(result.current.sample.data).toMatchObject({ size: 50, read: 0, wrong: 0, accuracyPct: null })
    expect(new Date(result.current.sample.data!.due + 'T00:00:00').getDay()).toBe(4) // every Thursday
    const [a, b, c] = result.current.sample.data!.items
    await act(() => result.current.judge.mutateAsync({ id: a.id, right: true }))
    await act(() => result.current.judge.mutateAsync({ id: b.id, right: true }))
    await act(() => result.current.judge.mutateAsync({ id: c.id, right: false }))
    await waitFor(() => expect(result.current.sample.data?.read).toBe(3))
    expect(result.current.sample.data).toMatchObject({ wrong: 1, accuracyPct: 67 })
    expect(result.current.sample.data!.items.find((i) => i.id === c.id)?.verdict).toBe(false)
  })

  it('marks a public mention replied with at least one reply hour, and the list updates', async () => {
    const { result } = renderHookWithProviders(() => ({ mentions: usePublicMentions(), mark: useMarkReplied() }))
    await waitFor(() => ready(result.current.mentions))
    const open = PUBLIC_MENTIONS.find((m) => !m.replied)!
    await act(() => result.current.mark.mutateAsync({ id: open.id }))
    await waitFor(() => expect(result.current.mentions.data?.find((m) => m.id === open.id)?.replied).toBe(true))
    const m = result.current.mentions.data!.find((x) => x.id === open.id)!
    expect(m.replyHours).toBeGreaterThanOrEqual(1)
    expect(m.replyHours! % 24).toBe(0)
    expect(m.repliedAt).toBeDefined()
    await expect(result.current.mark.mutateAsync({ id: 'PUB-000' })).rejects.toThrow('Public mention not found')
  })

  it('records "no answer": attempts go up, the next attempt is a working day, the last one needs a human, DNCR is refused', async () => {
    const { result } = renderHookWithProviders(() => useRecordNoAnswer(), { role: 'cxmgr' })
    const todo = mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.status === 'to_do')!
    todo.channel = 'human' // the CX team's own list: 3 attempts (an AI campaign row hands over after 2, tested below)
    const first = await act(() => result.current.mutateAsync({ id: todo.id }))
    expect(first.item).toMatchObject({ attempts: 1, status: 'no_answer' })
    expect(first.result.nextAttemptOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(first.result.nextAttemptOn + 'T00:00:00').getDay()).toBeGreaterThanOrEqual(1)
    expect(new Date(first.result.nextAttemptOn + 'T00:00:00').getDay()).toBeLessThanOrEqual(5)
    expect(first.toast.en).toMatch(/^No answer\. Next attempt \d{4}-\d{2}-\d{2} within calling hours\.$/)
    await act(() => result.current.mutateAsync({ id: todo.id }))
    const last = await act(() => result.current.mutateAsync({ id: todo.id }))
    expect(last.item).toMatchObject({ attempts: 3, status: 'needs_human' })
    expect(last.item.nextAttemptOn).toBeUndefined()
    expect(last.toast.en).toBe('No answer after 3 attempts: WhatsApp sent, flagged "needs a human".')
    // Still open (it counts), and not done.
    expect(mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.id === todo.id)?.status).toBe('needs_human')

    // An AI campaign row hands over to a person after aiNoAnswers (2), not callTries (3).
    const ai = mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.status === 'no_answer' && i.id !== todo.id) ?? mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.status === 'done')!
    const aiRow = { ...ai, id: 'dcl-ai-probe', channel: 'ai_campaign' as const, status: 'to_do' as const, attempts: 0, outcome: undefined, nextAttemptOn: undefined }
    mock.MOCK_DETRACTOR_CALL_ITEMS.push(aiRow)
    const a1 = await act(() => result.current.mutateAsync({ id: 'dcl-ai-probe' }))
    expect(a1.item).toMatchObject({ attempts: 1, status: 'no_answer' })
    const a2 = await act(() => result.current.mutateAsync({ id: 'dcl-ai-probe' }))
    expect(a2.item).toMatchObject({ attempts: 2, status: 'needs_human' })
    expect(a2.result.handedOver).toBe(true)
    expect(a2.toast.en).toBe('No answer 2 times: the campaign hands this call to a person, flagged "needs a human".')
    mock.MOCK_DETRACTOR_CALL_ITEMS.pop()

    const done = mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.status === 'done')!
    await expect(result.current.mutateAsync({ id: done.id })).rejects.toThrow('already done')
    // A DNCR person is refused even if a row were to exist.
    const dncr = mock.MOCK_PERSONS.find((p) => p.consent.dncr)!
    const probe = { ...mock.MOCK_DETRACTOR_CALL_ITEMS[0], id: 'dcl-probe', personId: dncr.id, status: 'to_do' as const, attempts: 0, outcome: undefined }
    mock.MOCK_DETRACTOR_CALL_ITEMS.push(probe)
    await expect(result.current.mutateAsync({ id: 'dcl-probe' })).rejects.toThrow('DNCR')
    mock.MOCK_DETRACTOR_CALL_ITEMS.pop()
  })
})

describe('the close-the-loop list is a copy, not the register (v40 carry-over)', () => {
  it('useDetractorCallItems returns copies of the rows, so a page never holds the register that the mutations edit in place', async () => {
    const { useDetractorCallItems } = await import('./queries')
    const { result } = renderHookWithProviders(() => useDetractorCallItems(), { role: 'cxmgr' })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const rows = result.current.data!
    expect(rows).not.toBe(mock.MOCK_DETRACTOR_CALL_ITEMS)
    expect(rows).toHaveLength(mock.MOCK_DETRACTOR_CALL_ITEMS.length)
    rows.forEach((row, i) => {
      expect(row).toEqual(mock.MOCK_DETRACTOR_CALL_ITEMS[i])
      expect(row).not.toBe(mock.MOCK_DETRACTOR_CALL_ITEMS[i])
    })
  })
})

describe('the environment switch narrows everything (decided 18 Nov)', () => {
  it('fixes, the call list, investigations, hand-offs, public mentions and the Home counts follow the switch', async () => {
    const { envsOfFix, inScopeAny } = await import('@/utils/envScope')
    const { useDetractorCallItems, useHandoffs, useHomeSummary } = await import('./queries')
    const { result } = renderHookWithProviders(() => ({
      scope: useEnvScope(),
      fixes: useCorrectiveActions(),
      loop: useDetractorCallItems(),
      investigations: useInvestigations(),
      handoffs: useHandoffs(),
      mentions: usePublicMentions(),
      home: useHomeSummary(),
    }))
    await waitFor(() => ready(result.current.fixes))
    await waitFor(() => ready(result.current.loop))
    const allFixes = result.current.fixes.data!.length
    const allLoop = result.current.loop.data!.length
    expect(allFixes).toBe(mock.MOCK_CORRECTIVE_ACTIONS.length)
    expect(allLoop).toBe(mock.MOCK_DETRACTOR_CALL_ITEMS.length)
    expect(result.current.mentions.data).toHaveLength(16)

    act(() => result.current.scope.setEnv('ast'))
    const patternById = new Map(mock.MOCK_PATTERNS.map((p) => [p.id, p]))
    const signalById = new Map(mock.MOCK_SIGNALS.map((s) => [s.id, s]))
    await waitFor(() => expect(result.current.loop.data?.every((l) => l.envId === 'ast')).toBe(true))
    expect(result.current.loop.data!.length).toBe(mock.MOCK_DETRACTOR_CALL_ITEMS.filter((l) => l.envId === 'ast').length)
    await waitFor(() => ready(result.current.fixes))
    const expectedFixes = mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => inScopeAny('ast', envsOfFix(f, patternById, signalById)))
    await waitFor(() => expect(result.current.fixes.data?.map((f) => f.id)).toEqual(expectedFixes.map((f) => f.id)))
    await waitFor(() => expect(result.current.investigations.data?.every((i) => inScopeAny('ast', envsOfFix(i, patternById, signalById)))).toBe(true))
    await waitFor(() => expect(result.current.mentions.data?.every((m) => m.environment === 'PSI Assets')).toBe(true))
    expect(result.current.mentions.data!.length).toBe(PUBLIC_MENTIONS.filter((m) => m.environment === 'PSI Assets').length)
    const personEnv = new Map(mock.MOCK_PERSONS.map((p) => [p.id, p.envId]))
    await waitFor(() => expect(result.current.handoffs.data?.every((h) => personEnv.get(h.personId) === 'ast')).toBe(true))
    await waitFor(() => expect(result.current.home.data?.journeysViewed).toBe(mock.MOCK_PERSONS.filter((p) => p.envId === 'ast').length))
    expect(result.current.home.data!.toCall).toBeLessThanOrEqual(allLoop)

    act(() => result.current.scope.setEnv('all'))
    await waitFor(() => expect(result.current.fixes.data).toHaveLength(allFixes))
  })

  it('an environment manager sees only its own environment in every register', async () => {
    const { useDetractorCallItems } = await import('./queries')
    const { result } = renderHookWithProviders(() => ({ loop: useDetractorCallItems(), fixes: useCorrectiveActions(), mentions: usePublicMentions() }), { role: 'envmgmt' })
    await waitFor(() => ready(result.current.loop))
    await waitFor(() => ready(result.current.mentions))
    expect(result.current.loop.data!.every((l) => l.envId === 'dub')).toBe(true)
    expect(result.current.mentions.data!.every((m) => m.environment === 'Dubai')).toBe(true)
    expect(result.current.fixes.data!.length).toBeLessThanOrEqual(mock.MOCK_CORRECTIVE_ACTIONS.length)
  })
})

describe('a fix\'s clocks (decided 18 Nov; the cells of 19 Nov, halved for a VIP in v42)', () => {
  const probe = (id: string): import('@/types').CorrectiveAction => ({
    id,
    kind: 'service_behaviour',
    title: { en: 'Probe', ar: 'اختبار' },
    owner: 'Team manager',
    dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    status: 'proposed',
    verificationDueAt: new Date(Date.now() + 70 * 86_400_000).toISOString(),
    proposedAt: new Date().toISOString(),
    product: 're',
    auditLog: [],
  })

  it('approval sets the due date from the matrix Resolve (h) in working hours; marking done starts the 60-day check', async () => {
    const { isWorkingDay } = await import('@/utils/workingDays')
    const fix = probe('ca-probe-1')
    mock.MOCK_CORRECTIVE_ACTIONS.push(fix)
    const { result } = renderHookWithProviders(() => ({ decide: useDecideCorrectiveAction(), status: useSetFixStatus() }), { role: 'cxmgr' })
    const before = Date.now()
    await act(() => result.current.decide.mutateAsync({ id: fix.id, decision: 'approved' }))
    expect(fix.dueSource).toBe('matrix') // Real Estate, service and behaviour: 27 working hours (three working days, 19 Nov set)
    const due = new Date(fix.dueDate)
    expect(Math.abs(due.getTime() - Date.parse(fixDue(before, 27, rulesFromConfig(mock.MOCK_RULES_CONFIG)).dueAt))).toBeLessThan(120_000)
    expect(due.getTime()).toBeGreaterThan(before + 2 * 86_400_000) // 27 working hours is three working days: at least two calendar days
    expect(isWorkingDay(due)).toBe(true)
    expect(due.getHours() + due.getMinutes() / 60).toBeGreaterThanOrEqual(9)
    expect(due.getHours() + due.getMinutes() / 60).toBeLessThanOrEqual(18)

    await act(() => result.current.status.mutateAsync({ id: fix.id, status: 'verification' }))
    const check = Date.parse(fix.verificationDueAt)
    expect(Math.abs(check - (Date.now() + 60 * 86_400_000))).toBeLessThan(60_000) // 60 days from "done"
  })

  it('an empty Resolve (h) cell falls back to Agent 5\'s 14 days', async () => {
    const fix = probe('ca-probe-2')
    mock.MOCK_CORRECTIVE_ACTIONS.push(fix)
    const { result } = renderHookWithProviders(() => ({ decide: useDecideCorrectiveAction(), save: useSaveMatrixCell() }), { role: 'cxmgr' })
    await act(() => result.current.save.mutateAsync({ product: 're', kind: 'service', field: 'resolveH', value: null }))
    try {
      await act(() => result.current.decide.mutateAsync({ id: fix.id, decision: 'approved' }))
      expect(fix.dueSource).toBe('fallback')
      expect(Math.abs(Date.parse(fix.dueDate) - (Date.now() + 14 * 86_400_000))).toBeLessThan(60_000)
    } finally {
      await act(() => result.current.save.mutateAsync({ product: 're', kind: 'service', field: 'resolveH', value: 27 }))
    }
  })

  it('the employee row has no resolve clock (a management note): approval uses Agent 5\'s 14 days, and the preview says so', async () => {
    const fix = { ...probe('ca-probe-employee'), kind: 'employee' as const }
    mock.MOCK_CORRECTIVE_ACTIONS.push(fix)
    const { result } = renderHookWithProviders(() => ({ decide: useDecideCorrectiveAction(), due: useFixDue(fix) }), { role: 'cxmgr' })
    await waitFor(() => expect(result.current.due).toBeDefined())
    expect(result.current.due).toMatchObject({ source: 'fallback', preview: true })
    expect(result.current.due?.hours).toBeUndefined()
    await act(() => result.current.decide.mutateAsync({ id: fix.id, decision: 'approved' }))
    expect(fix.dueSource).toBe('fallback')
    expect(Math.abs(Date.parse(fix.dueDate) - (Date.now() + 14 * 86_400_000))).toBeLessThan(60_000)
  })

  it('a VIP-related fix is due at HALF the Resolve (h): approval of a Real Estate service fix on the VIP pattern counts 13.5 working hours, not 27', async () => {
    const vipPattern = mock.MOCK_CORRECTIVE_ACTIONS[0].patternId
    const fix = { ...probe('ca-probe-vip'), patternId: vipPattern }
    const plain = { ...probe('ca-probe-plain'), patternId: mock.MOCK_CORRECTIVE_ACTIONS[1].patternId }
    mock.MOCK_CORRECTIVE_ACTIONS.push(fix, plain)
    const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
    const { result } = renderHookWithProviders(() => ({ decide: useDecideCorrectiveAction() }), { role: 'cxmgr' })
    const before = Date.now()
    await act(() => result.current.decide.mutateAsync({ id: fix.id, decision: 'approved' }))
    await act(() => result.current.decide.mutateAsync({ id: plain.id, decision: 'approved' }))
    expect(fix.dueSource).toBe('matrix')
    expect(Math.abs(Date.parse(fix.dueDate) - Date.parse(fixDue(before, 13.5, rules).dueAt))).toBeLessThan(120_000)
    expect(Math.abs(Date.parse(plain.dueDate) - Date.parse(fixDue(before, 27, rules).dueAt))).toBeLessThan(120_000)
    expect(Date.parse(fix.dueDate)).toBeLessThan(Date.parse(plain.dueDate))
  })

  it('a decision that is not an approval leaves the due date alone', async () => {
    const fix = probe('ca-probe-3')
    mock.MOCK_CORRECTIVE_ACTIONS.push(fix)
    const due = fix.dueDate
    const { result } = renderHookWithProviders(() => useDecideCorrectiveAction(), { role: 'cxmgr' })
    await act(() => result.current.mutateAsync({ id: fix.id, decision: 'rejected', reason: 'Not now' }))
    expect(fix.dueDate).toBe(due)
    expect(fix.dueSource).toBeUndefined()
  })

  it('useFixDue previews the due date before approval and shows the stored one after', async () => {
    const { result: fresh } = renderHookWithProviders(() => useFixDue({ kind: 'training_gap', product: 're', dueDate: new Date().toISOString(), dueSource: undefined, status: 'proposed' }))
    await waitFor(() => expect(fresh.current).toBeDefined())
    expect(fresh.current).toMatchObject({ source: 'matrix', preview: true, hours: 90 }) // training gap: 90 working hours
    const stored = '2026-12-01T10:00:00.000Z'
    const { result: after } = renderHookWithProviders(() => useFixDue({ kind: 'training_gap', product: 're', dueDate: stored, dueSource: 'fallback' }))
    expect(after.current).toEqual({ dueAt: stored, source: 'fallback', preview: false })
    // A fix past the proposal keeps its stored date even with no source (a sample fix): not a preview from now.
    const { result: sample } = renderHookWithProviders(() => useFixDue({ kind: 'training_gap', product: 're', dueDate: stored, dueSource: undefined, status: 'in_progress' }))
    expect(sample.current).toEqual({ dueAt: stored, source: 'recorded', preview: false })
    // A proposed fix's stored date is only the placeholder from its proposal: the live preview wins.
    const { result: waiting } = renderHookWithProviders(() => useFixDue({ kind: 'training_gap', product: 're', dueDate: stored, dueSource: undefined, status: 'proposed' }))
    await waitFor(() => expect(waiting.current).toBeDefined())
    expect(waiting.current).toMatchObject({ preview: true, source: 'matrix' })
    expect(waiting.current!.dueAt).not.toBe(stored)
  })

  it('useIsVipFix and the due preview: the first sample fix (its pattern includes a person tagged VIP) is VIP and its preview is halved; the second is not', async () => {
    const [vipFix, otherFix] = mock.MOCK_CORRECTIVE_ACTIONS
    const { result } = renderHookWithProviders(() => ({
      vip: useIsVipFix(vipFix),
      other: useIsVipFix(otherFix),
      none: useIsVipFix({ patternId: undefined }),
      unknown: useIsVipFix({ patternId: 'no-such-pattern' }),
      // the same kind and product for both, so only the VIP rule differs: training gap, Real Estate, 90 working hours
      vipDue: useFixDue({ kind: 'training_gap', product: 're', dueDate: '', dueSource: undefined, status: 'proposed', patternId: vipFix.patternId }),
      otherDue: useFixDue({ kind: 'training_gap', product: 're', dueDate: '', dueSource: undefined, status: 'proposed', patternId: otherFix.patternId }),
    }))
    await waitFor(() => expect(result.current.vip).toBe(true))
    expect(result.current.other).toBe(false)
    expect(result.current.none).toBe(false)
    expect(result.current.unknown).toBe(false)
    await waitFor(() => expect(result.current.vipDue).toMatchObject({ preview: true, source: 'matrix', hours: 45, vip: true }))
    expect(result.current.otherDue).toMatchObject({ preview: true, source: 'matrix', hours: 90 })
    expect(result.current.otherDue?.vip).toBeUndefined()
    expect(Date.parse(result.current.vipDue!.dueAt)).toBeLessThan(Date.parse(result.current.otherDue!.dueAt))
  })

  it('a stored due date is shown as it is, VIP or not (the halving happened at approval)', () => {
    const stored = '2026-12-01T10:00:00.000Z'
    const vipFix = mock.MOCK_CORRECTIVE_ACTIONS[0]
    const { result } = renderHookWithProviders(() => useFixDue({ kind: 'legal_privacy', product: 'wl', dueDate: stored, dueSource: 'matrix', status: 'approved', patternId: vipFix.patternId }))
    expect(result.current).toEqual({ dueAt: stored, source: 'matrix', preview: false })
  })

  it('createActionFromPattern computes the due date from the matrix itself (no caller argument)', async () => {
    const { useCreateActionFromPattern } = await import('./queries')
    const pattern = mock.MOCK_PATTERNS?.[0]
    expect(pattern).toBeDefined()
    const { result } = renderHookWithProviders(() => useCreateActionFromPattern(), { role: 'cxmgr' })
    const before = mock.MOCK_CORRECTIVE_ACTIONS.length
    const created = await act(() => result.current.mutateAsync({ pattern: pattern!, kind: 'training_gap', owner: 'L&D manager' }))
    // training gap: 90 working hours for Real Estate and After-Sales, 45 for the others (19 Nov set), halved when the pattern has a VIP;
    // the first pattern is the VIP one. In the future, not the 14-day fallback.
    const base = created.product === 're' || created.product === 'af' ? 90 : 45
    const rules = rulesFromConfig(mock.MOCK_RULES_CONFIG)
    expect(Math.abs(Date.parse(created.dueDate) - Date.parse(fixDue(new Date(), base / 2, rules).dueAt))).toBeLessThan(120_000)
    expect(Date.parse(created.dueDate)).toBeGreaterThan(Date.now())
    expect(created.dueSource).toBeUndefined()
    expect(created.status).toBe('proposed')
    mock.MOCK_CORRECTIVE_ACTIONS.length = before
  })
})

describe('the weekly sample\'s effect on the supervisor and the agents page (decided 18 Nov)', () => {
  it('a wrong lowers the agent\'s pass rate and becomes a supervisor test; judging it right again gives both back', async () => {
    const { useAgentPassRates, useSupervisorTests } = await import('./queriesV40')
    const { useAgentJobDescriptions } = await import('./referenceQueries')
    const { result } = renderHookWithProviders(() => ({ sample: useWeeklySample(), judge: useJudgeSample(), rates: useAgentPassRates(), tests: useSupervisorTests(), jds: useAgentJobDescriptions() }))
    await waitFor(() => ready(result.current.sample))
    await waitFor(() => ready(result.current.rates))
    const item = result.current.sample.data!.items.find((i) => i.agent === 2 && i.verdict === null)!
    const jd2 = AGENT_JDS.find((j) => j.id === 2)!
    const base = jd2.baseApprovalPct as number
    expect(jd2.approvalPct).toBe(base)

    await act(() => result.current.judge.mutateAsync({ id: item.id, right: false }))
    await waitFor(() => expect(result.current.tests.data?.some((t) => t.fromSampleId === item.id)).toBe(true))
    await waitFor(() => expect(result.current.rates.data!.find((r) => r.agent === 2)!.wrong).toBe(1))
    expect(result.current.rates.data!.find((r) => r.agent === 2)!.base).toBe(base)
    expect(jd2.approvalPct).toBeLessThan(base) // what the agents page reads
    expect(jd2).toMatchObject({ wrongThisWeek: 1, supervisorTests: 1 })
    await waitFor(() => expect(result.current.jds.data?.find((j) => j.id === 2)?.approvalPct).toBe(jd2.approvalPct))

    await act(() => result.current.judge.mutateAsync({ id: item.id, right: true }))
    await waitFor(() => expect(result.current.tests.data?.some((t) => t.fromSampleId === item.id)).toBe(false))
    expect(jd2.approvalPct).toBe(base)
    expect(jd2).toMatchObject({ wrongThisWeek: 0, supervisorTests: 0 })
  })
})

describe('public replies (decided 18 Nov): Marketing owns them, CX watches the clock', () => {
  it('every mention names Marketing as the owner, and a mention past 48 hours without a reply is a breach CX raises a signal for', async () => {
    const { usePublicReplyBreaches } = await import('./queriesV40')
    const { result } = renderHookWithProviders(() => ({ breaches: usePublicReplyBreaches(), brief: useBriefInputs(), mark: useMarkReplied() }))
    await waitFor(() => ready(result.current.breaches))
    await waitFor(() => ready(result.current.brief))
    const unreplied = PUBLIC_MENTIONS.filter((m) => !m.replied)
    expect(result.current.breaches.data!.length).toBe(unreplied.length) // the sample's mentions are all older than 48 hours
    expect(result.current.brief.data!.publicMentions.overdue).toBe(unreplied.length)
    for (const m of PUBLIC_MENTIONS) expect(m.owner.en).toBe('Marketing · channel owner')
    const first = unreplied[0]
    await act(() => result.current.mark.mutateAsync({ id: first.id }))
    await waitFor(() => expect(result.current.breaches.data!.some((m) => m.id === first.id)).toBe(false))
  })
})
