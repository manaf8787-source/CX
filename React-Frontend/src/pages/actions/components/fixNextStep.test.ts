import { describe, expect, it } from 'vitest'
import type { CorrectiveAction } from '@/types'
import { fixNextStep, isAiMadeFix } from './fixNextStep'

const rules = { approveDays: 5, verifyDays: 60 }
const fix = (over: Partial<CorrectiveAction>): Pick<CorrectiveAction, 'status' | 'decision' | 'sentToInvestigation' | 'dueDate' | 'verificationDueAt'> => ({
  status: 'proposed',
  dueDate: '2026-11-25T12:00:00.000Z',
  verificationDueAt: '2027-01-12T12:00:00.000Z',
  ...over,
})

describe('fixNextStep (v40 F07, S2)', () => {
  it('proposed: the manager decides within the approval window, on step Fix', () => {
    const n = fixNextStep(fix({}), rules)
    expect(n.step).toBe('ca')
    expect(n.text.en).toBe('The responsible manager approves, changes, rejects, or asks for an investigation')
    expect(n.due?.en).toBe('within 5 working days')
    expect(n.due?.ar).toBe('خلال 5 أيام عمل')
  })

  it('reads the approval window from the rules', () => {
    expect(fixNextStep(fix({}), { approveDays: 3, verifyDays: 60 }).due?.en).toBe('within 3 working days')
  })

  it('approved and in progress: the owner does it, by the due date (with the date)', () => {
    for (const status of ['approved', 'in_progress'] as const) {
      const n = fixNextStep(fix({ status }), rules)
      expect(n.step).toBe('ca')
      expect(n.text.en).toBe('The owner does the fix and marks it done')
      expect(n.due?.en).toMatch(/^by the due date, .*2026/)
      expect(n.due?.ar).toMatch(/^قبل تاريخ الاستحقاق، /)
    }
  })

  it('verification: Agent 6 recounts at 60 days (with the check date), on step Check', () => {
    const n = fixNextStep(fix({ status: 'verification' }), rules)
    expect(n.step).toBe('vr')
    expect(n.text.en).toMatch(/^Agent 6 counts the same signals again/)
    expect(n.due?.en).toMatch(/^at 60 days, .*2027/)
  })

  it('effective, failed and partial read the closing sentences', () => {
    expect(fixNextStep(fix({ status: 'effective' }), rules).text.en).toBe('Nothing. It worked; it stays in the report as a fix that worked')
    expect(fixNextStep(fix({ status: 'failed' }), rules).text.en).toBe('The signal reopens and a new fix is proposed')
    expect(fixNextStep(fix({ status: 'partial' }), rules).text.en).toBe('Closed with a reason; nothing further')
  })

  it('a rejected fix is closed with a reason, on step Fix; a fix sent to investigation waits for evidence', () => {
    const rejected = fixNextStep(fix({ decision: 'rejected' }), rules)
    expect(rejected.step).toBe('ca')
    expect(rejected.text.en).toBe('Closed with a reason; nothing further')
    const inv = fixNextStep(fix({ sentToInvestigation: true }), rules)
    expect(inv.text.en).toBe('Interviews or a shopper check come back as evidence; only then is a fix proposed')
  })
})

describe('isAiMadeFix', () => {
  const entry = (byRole: 'system' | 'cxmgr') => ({ at: '2026-11-01T00:00:00Z', what: { en: 'Proposed', ar: 'اقتُرح' }, byRole })
  it('is true for Agent 5 proposals, AI Insights proposals and a system first line; false for a person', () => {
    expect(isAiMadeFix({ auditLog: [entry('system')] })).toBe(true)
    expect(isAiMadeFix({ auditLog: [entry('cxmgr')], proposedBy: { en: 'Agent 5', ar: 'الوكيل 5' } })).toBe(true)
    expect(isAiMadeFix({ auditLog: [entry('cxmgr')], fromInsight: { subjectId: 'a', suggestionId: 'b', recovery: { en: 'x', ar: 'س' } } })).toBe(true)
    expect(isAiMadeFix({ auditLog: [entry('cxmgr')] })).toBe(false)
    expect(isAiMadeFix({ auditLog: [] })).toBe(false)
  })
})
