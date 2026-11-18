import { describe, expect, it } from 'vitest'
import type { CorrectiveAction, DetractorCallItem, Investigation, Pattern, Person } from '@/types'
import * as mock from '@/services/mockData'
import { DEFAULT_RULES_BAG } from './ruleValues'
import { buildInbox, dayChipLabel, dayChipState, visibleFixes, workTodayStats, type InboxInput } from './inbox'

// Tuesday 17 Nov 2026, midday. The default week is Monday to Friday.
const TODAY = new Date(2026, 10, 17, 12, 0)
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0).toISOString()

function fix(over: Partial<CorrectiveAction> = {}): CorrectiveAction {
  return {
    id: 'ca-1',
    kind: 'service_behaviour',
    title: { en: 'Address slow response in Dubai team', ar: 'معالجة' },
    owner: 'Team manager',
    dueDate: iso(2026, 11, 30),
    status: 'proposed',
    verificationDueAt: iso(2027, 1, 20),
    proposedAt: iso(2026, 11, 13),
    product: 're',
    auditLog: [],
    ...over,
  }
}
function loop(over: Partial<DetractorCallItem> = {}): DetractorCallItem {
  return { id: 'dcl-1', personId: 'p-001', product: 're', environment: 'Dubai', envId: 'dub', severity: 'medium', firstScore: 3, channel: 'human', instrument: 'nps', attempts: 0, status: 'to_do', dueOn: '2026-11-20', ...over }
}
const person = (id: string, dncr = false): Person => ({ ...mock.MOCK_PERSONS[0], id, name: `Sample ${id}`, consent: { dncr, whatsapp: true, sms: true, email: true } })
const pattern = (id: string, team: string): Pattern => ({ ...mock.MOCK_PATTERNS[0], id, team })

function input(over: Partial<InboxInput> = {}): InboxInput {
  return { role: 'cxmgr', today: TODAY, rules: DEFAULT_RULES_BAG, fixes: [], patterns: [], loopItems: [], investigations: [], campaigns: [], persons: [person('p-001')], ...over }
}

describe('My inbox (v40 F20)', () => {
  it('approve: the 5-working-day window minus the working days since the proposal; urgent at one day or less', () => {
    // Proposed Friday 13: Mon 16 and Tue 17 are two working days, so three are left.
    const [a] = buildInbox(input({ fixes: [fix()] }))
    expect(a).toMatchObject({ kind: 'approve', daysLeft: 3, unit: 'wd', priority: 1, target: '/actions/corrective?fix=CA-201' })
    expect(a.text.en).toBe('Approve, change, reject or investigate: Address slow response in Dubai team')
    // Proposed Tuesday 10: five working days gone, none left.
    expect(buildInbox(input({ fixes: [fix({ proposedAt: iso(2026, 11, 10) })] }))[0]).toMatchObject({ daysLeft: 0, priority: 2 })
    // Late is negative.
    expect(buildInbox(input({ fixes: [fix({ proposedAt: iso(2026, 11, 3) })] }))[0].daysLeft).toBe(-5) // ten working days gone, five allowed
    // The window is a rule.
    expect(buildInbox(input({ fixes: [fix()], rules: { ...DEFAULT_RULES_BAG, approveDays: 10 } }))[0].daysLeft).toBe(8)
  })

  it('truncates a long fix title to 80 characters', () => {
    const long = 'x'.repeat(120)
    const text = buildInbox(input({ fixes: [fix({ title: { en: long, ar: long } })] }))[0].text.en
    expect(text.length).toBeLessThan('Approve, change, reject or investigate: '.length + 81)
    expect(text.endsWith('…')).toBe(true)
  })

  it('do: calendar days to the due date; priority 2 when late, 1 within three days, else 0', () => {
    const at = (due: string) => buildInbox(input({ fixes: [fix({ status: 'in_progress', dueDate: due })] }))[0]
    expect(at(iso(2026, 11, 16))).toMatchObject({ kind: 'do', daysLeft: -1, unit: 'd', priority: 2 })
    expect(at(iso(2026, 11, 20))).toMatchObject({ daysLeft: 3, priority: 1 })
    expect(at(iso(2026, 11, 30))).toMatchObject({ daysLeft: 13, priority: 0 })
    expect(at(iso(2026, 11, 30)).text.en).toBe('Do the fix and mark it done: Address slow response in Dubai team')
  })

  it('verify: the 60-day check date, with Agent 6, priority 0', () => {
    const [v] = buildInbox(input({ fixes: [fix({ status: 'verification', verificationDueAt: iso(2026, 11, 27) })] }))
    expect(v).toMatchObject({ kind: 'verify', daysLeft: 10, unit: 'd', priority: 0 })
    expect(v.text.en).toBe('60-day check runs on 2026-11-27')
    expect(v.who?.en).toBe('Agent 6')
  })

  it('closed fixes (effective, partial, failed) are not on anyone', () => {
    for (const status of ['effective', 'partial', 'failed'] as const) expect(buildInbox(input({ fixes: [fix({ status })] }))).toEqual([])
  })

  it('call: critical first, never a done row, never a DNCR person; names appear for CX roles', () => {
    const items = buildInbox(
      input({
        persons: [person('p-001'), person('p-002'), person('p-003', true)],
        loopItems: [
          loop({ id: 'dcl-1', personId: 'p-001' }),
          loop({ id: 'dcl-2', personId: 'p-002', severity: 'critical', nextAttemptOn: '2026-11-18', attempts: 1, status: 'no_answer' }),
          loop({ id: 'dcl-3', personId: 'p-003' }),
          loop({ id: 'dcl-4', personId: 'p-001', status: 'done' }),
        ],
      }),
    )
    expect(items.map((i) => i.id)).toEqual(['call:dcl-2', 'call:dcl-1'])
    expect(items[0]).toMatchObject({ kind: 'call', priority: 2, critical: true, daysLeft: 1, unit: 'wd' })
    expect(items[0].text.en).toBe('Critical · Call Sample p-002 · NPS 3')
    expect(items[1].who?.en).toBe('CX team')
    expect(items.some((i) => i.text.en.includes('p-003'))).toBe(false)
  })

  it('call: a row past its date is priority 1; an AI campaign member names the campaign', () => {
    const [i] = buildInbox(input({ loopItems: [loop({ id: 'dcl-9', channel: 'ai_campaign', dueOn: '2026-11-12' })], campaigns: [{ id: 'camp-ai-1', name: { en: 'x', ar: 'x' }, segmentDescription: { en: 'x', ar: 'x' }, script: { en: 'x', ar: 'x' }, status: 'running', memberIds: ['dcl-9'] }] }))
    expect(i).toMatchObject({ priority: 1 })
    expect(i.daysLeft).toBeLessThan(0)
    expect(i.who?.en).toBe('AI campaign camp-ai-1')
  })

  it('investigations: open ones only, CX only, no date, with Agent 8', () => {
    const inv: Investigation[] = [
      { id: 'inv-1', kind: 'customer_interviews', requestedCount: 6, doneCount: 4, status: 'in_progress' },
      { id: 'inv-2', kind: 'mystery_shopper_check', status: 'requested' },
      { id: 'inv-3', kind: 'customer_interviews', requestedCount: 5, status: 'returned' },
    ]
    const items = buildInbox(input({ investigations: inv }))
    expect(items.map((i) => i.text.en)).toEqual(['Investigation open: INV-1 · 4/6 interviews', 'Investigation open: INV-2 · shopper check'])
    expect(items.every((i) => i.daysLeft === null && i.who?.en === 'Agent 8')).toBe(true)
    expect(buildInbox(input({ role: 'envmgmt', investigations: inv }))).toEqual([])
  })

  it('the weekly sample is on the Internal Audit and Marketing Lead only, due Thursday', () => {
    const items = buildInbox(input({ role: 'auditmkt', sampleRead: 0, sampleSize: 50 }))
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'sample', daysLeft: 2, priority: 1, target: '/settings/weekly-sample', who: null })
    expect(items[0].text.en).toBe('Weekly sample: 50 outputs to read, 0 read')
    expect(buildInbox(input({ role: 'cxmgr' })).some((i) => i.kind === 'sample')).toBe(false)
  })

  it('orders by priority, then fewest days left, items without a date last', () => {
    const items = buildInbox(
      input({
        fixes: [fix({ id: 'ca-1' }), fix({ id: 'ca-2', status: 'in_progress', dueDate: iso(2026, 11, 16) }), fix({ id: 'ca-3', status: 'verification', verificationDueAt: iso(2026, 11, 27) })],
        investigations: [{ id: 'inv-1', kind: 'mystery_shopper_check', status: 'requested' }],
      }),
    )
    expect(items.map((i) => i.id)).toEqual(['do:ca-2', 'approve:ca-1', 'verify:ca-3', 'inv:inv-1'])
    expect(workTodayStats(items)).toEqual({ total: 4, urgent: 2 })
  })

  it('shows each role only its own items', () => {
    const fixes = [fix({ id: 'ca-1', kind: 'training_gap', patternId: 'p-dub' }), fix({ id: 'ca-2', kind: 'process', patternId: 'p-auh' })]
    const patterns = [pattern('p-dub', 'Dubai team'), pattern('p-auh', 'Abu Dhabi team')]
    const run = (role: InboxInput['role'], roleEnvironment?: string) => buildInbox(input({ role, fixes, patterns, roleEnvironment, loopItems: [loop()], investigations: [{ id: 'inv-1', kind: 'mystery_shopper_check', status: 'requested' }] })).map((i) => i.id).sort()
    expect(run('cxmgr')).toEqual(['approve:ca-1', 'approve:ca-2', 'call:dcl-1', 'inv:inv-1'])
    expect(run('ld')).toEqual(['approve:ca-1']) // training gap only
    expect(run('envmgmt', 'Dubai')).toEqual(['approve:ca-1']) // its own environment, no loop, no investigations
    expect(run('teamlead')).toEqual(['approve:ca-1', 'approve:ca-2'])
    for (const role of ['hrmgr', 'shopper', 'auditmkt', 'marketing'] as const) expect(run(role), role).toEqual(role === 'auditmkt' ? ['sample:week'] : [])
  })

  it('visibleFixes follows the Actions rules', () => {
    const fixes = [fix({ id: 'a', kind: 'training_gap' }), fix({ id: 'b', kind: 'process' })]
    expect(visibleFixes(fixes, [], 'cxteam').map((f) => f.id)).toEqual(['a', 'b'])
    expect(visibleFixes(fixes, [], 'ld').map((f) => f.id)).toEqual(['a'])
    expect(visibleFixes(fixes, [], 'hrmgr')).toEqual([])
  })

  it('works on the seeded sample: sorted, every item has a target and a bilingual text', () => {
    const items = buildInbox({
      role: 'cxmgr',
      today: new Date(),
      fixes: mock.MOCK_CORRECTIVE_ACTIONS,
      patterns: mock.MOCK_PATTERNS,
      loopItems: mock.MOCK_DETRACTOR_CALL_ITEMS,
      investigations: mock.MOCK_INVESTIGATIONS,
      campaigns: mock.MOCK_AI_CAMPAIGNS,
      persons: mock.MOCK_PERSONS,
    })
    expect(items.length).toBeGreaterThan(3)
    for (let i = 1; i < items.length; i++) expect(items[i - 1].priority).toBeGreaterThanOrEqual(items[i].priority)
    for (const it of items) {
      expect(it.target.startsWith('/')).toBe(true)
      expect(it.text.ar).toMatch(/[؀-ۿ]/)
    }
    // A DNCR person is never callable.
    const dncr = new Set(mock.MOCK_PERSONS.filter((p) => p.consent.dncr).map((p) => p.name))
    for (const it of items.filter((x) => x.kind === 'call')) for (const name of dncr) expect(it.text.en).not.toContain(name)
  })
})

describe('day chip (v40 F20, S7)', () => {
  it('overdue past 30 days, then late, today, one day left (warn), then neutral', () => {
    expect(dayChipState(-31)).toBe('overdue')
    expect(dayChipState(-30)).toBe('late')
    expect(dayChipState(-1)).toBe('late')
    expect(dayChipState(0)).toBe('today')
    expect(dayChipState(1)).toBe('soon')
    expect(dayChipState(2)).toBe('ok')
    expect(dayChipState(null)).toBe('none')
  })

  it('says it in both languages, with working days or days', () => {
    expect(dayChipLabel(-31, 'wd')?.en).toBe('overdue')
    expect(dayChipLabel(-3, 'wd')?.en).toBe('3 working days late')
    expect(dayChipLabel(-3, 'd')?.en).toBe('3 days late')
    expect(dayChipLabel(0, 'd')?.en).toBe('today')
    expect(dayChipLabel(4, 'wd')?.en).toBe('4 working days left')
    expect(dayChipLabel(4, 'd')?.ar).toBe('متبقٍ 4 يوم')
    expect(dayChipLabel(null, 'd')).toBeNull()
  })
})
