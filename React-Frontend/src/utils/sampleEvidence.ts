import type { Bi, CorrectiveAction, DetractorCallItem, Interaction, Pattern, Severity, Signal } from '../types'
import { CHANNEL_LABEL } from '../components/customers/channels'
import { signalCategoryLabel, signalKindLabel } from '../pages/actions/components/labels'
import { invId } from './trace'

/**
 * What an agent saw, one line per weekly-sample row (v41.1 F29): the input the output was made from, so a reader can judge it
 * from the row itself. Every line is built from structured facts: a source, a date, a count, a score, a recovery figure. No
 * customer or agent name and no conversation text ever goes in (the Internal Audit and Marketing Lead reads these lines).
 * All wording is sample data.
 */

export const join = (parts: Bi[]): Bi => ({ en: parts.map((p) => p.en).join(' · '), ar: parts.map((p) => p.ar).join(' · ') })
export const bi = (en: string, ar: string): Bi => ({ en, ar })

/** English count with its noun: `1 problem`, `3 problems`. */
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Date part of an ISO time, or an en dash when there is none. */
export const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '–')

/**
 * The one-line summary Agent 2 holds for a signal of this category. The sample's signals carry no text of their own (the
 * conversation text stays on the record, for the CX team and the CX manager), so the line is third person and per category.
 */
const SIGNAL_SUMMARY: Record<string, Bi> = {
  slow_response: bi('Customer waited several days for a reply', 'انتظر العميل عدة أيام للحصول على رد'),
  repeat_contact: bi('Customer contacted us again about the same issue', 'تواصل العميل مجدداً بشأن المشكلة نفسها'),
  wrong_language: bi('Reply came in a language the customer did not use', 'جاء الرد بلغة لم يستخدمها العميل'),
  promise_not_kept: bi('A promised callback did not happen', 'اتصال موعود لم يتم'),
  unapproved_discount: bi('A discount was offered without approval', 'عُرض خصم دون موافقة'),
}

/** The signal text as the reader sees it; an unknown category falls back to its label. */
export function signalSummary(category: string): Bi {
  return SIGNAL_SUMMARY[category] ?? signalCategoryLabel(category)
}

/** Where a signal came from: the channel of its first event; a public mention has no event, so its source is the public channel. */
export function signalSource(events: readonly Pick<Interaction, 'channel'>[]): Bi {
  return events[0] ? CHANNEL_LABEL[events[0].channel] : signalKindLabel('public_mention')
}

/** Agent 2's input: the source, the date and the signal's text. A public mention has no event, so its source is the public channel. */
export function signalSaw(signal: Pick<Signal, 'kind' | 'category' | 'occurredAt'>, events: readonly Pick<Interaction, 'channel'>[]): Bi {
  const source = signalSource(events)
  const text = signalSummary(signal.category)
  return join([source, bi(day(signal.occurredAt), day(signal.occurredAt)), bi(`"${text.en}"`, `"${text.ar}"`)])
}

/**
 * Agent 2's severity for a signal [Proposed]: the sample's signals hold none and the spec gives Agent 2 no scale, so this uses the
 * portal's three levels. Critical is a legal, privacy or safety signal (the only signal that opens a case directly); medium is a
 * breach, or a signal whose events carry two different problems; everything else is low.
 */
export function signalSeverity(signal: Pick<Signal, 'kind'>, events: readonly Pick<Interaction, 'problemFlags'>[]): Severity {
  if (signal.kind === 'legal_privacy_safety') return 'critical'
  const flags = new Set(events.flatMap((e) => e.problemFlags))
  return signal.kind === 'breach' || flags.size >= 2 ? 'medium' : 'low'
}

export const SEVERITY_WORD: Record<Severity, Bi> = {
  critical: bi('critical', 'حرجة'),
  medium: bi('medium', 'متوسطة'),
  low: bi('low', 'منخفضة'),
}

/** What the pattern says in a few words; a same-agent pattern never names the agent. */
export function patternRule(p: Pick<Pattern, 'thresholdKind' | 'category' | 'currentValue'>): Bi {
  const label = signalCategoryLabel(p.category)
  if (p.thresholdKind === 'same_agent') return bi('Same agent', 'الوكيل نفسه')
  if (p.thresholdKind === 'environment_concentration') return bi(`${p.currentValue}% in one environment: ${label.en}`, `${p.currentValue}% في بيئة واحدة: ${label.ar}`)
  return bi(`Same issue: ${label.en}`, `المشكلة نفسها: ${label.ar}`)
}

export const signalsInWindow = (p: Pick<Pattern, 'signalIds' | 'windowDays'>): Bi => bi(`${count(p.signalIds.length, 'signal')} in ${p.windowDays} days`, `${p.signalIds.length} إشارة خلال ${p.windowDays} يوماً`)

/** Agent 5's input: the pattern, how many signals made it, and how often this fix recovered customers before. */
export function fixSaw(fix: Pick<CorrectiveAction, 'fromInsight' | 'source'>, pattern: Pattern | undefined): Bi {
  if (pattern) return join([patternRule(pattern), signalsInWindow(pattern), pattern.recoveryFigure])
  if (fix.fromInsight) return join([bi('AI Insights suggestion', 'اقتراح رؤى الذكاء الاصطناعي'), fix.fromInsight.recovery])
  if (fix.source) return bi(`Returned investigation ${invId(fix.source.investigationId)}`, `تحقيق عائد ${invId(fix.source.investigationId)}`)
  return bi('No pattern: proposed from the form', 'بلا نمط: اقتُرح من النموذج')
}

/** Agent 3's input for a count: the signals, the window and the sample behind a pattern. */
export function countSaw(pattern: Pick<Pattern, 'signalIds' | 'windowDays' | 'sampleSize'>): Bi {
  return join([signalsInWindow(pattern), bi(`sample ${pattern.sampleSize}`, `العينة ${pattern.sampleSize}`)])
}

/** Events on a person's timeline and how many of them carry a problem flag. */
function timeline(events: readonly Pick<Interaction, 'problemFlags'>[]) {
  return { events: events.length, problems: events.filter((e) => e.problemFlags.length > 0).length }
}

/** Agent 8's input for an interview brief: the first score, the timeline it read and the problems it found. */
export function briefSaw(item: Pick<DetractorCallItem, 'instrument' | 'firstScore'>, events: readonly Pick<Interaction, 'problemFlags'>[]): Bi {
  const { events: n, problems } = timeline(events)
  const score = `${(item.instrument ?? 'nps').toUpperCase()} ${item.firstScore}`
  return join([bi(score, score), bi(`${count(n, 'event')} on the timeline`, `${n} حدثاً على الخط الزمني`), bi(`${count(problems, 'problem')} found`, `${problems} مشكلة مرصودة`)])
}

/** Agent 7's input for a journey reading: events, problems and the last contact. */
export function journeySaw(events: readonly Pick<Interaction, 'problemFlags' | 'occurredAt'>[]): Bi {
  const { events: n, problems } = timeline(events)
  const last = day(events.map((e) => e.occurredAt).sort().at(-1))
  return join([bi(count(n, 'event'), `${n} حدثاً`), bi(count(problems, 'problem'), `${problems} مشكلة`), bi(`last contact ${last}`, `آخر تواصل ${last}`)])
}
