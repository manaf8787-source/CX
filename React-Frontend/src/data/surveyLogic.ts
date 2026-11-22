import { kindOf, optionsOf, type QuestionKind } from './campaignResults'
export { matchesValue } from './campaignResults'
import type { EditableQuestion, ShowIf } from './surveyEditor'
import type { Bi } from '../types'

/**
 * The "ask this only if" rules of a campaign (owner's request, 22 Nov): a smart survey where the answer to one question decides whether
 * the next one is asked. The rule always points at an earlier question, so the survey can never loop. In the real platform the survey
 * agent evaluates these rules per person while the survey runs.
 */
export const CONDITION_KINDS: QuestionKind[] = ['yesno', 'choice', 'nps', 'rating']

export type Op = ShowIf['op']

export function opsFor(kind: QuestionKind): { op: Op; label: Bi }[] {
  if (kind === 'yesno' || kind === 'choice')
    return [
      { op: 'is', label: { en: 'is', ar: 'هي' } },
      { op: 'isNot', label: { en: 'is not', ar: 'ليست' } },
    ]
  return [
    { op: 'atLeast', label: { en: 'is at least', ar: 'لا تقل عن' } },
    { op: 'atMost', label: { en: 'is at most', ar: 'لا تزيد عن' } },
    { op: 'is', label: { en: 'is exactly', ar: 'تساوي' } },
  ]
}

export function valuesFor(q: EditableQuestion): { value: string; label: Bi }[] {
  const kind = kindOf(q)
  if (kind === 'yesno')
    return [
      { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
      { value: 'no', label: { en: 'No', ar: 'لا' } },
    ]
  if (kind === 'choice') return optionsOf(q).map((o) => ({ value: o.en, label: o }))
  if (kind === 'nps') return Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: { en: String(i), ar: String(i) } }))
  if (kind === 'rating') return Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), label: { en: String(i + 1), ar: String(i + 1) } }))
  return []
}

/** Can a later question depend on this one? Open text cannot. */
export const canDependOn = (q: EditableQuestion) => CONDITION_KINDS.includes(kindOf(q)) && valuesFor(q).length > 0

/** The rule in words: "Only if question 1 is Yes". Empty when the question is always asked or the rule points at nothing. */
export function describeShowIf(show: ShowIf | undefined, all: EditableQuestion[], t: (en: string, ar: string) => string): string {
  if (!show) return ''
  const from = all[show.q]
  if (!from) return ''
  const op = opsFor(kindOf(from)).find((o) => o.op === show.op)
  const val = valuesFor(from).find((v) => v.value === show.value)
  if (!op || !val) return ''
  return t(
    `Only if the answer to question ${show.q + 1} ${op.label.en} ${val.label.en}`,
    `فقط إذا كانت إجابة السؤال ${show.q + 1} ${op.label.ar} ${val.label.ar}`,
  )
}

/** After question `removed` is deleted: rules pointing at it are dropped, rules pointing after it move up by one. */
export function reindexAfterRemove(questions: EditableQuestion[], removed: number): EditableQuestion[] {
  return questions
    .filter((_, i) => i !== removed)
    .map((q) => {
      if (!q.showIf) return q
      if (q.showIf.q === removed) return { ...q, showIf: undefined }
      if (q.showIf.q > removed) return { ...q, showIf: { ...q.showIf, q: q.showIf.q - 1 } }
      return q
    })
}

