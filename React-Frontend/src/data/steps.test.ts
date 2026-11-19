import { describe, expect, it } from 'vitest'
import { CLOSE_LOOP_NEXT, OVERVIEW_NEXT, REJECTED_FIX_NEXT, STEPS, TRACE_COPY, TRACE_NEXT, actionsNext, fixNext, journeyNext, stepById } from './steps'
import { agentChipLabel, supervisorChipLabel } from '@/lib/agents'

describe('the six steps (v40 S1)', () => {
  it('are Listen, Signal, Pattern, Fix, Check, Report in order, in both languages', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['ev', 'sg', 'pt', 'ca', 'vr', 'rp'])
    expect(STEPS.map((s) => s.name.en)).toEqual(['1 Listen', '2 Signal', '3 Pattern', '4 Fix', '5 Check', '6 Report'])
    expect(STEPS.map((s) => s.name.ar)).toEqual(['1 نسمع', '2 إشارة', '3 نمط', '4 إصلاح', '5 تحقق', '6 تقرير'])
    expect(STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6])
    expect(stepById('ca').title.en).toBe('One suggested fix; a person approves')
    expect(stepById('rp').title.ar).toBe('سطر لكل منتج، كل رقم له أثر')
  })

  it('open Customers, the Signals page (twice, the second at the patterns), the fixes, Close the loop and the Overview', () => {
    expect(STEPS.map((s) => s.to)).toEqual(['/customers', '/actions/signals', '/actions/signals', '/actions/corrective', '/close-the-loop', '/overview'])
    expect(stepById('pt').hash).toBe('#patterns')
  })
})

describe('"where you are, what happens next" (v40 S2)', () => {
  it('a fix by status: step, sentence and due phrase', () => {
    expect(fixNext('proposed')).toMatchObject({ step: 'ca', text: { en: 'The responsible manager approves, changes, rejects, or asks for an investigation' }, due: { en: 'within 5 working days', ar: 'خلال 5 أيام عمل' } })
    for (const s of ['approved', 'in_progress'] as const) expect(fixNext(s)).toMatchObject({ step: 'ca', text: { en: 'The owner does the fix and marks it done' }, due: { en: 'by the due date' } })
    expect(fixNext('verification')).toMatchObject({ step: 'vr', text: { en: 'Agent 6 counts the same signals again and marks it effective, partial or failed' }, due: { en: 'at 60 days' } })
    expect(fixNext('effective')).toMatchObject({ step: 'vr', text: { en: 'Nothing. It worked; it stays in the report as a fix that worked' } })
    expect(fixNext('effective').due).toBeUndefined()
    expect(fixNext('failed').text.en).toBe('The signal reopens and a new fix is proposed')
    // v40.1 (prototype caNext): a partial fix asks for a second step, a new fix on the same pattern, within the approval window
    expect(fixNext('partial')).toMatchObject({
      step: 'ca',
      text: { en: 'The owner proposes a second step; the CX manager approves it as a new fix on the same pattern', ar: 'المالك يقترح خطوة ثانية؛ مدير CX يعتمدها كحل جديد على النمط نفسه' },
      due: { en: 'within 5 working days', ar: 'خلال 5 أيام عمل' },
    })
    expect(fixNext('partial', { approveDays: 3 }).due?.en).toBe('within 3 working days')
  })

  it('a rejected proposal reads the closing sentence, on step Fix', () => {
    expect(REJECTED_FIX_NEXT).toMatchObject({ step: 'ca', text: { en: 'Closed with a reason; nothing further', ar: 'أُغلق بسبب؛ لا شيء بعده' } })
    expect(REJECTED_FIX_NEXT.due).toBeUndefined()
  })

  it('keeps 60 days, never 30 (the prototype\'s stale label), and follows the rules', () => {
    for (const status of ['proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const) {
      const n = fixNext(status)
      expect(`${n.text.en} ${n.due?.en ?? ''} ${n.text.ar} ${n.due?.ar ?? ''}`).not.toMatch(/30/)
    }
    expect(fixNext('proposed', { approveDays: 7 }).due?.en).toBe('within 7 working days')
    expect(fixNext('verification', { verifyDays: 45 }).due?.ar).toBe('عند 45 يوماً')
  })

  it('the Actions page: Signals = sg, Investigations = pt, every other tab = ca', () => {
    expect(actionsNext('signals').step).toBe('sg')
    expect(actionsNext('investigations').step).toBe('pt')
    expect(actionsNext('other')).toMatchObject({ step: 'ca', text: { en: 'Open any fix to see who must say yes and by when' } })
  })

  it('Close the loop, the Overview and the journey', () => {
    expect(CLOSE_LOOP_NEXT.step).toBe('vr')
    expect(OVERVIEW_NEXT.step).toBe('rp')
    expect(OVERVIEW_NEXT.text.en).toContain('Agent 9 writes the Monthly CX pack')
    expect(journeyNext({ drifting: true, problems: 3 }).step).toBe('sg')
    expect(journeyNext({ drifting: true, problems: 3 }).text.en).toMatch(/drifting away/)
    expect(journeyNext({ drifting: false, problems: 3 })).toMatchObject({ step: 'sg', text: { en: '3 problems found on this journey; each is a signal and is counted with the others' } })
    expect(journeyNext({ drifting: false, problems: 0 })).toMatchObject({ step: 'ev', text: { en: 'No problem found; nothing to do unless a new contact arrives' } })
  })

  it('the trace card copy (v40 S4)', () => {
    expect(TRACE_COPY.title).toEqual({ en: 'Trace', ar: 'الأثر' })
    expect(TRACE_COPY.columns.map((c) => c.en)).toEqual(['1 Event', '2 Signal', '3 Pattern', '4 Fix', '5 Check', '6 Report'])
    expect(TRACE_COPY.emptyEventPublic.en).toBe('public mention, no person identified')
    expect(TRACE_COPY.reportLabel).toEqual({ en: 'November pack', ar: 'حزمة نوفمبر' })
    expect(TRACE_NEXT.fix.en).toBe('Check: Agent 6 recounts at 60 days after done')
    expect(TRACE_NEXT.report).toBeNull()
  })
})

describe('agent chips (v40 F33, S17)', () => {
  it('say "Agent 9 · Reporting" and "الوكيل 9 · التقارير"', () => {
    expect(agentChipLabel(9)).toEqual({ en: 'Agent 9 · Reporting', ar: 'الوكيل 9 · التقارير' })
    expect(agentChipLabel(3).en).toBe('Agent 3 · Signals and patterns')
    for (let n = 1; n <= 10; n++) expect(agentChipLabel(n).ar, `agent ${n}`).toMatch(/^الوكيل \d+ · [؀-ۿ]/)
    expect(agentChipLabel(99)).toEqual({ en: 'Agent 99', ar: 'الوكيل 99' })
  })
  it('the supervisor chip says how many checks passed', () => {
    expect(supervisorChipLabel()).toEqual({ en: 'CX Supervisor: 6 checks passed', ar: 'سوبرفايزر CX: اجتاز 6 فحوصات' })
    expect(supervisorChipLabel(5).en).toBe('CX Supervisor: 5 checks passed')
  })
})
