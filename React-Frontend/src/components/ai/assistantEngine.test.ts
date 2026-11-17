import { describe, expect, it } from 'vitest'
import * as mock from '@/services/mockData'
import { answerQuestion, type AssistantDataset } from './assistantEngine'

const data: AssistantDataset = {
  persons: mock.MOCK_PERSONS,
  interactions: mock.MOCK_INTERACTIONS,
  signals: mock.MOCK_SIGNALS,
  patterns: mock.MOCK_PATTERNS,
  correctiveActions: mock.MOCK_CORRECTIVE_ACTIONS,
  shopperCases: mock.MOCK_SHOPPER_CASES,
  personas: mock.MOCK_PERSONAS,
  detractorCallItems: mock.MOCK_DETRACTOR_CALL_ITEMS,
  agentDirectory: mock.MOCK_AGENT_DIRECTORY,
  effortSummaries: mock.MOCK_EFFORT_SUMMARIES,
}
const ask = (q: string, role: Parameters<typeof answerQuestion>[1] = 'cxmgr') => answerQuestion(q, role, data)

describe('assistant engine (mocked, answers from sample data)', () => {
  it('answers open-action questions however they are phrased', () => {
    const open = mock.MOCK_CORRECTIVE_ACTIONS.filter((a) => a.status !== 'effective' && a.status !== 'failed').length
    for (const q of ['open actions', 'How many open corrective actions?', 'which actions are open']) {
      expect(ask(q).text.en, q).toMatch(new RegExp(`^${open} open corrective action`))
    }
    expect(ask('الإجراءات المفتوحة').text.ar).toMatch(/[؀-ۿ]/)
  })

  it('answers counts that match the sample data', () => {
    expect(ask('how many signals?').text.en).toContain(String(mock.MOCK_SIGNALS.length))
  })

  it('never shows conversation text to a role that may not read it', () => {
    const withText = mock.MOCK_INTERACTIONS.find((i) => i.text && i.channel !== 'call')
    const person = mock.MOCK_PERSONS.find((p) => p.id === withText?.personKey)
    expect(person).toBeDefined()
    const q = `what did ${person!.name} say`
    expect(ask(q, 'exec').text.en).not.toContain(withText!.text!)
    expect(ask(q, 'marketing').text.en).not.toContain(withText!.text!)
  })

  it('falls back honestly when nothing matches', () => {
    expect(ask('qwerty zxcv').text.en).toMatch(/^No match in the sample data/)
  })
})
