import type {
  AiInterviewCampaign,
  Bi,
  CorrectiveAction,
  DayChipState,
  DetractorCallItem,
  InboxItem,
  Investigation,
  Pattern,
  Person,
  RoleId,
} from '../types'
import { canAccessPath, canOpenPage } from '../auth/access'
import { DEFAULT_RULES_BAG, calendarFromRules, type RulesBag } from './ruleValues'
import { caId, invId } from './trace'
import { calendarDaysLeft, nextWeekday, startOfDay, toDayKey, workingDaysBetween } from './workingDays'

/**
 * My inbox (v40 F20): everything that is on a role, ordered by urgency, each with a day counter.
 * Pure function over the registers, so the Home card ("Your work today") and the inbox page
 * read exactly the same list.
 */

/** Short copy of the inbox page (v40 S7). */
export const INBOX_COPY = {
  title: { en: 'My inbox', ar: 'صندوقي' } as Bi,
  intro: {
    en: 'Everything that is on you, ordered by urgency. Each row says how many days are left and opens the record; nothing here is a notification you can lose.',
    ar: 'كل ما هو عليك، مرتباً بالأهمية. كل سطر يقول كم يوماً متبقياً ويفتح السجل؛ لا شيء هنا إشعار يضيع.',
  } as Bi,
  columns: { due: { en: 'Due', ar: 'المهلة' } as Bi, what: { en: 'What', ar: 'ماذا' } as Bi, with: { en: 'With', ar: 'مع' } as Bi },
  empty: { en: 'Nothing on you today.', ar: 'لا شيء عليك اليوم.' } as Bi,
  open: { en: 'Open', ar: 'افتح' } as Bi,
  footer: (approveDays: number, verifyDays: number): Bi => ({
    en: `Approval window: ${approveDays} working days. Verification at ${verifyDays} days. Changed under Settings → Rules as configuration.`,
    ar: `نافذة الاعتماد: ${approveDays} أيام عمل. التحقق عند ${verifyDays} يوماً. تُغيَّر في الإعدادات ← القواعد كإعدادات.`,
  }),
}

/** "Your work today" card on Home (v40 S1). */
export const WORK_TODAY_COPY = {
  title: { en: 'Your work today', ar: 'شغلك اليوم' } as Bi,
  hint: (n: number, urgent: number): Bi => ({
    en: `${n} items on you, ${urgent} urgent. Each has a day count.`,
    ar: `${n} بنداً عليك، ${urgent} عاجلة. لكل بند عدّاد أيام.`,
  }),
  button: { en: 'Open my inbox', ar: 'افتح صندوقي' } as Bi,
}

// --- Day chip -----------------------------------------------------------------

/** More than this many days late reads "overdue" instead of a count. */
export const OVERDUE_AFTER_DAYS = 30

/** State of the day chip: overdue (crit), late (crit), today, soon (warn, one day or less), ok (neutral), none (no date). */
export function dayChipState(daysLeft: number | null): DayChipState {
  if (daysLeft === null) return 'none'
  if (daysLeft < -OVERDUE_AFTER_DAYS) return 'overdue'
  if (daysLeft < 0) return 'late'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= 1) return 'soon'
  return 'ok'
}

/** The chip text (v40 S7): "overdue", "{n} working days late" / "{n} days late", "today", "{n} working days left" / "{n} days left". */
export function dayChipLabel(daysLeft: number | null, unit: 'wd' | 'd'): Bi | null {
  switch (dayChipState(daysLeft)) {
    case 'none':
      return null
    case 'overdue':
      return { en: 'overdue', ar: 'متأخر' }
    case 'today':
      return { en: 'today', ar: 'اليوم' }
    case 'late': {
      const n = Math.abs(daysLeft as number)
      return unit === 'wd' ? { en: `${n} working days late`, ar: `${n} يوم عمل تأخير` } : { en: `${n} days late`, ar: `${n} يوم تأخير` }
    }
    default: {
      const n = daysLeft as number
      return unit === 'wd' ? { en: `${n} working days left`, ar: `متبقٍ ${n} يوم عمل` } : { en: `${n} days left`, ar: `متبقٍ ${n} يوم` }
    }
  }
}

// --- Building the list -----------------------------------------------------------

export interface InboxInput {
  role: RoleId
  today: Date
  rules?: RulesBag
  /** The role's own environment (short English label), set for environment management only. */
  roleEnvironment?: string
  fixes: readonly CorrectiveAction[]
  patterns: readonly Pattern[]
  loopItems: readonly DetractorCallItem[]
  investigations: readonly Investigation[]
  campaigns: readonly AiInterviewCampaign[]
  persons: readonly Person[]
  /** Weekly sample: outputs read so far this week, of 50. */
  sampleRead?: number
  sampleSize?: number
  /** Thursday of the sample, 'YYYY-MM-DD'; computed from `today` when absent. */
  sampleDue?: string
}

/**
 * Fixes a role may see: L&D sees only the training-gap kind (KB §15); environment management only its own
 * environment's patterns (KB §2); everyone with the Actions page sees the rest; roles without it see none.
 */
export function visibleFixes(
  fixes: readonly CorrectiveAction[],
  patterns: readonly Pattern[],
  role: RoleId,
  roleEnvironment?: string,
): CorrectiveAction[] {
  if (!canOpenPage(role, '/actions')) return []
  let list = [...fixes]
  if (role === 'ld') list = list.filter((f) => f.kind === 'training_gap')
  if (role === 'envmgmt' && roleEnvironment) list = list.filter((f) => patterns.find((p) => p.id === f.patternId)?.team.startsWith(roleEnvironment))
  return list
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const same = (s: string): Bi => ({ en: s, ar: s })

export function buildInbox(input: InboxInput): InboxItem[] {
  const rules = input.rules ?? DEFAULT_RULES_BAG
  const cal = calendarFromRules(rules)
  const today = startOfDay(input.today)
  const items: InboxItem[] = []
  const role = input.role

  // Fixes: approve, do, verify (fix visibility rules).
  for (const f of visibleFixes(input.fixes, input.patterns, role, input.roleEnvironment)) {
    const title = f.title.en
    const owner = same(f.owner)
    const target = `/actions/corrective?fix=${caId(f.id)}`
    if (f.status === 'proposed') {
      const left = rules.approveDays - workingDaysBetween(f.proposedAt, today, cal)
      items.push({
        id: `approve:${f.id}`,
        kind: 'approve',
        text: { en: `Approve, change, reject or investigate: ${clip(f.title.en, 80)}`, ar: `اعتمد أو عدّل أو ارفض أو حقّق: ${clip(f.title.ar, 80)}` },
        daysLeft: left,
        unit: 'wd',
        who: owner,
        priority: left <= 1 ? 2 : 1,
        target,
      })
    } else if (f.status === 'approved' || f.status === 'in_progress') {
      const left = calendarDaysLeft(f.dueDate, today)
      items.push({
        id: `do:${f.id}`,
        kind: 'do',
        text: { en: `Do the fix and mark it done: ${title}`, ar: `نفّذ الحل وعلّمه منجزاً: ${f.title.ar}` },
        daysLeft: left,
        unit: 'd',
        who: owner,
        priority: left < 0 ? 2 : left <= 3 ? 1 : 0,
        target,
      })
    } else if (f.status === 'verification') {
      const day = toDayKey(f.verificationDueAt)
      items.push({
        id: `verify:${f.id}`,
        kind: 'verify',
        text: { en: `${rules.verifyDays}-day check runs on ${day}`, ar: `فحص الـ${rules.verifyDays} يوماً يجري في ${day}` },
        daysLeft: calendarDaysLeft(f.verificationDueAt, today),
        unit: 'd',
        who: { en: 'Agent 6', ar: 'الوكيل 6' },
        priority: 0,
        target,
      })
    }
  }

  // Close the loop and investigations: CX only. A DNCR person is never callable, so never listed.
  if (canAccessPath(role, '/close-the-loop')) {
    const person = (id: string) => input.persons.find((p) => p.id === id)
    for (const l of input.loopItems) {
      if (l.status === 'done') continue
      const p = person(l.personId)
      if (p?.consent.dncr) continue
      const critical = l.severity === 'critical'
      const due = l.nextAttemptOn ?? l.dueOn
      const left = due ? workingDaysBetween(today, due, cal) : null
      const campaign = input.campaigns.find((c) => c.memberIds.includes(l.id))
      const name = p?.name ?? l.personId
      const reason = `${(l.instrument ?? 'nps').toUpperCase()} ${l.firstScore}`
      items.push({
        id: `call:${l.id}`,
        kind: 'call',
        text: { en: `${critical ? 'Critical · ' : ''}Call ${name} · ${reason}`, ar: `${critical ? 'حرج · ' : ''}اتصل بـ ${name} · ${reason}` },
        daysLeft: left,
        unit: 'wd',
        who: l.channel === 'ai_campaign' && campaign ? { en: `AI campaign ${campaign.id}`, ar: `حملة AI ${campaign.id}` } : { en: 'CX team', ar: 'فريق CX' },
        priority: critical ? 2 : left !== null && left < 0 ? 1 : 0,
        target: `/close-the-loop?item=${l.id}`,
        critical,
      })
    }
  }
  if (canAccessPath(role, '/actions/investigations') && (role === 'cxmgr' || role === 'cxteam')) {
    for (const inv of input.investigations) {
      if (inv.status === 'returned') continue
      const id = invId(inv.id)
      const interviews = inv.kind === 'customer_interviews'
      items.push({
        id: `inv:${inv.id}`,
        kind: 'inv',
        text: interviews
          ? { en: `Investigation open: ${id} · ${inv.doneCount ?? 0}/${inv.requestedCount ?? 0} interviews`, ar: `تحقيق مفتوح: ${id} · ${inv.doneCount ?? 0}/${inv.requestedCount ?? 0} مقابلات` }
          : { en: `Investigation open: ${id} · shopper check`, ar: `تحقيق مفتوح: ${id} · فحص متسوق` },
        daysLeft: null,
        unit: 'd',
        who: { en: 'Agent 8', ar: 'الوكيل 8' },
        priority: 0,
        target: `/actions/investigations?inv=${id}`,
      })
    }
  }

  // Weekly sample: Internal Audit only.
  if (role === 'auditmkt') {
    const size = input.sampleSize ?? 50
    const read = input.sampleRead ?? 0
    const due = input.sampleDue ?? nextWeekday(today, 4)
    items.push({
      id: 'sample:week',
      kind: 'sample',
      text: { en: `Weekly sample: ${size} outputs to read, ${read} read`, ar: `العينة الأسبوعية: ${size} مخرجاً للقراءة، قُرئ ${read}` },
      daysLeft: calendarDaysLeft(due, today),
      unit: 'd',
      who: null,
      priority: 1,
      target: '/settings/weekly-sample',
    })
  }

  return items.sort((a, b) => b.priority - a.priority || (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY) || a.id.localeCompare(b.id))
}

/** The numbers of the "Your work today" hint: items on the role and how many are urgent (priority 1 or more). */
export function workTodayStats(items: readonly InboxItem[]): { total: number; urgent: number } {
  return { total: items.length, urgent: items.filter((i) => i.priority >= 1).length }
}
