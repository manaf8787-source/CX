import type {
  AiJourneyReading,
  AuditEntry,
  Bi,
  CorrectiveAction,
  CorrectiveActionStatus,
  DetractorCallItem,
  Interaction,
  Pattern,
  Person,
  RoleId,
  Signal,
  WeeklySampleItem,
} from '../types'
import { buildFeeds } from '../data/feeds'
import { buildCrmMapping } from '../data/crmMapping'
import { buildMatrix } from '../data/escalationDefaults'
import { ownerTitle } from '../data/ownerTitles'
import { SURVEY_QUESTION_SETS } from '../data/surveyQuestions'
import { signalCategoryLabel } from '../pages/actions/components/labels'
import { RUNAWAY_TYPE_LABEL } from '../utils/runaway'
import { auditEntry } from '../utils/audit'
import { REASON_CODE_LABEL, suggestReasonCode } from '../utils/closeTheLoop'
import { SEVERITY_WORD, briefSaw, countSaw, fixSaw, journeySaw, signalSaw, signalSeverity } from '../utils/sampleEvidence'
import { caId, sgId } from '../utils/trace'
import { addWorkingDays, nextWorkingDay, toDayKey } from '../utils/workingDays'

/**
 * Builders and constants for the v39/v40 sample data (docs/V40_DELTA.md section D1).
 * `mockData.ts` re-exports this module, so `mockStore.ts` stays unchanged. Everything here is
 * deterministic (no random draws) so the seeded base sample keeps its sequence.
 * All figures and names are sample data.
 */

// --- Independent registers -----------------------------------------------------

export const MOCK_FEEDS = buildFeeds()
export const MOCK_MAPPING = buildCrmMapping()
export const MOCK_MATRIX = buildMatrix()
export const MOCK_QUESTION_SETS = SURVEY_QUESTION_SETS.map((s) => ({ ...s, questions: [...s.questions] }))

// --- Audit trail seeds (F21) -----------------------------------------------------

const DAY = 86_400_000

/** The role that plausibly acted on a fix of this kind (sample only). */
function actingRole(kind: CorrectiveAction['kind']): RoleId {
  if (kind === 'training_gap') return 'ld'
  if (kind === 'legal_privacy' || kind === 'marketing') return 'cxmgr'
  return 'envmgmt'
}

/**
 * A believable audit trail for a seeded fix, from its status: proposed by Agent 5, then the decision,
 * then the status moves it has already made. Entries are dated after `proposedAt` and never in the future.
 */
export function seedAuditLog(
  fix: Pick<CorrectiveAction, 'kind' | 'status' | 'decision' | 'decisionReason'>,
  proposedAt: string,
  patternTraceId?: string,
  now: number = Date.now(),
): AuditEntry[] {
  const start = Date.parse(proposedAt)
  const at = (days: number) => new Date(Math.min(now, start + days * DAY + 9 * 3_600_000)).toISOString()
  const role = actingRole(fix.kind)
  const log: AuditEntry[] = [
    auditEntry(
      'system',
      { en: `Proposed by Agent 5${patternTraceId ? ` from pattern ${patternTraceId}` : ''}`, ar: `اقترحه الوكيل 5${patternTraceId ? ` من النمط ${patternTraceId}` : ''}` },
      proposedAt,
    ),
  ]
  if (fix.status === 'proposed') return log
  const reason = fix.decisionReason?.en && fix.decisionReason.en !== '—' ? fix.decisionReason : undefined
  log.push(
    auditEntry(
      role,
      fix.decision === 'modified'
        ? { en: `Changed and approved${reason ? `: ${reason.en}` : ''}`, ar: `عُدّل واعتُمد${reason ? `: ${reason.ar}` : ''}` }
        : { en: 'Approved', ar: 'اعتُمد' },
      at(1),
    ),
  )
  const moved: CorrectiveActionStatus[] = ['in_progress', 'verification', 'effective', 'partial', 'failed']
  if (moved.includes(fix.status)) log.push(auditEntry(role, { en: 'Status set to In progress', ar: 'الحالة: قيد التنفيذ' }, at(3)))
  if (['verification', 'effective', 'partial', 'failed'].includes(fix.status)) {
    log.push(auditEntry(role, { en: 'Marked done; the 60-day check is scheduled', ar: 'عُلّم منجزاً؛ جُدول فحص الـ60 يوماً' }, at(9)))
  }
  if (['effective', 'partial', 'failed'].includes(fix.status)) {
    const verdict: Record<string, Bi> = {
      effective: { en: 'Verdict: effective', ar: 'الحكم: فعّال' },
      partial: { en: 'Verdict: partial', ar: 'الحكم: جزئي' },
      failed: { en: 'Verdict: failed', ar: 'الحكم: فاشل' },
    }
    log.push(auditEntry('system', verdict[fix.status], at(12)))
  }
  return log
}

// --- Close the loop: attempts (F27) ---------------------------------------------------

/**
 * Attempt state for the sample's open rows: item 2 still to do, 5 and 8 "no answer" (1 and 2 attempts
 * so far, next attempt the following working days), 11 at the last attempt ("needs a human").
 * Every other item has had its call. `today` is the sample day; dates use the default Monday-to-Friday week.
 */
export function seedCallAttempts(index: number, open: boolean, tries: number, today: Date = new Date()): Pick<DetractorCallItem, 'attempts' | 'status' | 'nextAttemptOn' | 'dueOn'> {
  if (!open) return { attempts: 1, status: 'done' }
  const dueOn = toDayKey(addWorkingDays(today, 5))
  if (index === 2) return { attempts: 0, status: 'to_do', dueOn: toDayKey(addWorkingDays(today, 2)) }
  if (index === 5) return { attempts: 1, status: 'no_answer', nextAttemptOn: toDayKey(nextWorkingDay(today)), dueOn }
  if (index === 8) return { attempts: Math.min(2, tries - 1), status: 'no_answer', nextAttemptOn: toDayKey(addWorkingDays(today, 2)), dueOn }
  return { attempts: tries, status: 'needs_human', dueOn }
}

// --- Weekly sample (F31) ----------------------------------------------------------------

export const WEEKLY_SAMPLE_SIZE = 50

interface SampleInput {
  fixes: readonly CorrectiveAction[]
  signals: readonly Signal[]
  patterns: readonly Pattern[]
  loopItems: readonly DetractorCallItem[]
  persons: readonly Person[]
  readings: readonly AiJourneyReading[]
  /** Every event: the input an agent read (v41.1 F29). */
  interactions: readonly Interaction[]
}

const KIND = {
  fix: { en: 'Proposed fix', ar: 'حل مقترح' },
  classification: { en: 'Classification', ar: 'تصنيف' },
  brief: { en: 'Interview brief', ar: 'ملخص مقابلة' },
  journey: { en: 'Journey reading', ar: 'قراءة رحلة' },
  count: { en: 'Signal count', ar: 'عدّ إشارة' },
} satisfies Record<string, Bi>

/**
 * The fifty outputs of the week, in the prototype's composition: every fix (Agent 5), the first 18 signals
 * (Agent 2), the first 12 close-the-loop rows (Agent 8), the first 10 people (Agent 7), padded with Agent 3
 * signal counts. [Proposed] composition (not in the spec). No text carries a customer name: items about a
 * person carry `personId`, and the page resolves the name only for roles that may see names.
 *
 * v41.1 (F29): a row can be judged from itself. `saw` is the input the agent worked from, `text` the output in one line, and
 * `open` what the CX roles' "Open" button opens. Evidence lines come from `utils/sampleEvidence.ts`: facts, never names or text.
 */
export function buildWeeklySample(input: SampleInput): WeeklySampleItem[] {
  const out: WeeklySampleItem[] = []
  const add = (agent: number, kind: Bi, saw: Bi, text: Bi, ref: string, open?: WeeklySampleItem['open'], personId?: string) => {
    if (out.length >= WEEKLY_SAMPLE_SIZE) return
    out.push({ id: `ws-${out.length + 1}`, agent, kind, saw, text, ref, open, personId, verdict: null })
  }
  const eventsOf = new Map<string, Interaction[]>()
  const eventById = new Map<string, Interaction>()
  for (const i of input.interactions) {
    eventById.set(i.id, i)
    eventsOf.set(i.personKey, [...(eventsOf.get(i.personKey) ?? []), i])
  }
  const patternById = new Map(input.patterns.map((p) => [p.id, p]))
  const signalEvents = (s: Signal) => s.eventIds.map((id) => eventById.get(id)).filter((e): e is Interaction => !!e)

  for (const f of input.fixes) {
    const owner = ownerTitle(f.owner)
    add(5, KIND.fix, fixSaw(f, f.patternId ? patternById.get(f.patternId) : undefined), { en: `${f.title.en} → ${owner.en}`, ar: `${f.title.ar} ← ${owner.ar}` }, caId(f.id), { traceKind: 'fix', id: caId(f.id) })
  }
  for (const s of input.signals.slice(0, 18)) {
    const label = signalCategoryLabel(s.category)
    const events = signalEvents(s)
    const severity = SEVERITY_WORD[signalSeverity(s, events)]
    add(2, KIND.classification, signalSaw(s, events), { en: `${label.en} · ${severity.en} severity`, ar: `${label.ar} · خطورة ${severity.ar}` }, sgId(s.id), { traceKind: 'signal', id: sgId(s.id) })
  }
  for (const l of input.loopItems.slice(0, 12)) {
    const events = eventsOf.get(l.personId) ?? []
    const reason = REASON_CODE_LABEL[suggestReasonCode(events)]
    const critical = l.severity === 'critical'
    add(
      8,
      KIND.brief,
      briefSaw(l, events),
      { en: `Reason suggested: ${reason.en}${critical ? ' · critical' : ''}`, ar: `السبب المقترح: ${reason.ar}${critical ? ' · حرج' : ''}` },
      l.id,
      { to: `/close-the-loop?item=${l.id}` },
      l.personId,
    )
  }
  for (const p of input.persons.slice(0, 10)) {
    const verdict = input.readings.find((r) => r.personId === p.id)?.verdict
    const label: Bi = verdict && verdict !== 'healthy' && verdict !== 'high_effort' ? RUNAWAY_TYPE_LABEL[verdict] : verdict === 'high_effort' ? { en: 'High effort', ar: 'جهد مرتفع' } : { en: 'Healthy', ar: 'سليم' }
    add(7, KIND.journey, journeySaw(eventsOf.get(p.id) ?? []), { en: `Reading: ${label.en}`, ar: `القراءة: ${label.ar}` }, p.id.toUpperCase(), { to: `/customers/${p.id}` }, p.id)
  }
  for (const p of input.patterns) {
    const label = signalCategoryLabel(p.category)
    add(3, KIND.count, countSaw(p), { en: `${label.en}: ${p.signalIds.length} signals`, ar: `${label.ar}: ${p.signalIds.length} إشارات` }, p.traceId, { traceKind: 'pattern', id: p.traceId })
  }
  for (const s of input.signals.slice(18)) {
    const label = signalCategoryLabel(s.category)
    add(3, KIND.count, signalSaw(s, signalEvents(s)), { en: `Counted toward ${label.en}`, ar: `مُحتسبة ضمن ${label.ar}` }, sgId(s.id), { traceKind: 'signal', id: sgId(s.id) })
  }
  return out
}
