import type {
  AuditEntry,
  Bi,
  CorrectiveAction,
  CorrectiveActionStatus,
  DetractorCallItem,
  RoleId,
} from '../types'
import { buildFeeds } from '../data/feeds'
import { buildCrmMapping } from '../data/crmMapping'
import { buildMatrix } from '../data/escalationDefaults'
import { SURVEY_QUESTION_SETS } from '../data/surveyQuestions'
import { auditEntry } from '../utils/audit'
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

// --- Weekly sample (F31, split by reader in v42.1) ----------------------------------------------

export { WEEKLY_SAMPLE_SIZE, buildWeeklySample } from './weeklySampleBuild'
