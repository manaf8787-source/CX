import type { SurveyCampaign } from './surveyCampaigns'
import type { EditableQuestion, ShowIf } from './surveyEditor'
import type { Bi } from '../types'

/**
 * What a sent campaign got back, as numbers the Dashboard shows (owner's request, 22 Nov). Prototype: the numbers are generated from the
 * campaign's id and its sent and answered counts, so the same campaign always shows the same figures. In the real platform they come
 * from the answers the survey agent collected; nothing here is a real customer's reply.
 */
export type QuestionKind = 'nps' | 'rating' | 'choice' | 'yesno' | 'open'

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

/** The options written in brackets, "(a · b · c)", in both languages. */
export function optionsOf(q: EditableQuestion): Bi[] {
  const grab = (s: string) =>
    (/\(([^()]*·[^()]*)\)\s*$/.exec(s)?.[1] ?? '')
      .split('·')
      .map((x) => x.trim())
      .filter(Boolean)
  const en = grab(q.en)
  const ar = grab(q.ar)
  return en.map((e, i) => ({ en: e, ar: ar[i] ?? e }))
}

export function matchesValue(show: ShowIf, answer: string): boolean {
  const n = Number(answer)
  const v = Number(show.value)
  switch (show.op) {
    case 'is':
      return answer === show.value
    case 'isNot':
      return answer !== show.value
    case 'atLeast':
      return n >= v
    case 'atMost':
      return n <= v
  }
}

/** The share of the people who answered `prev` whose answer satisfies the rule (1 when the rule cannot be read). */
function shareThatMatch(show: ShowIf, prev: QuestionResult | undefined): number {
  if (!prev || !prev.bars.length) return 1
  const total = prev.bars.reduce((s, b) => s + b.count, 0)
  if (!total) return 1
  const key = (b: { label: Bi }) => (prev.kind === 'yesno' ? b.label.en.toLowerCase() : b.label.en)
  return prev.bars.filter((b) => matchesValue(show, key(b))).reduce((s, b) => s + b.count, 0) / total
}

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

/** Splits `total` over weights, so the parts add up exactly. */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0) || 1
  const parts = weights.map((w) => Math.floor((w / sum) * total))
  let left = total - parts.reduce((s, n) => s + n, 0)
  for (let i = 0; left > 0; i = (i + 1) % parts.length, left--) parts[i]++
  return parts
}

export interface QuestionResult {
  index: number
  question: EditableQuestion
  kind: QuestionKind
  answered: number
  /** nps / rating / yesno / choice: label and count per bar. */
  bars: { label: Bi; count: number }[]
  /** nps: promoters minus detractors, in points. rating: share of 4 and 5, in percent. yesno: share of yes, in percent. */
  headline?: { label: Bi; value: number; unit: '' | '%' }
  /** open: a few example replies, clearly sample. */
  quotes: { text: Bi; tone: 'good' | 'bad' | 'neutral' }[]
  /** Set when the question has an "only if" rule: how many people were asked it, out of all who answered. */
  askedOf?: number
}

export interface CampaignResult {
  asked: number
  delivered: number
  opened: number
  answered: number
  rate: number
  /** Responses on each of the 14 days after sending. */
  daily: { day: number; count: number }[]
  questions: QuestionResult[]
  /** The first headline among the questions (NPS, or CSAT), for the comparison table. */
  headline?: { label: Bi; value: number; unit: '' | '%' }
}

const QUOTES: Record<'good' | 'bad' | 'neutral', Bi[]> = {
  good: [
    {
      en: 'Quick answer and a clear next step.',
      ar: 'ردّ سريع وخطوة تالية واضحة.',
    },
    { en: 'The agent knew the project well.', ar: 'الوكيل يعرف المشروع جيداً.' },
    { en: 'Everything was as promised.', ar: 'كل شيء كما وُعدنا.' },
  ],
  bad: [
    {
      en: 'Waited three days for a reply.',
      ar: 'انتظرت ثلاثة أيام للحصول على ردّ.',
    },
    {
      en: 'Had to explain the same thing twice.',
      ar: 'اضطررت لشرح الأمر نفسه مرتين.',
    },
    { en: 'The payment plan was not clear.', ar: 'خطة الدفع لم تكن واضحة.' },
  ],
  neutral: [
    { en: 'Fine, nothing special.', ar: 'جيد، لا شيء مميز.' },
    {
      en: 'Would like more updates along the way.',
      ar: 'أرغب بمزيد من التحديثات خلال الطريق.',
    },
  ],
}

export function campaignResult(c: SurveyCampaign): CampaignResult | undefined {
  if (c.status !== 'sent' || !c.sentCount || c.answeredCount == null) return undefined
  const r = rng(c.id)
  const asked = c.sentCount
  const answered = c.answeredCount
  const delivered = Math.round(asked * (0.94 + r() * 0.05))
  const opened = Math.max(answered, Math.round(delivered * (0.55 + r() * 0.2)))
  const decay = Array.from({ length: 14 }, (_, i) => Math.exp(-i * (0.35 + r() * 0.05)) * (0.9 + r() * 0.2))
  const daily = split(answered, decay).map((count, i) => ({
    day: i + 1,
    count,
  }))
  const mood = 0.35 + r() * 0.5 // how happy this campaign's people are, 0..1

  const questions: QuestionResult[] = []
  const basisOf = (question: EditableQuestion) => (question.showIf ? (questions[question.showIf.q]?.answered ?? answered) : answered)
  const build = (question: EditableQuestion, index: number): QuestionResult => {
    const kind = kindOf(question)
    const gate = question.showIf ? shareThatMatch(question.showIf, questions[question.showIf.q]) : 1
    const n = Math.max(1, Math.round(basisOf(question) * gate * (index === 0 ? 1 : 0.86 + r() * 0.12)))
    if (kind === 'nps') {
      const w = Array.from({ length: 11 }, (_, s) => Math.exp(-Math.pow((s - (5.5 + mood * 4.4)) / 2.1, 2)) * (0.8 + r() * 0.4))
      const counts = split(n, w)
      const pro = counts[9] + counts[10]
      const det = counts.slice(0, 7).reduce((a, b) => a + b, 0)
      return {
        index,
        question,
        kind,
        answered: n,
        bars: counts.map((count, s) => ({
          label: { en: String(s), ar: String(s) },
          count,
        })),
        headline: {
          label: { en: 'NPS', ar: 'NPS' },
          value: Math.round(((pro - det) / n) * 100),
          unit: '',
        },
        quotes: [],
      }
    }
    if (kind === 'rating') {
      const w = [1, 2, 4, 6, 5].map((x, i) => x * (0.6 + mood * (i + 1) * 0.35) * (0.8 + r() * 0.4))
      const counts = split(n, w)
      return {
        index,
        question,
        kind,
        answered: n,
        bars: counts.map((count, i) => ({
          label: { en: String(i + 1), ar: String(i + 1) },
          count,
        })),
        headline: {
          label: { en: 'Satisfied (4–5)', ar: 'راضون (4–5)' },
          value: Math.round(((counts[3] + counts[4]) / n) * 100),
          unit: '%',
        },
        quotes: [],
      }
    }
    if (kind === 'yesno') {
      const yes = Math.round(n * (0.3 + r() * 0.4))
      return {
        index,
        question,
        kind,
        answered: n,
        bars: [
          { label: { en: 'Yes', ar: 'نعم' }, count: yes },
          { label: { en: 'No', ar: 'لا' }, count: n - yes },
        ],
        headline: {
          label: { en: 'Yes', ar: 'نعم' },
          value: Math.round((yes / n) * 100),
          unit: '%',
        },
        quotes: [],
      }
    }
    if (kind === 'choice') {
      const opts = optionsOf(question)
      const counts = split(
        n,
        opts.map(() => 0.4 + r()),
      )
      return {
        index,
        question,
        kind,
        answered: n,
        bars: opts.map((label, i) => ({ label, count: counts[i] })).sort((a, b) => b.count - a.count),
        quotes: [],
      }
    }
    const pick = (tone: 'good' | 'bad' | 'neutral') => QUOTES[tone][Math.floor(r() * QUOTES[tone].length)]
    return {
      index,
      question,
      kind,
      answered: Math.round(n * 0.6),
      bars: [],
      quotes: [
        { text: pick('good'), tone: 'good' },
        { text: pick('neutral'), tone: 'neutral' },
        { text: pick('bad'), tone: 'bad' },
      ],
    }
  }
  c.questions.forEach((question, index) => {
    const res = build(question, index)
    questions.push(question.showIf ? { ...res, askedOf: Math.round(basisOf(question) * shareThatMatch(question.showIf, questions[question.showIf.q])) } : res)
  })
  const headline = questions.find((x) => x.headline)?.headline
  return {
    asked,
    delivered,
    opened,
    answered,
    rate: Math.round((answered / asked) * 100),
    daily,
    questions,
    headline,
  }
}

