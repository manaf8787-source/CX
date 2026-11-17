import type { Pattern, PatternThresholdKind, Signal } from '../types'

/** Rules and Definitions, Decision 1 (FR-4.6 / FR-4.16). */
export const PATTERN_RULES = {
  sameIssueMin: 5,
  sameAgentMin: 3,
  environmentConcentrationPct: 50,
  minimumSample: 10,
  windowDays: 30,
} as const

export interface DetectPatternsOptions {
  /** When set, only signals inside the rolling window ending at `now` are counted. */
  windowDays?: number | null
  now?: number
}

function recoverySentence(tried: number, recovered: number): { en: string; ar: string } {
  const pct = Math.round((recovered / tried) * 100)
  return {
    en: `Tried in ${tried} similar closed cases, recovered in ${recovered}, ${recovered} of ${tried} is ${pct}%.`,
    ar: `جُرّب في ${tried} حالة مشابهة مغلقة، وتعافت ${recovered} منها، أي ${pct}%.`,
  }
}

function groupBy<K>(signals: Signal[], key: (s: Signal) => K | undefined): Map<K, Signal[]> {
  const map = new Map<K, Signal[]>()
  for (const s of signals) {
    const k = key(s)
    if (k === undefined) continue
    const list = map.get(k) ?? []
    list.push(s)
    map.set(k, list)
  }
  return map
}

/** FR-4.6 — three independent threshold rules, each producing its own
 * patterns: same issue 5+, same agent 3+, or one environment carrying 50%+
 * of a category's signals when that category has the minimum sample. */
export function detectPatterns(allSignals: Signal[], options: DetectPatternsOptions = {}): Pattern[] {
  const { windowDays = null, now = Date.now() } = options
  const signals =
    windowDays == null
      ? allSignals
      : allSignals.filter((s) => {
          const age = now - new Date(s.occurredAt).getTime()
          return age >= 0 && age <= windowDays * 86_400_000
        })
  const patterns: Pattern[] = []
  let n = 0

  for (const [category, list] of groupBy(signals, (s) => s.category)) {
    if (list.length < PATTERN_RULES.sameIssueMin) continue
    n += 1
    patterns.push({
      id: `pat-${n}`,
      signalIds: list.map((s) => s.id),
      team: `${list[0].environment} team`,
      category,
      windowDays: PATTERN_RULES.windowDays,
      sampleSize: list.length,
      thresholdKind: 'same_issue' as PatternThresholdKind,
      thresholdTarget: PATTERN_RULES.sameIssueMin,
      currentValue: list.length,
      hasMinimumSample: list.length >= PATTERN_RULES.minimumSample,
      aiSuggestion: { en: `Review ${category.replace(/_/g, ' ')} handling for this team.`, ar: 'مراجعة طريقة التعامل مع هذا النمط لهذا الفريق.' },
      recoveryFigure: recoverySentence(list.length + 4, list.length),
    })
  }

  for (const [agentRef, list] of groupBy(signals, (s) => s.agentRef)) {
    if (list.length < PATTERN_RULES.sameAgentMin) continue
    n += 1
    patterns.push({
      id: `pat-${n}`,
      signalIds: list.map((s) => s.id),
      team: `${list[0].environment} team`,
      category: list[0].category,
      windowDays: PATTERN_RULES.windowDays,
      sampleSize: list.length,
      thresholdKind: 'same_agent' as PatternThresholdKind,
      thresholdTarget: PATTERN_RULES.sameAgentMin,
      currentValue: list.length,
      agentRef,
      hasMinimumSample: list.length >= PATTERN_RULES.minimumSample,
      aiSuggestion: { en: 'Coach this agent on the repeated issue before it becomes a team-wide pattern.', ar: 'تدريب هذا الوكيل على المشكلة المتكررة قبل أن تتحول لنمط عام للفريق.' },
      recoveryFigure: recoverySentence(list.length + 6, Math.max(1, list.length - 1)),
    })
  }

  for (const [category, inCategory] of groupBy(signals, (s) => s.category)) {
    const total = inCategory.length
    if (total < PATTERN_RULES.minimumSample) continue
    for (const [environment, list] of groupBy(inCategory, (s) => s.environment)) {
      const pct = (list.length / total) * 100
      if (pct < PATTERN_RULES.environmentConcentrationPct) continue
      n += 1
      patterns.push({
        id: `pat-${n}`,
        signalIds: list.map((s) => s.id),
        team: `${environment} team`,
        category,
        windowDays: PATTERN_RULES.windowDays,
        sampleSize: total,
        thresholdKind: 'environment_concentration' as PatternThresholdKind,
        thresholdTarget: PATTERN_RULES.environmentConcentrationPct,
        currentValue: Math.round(pct),
        hasMinimumSample: true,
        aiSuggestion: { en: `${environment} carries most of this category's signals — look at local process or environment causes first.`, ar: `بيئة ${environment} تحمل معظم إشارات هذه الفئة — راجع العملية المحلية أو أسباب البيئة أولاً.` },
        recoveryFigure: recoverySentence(total + 3, list.length),
      })
    }
  }

  return patterns
}
