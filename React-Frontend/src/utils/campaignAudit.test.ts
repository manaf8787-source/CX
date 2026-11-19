import { describe, expect, it } from 'vitest'
import * as mock from '@/services/mockData'
import { PRODUCTS } from '@/data/products'
import { ROLE_DEFS } from '@/data/roles'
import { buildAuditCampaigns, CHECK_IDS } from '@/data/campaignAudit'
import { createCampaignAuditStore } from '@/services/mockCampaignAudit'
import { canAccessPath } from '@/auth/access'
import type { BriefInputs, DetractorCallItem, IndicatorSet, RoleId } from '@/types'
import { buildBrief, campaignsLine } from './brief'
import { buildInbox, visibleFixes, workTodayStats } from './inbox'
import { campaignAuditInboxItems, defaultCampaignId, startBlock, summariseCampaignAudit, targetingSignals } from './campaignAudit'

const store = () => createCampaignAuditStore(() => buildAuditCampaigns(mock.MOCK_PERSONAS, mock.MOCK_AI_CAMPAIGNS))
const views = () => store().list()

describe('campaign audit counts (v42.1 F33)', () => {
  it('counts what waits, runs and finished in the sample: 2 waiting, 3 running (71% each), 2 finished, 4 targeting signals', () => {
    const s = summariseCampaignAudit(views())
    expect(s).toEqual({ waiting: 2, sentBack: 0, running: 3, finished: 2, signals: 4, runningReachedPct: [71, 71, 71] })
  })

  it('a campaign sent back no longer waits on the audit lead; it counts as sent back', () => {
    const st = store()
    st.setCheck({ id: 'MC-103', check: 'money', value: false, by: 'auditmkt' })
    st.setVerdict({ id: 'MC-103', verdict: 'back', by: 'auditmkt' })
    expect(summariseCampaignAudit(st.list())).toMatchObject({ waiting: 1, sentBack: 1 })
  })

  it('a cleared campaign leaves the waiting count; starting and finishing it moves the other counts', () => {
    const st = store()
    CHECK_IDS.forEach((check) => st.setCheck({ id: 'MC-103', check, value: true, by: 'auditmkt' }))
    st.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' })
    expect(summariseCampaignAudit(st.list())).toMatchObject({ waiting: 1, running: 3 })
    st.start({ id: 'MC-103', by: 'marketing' })
    expect(summariseCampaignAudit(st.list())).toMatchObject({ waiting: 1, running: 4, finished: 2 })
    st.finish({ id: 'MC-103', by: 'marketing' })
    expect(summariseCampaignAudit(st.list())).toMatchObject({ running: 3, finished: 3 })
  })

  it('raises a targeting signal for each run under 80%: the running campaigns at 71% and MC-106 at 78%, not MC-105 at 86%', () => {
    const signals = targetingSignals(views())
    expect(signals.map((s) => s.campaignId).sort()).toEqual(['MC-101', 'MC-102', 'MC-106', 'camp-ai-1'])
    expect(signals.find((s) => s.campaignId === 'MC-106')?.reachedPct).toBe(78)
    expect(targetingSignals(views().filter((c) => c.id === 'MC-105'))).toEqual([])
    // a campaign that did not run has no result and no signal
    expect(targetingSignals(views().filter((c) => c.stage === 'before'))).toEqual([])
  })

  it('gates a start on the verdict only for a campaign that has not started', () => {
    const list = views()
    expect(startBlock(list.find((c) => c.id === 'MC-103')!)).toBe('waiting')
    expect(startBlock(list.find((c) => c.id === 'MC-101')!)).toBeNull()
    expect(startBlock({ stage: 'before', clearance: 'cleared' })).toBeNull()
    expect(startBlock({ stage: 'before', clearance: 'sent_back' })).toBe('sent_back')
  })

  it('opens the page on the first campaign waiting for clearance for an editor, the first of the list for a reader', () => {
    expect(defaultCampaignId(views(), true)).toBe('MC-103')
    expect(defaultCampaignId(views(), false)).toBe('MC-101')
    expect(defaultCampaignId([], true)).toBeUndefined()
    const st = store()
    CHECK_IDS.forEach((check) => st.setCheck({ id: 'MC-103', check, value: true, by: 'auditmkt' }))
    st.setVerdict({ id: 'MC-103', verdict: 'ok', by: 'auditmkt' })
    expect(defaultCampaignId(st.list(), true)).toBe('MC-104')
  })
})

describe('the inbox of the Internal Audit and Marketing Lead (v42.1 F33)', () => {
  it('"Clear or send back": urgent, two working days, with the Marketing manager, opens the page', () => {
    const [item] = campaignAuditInboxItems('auditmkt', { waiting: 2, finished: 0 })
    expect(item).toMatchObject({ kind: 'caud', priority: 2, daysLeft: 2, unit: 'wd', target: '/settings/campaign-audit', who: { en: 'Marketing manager', ar: 'مدير التسويق' } })
    expect(item.text.en).toBe('Clear or send back: 2 campaigns waiting before they run')
    expect(item.text.ar).toBe('إجازة أو إعادة: حملتان تنتظران قبل التشغيل')
  })

  it('"Audit after the run": normal, five working days, nobody, opens the page', () => {
    const [item] = campaignAuditInboxItems('auditmkt', { waiting: 0, finished: 2 })
    expect(item).toMatchObject({ kind: 'caud2', priority: 0, daysLeft: 5, unit: 'wd', target: '/settings/campaign-audit', who: null })
    expect(item.text.en).toBe('Audit after the run: 2 finished campaigns')
  })

  it('lists a row only when it has something to count, and only for the audit lead', () => {
    expect(campaignAuditInboxItems('auditmkt', { waiting: 0, finished: 0 })).toEqual([])
    expect(campaignAuditInboxItems('auditmkt', undefined)).toEqual([])
    for (const r of ROLE_DEFS.filter((d) => d.id !== 'auditmkt')) expect(campaignAuditInboxItems(r.id, { waiting: 2, finished: 2 }), r.id).toEqual([])
  })

  it('the rows reach the inbox in the order urgent, weekly sample, after the run, and count in "Your work today"', () => {
    const items = buildInbox({
      role: 'auditmkt',
      today: new Date('2026-11-19T09:00:00'),
      fixes: [],
      patterns: [],
      loopItems: [] as DetractorCallItem[],
      investigations: [],
      campaigns: [],
      persons: [],
      campaignAudit: { waiting: 2, finished: 2 },
    })
    expect(items.map((i) => i.kind)).toEqual(['caud', 'sample', 'caud2'])
    expect(items.map((i) => i.priority)).toEqual([2, 1, 0])
    expect(workTodayStats(items)).toEqual({ total: 3, urgent: 2 })
    // every target opens a page the role may open
    for (const i of items) expect(canAccessPath('auditmkt', i.target.split('?')[0]), i.id).toBe(true)
  })

  it('no other role gets the rows, even when the input carries them', () => {
    for (const r of ROLE_DEFS) {
      if (r.id === 'auditmkt') continue
      const items = buildInbox({ role: r.id, today: new Date('2026-11-19T09:00:00'), fixes: [], patterns: [], loopItems: [], investigations: [], campaigns: [], persons: [], campaignAudit: { waiting: 2, finished: 2 } })
      expect(items.some((i) => i.kind === 'caud' || i.kind === 'caud2'), r.id).toBe(false)
    }
  })

  it('without the audit input (loading) the inbox keeps its old rows', () => {
    const items = buildInbox({ role: 'auditmkt', today: new Date('2026-11-19T09:00:00'), fixes: [], patterns: [], loopItems: [], investigations: [], campaigns: [], persons: [] })
    expect(items.map((i) => i.kind)).toEqual(['sample'])
  })
})

const INPUTS: BriefInputs = {
  windowDays: 30,
  signals: { inWindow: 42, patternsOverLine: 4, patternsWaitingForFix: 3 },
  fixes: { proposed: 2, inProgress: 3, late: 1, effective: 1, failed: 1 },
  shopper: { open: 2, late: 1 },
  loop: { open: 4, critical: 1, recoveredByPhonePct: 55, recoveredByAiPct: 40 },
  people: { drifting: 6, total: 30 },
  publicMentions: { last30: 16, overdue: 2, negativePct: 38, avgReplyHours: 61, target: 48 },
  ldFixes: 2,
  conductNotes: 1,
  sample: { toRead: 50, read: 0 },
  campaigns: { waiting: 2, runningReachedPct: [71, 71, 71] },
}
const INDICATORS: IndicatorSet[] = [
  { productId: 're', nps: 32, csat: 78, ces: 71, answers: 120, deltaVsLastMonth: 3 },
  { productId: 'af', nps: -5, csat: 70, ces: 66, answers: 80, deltaVsLastMonth: -2 },
]
const brief = (role: RoleId, inputs: BriefInputs = INPUTS) => buildBrief({ role, inputs, indicators: INDICATORS, products: PRODUCTS })

describe('the daily brief of the Internal Audit and Marketing Lead (v42.1 F33)', () => {
  it('says how many campaigns wait for clearance and how much of the right people the running ones reached', () => {
    const line = brief('auditmkt').find((l) => l.kind === 'campaigns')!
    expect(line.text.en).toBe('2 campaigns wait for your clearance; 3 running, 71%, 71% and 71% reached the right people so far')
    expect(line.text.ar).toBe('تنتظر حملتان إجازتك؛ 3 تعمل، وصلت للأشخاص الصحيحين 71%، 71% و71% حتى الآن')
  })

  it('opens the campaign audit page and sits after the NPS lines', () => {
    const lines = brief('auditmkt')
    expect(lines.find((l) => l.kind === 'campaigns')?.to).toBe('/settings/campaign-audit')
    expect(lines.map((l) => l.kind)).toEqual(['nps', 'nps', 'campaigns', 'drifting', 'public', 'sample'])
  })

  it('agrees in number and says an empty side in words', () => {
    expect(campaignsLine({ waiting: 1, runningReachedPct: [71] })?.en).toBe('1 campaign waits for your clearance; 1 running, 71% reached the right people so far')
    expect(campaignsLine({ waiting: 1, runningReachedPct: [71] })?.ar).toBe('تنتظر حملة واحدة إجازتك؛ 1 تعمل، وصلت للأشخاص الصحيحين 71% حتى الآن')
    expect(campaignsLine({ waiting: 2, runningReachedPct: [71, 78] })?.en).toBe('2 campaigns wait for your clearance; 2 running, 71% and 78% reached the right people so far')
    expect(campaignsLine({ waiting: 0, runningReachedPct: [86] })?.en).toBe('No campaign waits for your clearance; 1 running, 86% reached the right people so far')
    expect(campaignsLine({ waiting: 3, runningReachedPct: [] })?.en).toBe('3 campaigns wait for your clearance; none running')
    expect(campaignsLine({ waiting: 3, runningReachedPct: [] })?.ar).toBe('تنتظر 3 حملات إجازتك؛ لا حملة تعمل')
  })

  it('writes no line when nothing waits and nothing runs, and none without the audit input', () => {
    expect(campaignsLine({ waiting: 0, runningReachedPct: [] })).toBeNull()
    expect(brief('auditmkt', { ...INPUTS, campaigns: { waiting: 0, runningReachedPct: [] } }).some((l) => l.kind === 'campaigns')).toBe(false)
    const { campaigns: _drop, ...without } = INPUTS
    expect(brief('auditmkt', without).some((l) => l.kind === 'campaigns')).toBe(false)
  })

  it('no other role has the line', () => {
    for (const r of ROLE_DEFS) {
      if (r.id === 'auditmkt') continue
      expect(brief(r.id).some((l) => l.kind === 'campaigns'), r.id).toBe(false)
    }
  })
})

describe('the audit role never approves a fix (Decision 2): nothing to approve in its inbox', () => {
  it('a fix waiting for a yes is on the responsible manager, not on the Internal Audit and Marketing Lead', () => {
    const proposed = mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => f.status === 'proposed')
    expect(proposed.length).toBeGreaterThan(0)
    expect(visibleFixes(mock.MOCK_CORRECTIVE_ACTIONS, mock.MOCK_PATTERNS, 'auditmkt')).toEqual([])
    const base = { today: new Date('2026-11-19T09:00:00'), fixes: mock.MOCK_CORRECTIVE_ACTIONS, patterns: mock.MOCK_PATTERNS, loopItems: [], investigations: [], campaigns: [], persons: [] }
    const audit = buildInbox({ ...base, role: 'auditmkt' })
    expect(audit.some((i) => i.kind === 'approve' || i.kind === 'do' || i.kind === 'verify')).toBe(false)
    // the CX manager's inbox holds the approvals, so the decision has an owner
    expect(buildInbox({ ...base, role: 'cxmgr' }).some((i) => i.kind === 'approve')).toBe(true)
  })
})
