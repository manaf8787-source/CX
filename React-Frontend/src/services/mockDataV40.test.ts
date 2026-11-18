import { describe, expect, it } from 'vitest'
import * as mock from './mockData'
import { buildWeeklySample, seedAuditLog, seedCallAttempts } from './mockDataV40'
import { ENV_IDS, ENVIRONMENTS, envIdFromShort, envName, envNameFromShort, inEnvScope } from '@/data/environments'
import { buildFeeds, feedsInScope, lateFeedsLabel, summariseFeeds } from '@/data/feeds'
import { CRM_MAPPING_OPTIONS, CRM_MAPPING_ROWS, mappingCounts } from '@/data/crmMapping'
import * as escalation from '@/data/escalationDefaults'
import { MATRIX_KEY_BY_FIX_KIND, MATRIX_KINDS, MATRIX_DEFAULTS, buildMatrix } from '@/data/escalationDefaults'
import { SURVEY_QUESTION_SETS, questionSetsFor } from '@/data/surveyQuestions'
import { DNCR_PEOPLE_IN_SAMPLE, PUBLIC_MENTIONS, SURVEY_DELIVERY_LAST_MONTH, AGENT_JDS } from '@/data/v38Reference'
import { PRODUCTS } from '@/data/products'
import { ACTION_KIND } from '@/lib/actionKinds'
import type { CorrectiveActionKind } from '@/types'

describe('three environments (v40 B9)', () => {
  it('Dubai, Abu Dhabi and PSI Assets (rental), with Arabic names; Amman and Sharjah are gone', () => {
    expect(ENV_IDS).toEqual(['dub', 'auh', 'ast'])
    expect(ENVIRONMENTS.map((e) => e.name.en)).toEqual(['Dubai', 'Abu Dhabi', 'PSI Assets (rental)'])
    for (const e of ENVIRONMENTS) expect(e.name.ar).toMatch(/[؀-ۿ]/)
    expect(envName('all').en).toBe('All environments')
    expect(envName('ast').ar).toBe('PSI للأصول (التأجير)')
    expect(envIdFromShort('PSI Assets')).toBe('ast')
    expect(envNameFromShort('Abu Dhabi').ar).toBe('أبوظبي')
    expect(envNameFromShort('Unknown')).toEqual({ en: 'Unknown', ar: 'Unknown' })
    expect(inEnvScope('all', 'dub')).toBe(true)
    expect(inEnvScope('dub', 'auh')).toBe(false)
    const text = JSON.stringify([mock.MOCK_PERSONS, mock.MOCK_INTERACTIONS, mock.MOCK_SIGNALS, mock.MOCK_SHOPPER_CASES, mock.MOCK_PATTERNS, mock.MOCK_AI_INSIGHTS, mock.MOCK_LD_REQUESTS])
    expect(text).not.toMatch(/Amman|Sharjah/)
  })

  it('every record carries an environment id that matches its short label, and all three are used by people', () => {
    const records = [...mock.MOCK_PERSONS, ...mock.MOCK_INTERACTIONS, ...mock.MOCK_SIGNALS, ...mock.MOCK_SHOPPER_CASES, ...mock.MOCK_DETRACTOR_CALL_ITEMS]
    for (const r of records) expect(envIdFromShort(r.environment), `${r.environment}`).toBe(r.envId)
    expect(new Set(mock.MOCK_PERSONS.map((p) => p.envId))).toEqual(new Set(ENV_IDS))
  })

  it('a signal, interaction and call item inherit the environment of their person', () => {
    const byId = new Map(mock.MOCK_PERSONS.map((p) => [p.id, p]))
    for (const i of mock.MOCK_INTERACTIONS.slice(0, 120)) expect(i.envId).toBe(byId.get(i.personKey)?.envId)
    for (const d of mock.MOCK_DETRACTOR_CALL_ITEMS) expect(d.envId).toBe(byId.get(d.personId)?.envId)
  })

  it('keeps the seeded sample size and determinism: 30 people, 120 interactions', () => {
    expect(mock.MOCK_PERSONS).toHaveLength(30)
    expect(mock.MOCK_INTERACTIONS).toHaveLength(120)
    expect(mock.MOCK_PERSONS[0].id).toBe('p-001')
  })
})

describe('people: segment, source of lead, consent (v40 F24, F29)', () => {
  it('has the six segments and five sources', () => {
    const segments = new Set(mock.MOCK_PERSONS.map((p) => p.segment))
    for (const s of segments) expect(['lead', 'buyer', 'tenant', 'owner', 'investor', 'member']).toContain(s)
    expect(segments.size).toBeGreaterThanOrEqual(4)
    for (const p of mock.MOCK_PERSONS) {
      expect(p.type === 'lead').toBe(p.segment === 'lead')
      expect(['app', 'website', 'whatsapp', 'club', 'crm']).toContain(p.sourceOfLead)
      if (p.vip) expect(p.segment === 'member' || p.segment === 'lead').toBe(true)
    }
  })

  it('consent follows the v40 sample pattern: DNCR for 4, 13, 22; WhatsApp off for 3, 10, 17, 24; SMS always on', () => {
    const idx = (f: (p: (typeof mock.MOCK_PERSONS)[number]) => boolean) => mock.MOCK_PERSONS.flatMap((p, i) => (f(p) ? [i] : []))
    expect(idx((p) => p.consent.dncr)).toEqual([4, 13, 22])
    expect(idx((p) => !p.consent.whatsapp)).toEqual([3, 10, 17, 24])
    expect(idx((p) => !p.consent.email)).toEqual([2, 7, 12, 17, 22, 27])
    expect(mock.MOCK_PERSONS.every((p) => p.consent.sms)).toBe(true)
    expect(DNCR_PEOPLE_IN_SAMPLE).toBe(idx((p) => p.consent.dncr).length)
  })

  it('a DNCR person is never on the close-the-loop list', () => {
    const dncr = new Set(mock.MOCK_PERSONS.filter((p) => p.consent.dncr).map((p) => p.id))
    expect(dncr.size).toBe(3)
    for (const d of mock.MOCK_DETRACTOR_CALL_ITEMS) expect(dncr.has(d.personId)).toBe(false)
    expect(mock.MOCK_DETRACTOR_CALL_ITEMS).toHaveLength(12)
  })
})

describe('close the loop attempts (v40 F27)', () => {
  it('covers every state: to do, no answer (1 and 2 attempts), needs a human, done', () => {
    const items = mock.MOCK_DETRACTOR_CALL_ITEMS
    const statuses = new Set(items.map((i) => i.status))
    expect(statuses).toEqual(new Set(['to_do', 'no_answer', 'needs_human', 'done']))
    expect(items.filter((i) => i.status === 'no_answer').map((i) => i.attempts).sort()).toEqual([1, 2])
    expect(items.find((i) => i.status === 'needs_human')?.attempts).toBe(3)
    expect(items.find((i) => i.status === 'to_do')?.attempts).toBe(0)
  })

  it('a row is done exactly when it has an outcome, and only no-answer rows carry a next attempt date', () => {
    for (const i of mock.MOCK_DETRACTOR_CALL_ITEMS) {
      expect(i.status === 'done').toBe(i.outcome !== undefined)
      if (i.nextAttemptOn) expect(i.status).toBe('no_answer')
      if (i.status === 'no_answer') expect(i.nextAttemptOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('seeds attempts deterministically from the row index', () => {
    const today = new Date(2026, 10, 17)
    expect(seedCallAttempts(0, false, 3, today)).toEqual({ attempts: 1, status: 'done' })
    expect(seedCallAttempts(2, true, 3, today)).toMatchObject({ attempts: 0, status: 'to_do', dueOn: '2026-11-19' })
    expect(seedCallAttempts(5, true, 3, today)).toMatchObject({ attempts: 1, status: 'no_answer', nextAttemptOn: '2026-11-18' })
    expect(seedCallAttempts(8, true, 3, today)).toMatchObject({ attempts: 2, nextAttemptOn: '2026-11-19' })
    expect(seedCallAttempts(11, true, 3, today)).toMatchObject({ attempts: 3, status: 'needs_human' })
  })
})

describe('fixes: proposal date, product, audit trail (v40 F20, F21, F22)', () => {
  it('every seeded fix has a proposal date in the past, a product and an audit log that starts with the proposal', () => {
    expect(mock.MOCK_CORRECTIVE_ACTIONS.length).toBeGreaterThan(0)
    for (const f of mock.MOCK_CORRECTIVE_ACTIONS) {
      expect(Date.parse(f.proposedAt)).toBeLessThanOrEqual(Date.now())
      expect(PRODUCTS.some((p) => p.id === f.product)).toBe(true)
      expect(f.auditLog.length).toBeGreaterThan(0)
      expect(f.auditLog[0]).toMatchObject({ byRole: 'system', at: f.proposedAt })
      expect(f.auditLog[0].what.en).toMatch(/^Proposed by Agent 5/)
      for (const e of f.auditLog) {
        expect(e.what.ar).toMatch(/[؀-ۿ]/)
        expect(Date.parse(e.at)).toBeLessThanOrEqual(Date.now())
      }
      // Entries are in time order, oldest first.
      expect([...f.auditLog].sort((a, b) => a.at.localeCompare(b.at))).toEqual(f.auditLog)
    }
  })

  it('the trail grows with the status: proposed has one line, a verdict has a verdict line', () => {
    const f = (status: 'proposed' | 'in_progress' | 'effective') => seedAuditLog({ kind: 'process', status }, new Date(Date.now() - 20 * 86_400_000).toISOString())
    expect(f('proposed')).toHaveLength(1)
    expect(f('in_progress').map((e) => e.what.en)).toEqual(['Proposed by Agent 5', 'Approved', 'Status set to In progress'])
    expect(f('effective').at(-1)?.what.en).toBe('Verdict: effective')
    expect(f('effective').at(-1)?.byRole).toBe('system')
  })

  it('a proposed fix was proposed recently (some are close to the 5-working-day window)', () => {
    for (const f of mock.MOCK_CORRECTIVE_ACTIONS.filter((x) => x.status === 'proposed')) expect(Date.now() - Date.parse(f.proposedAt)).toBeLessThan(15 * 86_400_000)
  })
})

describe('data feeds (v40 F13, F14)', () => {
  it('has the eight v40 feeds: three CRM environments and five shared sources, PSI Assets late', () => {
    const feeds = buildFeeds(new Date(2026, 10, 17, 7, 0))
    expect(feeds.map((f) => f.id)).toEqual(['crm_auh', 'crm_dub', 'crm_ast', 'wa', 'ai', 'app', 'sv', 'pub'])
    expect(feeds.filter((f) => f.env).map((f) => f.env)).toEqual(['auh', 'dub', 'ast'])
    expect(feeds.filter((f) => f.status !== 'ok').map((f) => f.id)).toEqual(['crm_ast'])
    expect(feeds.find((f) => f.id === 'crm_ast')?.receivedAt.slice(0, 10)).toBe(new Date(2026, 10, 16, 6, 5).toISOString().slice(0, 10))
    expect(feeds.find((f) => f.id === 'crm_auh')?.rows).toBe(3_728_460)
    for (const f of feeds) {
      expect(f.name.ar).toMatch(/[؀-ۿ]/)
      expect(f.note.ar).toMatch(/[؀-ۿ]/)
    }
  })

  it('scopes to the shared feeds plus the selected CRM, and finds the latest time and the late count', () => {
    const feeds = buildFeeds(new Date(2026, 10, 17, 7, 0))
    expect(feedsInScope(feeds, 'all')).toHaveLength(8)
    expect(feedsInScope(feeds, 'dub').map((f) => f.id)).toEqual(['crm_dub', 'wa', 'ai', 'app', 'sv', 'pub'])
    const all = summariseFeeds(feeds, 'all')
    expect(all.lateCount).toBe(1)
    expect(new Date(all.asOf!).getHours()).toBe(6)
    expect(new Date(all.asOf!).getMinutes()).toBe(40) // WhatsApp, the latest of the day
    expect(summariseFeeds(feeds, 'dub').lateCount).toBe(0)
    expect(summariseFeeds(feeds, 'ast').lateCount).toBe(1)
    expect(summariseFeeds([], 'all')).toEqual({ asOf: null, lateCount: 0, feeds: [] })
  })

  it('says "late or missing" in the singular and the plural, in both languages', () => {
    expect(lateFeedsLabel(1).en).toBe('1 feed late or missing')
    expect(lateFeedsLabel(2).en).toBe('2 feeds late or missing')
    expect(lateFeedsLabel(2).ar).toMatch(/[؀-ۿ]/)
  })

  it('the mock store holds the same table', () => {
    expect(mock.MOCK_FEEDS.map((f) => f.id)).toEqual(['crm_auh', 'crm_dub', 'crm_ast', 'wa', 'ai', 'app', 'sv', 'pub'])
  })
})

describe('CRM mapping (v40 F15)', () => {
  it('has the prototype rows, every portal value is a real option, and counts come from the data', () => {
    const rows = (k: string) => CRM_MAPPING_ROWS.filter((r) => r.kind === k)
    expect(rows('src')).toHaveLength(13)
    expect(rows('stg')).toHaveLength(14) // the prototype's sentence says 13; its table lists 14
    expect(rows('act')).toHaveLength(17)
    for (const r of CRM_MAPPING_ROWS) expect(CRM_MAPPING_OPTIONS[r.kind].some((o) => o.id === r.portalValue), `${r.kind} ${r.crmValue}`).toBe(true)
    for (const kind of ['src', 'stg', 'act'] as const) expect(CRM_MAPPING_OPTIONS[kind].at(-1)?.id).toBe('ignore')
    expect(mappingCounts()).toEqual({ sources: { crm: 13, portal: 9 }, stages: { crm: 14, portal: 6 }, events: { crm: 17, portal: 10 } })
    expect(mock.MOCK_MAPPING.rows.find((r) => r.crmValue === 'Property Finder')?.portalValue).toBe('portal')
    expect(mock.MOCK_MAPPING.rows.find((r) => r.crmValue === 'Bayut')?.portalValue).toBe('portal')
    expect(mock.MOCK_MAPPING.rows.find((r) => r.crmValue === 'Automatic')?.portalValue).toBe('ignore')
  })

  it('is aligned to CRM-Field-Mapping.docx: the Media values it lists, the stage names, the communication and renewal categories', () => {
    const has = (kind: string, v: string) => CRM_MAPPING_ROWS.some((r) => r.kind === kind && r.crmValue === v)
    for (const media of ['PSI Mobile App', 'Website', 'www.psinv.net', "What's App", 'Facebook', 'Property Finder', 'Bayut', 'Walk In', 'Auto Generated – Post Transaction']) expect(has('src', media), media).toBe(true)
    // "Website and www.psinv.net are two separate values".
    expect(CRM_MAPPING_ROWS.filter((r) => r.kind === 'src' && /^Website$|^www\.psinv\.net$/.test(r.crmValue))).toHaveLength(2)
    // Values the review does not list are not shown as "seen".
    for (const v of ['Instagram', 'www.bayut.com', 'HubSpot Website']) expect(has('src', v), v).toBe(false)
    for (const stage of ['New', 'Contacted', 'Viewing', 'Opportunity', 'Negotiation', 'Reservation (with developer)', 'Contract signed', 'Closed won', 'Closed lost']) expect(has('stg', stage), stage).toBe(true)
    for (const act of ['Calls', 'Incoming Call – Communication', 'WhatsApp Communication', 'Chatbot Communication', 'After Sales · Handover Workflow', 'Client Complaint Category', 'Lease Renewal', 'Renewal Notice', 'Non-Renewal Notice', 'Survey Completed']) expect(has('act', act), act).toBe(true)
    expect(CRM_MAPPING_ROWS.find((r) => r.crmValue === 'Non-Renewal Notice')?.portalValue).toBe('renewal')
  })

  it('every option has an Arabic label', () => {
    for (const kind of ['src', 'stg', 'act'] as const) for (const o of CRM_MAPPING_OPTIONS[kind]) expect(o.label.ar, o.id).toMatch(/[؀-ۿ]/)
  })
})

describe('escalation matrix (v40 F22)', () => {
  it('has ten rows per product for all six products, every cell a default, identical across products', () => {
    const m = buildMatrix()
    expect(Object.keys(m).sort()).toEqual(['af', 'cl', 'ev', 're', 'to', 'wl'])
    for (const rows of Object.values(m)) {
      expect(rows.map((r) => r.kind)).toEqual(MATRIX_KINDS)
      for (const r of rows) expect(Object.values(r.isDefault).every(Boolean)).toBe(true)
    }
    expect(JSON.stringify(m.re)).toBe(JSON.stringify(m.wl))
  })

  it('carries the v40 default cells (spot checks) with Arabic titles', () => {
    expect(MATRIX_DEFAULTS.employee).toMatchObject({ informed: null, respondH: null, resolveH: null })
    expect(MATRIX_DEFAULTS.employee.receiver?.en).toBe('Direct manager of the agent')
    expect(MATRIX_DEFAULTS.service).toMatchObject({ respondH: 9, resolveH: 45 })
    expect(MATRIX_DEFAULTS.training.resolveH).toBe(90)
    expect(MATRIX_DEFAULTS.legal).toMatchObject({ respondH: 1, resolveH: 5 })
    expect(MATRIX_DEFAULTS.marketing.respondH).toBe(18)
    expect(MATRIX_DEFAULTS.shopper_critical).toMatchObject({ respondH: 9, resolveH: 45 }) // "1 day / 5 days" stored as hours
    for (const cells of Object.values(MATRIX_DEFAULTS)) for (const v of [cells.receiver, cells.informed, cells.backup]) if (v) expect(v.ar).toMatch(/[؀-ۿ]/)
  })

  it('maps every fix kind to a matrix row', () => {
    for (const kind of Object.keys(ACTION_KIND) as CorrectiveActionKind[]) expect(MATRIX_KINDS).toContain(MATRIX_KEY_BY_FIX_KIND[kind])
    expect(MATRIX_KEY_BY_FIX_KIND.service_behaviour).toBe('service')
    expect(MATRIX_KEY_BY_FIX_KIND.legal_privacy).toBe('legal')
  })

  it('one table per product with a row per fix kind is the contract: the per-complaint-category template is gone (decided 18 Nov)', () => {
    expect(Object.keys(escalation).filter((k) => /TEMPLATE|CATEGORY/.test(k))).toEqual([])
    expect(MATRIX_KINDS).toHaveLength(10) // eight fix kinds plus the two case types
    // Real Estate has one table, not one per environment.
    expect(Object.keys(mock.MOCK_MATRIX.re)).toHaveLength(10)
    expect(Array.isArray(mock.MOCK_MATRIX.re)).toBe(true)
    expect(escalation.MATRIX_COPY.defaultCellsNote.en).toContain('Cells still at their default are proposals')
  })
})

describe('survey questions (v40 F23)', () => {
  it('has the nine sets in both languages; Wallet has none', () => {
    expect(SURVEY_QUESTION_SETS).toHaveLength(9)
    expect(questionSetsFor('re').map((s) => s.id)).toEqual(['nps', 'tx', 'why', 're2'])
    expect(questionSetsFor('af')).toHaveLength(2)
    expect(questionSetsFor('wl')).toEqual([])
    for (const s of SURVEY_QUESTION_SETS) {
      expect(s.questions.length).toBeGreaterThan(0)
      for (const q of [s.name, s.when, ...s.questions]) expect(q.ar, `${s.product}.${s.id}`).toMatch(/[؀-ۿ]/)
    }
    expect(questionSetsFor('to')[0].questions).toHaveLength(6)
  })

  it('marks the not-launched products\' wording [Proposed]', () => {
    for (const s of SURVEY_QUESTION_SETS) expect(Boolean(s.proposed), `${s.product}.${s.id}`).toBe(['cl', 'to', 'ev'].includes(s.product))
  })
})

describe('public mentions and skipped surveys (v40 F25, F30)', () => {
  it('every public mention has the [Proposed] owner, and the register is mutable', () => {
    expect(PUBLIC_MENTIONS).toHaveLength(16)
    for (const m of PUBLIC_MENTIONS) expect(m.owner).toEqual({ en: 'Marketing · channel owner', ar: 'التسويق · مسؤول القناة' })
  })

  it('skipped reasons sum to the total skipped and include DNCR, no consent and duplicate', () => {
    const d = SURVEY_DELIVERY_LAST_MONTH
    expect(d.skippedBy.reduce((s, r) => s + r.count, 0)).toBe(d.skipped)
    expect(d.skippedBy.map((r) => r.reason.en)).toEqual(['Inside a cap', 'Not identified', 'Opted out', 'DNCR', 'No consent', 'Duplicate'])
    expect(d.skippedBy.find((r) => r.reason.en === 'DNCR')?.count).toBe(DNCR_PEOPLE_IN_SAMPLE)
    for (const r of d.skippedBy.filter((x) => x.reason.en !== 'DNCR')) expect(r.reason.ar).toMatch(/[؀-ۿ]/) // DNCR is an acronym, written the same
  })

  it('Agent 9 now writes the daily brief per role as well as the monthly pack (F36)', () => {
    const a9 = AGENT_JDS.find((a) => a.id === 9)!
    expect(a9.output.en).toBe('The daily brief per role; the Monthly CX pack; the role summaries; every figure traceable to its register')
    expect(a9.output.ar).toMatch(/الموجز اليومي/)
  })
})

describe('weekly sample (v40 F31)', () => {
  it('is fifty outputs, none read yet, across the prototype\'s agents, with no customer name in any text', () => {
    const items = mock.MOCK_WEEKLY_SAMPLE
    expect(items).toHaveLength(50)
    expect(new Set(items.map((i) => i.id)).size).toBe(50)
    expect(items.every((i) => i.verdict === null)).toBe(true)
    expect(new Set(items.map((i) => i.agent))).toEqual(new Set([2, 3, 5, 7, 8]))
    const names = mock.MOCK_PERSONS.map((p) => p.name)
    for (const i of items) {
      for (const n of names) expect(`${i.text.en} ${i.text.ar} ${i.ref}`, i.id).not.toContain(n)
      expect(i.text.ar).toMatch(/[؀-ۿ]/)
      expect(i.kind.ar).toMatch(/[؀-ۿ]/)
    }
    for (const i of items.filter((x) => x.agent === 7 || x.agent === 8)) expect(i.personId).toBeDefined()
    expect(mock.MOCK_WEEKLY_SAMPLE_SIZE).toBe(50)
  })

  it('takes every fix first, then 18 signals, up to 12 loop items and 10 people, and pads with signal counts', () => {
    const count = (agent: number) => mock.MOCK_WEEKLY_SAMPLE.filter((i) => i.agent === agent).length
    expect(count(5)).toBe(mock.MOCK_CORRECTIVE_ACTIONS.length)
    expect(count(2)).toBe(18)
    expect(count(8)).toBe(12)
    expect(count(7)).toBe(10)
    expect(count(3)).toBe(50 - mock.MOCK_CORRECTIVE_ACTIONS.length - 18 - 12 - 10)
  })

  it('stops at fifty even with more material', () => {
    const many = buildWeeklySample({ fixes: mock.MOCK_CORRECTIVE_ACTIONS, signals: mock.MOCK_SIGNALS, patterns: mock.MOCK_PATTERNS, loopItems: mock.MOCK_DETRACTOR_CALL_ITEMS, persons: mock.MOCK_PERSONS, readings: mock.MOCK_AI_JOURNEY_READINGS })
    expect(many.length).toBeLessThanOrEqual(50)
  })
})

describe('rules configuration carries the v40 keys', () => {
  it('lists the working week, the working day, the fix fallback and the calling rules as decided items with Arabic labels', () => {
    const ids = ['rule_working_days', 'rule_work_start', 'rule_work_end', 'rule_fix_fallback_days', 'rule_call_from', 'rule_call_to', 'rule_call_tries', 'rule_ai_no_answers']
    for (const id of ids) {
      const r = mock.MOCK_RULES_CONFIG.find((x) => x.id === id)
      expect(r, id).toBeDefined()
      expect(r!.proposed).toBeUndefined()
      expect(r!.label.ar).toMatch(/[؀-ۿ]/)
    }
    expect(mock.MOCK_RULES_CONFIG.find((r) => r.id === 'rule_ai_no_answers')?.value).toBe(2)
    expect(mock.MOCK_RULES_CONFIG.find((r) => r.id === 'rule_fix_fallback_days')?.value).toBe(14)
    expect(mock.MOCK_RULES_CONFIG.find((r) => r.id === 'rule_call_to')?.value).toBe(18)
  })
})
