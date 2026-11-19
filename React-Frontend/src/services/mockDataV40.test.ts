import { describe, expect, it } from 'vitest'
import * as mock from './mockData'
import { buildWeeklySample, seedAuditLog, seedCallAttempts } from './mockDataV40'
import { ENV_IDS, ENVIRONMENTS, envIdFromShort, envName, envNameFromShort, inEnvScope } from '@/data/environments'
import { buildFeeds, feedsInScope, lateFeedsLabel, summariseFeeds } from '@/data/feeds'
import { CRM_MAPPING_OPTIONS, CRM_MAPPING_ROWS, mappingCounts } from '@/data/crmMapping'
import * as escalation from '@/data/escalationDefaults'
import { MATRIX_KEY_BY_FIX_KIND, MATRIX_KINDS, buildMatrix } from '@/data/escalationDefaults'
import { SURVEY_QUESTION_SETS, questionSetsFor } from '@/data/surveyQuestions'
import { DNCR_PEOPLE_IN_SAMPLE, PUBLIC_MENTIONS, SURVEY_DELIVERY_LAST_MONTH, AGENT_JDS } from '@/data/v38Reference'
import { PRODUCTS } from '@/data/products'
import { ownerTitle } from '@/data/ownerTitles'
import { patternHasVip } from '@/utils/vipClock'
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
    // The last attempt is the row's own limit: 2 no-answers for an AI campaign row, 3 attempts for the CX team's list.
    const needsHuman = items.find((i) => i.status === 'needs_human')!
    expect(needsHuman.attempts).toBe(needsHuman.channel === 'ai_campaign' ? 2 : 3)
    for (const i of items.filter((x) => x.status === 'no_answer')) expect(i.attempts).toBeLessThan(i.channel === 'ai_campaign' ? 2 : 3)
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
    // An AI campaign row hands over after 2: the same slots stay inside that limit.
    expect(seedCallAttempts(8, true, 2, today)).toMatchObject({ attempts: 1, status: 'no_answer' })
    expect(seedCallAttempts(11, true, 2, today)).toMatchObject({ attempts: 2, status: 'needs_human' })
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

describe('escalation matrix (v40 F22, cells set 19 Nov in v42 F30; the cell-by-cell check against the document is data/escalationDefaults.test.ts)', () => {
  it('has twelve rows per product for all six products, none edited, and the products differ (the cells are per product now)', () => {
    const m = buildMatrix()
    expect(Object.keys(m).sort()).toEqual(['af', 'cl', 'ev', 're', 'to', 'wl'])
    for (const rows of Object.values(m)) {
      expect(rows.map((r) => r.kind)).toEqual(MATRIX_KINDS)
      for (const r of rows) if (r.kind !== 'vip') expect(Object.values(r.edited).some(Boolean)).toBe(false)
    }
    expect(JSON.stringify(m.re)).not.toBe(JSON.stringify(m.wl))
  })

  it('carries the 19 Nov cells (spot checks): hours as numbers, the four day cells as 9 and 45, the employee Resolve empty', () => {
    const cells = (p: 're' | 'cl' | 'ev' | 'wl', kind: string) => {
      const r = mock.MOCK_MATRIX[p].find((x) => x.kind === kind)
      if (!r || r.kind === 'vip') throw new Error(kind)
      return r.cells
    }
    expect(cells('re', 'employee')).toMatchObject({ informed: null, respondH: 9, resolveH: null })
    expect(cells('re', 'employee').receiver?.en).toBe('Direct manager of the agent')
    expect(cells('re', 'service')).toMatchObject({ respondH: 4, resolveH: 27 })
    expect(cells('re', 'training').resolveH).toBe(90)
    expect(cells('re', 'legal')).toMatchObject({ respondH: 1, resolveH: 9 })
    expect(cells('re', 'shopper_critical')).toMatchObject({ respondH: 9, resolveH: 45 }) // "1 day / 5 days" stored as hours
    expect(cells('cl', 'service')).toMatchObject({ respondH: 2, resolveH: 18 })
    expect(cells('ev', 'service')).toMatchObject({ respondH: 1, resolveH: 9 })
    expect(cells('wl', 'product').informed?.en).toBe('Information Security lead · IT lead')
    for (const rows of Object.values(mock.MOCK_MATRIX)) for (const r of rows) for (const v of r.kind === 'vip' ? [r.rule.receiver, r.rule.informed, r.rule.backup] : [r.cells.receiver, r.cells.informed, r.cells.backup]) if (v) expect(v.ar).toMatch(/[؀-ۿ]/)
  })

  it('maps every fix kind to a matrix row', () => {
    for (const kind of Object.keys(ACTION_KIND) as CorrectiveActionKind[]) expect(MATRIX_KINDS).toContain(MATRIX_KEY_BY_FIX_KIND[kind])
    expect(MATRIX_KEY_BY_FIX_KIND.service_behaviour).toBe('service')
    expect(MATRIX_KEY_BY_FIX_KIND.legal_privacy).toBe('legal')
  })

  it('one table per product with a row per fix kind is the contract: the per-complaint-category template is gone (decided 18 Nov)', () => {
    expect(Object.keys(escalation).filter((k) => /TEMPLATE|CATEGORY/.test(k))).toEqual([])
    expect(MATRIX_KINDS).toHaveLength(12) // eight fix kinds, the two case types, data exposure, and the VIP rule
    // Real Estate has one table, not one per environment.
    expect(mock.MOCK_MATRIX.re).toHaveLength(12)
    expect(Array.isArray(mock.MOCK_MATRIX.re)).toBe(true)
    // the cells are decided (set 19 Nov): the "default cells are proposals" note is gone
    expect(Object.keys(escalation.MATRIX_COPY)).not.toContain('defaultCellsNote')
    expect(escalation.MATRIX_COPY.setNote.en).toBe('Set 19 Nov · titles adjustable until 28 Nov')
  })
})

describe('the sample has a VIP-related fix (v42 F30)', () => {
  it('tags one more person VIP on the first fix’s pattern, as a Club member (or lead), and leaves the rest of the seeded sample alone', () => {
    const vips = mock.MOCK_PERSONS.filter((p) => p.vip)
    expect(vips.map((p) => p.id)).toContain('p-005') // the seeded VIP stays
    expect(vips).toHaveLength(2)
    for (const p of vips) {
      expect(p.sourceOfLead).toBe('club')
      expect(p.segment === 'member' || p.segment === 'lead').toBe(true)
    }
    expect(mock.MOCK_PERSONS).toHaveLength(30)
  })

  it('two sample fixes are VIP-related: the first, and the third whose pattern overlaps it (same repeat-contact signals); the second and fourth are not', () => {
    const vipIds = new Set(mock.MOCK_PERSONS.filter((p) => p.vip).map((p) => p.id))
    const related = mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => {
      const pattern = mock.MOCK_PATTERNS.find((p) => p.id === f.patternId)
      return mock.MOCK_SIGNALS.some((s) => pattern?.signalIds.includes(s.id) && s.personId && vipIds.has(s.personId))
    })
    expect(related.map((f) => f.id)).toEqual(['ca-1', 'ca-3'])
  })
})

describe('survey questions (v40 F23)', () => {
  it('has the nine v40 sets and the four Wallet sets of v42.3 in both languages', () => {
    expect(SURVEY_QUESTION_SETS).toHaveLength(13)
    expect(questionSetsFor('re').map((s) => s.id)).toEqual(['nps', 'tx', 'why', 're2'])
    expect(questionSetsFor('af')).toHaveLength(2)
    expect(questionSetsFor('wl').map((s) => s.id)).toEqual(['setup', 'call', 'addp', 'nps'])
    for (const s of SURVEY_QUESTION_SETS) {
      expect(s.questions.length).toBeGreaterThan(0)
      for (const q of [s.name, s.when, ...s.questions]) expect(q.ar, `${s.product}.${s.id}`).toMatch(/[؀-ۿ]/)
    }
    expect(questionSetsFor('to')[0].questions).toHaveLength(6)
  })

  it('marks the wording of PSI Club, Tour Estate and PSI Events [Proposed]; the Wallet\'s was decided on 19 Nov, so it is not', () => {
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

const CONTENT_CHECKS = ['fix', 'brief', 'journey']
const ORIGINAL_CHECKS = ['fix', 'classification', 'brief', 'journey', 'count']

describe('weekly sample (v40 F31, split by reader in v42.1)', () => {
  const items = mock.MOCK_WEEKLY_SAMPLE
  const checks = (list: typeof items) => list.map((i) => i.check)
  const count = (check: string) => items.filter((i) => i.check === check).length

  it('keeps the original fifty (ids ws-1 to ws-50) and appends the audit rows after them, none read yet', () => {
    expect(items).toHaveLength(61)
    expect(items.map((i) => i.id)).toEqual(Array.from({ length: 61 }, (_, k) => `ws-${k + 1}`))
    expect(items.every((i) => i.verdict === null)).toBe(true)
    expect(items.slice(0, 50).every((i) => ORIGINAL_CHECKS.includes(i.check))).toBe(true)
    expect(checks(items.slice(50))).toEqual(['routing', 'routing', 'routing', 'routing', 'access', 'access', 'access', 'targeting', 'targeting', 'targeting', 'targeting'])
    expect(new Set(items.map((i) => i.agent))).toEqual(new Set([2, 3, 5, 7, 8]))
    expect(mock.MOCK_WEEKLY_SAMPLE_SIZE).toBe(50) // the cap of the original composition, not the total
  })

  it('has no customer name in any text, in any card, and an Arabic form of every line', () => {
    const names = mock.MOCK_PERSONS.map((p) => p.name)
    for (const i of items) {
      const all = `${i.text.en} ${i.text.ar} ${i.saw.en} ${i.saw.ar} ${i.ref} ${JSON.stringify(i.card)} ${JSON.stringify(i.supervisor ?? '')}`
      for (const n of names) expect(all, i.id).not.toContain(n)
      expect(i.text.ar).toMatch(/[؀-ۿ]/)
      expect(i.saw.ar).toMatch(/[؀-ۿ]/)
      expect(i.kind.ar).toMatch(/[؀-ۿ]/)
      expect(i.card.how.ar).toMatch(/[؀-ۿ]/)
      for (const line of [...i.card.given, ...i.card.decided]) for (const b of [line.value, line.label, line.meta, line.quote]) if (b && line.quote !== b) expect(b.ar.trim().length, i.id).toBeGreaterThan(0)
    }
    for (const i of items.filter((x) => x.check === 'journey' || x.check === 'brief')) expect(i.personId).toBeDefined()
  })

  it('the original composition: every fix first, then 18 signals, up to 12 loop items and 10 people, padded with counts', () => {
    const original = items.slice(0, 50)
    const n = (check: string) => original.filter((i) => i.check === check).length
    expect(n('fix')).toBe(mock.MOCK_CORRECTIVE_ACTIONS.length)
    expect(n('classification')).toBe(18)
    expect(n('brief')).toBe(12)
    expect(n('journey')).toBe(10)
    expect(n('count')).toBe(50 - mock.MOCK_CORRECTIVE_ACTIONS.length - 18 - 12 - 10)
  })

  it('says which agent each kind belongs to: routing and access are Agent 5, targeting Agent 7', () => {
    const agentOf = (check: string) => [...new Set(items.filter((i) => i.check === check).map((i) => i.agent))]
    expect(agentOf('fix')).toEqual([5])
    expect(agentOf('routing')).toEqual([5])
    expect(agentOf('access')).toEqual([5])
    expect(agentOf('classification')).toEqual([2])
    expect(agentOf('count')).toEqual([3])
    expect(agentOf('brief')).toEqual([8])
    expect(agentOf('journey')).toEqual([7])
    expect(agentOf('targeting')).toEqual([7])
  })

  it('splits by reader: fixes, briefs and readings are the CX team\'s (26), the rest is audit\'s (35)', () => {
    for (const i of items) expect(i.reader, `${i.id} ${i.check}`).toBe(CONTENT_CHECKS.includes(i.check) ? 'cx' : 'audit')
    expect(items.filter((i) => i.reader === 'cx')).toHaveLength(count('fix') + count('brief') + count('journey'))
    expect(items.filter((i) => i.reader === 'cx')).toHaveLength(26)
    expect(items.filter((i) => i.reader === 'audit')).toHaveLength(35)
  })

  it('stops the original composition at fifty even with more material; the audit rows come on top', () => {
    const many = buildWeeklySample({ fixes: mock.MOCK_CORRECTIVE_ACTIONS, signals: mock.MOCK_SIGNALS, patterns: mock.MOCK_PATTERNS, loopItems: mock.MOCK_DETRACTOR_CALL_ITEMS, persons: mock.MOCK_PERSONS, readings: mock.MOCK_AI_JOURNEY_READINGS, interactions: mock.MOCK_INTERACTIONS, matrix: mock.MOCK_MATRIX, personas: mock.MOCK_PERSONAS })
    expect(many.filter((i) => ORIGINAL_CHECKS.includes(i.check)).length).toBeLessThanOrEqual(50)
    expect(many.filter((i) => !ORIGINAL_CHECKS.includes(i.check))).toHaveLength(11)
  })

  it('is deterministic: building it again gives the same rows', () => {
    const again = buildWeeklySample({ fixes: mock.MOCK_CORRECTIVE_ACTIONS, signals: mock.MOCK_SIGNALS, patterns: mock.MOCK_PATTERNS, loopItems: mock.MOCK_DETRACTOR_CALL_ITEMS, persons: mock.MOCK_PERSONS, readings: mock.MOCK_AI_JOURNEY_READINGS, interactions: mock.MOCK_INTERACTIONS, matrix: mock.MOCK_MATRIX, personas: mock.MOCK_PERSONAS })
    expect(JSON.stringify(again)).toBe(JSON.stringify(mock.MOCK_WEEKLY_SAMPLE.map((i) => ({ ...i, verdict: null, judgedAt: undefined }))))
  })
})

describe('weekly sample rows carry their evidence (v41.1 F29)', () => {
  const rows = (check: string) => mock.MOCK_WEEKLY_SAMPLE.filter((i) => i.check === check)

  it('every row says what the agent saw, in both languages, and names what Open opens (a targeting row has no record to open)', () => {
    for (const i of mock.MOCK_WEEKLY_SAMPLE) {
      expect(i.saw.en.trim().length, i.id).toBeGreaterThan(5)
      expect(i.saw.ar.trim().length, i.id).toBeGreaterThan(5)
      if (i.check === 'targeting') expect(i.open, i.id).toBeUndefined()
      else expect(i.open, i.id).toBeDefined()
    }
  })

  it('a proposed fix shows the pattern, the signal count and the recovery figure, and the output names the owner title', () => {
    for (const i of rows('fix')) {
      expect(i.saw.en, i.id).toMatch(/\d+ signals? in \d+ days|AI Insights suggestion|Returned investigation|No pattern/)
      if (/signals? in/.test(i.saw.en)) expect(i.saw.en, i.id).toMatch(/recovered in \d+, \d+ of \d+ is \d+%/)
      expect(i.text.en, i.id).toContain(' → ')
      expect(i.open, i.id).toEqual({ traceKind: 'fix', id: i.ref })
    }
  })

  it('a classification shows the source, the date and the signal text, and the output gives the category and severity', () => {
    for (const i of rows('classification')) {
      expect(i.saw.en, i.id).toMatch(/ · \d{4}-\d{2}-\d{2} · ".+"$/)
      expect(i.text.en, i.id).toMatch(/ · (critical|medium|low) severity$/)
      expect(i.open, i.id).toEqual({ traceKind: 'signal', id: i.ref })
    }
  })

  it('an interview brief shows the first score, the events and the problems; the output gives a suggested reason', () => {
    for (const i of rows('brief')) {
      expect(i.saw.en, i.id).toMatch(/^(NPS|CSAT|CES) \d+ · \d+ events? on the timeline · \d+ problems? found$/)
      expect(i.text.en, i.id).toMatch(/^Reason suggested: /)
      expect(i.open, i.id).toEqual({ to: `/close-the-loop?item=${i.ref}` })
    }
  })

  it('a journey reading shows events, problems and the last contact date', () => {
    for (const i of rows('journey')) {
      expect(i.saw.en, i.id).toMatch(/^\d+ events? · \d+ problems? · last contact (\d{4}-\d{2}-\d{2}|–)$/)
      expect(i.open, i.id).toEqual({ to: `/customers/${i.personId}` })
    }
  })
})

describe('weekly sample: the audit rows (v42.1 F32)', () => {
  const rows = (check: string) => mock.MOCK_WEEKLY_SAMPLE.filter((i) => i.check === check)
  const routing = rows('routing')
  const routingOf = (fixRef: string) => routing.find((i) => i.ref === fixRef)!

  it('a routing row for every fix: its kind, its product and what the matrix says, against the title it was routed to', () => {
    expect(routing).toHaveLength(mock.MOCK_CORRECTIVE_ACTIONS.length)
    for (const f of mock.MOCK_CORRECTIVE_ACTIONS) {
      const row = routingOf(`CA-${200 + Number(f.id.replace('ca-', ''))}`)
      const cells = (mock.MOCK_MATRIX[f.product ?? 're'].find((r) => r.kind === MATRIX_KEY_BY_FIX_KIND[f.kind]) as { cells: { receiver: { en: string } } }).cells
      expect(row.saw.en, row.id).toContain(`Kind: ${ACTION_KIND[f.kind].label.en}`)
      expect(row.saw.en, row.id).toContain(`product ${PRODUCTS.find((p) => p.id === (f.product ?? 're'))!.name.en}`)
      expect(row.saw.en, row.id).toContain(`matrix says: ${cells.receiver.en} (respond`)
      expect(row.saw.en, row.id).toMatch(/respond [\d½.]+ h · resolve [\d½.–]+( h)?/)
      expect(row.text.en, row.id).toContain(`${f.title.en} → `)
      expect(row.card.decided[0].value?.en, row.id).toBe(ownerEn(f.owner))
      expect(row.card.decided[1].value?.en, row.id).toBe(cells.receiver.en)
      expect(row.supervisor?.en, row.id).toMatch(/^Supervisor: schema and recompute only/)
      expect(row.reader).toBe('audit')
    }
  })

  it('"repeat contact → Legal" (CA-201) is the routing error: its row shows the mismatch, and no other fix is flagged', () => {
    const ca201 = routingOf('CA-201')
    expect(ca201.text.en).toBe('Address repeat contact in PSI Assets team → Legal · kind check: no legal, privacy or safety signal in this pattern')
    expect(ca201.card.decided.find((l) => l.attention)?.value?.en).toMatch(/Legal and privacy is for legal, privacy or safety signals; none of this pattern's signals is one \(it is about repeat contact\)/)
    for (const other of routing.filter((i) => i.ref !== 'CA-201')) expect(other.card.decided.some((l) => l.attention), other.id).toBe(false)
    // the fix really is a repeat-contact pattern with no legal signal behind it
    const fix = mock.MOCK_CORRECTIVE_ACTIONS[0]
    const pattern = mock.MOCK_PATTERNS.find((p) => p.id === fix.patternId)!
    expect(fix.kind).toBe('legal_privacy')
    expect(pattern.category).toBe('repeat_contact')
    expect(pattern.signalIds.map((id) => mock.MOCK_SIGNALS.find((s) => s.id === id)!.kind)).not.toContain('legal_privacy_safety')
  })

  it('the VIP rule halves the clocks of every fix whose pattern holds a VIP (CA-201, and CA-203 whose pattern shares the person), and of no other', () => {
    expect(routingOf('CA-201').saw.en).toMatch(/respond ½ h · resolve 4\.5 h · VIP · clocks halved/)
    expect(routingOf('CA-201').saw.ar).toContain('VIP · المهل مُنصَّفة')
    for (const f of mock.MOCK_CORRECTIVE_ACTIONS) {
      const pattern = mock.MOCK_PATTERNS.find((p) => p.id === f.patternId)
      const row = routingOf(`CA-${200 + Number(f.id.replace('ca-', ''))}`)
      expect(row.saw.en.includes('VIP · clocks halved'), row.id).toBe(patternHasVip(pattern, mock.MOCK_SIGNALS, mock.MOCK_PERSONS))
    }
  })

  it('an access row for the first three fixes: what the receiver got, with no conversation text and no customer name', () => {
    const access = rows('access')
    expect(access.map((i) => i.ref)).toEqual(['CA-201', 'CA-202', 'CA-203'])
    for (const i of access) {
      expect(i.saw.en).toBe('Fix text, "How the AI found this", the trace, as sent to the receiver')
      expect(i.text.en).toMatch(/no conversation text, no customer name$/)
      expect(i.supervisor?.en).toBe('Access check passed by code; you confirm by eye')
      expect(i.personId).toBeUndefined()
      const decided = JSON.stringify(i.card.decided)
      expect(decided).toContain('conversation text: none')
      expect(decided).toMatch(/PT-\d+ · CA-20\d/)
    }
    // CA-203 is an employee fix: the agent's id may appear inside the direct-manager line only, and the row says so
    expect(access[2].text.en).toContain('agent id only inside the direct-manager line')
    expect(JSON.stringify(access[2].card.decided)).toContain('agent id, inside the direct-manager line only')
    expect(JSON.stringify(access[0].card.decided)).toContain('"en":"none · conversation text: none"')
  })

  it('a targeting row for the first four personas: persona, size and channels, against the campaign\'s who and channel', () => {
    const targeting = rows('targeting')
    expect(targeting).toHaveLength(4)
    targeting.forEach((i, k) => {
      const p = mock.MOCK_PERSONAS[k]
      expect(i.ref).toBe(`MC-${101 + k}`)
      expect(i.saw.en).toContain(`Persona: ${p.name.en} · ${p.segmentSize} people on record · channels they use:`)
      expect(i.text.en).toBe(`Who: ${p.recommendation.targetWho.en} · channel: ${p.recommendation.channelAndWhen.en}`)
      expect(i.supervisor?.en).toBe('Supervisor: counts recomputed; whether these are the right people is what you judge')
      expect(i.agent).toBe(7)
      expect(i.card.given[0].value).toEqual(p.name)
    })
  })

  it('no audit row holds a customer name, an agent name, a conversation text or a person: audit reads ids and titles only', () => {
    const audit = mock.MOCK_WEEKLY_SAMPLE.filter((i) => i.reader === 'audit')
    const text = JSON.stringify(audit)
    for (const p of mock.MOCK_PERSONS) expect(text).not.toContain(p.name)
    for (const a of mock.MOCK_AGENT_DIRECTORY) expect(text).not.toContain(a.displayName)
    for (const e of mock.MOCK_INTERACTIONS.filter((x) => x.text)) expect(text).not.toContain(e.text as string)
    expect(text).not.toContain('"conversation"')
    for (const i of audit) {
      expect(i.personId, i.id).toBeUndefined()
      for (const line of [...i.card.given, ...i.card.decided]) {
        expect(line.personId, i.id).toBeUndefined()
        expect(line.conversation, i.id).toBeUndefined()
      }
    }
  })

  it('the CX rows keep conversation text in its own `conversation` field, verbatim, and a person behind `personId`', () => {
    const brief = rows('brief')
    const quoted = brief.flatMap((i) => i.card.given.filter((l) => l.conversation))
    expect(quoted.length).toBeGreaterThan(0)
    for (const l of quoted) expect(l.conversation).toMatch(/^Sample conversation note/)
    for (const i of brief) expect(i.card.given[0].personId).toBe(i.personId)
    for (const i of rows('journey')) expect(i.card.given[0].personId).toBe(i.personId)
  })
})

function ownerEn(owner: string): string {
  return ownerTitle(owner).en
}

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
