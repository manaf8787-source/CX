import type { EditableQuestion, Route, Target } from './surveyEditor'
import type { Bi } from '../types'

/**
 * The logic of a smart campaign survey (owner's request, 22 Nov): each question says where each answer goes next, so the answer to one
 * question decides which question comes after it. A jump can only go forward (to a later question or to the end), so a survey can never
 * loop. In the real platform the survey agent follows these routes per person while the survey runs.
 */
export type QuestionKind = 'nps' | 'rating' | 'choice' | 'yesno' | 'open'

/** The options written in brackets, "(a · b · c)", in both languages, or the builder's own list when it has one. */
export function optionsOf(q: EditableQuestion): Bi[] {
  if (q.choices?.length) return q.choices.filter((c) => c.en.trim())
  const grab = (s: string) =>
    (/\(([^()]*·[^()]*)\)\s*$/.exec(s)?.[1] ?? '')
      .split('·')
      .map((x) => x.trim())
      .filter(Boolean)
  const en = grab(q.en)
  const ar = grab(q.ar)
  return en.map((e, i) => ({ en: e, ar: ar[i] ?? e }))
}

/** The kind a question carries, or the one its wording implies when it was written before kinds existed. */
export function kindOf(q: EditableQuestion): QuestionKind {
  if (q.kind && ['nps', 'rating', 'choice', 'yesno', 'open'].includes(q.kind)) return q.kind as QuestionKind
  const en = q.en
  if (/0 to 10/.test(en)) return 'nps'
  if (/1 to 5/.test(en)) return 'rating'
  if (/yes\s*\/\s*no/i.test(en)) return 'yesno'
  if (optionsOf(q).length >= 2) return 'choice'
  return 'open'
}

/** The answers a question can get, as the values a route compares with. Empty for open text. */
export function answersOf(q: EditableQuestion): { value: string; label: Bi }[] {
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

/** Yes/no and choice route each answer on its own row; scores route by ranges ("6 or lower"). */
export const routesByAnswer = (q: EditableQuestion) => ['yesno', 'choice'].includes(kindOf(q))

export function matches(route: Route, answer: string): boolean {
  if (route.op === 'is') return answer === route.value
  const n = Number(answer)
  const v = Number(route.value)
  return route.op === 'atLeast' ? n >= v : n <= v
}

/** Where one answer of question `index` goes: a question index, or `null` for the end of the survey. */
export function targetOf(questions: EditableQuestion[], index: number, answer: string | undefined): number | null {
  const q = questions[index]
  const route = answer === undefined ? undefined : q.next?.routes.find((r) => matches(r, answer))
  return resolve(route ? route.to : (q.next?.otherwise ?? 'next'), index, questions.length)
}

export function resolve(t: Target, index: number, count: number): number | null {
  if (t === 'end') return null
  const n = t === 'next' ? index + 1 : t
  return n > index && n < count ? n : null
}

export const hasLogic = (questions: EditableQuestion[]) => questions.some((q) => q.next && (q.next.routes.length > 0 || q.next.otherwise !== 'next'))

/** Keeps every jump pointing forward at a question that exists, and every answer route pointing at an answer that exists. */
export function sanitize(questions: EditableQuestion[]): EditableQuestion[] {
  return questions.map((q, i) => {
    if (!q.next) return q
    const fix = (t: Target): Target => (typeof t === 'number' && (t <= i || t >= questions.length) ? 'next' : t)
    const valid = answersOf(q).map((a) => a.value)
    const routes = q.next.routes.filter((r) => (r.op === 'is' ? valid.includes(r.value) : valid.length > 0)).map((r) => ({ ...r, to: fix(r.to) }))
    return { ...q, next: { routes, otherwise: fix(q.next.otherwise) } }
  })
}

/** Moves or deletes questions and keeps the jumps on the same questions they pointed at. `order` lists the old indexes in the new order. */
export function reorder(questions: EditableQuestion[], order: number[]): EditableQuestion[] {
  const where = new Map(order.map((old, now) => [old, now]))
  const map = (t: Target): Target => (typeof t === 'number' ? (where.get(t) ?? 'next') : t)
  return sanitize(
    order.map((old) => {
      const q = questions[old]
      return q.next ? { ...q, next: { routes: q.next.routes.map((r) => ({ ...r, to: map(r.to) })), otherwise: map(q.next.otherwise) } } : q
    }),
  )
}

/** "Yes → Q2 · No → Q4" for a question, in the reader's language. */
export function describeRouting(questions: EditableQuestion[], index: number, t: (en: string, ar: string) => string, L: (b: Bi) => string): string {
  const q = questions[index]
  const name = (to: Target) => {
    const n = resolve(to, index, questions.length)
    return n === null ? t('End', 'النهاية') : t(`Q${n + 1}`, `س${n + 1}`)
  }
  const answers = answersOf(q)
  if (routesByAnswer(q) && answers.length) {
    // One entry per answer, so "Yes → Q2 · No → Q4" reads in full.
    const otherwise = q.next?.otherwise ?? 'next'
    const each = answers.map((a) => `${L(a.label)} → ${name(q.next?.routes.find((r) => r.op === 'is' && r.value === a.value)?.to ?? otherwise)}`)
    const same = new Set(each.map((e) => e.split(' → ')[1]))
    return same.size === 1 ? `→ ${[...same][0]}` : each.join(' · ')
  }
  const parts: string[] = []
  for (const r of q.next?.routes ?? []) {
    const what = r.op === 'is' ? r.value : r.op === 'atLeast' ? t(`${r.value}+`, `${r.value} فأعلى`) : t(`${r.value} or less`, `${r.value} فأقل`)
    parts.push(`${what} → ${name(r.to)}`)
  }
  const other = name(q.next?.otherwise ?? 'next')
  parts.push(parts.length ? t(`Other → ${other}`, `غير ذلك → ${other}`) : `→ ${other}`)
  return parts.join(' · ')
}

