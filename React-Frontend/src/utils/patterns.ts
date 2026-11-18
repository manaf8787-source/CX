import type { Pattern, PatternThresholdKind, Signal } from '../types'
import { patternTraceIds } from './trace'

/** The thresholds of Rules and Definitions, Decision 1 (FR-4.6 / FR-4.16). Every number is a setting. */
export interface PatternRules {
  sameIssueMin: number
  sameAgentMin: number
  environmentConcentrationPct: number
  minimumSample: number
  windowDays: number
}

/** The documented defaults. The live values come from Settings -> Rules as configuration (`rulesFromConfig`). */
export const PATTERN_RULES: Readonly<PatternRules> = {
  sameIssueMin: 5,
  sameAgentMin: 3,
  environmentConcentrationPct: 50,
  minimumSample: 10,
  windowDays: 30,
}

export interface DetectPatternsOptions {
  /** When set, only signals inside the rolling window ending at `now` are counted. */
  windowDays?: number | null
  now?: number
  /** Threshold overrides (v40 F16/F32): a changed rule, or one value changed for a "What if" cell. Missing keys use `PATTERN_RULES`. */
  rules?: Partial<PatternRules>
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

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
  const R: PatternRules = { ...PATTERN_RULES, ...options.rules }
  const signals =
    windowDays == null
      ? allSignals
      : allSignals.filter((s) => {
          const age = now - new Date(s.occurredAt).getTime()
          return age >= 0 && age <= windowDays * 86_400_000
        })
  const patterns: Pattern[] = []

  for (const [category, list] of groupBy(signals, (s) => s.category)) {
    if (list.length < R.sameIssueMin) continue
    const key = `same_issue:${slug(category)}`
    patterns.push({
      id: key,
      key,
      traceId: '',
      signalIds: list.map((s) => s.id),
      team: `${list[0].environment} team`,
      category,
      windowDays: R.windowDays,
      sampleSize: list.length,
      thresholdKind: 'same_issue' as PatternThresholdKind,
      thresholdTarget: R.sameIssueMin,
      currentValue: list.length,
      hasMinimumSample: list.length >= R.minimumSample,
      aiSuggestion: { en: `Review ${category.replace(/_/g, ' ')} handling for this team.`, ar: 'مراجعة طريقة التعامل مع هذا النمط لهذا الفريق.' },
      recoveryFigure: recoverySentence(list.length + 4, list.length),
    })
  }

  for (const [agentRef, list] of groupBy(signals, (s) => s.agentRef)) {
    if (list.length < R.sameAgentMin) continue
    const key = `same_agent:${slug(agentRef)}`
    patterns.push({
      id: key,
      key,
      traceId: '',
      signalIds: list.map((s) => s.id),
      team: `${list[0].environment} team`,
      category: list[0].category,
      windowDays: R.windowDays,
      sampleSize: list.length,
      thresholdKind: 'same_agent' as PatternThresholdKind,
      thresholdTarget: R.sameAgentMin,
      currentValue: list.length,
      agentRef,
      hasMinimumSample: list.length >= R.minimumSample,
      aiSuggestion: { en: 'Coach this agent on the repeated issue before it becomes a team-wide pattern.', ar: 'تدريب هذا الوكيل على المشكلة المتكررة قبل أن تتحول لنمط عام للفريق.' },
      recoveryFigure: recoverySentence(list.length + 6, Math.max(1, list.length - 1)),
    })
  }

  for (const [category, inCategory] of groupBy(signals, (s) => s.category)) {
    const total = inCategory.length
    if (total < R.minimumSample) continue
    for (const [environment, list] of groupBy(inCategory, (s) => s.environment)) {
      const pct = (list.length / total) * 100
      if (pct < R.environmentConcentrationPct) continue
      const key = `environment_concentration:${slug(category)}:${slug(environment)}`
      patterns.push({
        id: key,
        key,
        traceId: '',
        signalIds: list.map((s) => s.id),
        team: `${environment} team`,
        category,
        windowDays: R.windowDays,
        sampleSize: total,
        thresholdKind: 'environment_concentration' as PatternThresholdKind,
        thresholdTarget: R.environmentConcentrationPct,
        currentValue: Math.round(pct),
        hasMinimumSample: true,
        aiSuggestion: { en: `${environment} carries most of this category's signals — look at local process or environment causes first.`, ar: `بيئة ${environment} تحمل معظم إشارات هذه الفئة — راجع العملية المحلية أو أسباب البيئة أولاً.` },
        recoveryFigure: recoverySentence(total + 3, list.length),
      })
    }
  }

  // Display ids PT-nnn: a hash of the stable key, probed so two patterns never share one.
  const traceIds = patternTraceIds(patterns.map((p) => p.key))
  for (const p of patterns) p.traceId = traceIds.get(p.key)!
  return patterns
}

const DAY_MS = 86_400_000
const memo = new Map<string, Pattern[]>()

/**
 * `detectPatterns` with a small cache, for reads at render time (B17: patterns are computed from the
 * rules at read time). The cache key is the caller's `scopeKey` (for example the environment scope),
 * the rule values, the signal count and the day, so a threshold edit recomputes and nothing else does.
 */
export function detectPatternsCached(scopeKey: string, signals: Signal[], rules: PatternRules, now: number = Date.now()): Pattern[] {
  const key = [scopeKey, rules.sameIssueMin, rules.sameAgentMin, rules.environmentConcentrationPct, rules.minimumSample, rules.windowDays, signals.length, Math.floor(now / DAY_MS)].join('|')
  const hit = memo.get(key)
  if (hit) return hit
  const result = detectPatterns(signals, { windowDays: rules.windowDays, now, rules })
  if (memo.size > 64) memo.clear()
  memo.set(key, result)
  return result
}

/** The three rows of the signals "What if" card (v40 F32); the concentration threshold is not included. */
export type WhatIfRuleKey = 'sameIssueMin' | 'sameAgentMin' | 'windowDays'

export interface WhatIfRow {
  rule: WhatIfRuleKey
  /** The current setting (shown in bold). */
  current: number
  cells: { value: number; patterns: number; isCurrent: boolean }[]
}

/**
 * How many patterns there would be if one threshold alone were changed to each candidate value,
 * with every other rule as configured. `total` is the count with today's thresholds.
 */
export function whatIf(
  signals: Signal[],
  rules: PatternRules,
  candidates: Record<WhatIfRuleKey, readonly number[]>,
  now: number = Date.now(),
): { total: number; rows: WhatIfRow[] } {
  const count = (over: Partial<PatternRules>) => {
    const r = { ...rules, ...over }
    return detectPatterns(signals, { windowDays: r.windowDays, now, rules: r }).length
  }
  const rows = (Object.keys(candidates) as WhatIfRuleKey[]).map((rule): WhatIfRow => ({
    rule,
    current: rules[rule],
    cells: candidates[rule].map((value) => ({ value, patterns: count({ [rule]: value }), isCurrent: value === rules[rule] })),
  }))
  return { total: count({}), rows }
}

/** How far a pattern is toward (or past) its rule: current value over the threshold. */
export function thresholdCloseness(p: Pick<Pattern, 'currentValue' | 'thresholdTarget'>): number {
  return p.thresholdTarget > 0 ? p.currentValue / p.thresholdTarget : 0
}

/** Patterns ordered for review: furthest past (or closest to) the threshold first;
 * patterns with the minimum sample before thin ones at the same closeness. */
export function sortByThresholdCloseness<T extends Pick<Pattern, 'currentValue' | 'thresholdTarget' | 'hasMinimumSample' | 'id'>>(patterns: T[]): T[] {
  return [...patterns].sort(
    (a, b) =>
      thresholdCloseness(b) - thresholdCloseness(a) ||
      Number(b.hasMinimumSample) - Number(a.hasMinimumSample) ||
      a.id.localeCompare(b.id),
  )
}
