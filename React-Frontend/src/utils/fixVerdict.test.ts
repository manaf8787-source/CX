import { describe, expect, it } from 'vitest'
import { canRecordFixVerdict } from '@/auth/permissions'
import { ROLE_DEFS } from '@/data/roles'
import type { CorrectiveAction } from '@/types'
import {
  VERDICT_COPY,
  acceptToast,
  acceptedAsIsAudit,
  buildInvestigationFromFix,
  buildSecondStep,
  hasOpenSecondStep,
  investigateToast,
  investigationRequestedAudit,
  isOpenVerdict,
  nextNumberedId,
  secondStepRequestedAudit,
  secondStepToast,
  secondStepsOf,
} from './fixVerdict'

const ARABIC = /[؀-ۿ]/
const AT = '2026-11-19T09:00:00.000Z'

const fix = (over: Partial<CorrectiveAction> = {}): CorrectiveAction => ({
  id: 'ca-1',
  kind: 'legal_privacy',
  patternId: 'same_issue:repeat_contact',
  title: { en: 'Address repeat contact in PSI Assets team', ar: 'معالجة النمط المرصود لهذا الفريق' },
  owner: 'Legal',
  dueDate: '2026-11-25T12:00:00.000Z',
  status: 'partial',
  verificationDueAt: '2027-01-12T12:00:00.000Z',
  proposedAt: '2026-10-01T09:00:00.000Z',
  product: 'wl',
  auditLog: [],
  ...over,
})

describe('who closes the 60-day check (v40.1)', () => {
  it('the CX manager and the CX team only; the owner, the HR roles, Marketing, Internal Audit, executives and the shopper see no button', () => {
    const allowed = ROLE_DEFS.filter((r) => canRecordFixVerdict(r.id)).map((r) => r.id)
    expect(allowed).toEqual(['cxmgr', 'cxteam'])
    expect(canRecordFixVerdict('envmgmt')).toBe(false)
    expect(canRecordFixVerdict('hrspec')).toBe(false)
  })
})

describe('the verdict copy', () => {
  it('keeps the prototype strings, in both languages', () => {
    expect(VERDICT_COPY.buttons.effective.en).toBe('Signals dropped: effective')
    expect(VERDICT_COPY.buttons.partial).toEqual({ en: 'Dropped under half: partial', ar: 'انخفضت أقل من النصف: جزئي' })
    expect(VERDICT_COPY.buttons.failed.en).toBe('No drop: back to root cause')
    expect(VERDICT_COPY.barTitle.partial.en).toBe('Partial: the signals dropped by less than half.')
    expect(VERDICT_COPY.barTitle.failed.en).toBe('Failed: the signals did not drop, or came back.')
    expect(VERDICT_COPY.barText.en).toBe('Decision 3: ask the owner for a second step, or investigate first if the cause is unclear.')
    expect(VERDICT_COPY.second.en).toBe('Ask for a second step')
    expect(VERDICT_COPY.investigate.en).toBe('Investigate first (5 interviews)')
    expect(VERDICT_COPY.accept.en).toBe('Accept as is')
  })

  it('every string has Arabic', () => {
    const walk = (v: unknown): void => {
      if (v && typeof v === 'object' && 'en' in v && 'ar' in v) {
        expect((v as { ar: string }).ar).toMatch(ARABIC)
        return
      }
      if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    walk(VERDICT_COPY)
    for (const b of [secondStepToast('ca-5'), investigateToast(), acceptToast(), secondStepRequestedAudit('ca-5', 'cxmgr').what, acceptedAsIsAudit('partial', 'cxmgr').what]) expect(b.ar).toMatch(ARABIC)
  })

  it('the toast after a second step names the new fix by its display id (CA-2nn) and the 5-working-day window', () => {
    expect(secondStepToast('ca-5').en).toBe('CA-205 proposed on the same pattern; the owner has 5 working days.')
    expect(secondStepToast('ca-5').ar).toBe('CA-205 مقترح على النمط نفسه؛ أمام المالك 5 أيام عمل.')
  })
})

describe('ids continue the sample numbering', () => {
  it('the next fix is the highest number plus one, so gaps never reuse an id; CA-2nn is 200 + n', () => {
    expect(nextNumberedId('ca', [{ id: 'ca-1' }, { id: 'ca-2' }, { id: 'ca-3' }, { id: 'ca-4' }])).toBe('ca-5')
    expect(nextNumberedId('ca', [{ id: 'ca-1' }, { id: 'ca-9' }])).toBe('ca-10')
    expect(nextNumberedId('ca', [])).toBe('ca-1')
    expect(nextNumberedId('inv', [{ id: 'inv-1' }, { id: 'inv-7' }])).toBe('inv-8')
  })
})

describe('buildSecondStep: a new fix on the same pattern (prototype caSecond)', () => {
  it('copies pattern, kind, owner and product; proposed now; titled "Second step on CA-201: ..." in both languages; linked to the parent', () => {
    const child = buildSecondStep(fix(), { id: 'ca-5', dueDate: '2026-11-24T12:00:00.000Z', byRole: 'cxmgr', at: AT })
    expect(child).toMatchObject({
      id: 'ca-5',
      kind: 'legal_privacy',
      patternId: 'same_issue:repeat_contact',
      owner: 'Legal',
      product: 'wl',
      status: 'proposed',
      proposedAt: AT,
      parentFixId: 'ca-1',
      parentOutcome: 'partial',
    })
    expect(child.title.en).toBe('Second step on CA-201: Address repeat contact in PSI Assets team')
    expect(child.title.ar).toBe('خطوة ثانية على CA-201: معالجة النمط المرصود لهذا الفريق')
    expect(child.proposedBy).toEqual({ en: 'CX manager, after a partial result', ar: 'مدير تجربة العملاء، بعد نتيجة جزئية' })
    expect(child.decision).toBeUndefined()
    expect(child.sentToInvestigation).toBeUndefined()
    expect(child.fromInsight).toBeUndefined()
    expect(child.source).toBeUndefined()
    expect(child.monthlySignalSeries).toBeUndefined()
  })

  it('writes its own first audit line (a person, not the system) and a 60-day check date from now', () => {
    const child = buildSecondStep(fix(), { id: 'ca-5', dueDate: AT, byRole: 'cxteam', at: AT })
    expect(child.auditLog).toHaveLength(1)
    expect(child.auditLog[0]).toMatchObject({ at: AT, byRole: 'cxteam', what: { en: 'Second step requested after CA-201' } })
    expect(Date.parse(child.verificationDueAt) - Date.parse(AT)).toBe(60 * 86_400_000)
    expect(child.proposedBy?.en).toBe('CX team, after a partial result')
  })

  it('after a failed check it says so (the prototype writes "partial" for both) and remembers the outcome', () => {
    const child = buildSecondStep(fix({ status: 'failed' }), { id: 'ca-5', dueDate: AT, byRole: 'cxmgr', at: AT })
    expect(child.proposedBy?.en).toBe('CX manager, after a failed result')
    expect(child.parentOutcome).toBe('failed')
  })

  it('a fix with no pattern (an AI Insights proposal) keeps its environment instead', () => {
    const child = buildSecondStep(fix({ patternId: undefined, envId: 'dub' }), { id: 'ca-5', dueDate: AT, byRole: 'cxmgr', at: AT })
    expect(child.patternId).toBeUndefined()
    expect(child.envId).toBe('dub')
  })

  it('only a partial or failed fix has a second step', () => {
    for (const status of ['proposed', 'approved', 'in_progress', 'verification', 'effective'] as const) {
      expect(isOpenVerdict(status)).toBe(false)
      expect(() => buildSecondStep(fix({ status }), { id: 'ca-5', dueDate: AT, byRole: 'cxmgr' })).toThrow(/partial or failed/)
    }
    expect(isOpenVerdict('partial')).toBe(true)
    expect(isOpenVerdict('failed')).toBe(true)
  })
})

describe('second steps of a fix', () => {
  const parent = fix()
  const child = buildSecondStep(parent, { id: 'ca-5', dueDate: AT, byRole: 'cxmgr', at: AT })
  it('lists the children of a parent and nothing else', () => {
    expect(secondStepsOf([parent, child, fix({ id: 'ca-2' })], 'ca-1').map((f) => f.id)).toEqual(['ca-5'])
    expect(secondStepsOf([parent, child], 'ca-5')).toEqual([])
  })

  it('one stays open until it is rejected; then a new request makes sense', () => {
    expect(hasOpenSecondStep([parent], 'ca-1')).toBe(false)
    expect(hasOpenSecondStep([parent, child], 'ca-1')).toBe(true)
    expect(hasOpenSecondStep([parent, { ...child, decision: 'rejected' }], 'ca-1')).toBe(false)
    expect(hasOpenSecondStep([parent, { ...child, status: 'approved', decision: 'approved' }], 'ca-1')).toBe(true)
  })
})

describe('buildInvestigationFromFix (prototype caInv)', () => {
  it('interviews, five, running, with the note "Requested from CA-201 after a partial result."', () => {
    const inv = buildInvestigationFromFix(fix(), { id: 'inv-8', environment: 'PSI Assets team' })
    expect(inv).toMatchObject({
      id: 'inv-8',
      patternId: 'same_issue:repeat_contact',
      kind: 'customer_interviews',
      requestedCount: 5,
      doneCount: 0,
      status: 'in_progress',
      environment: 'PSI Assets team',
    })
    expect(inv.note?.en).toBe('Requested from CA-201 after a partial result.')
    expect(inv.note?.ar).toMatch(ARABIC)
  })

  it('names a failed result as failed', () => {
    expect(buildInvestigationFromFix(fix({ status: 'failed' }), { id: 'inv-8' }).note?.en).toBe('Requested from CA-201 after a failed result.')
  })

  it('needs a pattern and a partial or failed fix', () => {
    expect(() => buildInvestigationFromFix(fix({ patternId: undefined }), { id: 'inv-8' })).toThrow(/no pattern/)
    expect(() => buildInvestigationFromFix(fix({ status: 'verification' }), { id: 'inv-8' })).toThrow(/partial or failed/)
  })
})

describe('audit lines', () => {
  it('"Second step requested: CA-205" on the parent, with the role title and a date', () => {
    expect(secondStepRequestedAudit('ca-5', 'cxmgr', AT)).toMatchObject({ at: AT, byRole: 'cxmgr', what: { en: 'Second step requested: CA-205', ar: 'طُلبت خطوة ثانية: CA-205' } })
  })

  it('the investigation line keeps the prototype text and adds its id', () => {
    expect(investigationRequestedAudit('inv-8', 'cxmgr', AT).what.en).toBe('Investigation requested: 5 interviews (INV-8)')
  })

  it('accept as is says which result was accepted', () => {
    expect(acceptedAsIsAudit('partial', 'cxmgr', AT).what.en).toBe('Accepted as is after a partial result')
    expect(acceptedAsIsAudit('failed', 'cxmgr', AT).what.en).toBe('Accepted as is after a failed result')
  })
})
