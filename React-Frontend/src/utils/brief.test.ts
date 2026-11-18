import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '@/data/products'
import { canAccessPath } from '@/auth/access'
import type { BriefInputs, IndicatorSet, InboxItem, RoleId } from '@/types'
import { BRIEF_LINES_BY_ROLE, BRIEF_TARGET, buildBrief, count, nextForInboxItem, npsLine, stepCounts } from './brief'

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
}

const INDICATORS: IndicatorSet[] = [
  { productId: 're', nps: 32, csat: 78, ces: 71, answers: 120, deltaVsLastMonth: 3 },
  { productId: 'af', nps: -5, csat: 70, ces: 66, answers: 80, deltaVsLastMonth: -2 },
]

const brief = (role: RoleId, product?: 're' | 'af', inputs = INPUTS) => buildBrief({ role, product, inputs, indicators: INDICATORS, products: PRODUCTS })
const kinds = (role: RoleId, product?: 're' | 'af') => brief(role, product).map((l) => l.kind)

describe('daily brief lines per role (F09)', () => {
  it('gives the CX manager every line in the prototype order', () => {
    expect(kinds('cxmgr')).toEqual(['nps', 'nps', 'signals', 'fixes', 'shopper', 'loop', 'drifting', 'public'])
  })

  it('never gives the Internal Audit and Marketing Lead the signals or fixes lines, and gives it the weekly sample', () => {
    const k = kinds('auditmkt')
    expect(k).not.toContain('signals')
    expect(k).not.toContain('fixes')
    expect(k).toContain('sample')
  })

  it('gives the loop line to CX roles only', () => {
    for (const role of Object.keys(BRIEF_LINES_BY_ROLE) as RoleId[]) {
      expect(kinds(role).includes('loop'), role).toBe(role === 'cxmgr' || role === 'cxteam')
    }
  })

  it('gives L&D the training-gap line and the HR specialist the conduct line, nobody else', () => {
    for (const role of Object.keys(BRIEF_LINES_BY_ROLE) as RoleId[]) {
      expect(kinds(role).includes('ld'), role).toBe(role === 'ld')
      expect(kinds(role).includes('conduct'), role).toBe(role === 'hrspec')
    }
  })

  it('a role with a product sees that product’s NPS line only', () => {
    const lines = brief('aslead', 'af').filter((l) => l.kind === 'nps')
    expect(lines.map((l) => l.id)).toEqual(['nps:af'])
    expect(brief('cxmgr').filter((l) => l.kind === 'nps').map((l) => l.id)).toEqual(['nps:re', 'nps:af'])
  })

  it('the mystery shopper has no brief', () => {
    expect(brief('shopper')).toEqual([])
  })

  it('links a line only when the role can open its page, for every role and every line', () => {
    for (const role of Object.keys(BRIEF_LINES_BY_ROLE) as RoleId[]) {
      for (const line of brief(role)) {
        expect(line.to === undefined || canAccessPath(role, line.to), `${role}: ${line.id} -> ${line.to}`).toBe(true)
        expect(line.to !== undefined, `${role}: ${line.id} should link iff the role can open ${BRIEF_TARGET[line.kind]}`).toBe(canAccessPath(role, BRIEF_TARGET[line.kind]))
      }
    }
  })

  it('the NPS lines are plain text for a role that cannot open the Overview (HR, L&D, team leads, Marketing)', () => {
    for (const role of ['hrspec', 'hrmgr', 'ld', 'teamlead', 'marketing', 'envmgmt', 'aslead'] as RoleId[]) {
      for (const line of brief(role).filter((l) => l.kind === 'nps')) expect(line.to, role).toBeUndefined()
    }
    for (const role of ['cxmgr', 'cxteam', 'exec', 'auditmkt'] as RoleId[]) {
      for (const line of brief(role).filter((l) => l.kind === 'nps')) expect(line.to, role).toBe('/overview')
    }
  })

  it('the weekly sample line opens the sample page and the people line opens Who is leaving', () => {
    const audit = brief('auditmkt')
    expect(audit.find((l) => l.kind === 'sample')?.to).toBe('/settings/weekly-sample')
    expect(audit.find((l) => l.kind === 'drifting')?.to).toBe('/runaway')
    expect(audit.find((l) => l.kind === 'public')?.to).toBe('/settings/public-mentions')
  })

  it('leaves out the shopper line with no open cases and the public line with no mentions', () => {
    const quiet = { ...INPUTS, shopper: { open: 0, late: 0 }, publicMentions: { ...INPUTS.publicMentions, last30: 0 } }
    const k = kinds('cxmgr')
    expect(k).toContain('shopper')
    const q = buildBrief({ role: 'cxmgr', inputs: quiet, indicators: INDICATORS, products: PRODUCTS }).map((l) => l.kind)
    expect(q).not.toContain('shopper')
    expect(q).not.toContain('public')
  })
})

describe('daily brief sentences (S3)', () => {
  const text = (role: RoleId, kind: string, lang: 'en' | 'ar' = 'en', inputs = INPUTS) => brief(role, undefined, inputs).find((l) => l.kind === kind)!.text[lang]

  it('writes the NPS sentence with the change on last month, from the same figure the tile shows', () => {
    const re = npsLine(PRODUCTS.find((p) => p.id === 're')!, INDICATORS[0])
    expect(re.en).toBe('PSI Real Estate NPS is +32, up 3 points on last month')
    const af = npsLine(PRODUCTS.find((p) => p.id === 'af')!, INDICATORS[1])
    expect(af.en).toBe('After-Sales NPS is -5, down 2 points on last month')
    expect(npsLine(PRODUCTS[0], { ...INDICATORS[0], deltaVsLastMonth: 0 }).en).toBe('PSI Real Estate NPS is +32, unchanged on last month')
    expect(npsLine(PRODUCTS[0], { ...INDICATORS[0], deltaVsLastMonth: null }).en).toBe('PSI Real Estate NPS is +32')
    expect(npsLine(PRODUCTS[0], { ...INDICATORS[0], nps: null }).en).toBe('PSI Real Estate NPS: too early')
  })

  it('keeps the sign of a negative or positive NPS inside Arabic text', () => {
    const ar = npsLine(PRODUCTS[0], INDICATORS[0]).ar
    expect(ar).toContain('⁦+32⁩')
    expect(ar).toContain('ارتفع 3 نقاط عن الشهر الماضي')
  })

  it('agrees in number in English and Arabic', () => {
    expect(count(1, { en: ['signal', 'signals'], ar: ['إشارة واحدة', 'إشارتان', 'إشارات', 'إشارة'] })).toEqual({ en: '1 signal', ar: 'إشارة واحدة' })
    expect(count(2, { en: ['signal', 'signals'], ar: ['إشارة واحدة', 'إشارتان', 'إشارات', 'إشارة'] }).ar).toBe('إشارتان')
    expect(count(5, { en: ['signal', 'signals'], ar: ['إشارة واحدة', 'إشارتان', 'إشارات', 'إشارة'] }).ar).toBe('5 إشارات')
    expect(count(12, { en: ['signal', 'signals'], ar: ['إشارة واحدة', 'إشارتان', 'إشارات', 'إشارة'] }).ar).toBe('12 إشارة')
    const one = { ...INPUTS, signals: { inWindow: 1, patternsOverLine: 1, patternsWaitingForFix: 1 } }
    expect(text('cxmgr', 'signals', 'en', one)).toBe('1 signal in the last 30 days; 1 pattern crossed the line and is waiting for a fix')
    expect(text('cxmgr', 'signals', 'en')).toBe('42 signals in the last 30 days; 3 patterns crossed the line and are waiting for a fix')
  })

  it('writes the fixes, shopper, loop and people lines with the numbers of the inputs', () => {
    expect(text('cxmgr', 'fixes')).toBe('2 fixes are waiting for a yes, 3 are in progress, 1 is past its date; 1 verified effective, 1 failed')
    expect(text('cxmgr', 'shopper')).toBe('2 shopper cases open, 1 over the clock')
    expect(text('cxmgr', 'loop')).toBe('4 unhappy customers still to call, 1 critical; recovery so far 55% by phone, 40% by AI campaign')
    expect(text('cxmgr', 'drifting')).toBe('6 of 30 people on record are drifting away; silent leads first')
  })

  it('says "too early" for recovery with no data and leaves out the AI part when it is absent', () => {
    const early = { ...INPUTS, loop: { ...INPUTS.loop, recoveredByPhonePct: null, recoveredByAiPct: null } }
    expect(text('cxmgr', 'loop', 'en', early)).toContain('recovery so far: too early')
    const phoneOnly = { ...INPUTS, loop: { ...INPUTS.loop, recoveredByAiPct: null } }
    expect(text('cxmgr', 'loop', 'en', phoneOnly)).toBe('4 unhappy customers still to call, 1 critical; recovery so far 55% by phone')
  })

  it('the public line adds the target only when the average is over it, and the replies past the clock (decided 18 Nov)', () => {
    expect(text('cxmgr', 'public')).toBe('16 public mentions in 30 days, 38% negative, replied in 61 h on average (target 48); 2 without a reply past 48 h')
    const fine = { ...INPUTS, publicMentions: { ...INPUTS.publicMentions, avgReplyHours: 30, overdue: 0 } }
    expect(text('cxmgr', 'public', 'en', fine)).toBe('16 public mentions in 30 days, 38% negative, replied in 30 h on average')
  })

  it('writes the L&D, HR and Internal Audit lines', () => {
    expect(text('ld', 'ld')).toBe('2 training-gap fixes are with L&D right now')
    expect(text('hrspec', 'conduct')).toBe('1 conduct note this month, each to the direct manager only')
    expect(text('auditmkt', 'sample')).toBe('Weekly sample: 50 agent outputs to read by eye; 0 read so far this week')
  })

  it('has Arabic for every line of every role', () => {
    for (const role of Object.keys(BRIEF_LINES_BY_ROLE) as RoleId[]) {
      for (const line of brief(role)) expect(line.text.ar, `${role}:${line.id}`).toMatch(/[؀-ۿ]/)
    }
  })
})

describe('step counts and the next-step box', () => {
  it('counts each step from the same inputs as the brief', () => {
    const c = stepCounts(INPUTS, INDICATORS)
    expect(c.ev?.en).toBe('30 people on record')
    expect(c.sg?.en).toBe('42 signals in 30 days')
    expect(c.pt?.en).toBe('4 patterns over the line')
    expect(c.ca?.en).toBe('2 fixes waiting for a yes')
    expect(c.vr?.en).toBe('4 unhappy customers to call')
    expect(c.rp?.en).toBe('2 products, one line each')
    expect(c.ev?.ar).toContain('30')
  })

  it('maps an inbox row to the prototype’s own next-step sentences', () => {
    const item = (kind: InboxItem['kind']): InboxItem => ({ id: kind, kind, text: { en: '', ar: '' }, daysLeft: 1, unit: 'wd', who: null, priority: 1, target: '/x' })
    const rules = { approveDays: 5, verifyDays: 60 }
    expect(nextForInboxItem(item('approve'), rules)?.step).toBe('ca')
    expect(nextForInboxItem(item('approve'), rules)?.due?.en).toBe('within 5 working days')
    expect(nextForInboxItem(item('do'), rules)?.due?.en).toBe('by the due date')
    expect(nextForInboxItem(item('verify'), rules)?.step).toBe('vr')
    expect(nextForInboxItem(item('call'), rules)?.step).toBe('vr')
    expect(nextForInboxItem(item('inv'), rules)?.step).toBe('pt')
    expect(nextForInboxItem(item('sample'), rules)).toBeNull()
  })
})
