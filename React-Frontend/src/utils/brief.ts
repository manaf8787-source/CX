import type { Bi, BriefInputs, IndicatorSet, InboxItem, NextStep, Product, ProductId, RoleId, StepId } from '../types'
import { HR_NOW, IVR_REQUESTS, IVR_TARGET_HOURS, OPS_REQUESTS, OPS_TYPE, RECRUITMENT, STUCK_DAYS, daysBetween, hoursBetween } from '@/data/hrOps'
import { canAccessPath } from '../auth/access'
import { CLOSE_LOOP_NEXT, actionsNext, fixNext } from '../data/steps'
import { fmtSigned } from './indicators'

/**
 * The Daily brief written by Agent 9 at 07:00 (v40 F09): one short list per role, every line built from the same
 * numbers the pages show (`useBriefInputs`, `useIndicators`), each line linking to its page only when the role may
 * open it (a line the role cannot open is plain text, never a dead or forbidden link).
 *
 * Templates are the prototype's (docs/V40_DELTA.md S3). Where the prototype wrote a singular-less sentence
 * ("1 patterns"), this one agrees in English and in Arabic (singular, dual, plural of 3 to 10, singular of 11 and over).
 * Which lines each role gets is `[Proposed]` (the KB only says "one per role"): `BRIEF_LINES_BY_ROLE` is the one place to edit.
 */

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Card copy (S3). */
export const BRIEF_COPY = {
  title: b('Daily brief', 'الموجز اليومي'),
  hint: b(
    'Written at 07:00 by Agent 9 from the same numbers the pages show, for your role only; the supervisor checked every figure. Each line opens its page.',
    'يكتبه الوكيل 9 الساعة 07:00 من الأرقام نفسها التي تعرضها الصفحات، لدورك فقط؛ راجع السوبرفايزر كل رقم. كل سطر يفتح صفحته.',
  ),
  /** Tooltip of the `[Proposed]` badge on the card: the line set per role is not decided. */
  proposedTitle: b(
    'Which lines each role gets is proposed, not confirmed. The numbers are the pages’ own.',
    'أي الأسطر يصل إلى كل دور مقترح وغير مؤكد. أما الأرقام فهي أرقام الصفحات نفسها.',
  ),
  /** Shown instead of the list for a role that has no brief. */
  none: b('There is no brief for your role.', 'لا يوجد موجز لدورك.'),
  /** Screen-reader text beside a line that is not a link. */
  noPage: b('(no page for your role)', '(لا صفحة لدورك)'),
}

export type BriefLineKind =
  | 'nps'
  | 'detractors'
  | 'signals'
  | 'fixes'
  | 'shopper'
  | 'loop'
  | 'drifting'
  | 'public'
  | 'ld'
  | 'conduct'
  | 'sample'
  | 'campaigns'
  | 'hr_calls'
  | 'hr_recruit'
  | 'hr_requests'

/**
 * Lines per role, in the order shown (V40_DELTA F09 table). `[Proposed]`: the KB says "one per role" and nothing more.
 * The mystery shopper has no brief (it sees its own tasks only).
 */
export const BRIEF_LINES_BY_ROLE: Record<RoleId, readonly BriefLineKind[]> = {
  cxmgr: ['nps', 'detractors', 'signals', 'fixes', 'shopper', 'loop', 'drifting', 'public'],
  cxteam: ['nps', 'detractors', 'signals', 'fixes', 'shopper', 'loop', 'drifting', 'public'],
  exec: ['nps', 'signals', 'fixes', 'shopper', 'drifting', 'public'],
  envmgmt: ['nps', 'signals', 'fixes', 'shopper'],
  teamlead: ['nps', 'signals', 'fixes', 'shopper'],
  aslead: ['nps', 'signals', 'fixes', 'shopper'],
  hrspec: ['nps', 'signals', 'fixes', 'shopper', 'conduct'],
  // 24 Nov (owner, via Alaa): the HR director's brief is HR's own work, not the customer NPS
  hrmgr: ['hr_calls', 'hr_recruit', 'hr_requests', 'conduct'],
  ld: ['nps', 'signals', 'fixes', 'ld'],
  marketing: ['nps', 'drifting', 'public'],
  // v42.1 (F33): the campaign line after the NPS lines (the prototype puts it second, right after its first line) [Proposed position]
  auditmkt: ['nps', 'campaigns', 'drifting', 'public', 'sample'],
  shopper: [],
  admin: [],
  useradmin: [],
  custom: [],
}

/**
 * Where each line opens. The prototype sends the NPS and public-mention lines to the Overview even for roles that cannot
 * open it, the sample line to the agents page and the people line to a view with no menu entry: here a line links only
 * to a page the role can open, the public line goes to the Public mentions page, the sample line to the sample page,
 * the people line to Customers, Who is leaving. `[Proposed]` (docs/V40_DELTA.md F09).
 */
export const BRIEF_TARGET: Record<BriefLineKind, string> = {
  nps: '/overview',
  detractors: '/detractors',
  signals: '/actions/signals',
  fixes: '/actions/corrective',
  shopper: '/actions/shopper-cases',
  loop: '/close-the-loop',
  drifting: '/runaway',
  public: '/settings/public-mentions',
  ld: '/actions/corrective',
  conduct: '/actions/corrective',
  sample: '/settings/weekly-sample',
  campaigns: '/settings/campaign-audit',
  hr_calls: '/settings/hr-team',
  hr_recruit: '/settings/hr-team?tab=recruitment',
  hr_requests: '/settings/hr-team?tab=operations',
}

export interface BriefLine {
  /** Stable key, e.g. `nps:re`. */
  id: string
  kind: BriefLineKind
  text: Bi
  /** Set only when the role can open the page. */
  to?: string
}

// --- Grammar --------------------------------------------------------------------------------------------------

/** English singular and plural; Arabic singular (with "one"), dual, plural for 3 to 10, singular accusative for 11 and over. */
interface Forms {
  en: readonly [string, string]
  ar: readonly [string, string, string, string]
}

/** "1 signal" / "5 signals" and "إشارة واحدة" / "إشارتان" / "5 إشارات" / "12 إشارة". Zero takes the plural. */
export function count(n: number, f: Forms): Bi {
  const en = `${n} ${n === 1 ? f.en[0] : f.en[1]}`
  let ar: string
  if (n === 1) ar = f.ar[0]
  else if (n === 2) ar = f.ar[1]
  else if (n <= 10) ar = `${n} ${f.ar[2]}`
  else ar = `${n} ${f.ar[3]}`
  return b(en, ar)
}

const SIGNAL: Forms = { en: ['signal', 'signals'], ar: ['إشارة واحدة', 'إشارتان', 'إشارات', 'إشارة'] }
const PATTERN: Forms = { en: ['pattern', 'patterns'], ar: ['نمط واحد', 'نمطان', 'أنماط', 'نمطاً'] }
const FIX: Forms = { en: ['fix', 'fixes'], ar: ['حل واحد', 'حلان', 'حلول', 'حلاً'] }
const SHOPPER_CASE: Forms = { en: ['shopper case', 'shopper cases'], ar: ['حالة متسوق واحدة', 'حالتا متسوق', 'حالات متسوق', 'حالة متسوق'] }
const UNHAPPY: Forms = { en: ['unhappy customer', 'unhappy customers'], ar: ['زبون غير راضٍ', 'زبونان غير راضيين', 'زبائن غير راضين', 'زبوناً غير راضٍ'] }
const MENTION: Forms = { en: ['public mention', 'public mentions'], ar: ['إشارة عامة واحدة', 'إشارتان عامتان', 'إشارات عامة', 'إشارة عامة'] }
const CONDUCT_NOTE: Forms = { en: ['conduct note', 'conduct notes'], ar: ['ملاحظة سلوك واحدة', 'ملاحظتا سلوك', 'ملاحظات سلوك', 'ملاحظة سلوك'] }
const TRAINING_FIX: Forms = { en: ['training-gap fix', 'training-gap fixes'], ar: ['حل فجوة تدريب واحد', 'حلا فجوة تدريب', 'حلول فجوة تدريب', 'حل فجوة تدريب'] }
const POINT: Forms = { en: ['point', 'points'], ar: ['نقطة واحدة', 'نقطتين', 'نقاط', 'نقطة'] }
const PERSON_ON_RECORD: Forms = { en: ['person on record', 'people on record'], ar: ['شخص واحد في السجل', 'شخصان في السجل', 'أشخاص في السجل', 'شخصاً في السجل'] }
const PRODUCT: Forms = { en: ['product', 'products'], ar: ['منتج واحد', 'منتجان', 'منتجات', 'منتجاً'] }

const isAre = (n: number) => (n === 1 ? 'is' : 'are')
/** Arabic verb agreement for a counted subject: one, two, many. */
const agr = (n: number, one: string, two: string, many: string) => (n === 1 ? one : n === 2 ? two : many)

/** Wraps a signed value so "+32" keeps its sign on the left inside Arabic text (an isolate, no visible character). */
const ltr = (s: string) => `⁦${s}⁩`

// --- Lines ---------------------------------------------------------------------------------------------------------

/** "{product} NPS is +32, up 3 points on last month". `too early` when there are no answers. */
export function npsLine(product: Product, set: IndicatorSet): Bi {
  const name = product.name
  if (set.nps == null) return b(`${name.en} NPS: too early`, `NPS ${name.ar}: مبكر`)
  const value = fmtSigned(set.nps)
  const d = set.deltaVsLastMonth
  let en = `${name.en} NPS is ${value}`
  let ar = `NPS ${name.ar} هو ${ltr(value)}`
  if (d != null) {
    const pts = count(Math.abs(d), POINT)
    if (d > 0) {
      en += `, up ${pts.en} on last month`
      ar += `، ارتفع ${pts.ar} عن الشهر الماضي`
    } else if (d < 0) {
      en += `, down ${pts.en} on last month`
      ar += `، انخفض ${pts.ar} عن الشهر الماضي`
    } else {
      en += ', unchanged on last month'
      ar += '، دون تغيير عن الشهر الماضي'
    }
  }
  return b(en, ar)
}

function signalsLine(i: BriefInputs): Bi {
  const rec = count(i.signals.inWindow, SIGNAL)
  const p = i.signals.patternsWaitingForFix
  const pats = count(p, PATTERN)
  return b(
    `${rec.en} in the last ${i.windowDays} days; ${pats.en} crossed the line and ${isAre(p)} waiting for a fix`,
    `${rec.ar} في آخر ${i.windowDays} يوماً؛ ${pats.ar} ${agr(p, 'تجاوز الحد وينتظر حلاً', 'تجاوزا الحد وينتظران حلاً', 'تجاوزت الحد وتنتظر حلاً')}`,
  )
}

function fixesLine(i: BriefInputs): Bi {
  const f = i.fixes
  const prop = count(f.proposed, FIX)
  return b(
    `${prop.en} ${isAre(f.proposed)} waiting for a yes, ${f.inProgress} ${isAre(f.inProgress)} in progress, ${f.late} ${isAre(f.late)} past ${f.late === 1 ? 'its' : 'their'} date; ${f.effective} verified effective, ${f.failed} failed`,
    `${prop.ar} بانتظار موافقة، ${f.inProgress} قيد التنفيذ، ${f.late} تجاوزت موعدها؛ ${f.effective} ثبت نجاحها، ${f.failed} فشلت`,
  )
}

function shopperLine(i: BriefInputs): Bi {
  const c = count(i.shopper.open, SHOPPER_CASE)
  return b(`${c.en} open, ${i.shopper.late} over the clock`, `${c.ar} مفتوحة، ${i.shopper.late} تجاوزت المهلة`)
}

function loopLine(i: BriefInputs): Bi {
  const l = i.loop
  const c = count(l.open, UNHAPPY)
  const pron = agr(l.open, 'به', 'بهما', 'بهم')
  const phoneEn =
    l.recoveredByPhonePct == null
      ? 'recovery so far: too early'
      : `recovery so far ${l.recoveredByPhonePct}% by phone${l.recoveredByAiPct != null ? `, ${l.recoveredByAiPct}% by AI campaign` : ''}`
  const phoneAr =
    l.recoveredByPhonePct == null
      ? 'التعافي حتى الآن: مبكر'
      : `التعافي حتى الآن ${l.recoveredByPhonePct}% بالهاتف${l.recoveredByAiPct != null ? `، ${l.recoveredByAiPct}% بحملة الذكاء` : ''}`
  return b(`${c.en} still to call, ${l.critical} critical; ${phoneEn}`, `${c.ar} لم نتصل ${pron} بعد، ${l.critical} حرجة؛ ${phoneAr}`)
}

function driftingLine(i: BriefInputs): Bi {
  const { drifting, total } = i.people
  return b(
    `${drifting} of ${total} people on record ${isAre(drifting)} drifting away; silent leads first`,
    `${drifting} من ${total} شخصاً في السجل يبتعدون؛ العملاء الصامتون أولاً`,
  )
}

function publicLine(i: BriefInputs): Bi {
  const p = i.publicMentions
  const c = count(p.last30, MENTION)
  let en = `${c.en} in 30 days`
  let ar = `${c.ar} في 30 يوماً`
  if (p.negativePct != null) {
    en += `, ${p.negativePct}% negative`
    ar += `، ${p.negativePct}% سلبية`
  }
  if (p.avgReplyHours != null) {
    const over = p.avgReplyHours > p.target
    en += `, replied in ${p.avgReplyHours} h on average${over ? ` (target ${p.target})` : ''}`
    ar += `، متوسط الرد ${p.avgReplyHours} ساعة${over ? ` (الهدف ${p.target})` : ''}`
  }
  // Decided 18 Nov: CX watches the 48 h reply clock and raises a signal for each miss.
  if (p.overdue > 0) {
    en += `; ${p.overdue} without a reply past ${p.target} h`
    ar += `؛ ${p.overdue} دون رد بعد ${p.target} ساعة`
  }
  return b(en, ar)
}

function trainingLine(i: BriefInputs): Bi {
  const c = count(i.ldFixes, TRAINING_FIX)
  return b(`${c.en} ${isAre(i.ldFixes)} with L&D right now`, `${c.ar} لدى L&D الآن`)
}

function conductLine(i: BriefInputs): Bi {
  const c = count(i.conductNotes, CONDUCT_NOTE)
  return b(`${c.en} this month, each to the direct manager only`, `${c.ar} هذا الشهر، كل منها للمدير المباشر فقط`)
}

/** HR lines (24 Nov): the same numbers as the HR team performance page, last 30 days. */
function hrCallsLine(): Bi {
  const since = HR_NOW - 30 * 86_400_000
  const rows = IVR_REQUESTS.filter((x) => Date.parse(x.receivedAt) >= since)
  const waiting = rows.filter((x) => !x.calledBackAt).length
  const onTime = rows.filter((x) => x.calledBackAt && hoursBetween(x.receivedAt, x.calledBackAt) <= IVR_TARGET_HOURS).length
  const pct = rows.length ? Math.round((100 * onTime) / rows.length) : 0
  return b(
    `${rows.length} people asked for HR on the call center in 30 days; ${pct}% were called back within ${IVR_TARGET_HOURS} h, ${waiting} still waiting`,
    `${rows.length} شخصاً طلبوا الموارد البشرية عبر مركز الاتصال خلال 30 يوماً؛ أُعيد الاتصال بـ${pct}% خلال ${IVR_TARGET_HOURS} ساعات، و${waiting} ما زالوا ينتظرون`,
  )
}
function hrRecruitLine(): Bi {
  const open = RECRUITMENT.candidates.filter((c) => c.stage !== 'hired' && c.stage !== 'refused')
  const stuck = open.filter((c) => daysBetween(c.stageSince) > STUCK_DAYS).length
  return b(
    `Recruitment: ${open.length} candidates in progress, ${stuck} stuck more than ${STUCK_DAYS} days in one stage`,
    `التوظيف: ${open.length} مرشحاً قيد المتابعة، ${stuck} عالقون أكثر من ${STUCK_DAYS} أيام في مرحلة واحدة`,
  )
}
function hrRequestsLine(): Bi {
  const open = OPS_REQUESTS.filter((x) => !x.closedAt)
  const late = open.filter((x) => daysBetween(x.openedAt) > OPS_TYPE[x.type].targetDays).length
  return b(`HR requests: ${open.length} open, ${late} past their target`, `طلبات الموارد البشرية: ${open.length} مفتوحة، ${late} تجاوزت الهدف`)
}

function sampleLine(i: BriefInputs): Bi {
  return b(
    `Weekly sample: ${i.sample.toRead} agent outputs to read by eye; ${i.sample.read} read so far this week`,
    `العينة الأسبوعية: ${i.sample.toRead} مخرجاً للوكلاء للقراءة؛ قُرئ ${i.sample.read} حتى الآن هذا الأسبوع`,
  )
}

const CAMPAIGN: Forms = { en: ['campaign', 'campaigns'], ar: ['حملة واحدة', 'حملتان', 'حملات', 'حملة'] }

/** "71%", "71% and 78%", "71%, 78% and 86%" (Arabic: "71%، 78% و86%"). */
const percentList = (pcts: readonly number[], lang: 'en' | 'ar'): string => {
  const items = pcts.map((p) => `${p}%`)
  if (items.length < 2) return items.join('')
  const last = items[items.length - 1]
  const head = items.slice(0, -1).join(lang === 'ar' ? '، ' : ', ')
  return lang === 'ar' ? `${head} و${last}` : `${head} and ${last}`
}

/**
 * Campaign audit (v42.1 F33, prototype `briefLines`): "2 campaigns wait for your clearance; 3 running, 71% and 71% and 71% reached the
 * right people so far". Counts agree in English and Arabic, the percentages join as a list, and an empty side is said ("none running")
 * instead of printing "0 running,". Null when nothing waits and nothing runs: no line.
 */
export function campaignsLine(c: NonNullable<BriefInputs['campaigns']>): Bi | null {
  const running = c.runningReachedPct
  if (c.waiting === 0 && running.length === 0) return null
  const wait =
    c.waiting === 0
      ? b('No campaign waits for your clearance', 'لا حملة تنتظر إجازتك')
      : b(`${count(c.waiting, CAMPAIGN).en} ${c.waiting === 1 ? 'waits' : 'wait'} for your clearance`, `تنتظر ${count(c.waiting, CAMPAIGN).ar} إجازتك`)
  const run =
    running.length === 0
      ? b('none running', 'لا حملة تعمل')
      : b(
          `${running.length} running, ${percentList(running, 'en')} reached the right people so far`,
          `${running.length} تعمل، وصلت للأشخاص الصحيحين ${percentList(running, 'ar')} حتى الآن`,
        )
  return b(`${wait.en}; ${run.en}`, `${wait.ar}؛ ${run.ar}`)
}

export interface BriefInput {
  role: RoleId
  /** The role's own product (After-Sales lead, Real Estate roles): only that product's NPS line shows. */
  product?: ProductId
  inputs: BriefInputs
  /** One set per live product, from `useIndicators` (the same source as the Home tiles). */
  indicators: readonly IndicatorSet[]
  products: readonly Product[]
  /** NPS detractors in the role's scope (90 days), with the top reason; from the survey answers (Detractor analysis). */
  detractors?: { total: number; toCall: number; topReason?: Bi }
}

/** The brief of a role: its lines in order, each with a link only when the role can open the page. */
export function buildBrief({ role, product, inputs, indicators, products, detractors }: BriefInput): BriefLine[] {
  const lines: BriefLine[] = []
  const add = (id: string, kind: BriefLineKind, text: Bi) => {
    // the HR director reads conduct cases on the HR page
    const target = kind === 'conduct' && role === 'hrmgr' ? '/settings/hr-team?tab=conduct' : BRIEF_TARGET[kind]
    lines.push({ id, kind, text, to: canAccessPath(role, target.split('?')[0]) ? target : undefined })
  }
  for (const kind of BRIEF_LINES_BY_ROLE[role]) {
    switch (kind) {
      case 'nps':
        for (const set of indicators) {
          if (product && set.productId !== product) continue
          const p = products.find((x) => x.id === set.productId)
          if (p) add(`nps:${p.id}`, 'nps', npsLine(p, set))
        }
        break
      case 'signals':
        add('signals', kind, signalsLine(inputs))
        break
      case 'fixes':
        add('fixes', kind, fixesLine(inputs))
        break
      case 'shopper':
        if (inputs.shopper.open > 0) add('shopper', kind, shopperLine(inputs))
        break
      case 'loop':
        add('loop', kind, loopLine(inputs))
        break
      case 'detractors':
        if (detractors)
          add(
            'detractors',
            kind,
            b(
              `${detractors.total} NPS detractors in 90 days${detractors.topReason ? `, mostly: ${detractors.topReason.en.toLowerCase()}` : ''}.`,
              `${detractors.total} منتقداً في \u2068NPS\u2069 خلال 90 يوماً${detractors.topReason ? `، أغلبها: ${detractors.topReason.ar}` : ''}.`,
            ),
          )
        break
      case 'drifting':
        add('drifting', kind, driftingLine(inputs))
        break
      case 'public':
        if (inputs.publicMentions.last30 > 0) add('public', kind, publicLine(inputs))
        break
      case 'ld':
        add('ld', kind, trainingLine(inputs))
        break
      case 'conduct':
        add('conduct', kind, conductLine(inputs))
        break
      case 'sample':
        add('sample', kind, sampleLine(inputs))
        break
      case 'hr_calls':
        add('hr_calls', kind, hrCallsLine())
        break
      case 'hr_recruit':
        add('hr_recruit', kind, hrRecruitLine())
        break
      case 'hr_requests':
        add('hr_requests', kind, hrRequestsLine())
        break
      case 'campaigns': {
        const line = inputs.campaigns ? campaignsLine(inputs.campaigns) : null
        if (line) add('campaigns', kind, line)
        break
      }
    }
  }
  return lines
}

// --- Six-step line counts (Home) ------------------------------------------------------------------------------

/**
 * The live count shown under each step on Home, from the same sources as the brief. `null` = no count for that step.
 * The page shows a count only for a step whose page the role can open. `[Proposed]` (the prototype's step line has no counts).
 */
export function stepCounts(inputs: BriefInputs, indicators: readonly IndicatorSet[]): Record<StepId, Bi | null> {
  const sig = count(inputs.signals.inWindow, SIGNAL)
  const pat = count(inputs.signals.patternsOverLine, PATTERN)
  const fix = count(inputs.fixes.proposed, FIX)
  const call = count(inputs.loop.open, UNHAPPY)
  const prod = count(indicators.length, PRODUCT)
  return {
    ev: count(inputs.people.total, PERSON_ON_RECORD),
    sg: b(`${sig.en} in ${inputs.windowDays} days`, `${sig.ar} في ${inputs.windowDays} يوماً`),
    pt: b(`${pat.en} over the line`, `${pat.ar} فوق الحد`),
    ca: b(`${fix.en} waiting for a yes`, `${fix.ar} بانتظار موافقة`),
    vr: b(`${call.en} to call`, `${call.ar} للاتصال`),
    rp: b(`${prod.en}, one line each`, `${prod.ar}، سطر لكل منتج`),
  }
}

// --- Next-step box for an inbox row ----------------------------------------------------------------------------------

/**
 * "Where you are, what happens next" for the most urgent inbox row, from the prototype's own sentences (S2):
 * a fix to approve, to do or to check reads as the fix box; a call as Close the loop; an investigation as the
 * investigation tab. The weekly sample has no step, so no box.
 */
export function nextForInboxItem(item: InboxItem, rules: { approveDays: number; verifyDays: number }): NextStep | null {
  switch (item.kind) {
    case 'approve':
      return fixNext('proposed', rules)
    case 'do':
      return fixNext('in_progress', rules)
    case 'verify':
      return fixNext('verification', rules)
    case 'call':
      return CLOSE_LOOP_NEXT
    case 'inv':
      return actionsNext('investigations')
    default:
      return null
  }
}

// --- Tiles (26 Nov, owner: "your day in numbers") ----------------------------------------------------------------

export type BriefTileTone = 'neutral' | 'alert' | 'warn'

/** One number of the brief: a label, the number, one short line under it, and the page it opens. Same sources as the lines. */
export interface BriefTile {
  id: string
  kind: BriefLineKind
  label: Bi
  value: string
  /** A quiet "/ 30" after the number. */
  of?: string
  sub: Bi
  /** For an NPS tile: the change on last month colours the line under it. */
  trend?: 'up' | 'down' | 'flat'
  /** alert = red (needs someone now), warn = amber (watch), neutral = grey. */
  tone: BriefTileTone
  to?: string
}

function hrNumbers() {
  const since = HR_NOW - 30 * 86_400_000
  const rows = IVR_REQUESTS.filter((x) => Date.parse(x.receivedAt) >= since)
  const waiting = rows.filter((x) => !x.calledBackAt).length
  const onTime = rows.filter((x) => x.calledBackAt && hoursBetween(x.receivedAt, x.calledBackAt) <= IVR_TARGET_HOURS).length
  const open = RECRUITMENT.candidates.filter((c) => c.stage !== 'hired' && c.stage !== 'refused')
  const reqOpen = OPS_REQUESTS.filter((x) => !x.closedAt)
  return {
    calls: { asked: rows.length, waiting, pct: rows.length ? Math.round((100 * onTime) / rows.length) : 0 },
    recruit: { open: open.length, stuck: open.filter((c) => daysBetween(c.stageSince) > STUCK_DAYS).length },
    requests: { open: reqOpen.length, late: reqOpen.filter((x) => daysBetween(x.openedAt) > OPS_TYPE[x.type].targetDays).length },
  }
}

/**
 * The brief as tiles (26 Nov, owner, for every role): the same kinds per role as `BRIEF_LINES_BY_ROLE`, each turned into one number.
 * What needs someone now is red, what to watch is amber, the rest grey; NPS colours only its change on last month.
 */
export function buildBriefTiles({ role, product, inputs, indicators, products, detractors }: BriefInput): BriefTile[] {
  const tiles: BriefTile[] = []
  const hr = hrNumbers()
  const add = (tile: Omit<BriefTile, 'to'>) => {
    const target = tile.kind === 'conduct' && role === 'hrmgr' ? '/settings/hr-team?tab=conduct' : BRIEF_TARGET[tile.kind]
    tiles.push({ ...tile, to: canAccessPath(role, target.split('?')[0]) ? target : undefined })
  }
  const approver = role === 'cxmgr' || role === 'envmgmt' || role === 'teamlead' || role === 'aslead'
  for (const kind of BRIEF_LINES_BY_ROLE[role]) {
    switch (kind) {
      case 'nps':
        for (const set of indicators) {
          if (product && set.productId !== product) continue
          const p = products.find((x) => x.id === set.productId)
          if (!p) continue
          const d = set.deltaVsLastMonth
          add({
            id: `nps:${p.id}`,
            kind,
            label: b(`NPS · ${p.name.en}`, `\u2068NPS\u2069 · \u2068${p.name.ar}\u2069`),
            value: set.nps == null ? '–' : fmtSigned(set.nps),
            sub:
              set.nps == null
                ? b('too early', 'مبكر')
                : d == null
                  ? b(`${set.answers} answers, 90 days`, `${set.answers} إجابة، 90 يوماً`)
                  : d === 0
                    ? b('unchanged on last month', 'دون تغيير عن الشهر الماضي')
                    : b(`${d > 0 ? '▲' : '▼'} ${Math.abs(d)} on last month`, `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} عن الشهر الماضي`),
            trend: d == null || set.nps == null ? undefined : d > 0 ? 'up' : d < 0 ? 'down' : 'flat',
            tone: 'neutral',
          })
        }
        break
      case 'detractors':
        // 26 Nov (owner): the detractors number opens Detractor analysis
        if (detractors)
          add({
            id: 'detractors',
            kind,
            label: b('NPS detractors, 90 days', 'منتقدو \u2068NPS\u2069، 90 يوماً'),
            value: String(detractors.total),
            sub: detractors.topReason
              ? b(`Mostly: ${detractors.topReason.en.toLowerCase()}`, `أغلبها: ${detractors.topReason.ar}`)
              : b(`${detractors.toCall} still to call`, `${detractors.toCall} لم يُتصل بهم بعد`),
            tone: detractors.toCall > 0 ? 'warn' : 'neutral',
          })
        break
      case 'signals': {
        const p = inputs.signals.patternsWaitingForFix
        add({
          id: 'signals',
          kind,
          label: b(`Signals, ${inputs.windowDays} days`, `الإشارات، ${inputs.windowDays} يوماً`),
          value: String(inputs.signals.inWindow),
          sub: b(`${p} ${p === 1 ? 'pattern' : 'patterns'} crossed the line`, `${count(p, PATTERN).ar} ${agr(p, 'تجاوز الحد', 'تجاوزا الحد', 'تجاوزت الحد')}`),
          tone: 'neutral',
        })
        break
      }
      case 'fixes': {
        const f = inputs.fixes
        add({
          id: 'fixes',
          kind,
          label: approver ? b('Waiting for your yes', 'بانتظار موافقتك') : b('Fixes waiting for a yes', 'حلول بانتظار موافقة'),
          value: String(f.proposed),
          sub:
            f.late > 0
              ? b(`${f.proposed === 1 ? 'fix' : 'fixes'} · ${f.late} past ${f.late === 1 ? 'its' : 'their'} date`, `حلول · ${f.late} تجاوزت موعدها`)
              : b(`${f.inProgress} in progress, none late`, `${f.inProgress} قيد التنفيذ، لا تأخير`),
          tone: f.proposed > 0 || f.late > 0 ? 'alert' : 'neutral',
        })
        break
      }
      case 'shopper':
        add({
          id: 'shopper',
          kind,
          label: b('Shopper cases', 'حالات المتسوق'),
          value: String(inputs.shopper.open),
          sub: inputs.shopper.late
            ? b(`${inputs.shopper.late} over the clock`, `${inputs.shopper.late} تجاوزت المهلة`)
            : b('none over the clock', 'لا شيء تجاوز المهلة'),
          tone: inputs.shopper.late ? 'alert' : 'neutral',
        })
        break
      case 'loop':
        add({
          id: 'loop',
          kind,
          label: b('Customers to call', 'عملاء للاتصال'),
          value: String(inputs.loop.open),
          sub: inputs.loop.critical ? b(`${inputs.loop.critical} critical`, `${inputs.loop.critical} حرجة`) : b('none critical', 'لا حالات حرجة'),
          tone: inputs.loop.critical ? 'alert' : inputs.loop.open ? 'warn' : 'neutral',
        })
        break
      case 'drifting':
        add({
          id: 'drifting',
          kind,
          label: b('Drifting away', 'يبتعدون'),
          value: String(inputs.people.drifting),
          of: `/ ${inputs.people.total}`,
          sub: b('silent leads first', 'العملاء الصامتون أولاً'),
          tone: 'neutral',
        })
        break
      case 'public': {
        const p = inputs.publicMentions
        if (p.last30 === 0) break
        const neg = p.negativePct != null ? ` · ${p.negativePct}%` : ''
        add({
          id: 'public',
          kind,
          label: b('Public comments', 'التعليقات العامة'),
          value: String(p.overdue > 0 ? p.overdue : p.last30),
          sub:
            p.overdue > 0
              ? b(`past ${p.target} h${neg ? `${neg} negative` : ''}`, `بعد ${p.target} ساعة${neg ? `${neg} سلبية` : ''}`)
              : b(`in 30 days${neg ? `${neg} negative` : ''}`, `في 30 يوماً${neg ? `${neg} سلبية` : ''}`),
          tone: p.overdue > 0 ? 'warn' : 'neutral',
        })
        break
      }
      case 'ld':
        add({
          id: 'ld',
          kind,
          label: b('With L&D now', 'لدى L&D الآن'),
          value: String(inputs.ldFixes),
          sub: b('training-gap fixes', 'حلول فجوات تدريب'),
          tone: 'neutral',
        })
        break
      case 'conduct':
        add({
          id: 'conduct',
          kind,
          label: b('Conduct notes', 'ملاحظات السلوك'),
          value: String(inputs.conductNotes),
          sub: b('this month, to the direct manager only', 'هذا الشهر، للمدير المباشر فقط'),
          tone: 'neutral',
        })
        break
      case 'sample':
        add({
          id: 'sample',
          kind,
          label: b('Weekly sample to read', 'العينة الأسبوعية للقراءة'),
          value: String(inputs.sample.toRead),
          sub: b(`${inputs.sample.read} read this week`, `قُرئ ${inputs.sample.read} هذا الأسبوع`),
          tone: inputs.sample.toRead ? 'warn' : 'neutral',
        })
        break
      case 'hr_calls':
        add({
          id: 'hr_calls',
          kind,
          label: b('HR callbacks waiting', 'اتصالات HR بالانتظار'),
          value: String(hr.calls.waiting),
          sub: b(`${hr.calls.pct}% called back within ${IVR_TARGET_HOURS} h`, `${hr.calls.pct}% خلال ${IVR_TARGET_HOURS} ساعات`),
          tone: hr.calls.waiting ? 'alert' : 'neutral',
        })
        break
      case 'hr_recruit':
        add({
          id: 'hr_recruit',
          kind,
          label: b('Candidates in progress', 'مرشحون قيد المتابعة'),
          value: String(hr.recruit.open),
          sub: b(`${hr.recruit.stuck} stuck over ${STUCK_DAYS} days`, `${hr.recruit.stuck} عالقون أكثر من ${STUCK_DAYS} أيام`),
          tone: hr.recruit.stuck ? 'warn' : 'neutral',
        })
        break
      case 'hr_requests':
        add({
          id: 'hr_requests',
          kind,
          label: b('HR requests open', 'طلبات HR مفتوحة'),
          value: String(hr.requests.open),
          sub: b(`${hr.requests.late} past their target`, `${hr.requests.late} تجاوزت الهدف`),
          tone: hr.requests.late ? 'alert' : 'neutral',
        })
        break
      case 'campaigns': {
        const c = inputs.campaigns
        if (!c || (c.waiting === 0 && c.runningReachedPct.length === 0)) break
        add({
          id: 'campaigns',
          kind,
          label: b('Campaigns to clear', 'حملات بانتظار إجازتك'),
          value: String(c.waiting),
          sub: b(`${c.runningReachedPct.length} running`, `${c.runningReachedPct.length} تعمل`),
          tone: c.waiting ? 'alert' : 'neutral',
        })
        break
      }
    }
  }
  return tiles
}

const NUMBER_WORD: Record<number, Bi> = {
  2: b('two', 'رقمين'),
  3: b('three', 'ثلاثة أرقام'),
  4: b('four', 'أربعة أرقام'),
  5: b('five', 'خمسة أرقام'),
  6: b('six', 'ستة أرقام'),
  7: b('seven', 'سبعة أرقام'),
  8: b('eight', 'ثمانية أرقام'),
  9: b('nine', 'تسعة أرقام'),
  10: b('ten', 'عشرة أرقام'),
}

/** "Your day in eight numbers" / "يومك في ثمانية أرقام". */
export function briefTitle(n: number): Bi {
  const w = NUMBER_WORD[n]
  return w ? b(`Your day in ${w.en} numbers`, `يومك في ${w.ar}`) : b('Your day in numbers', 'يومك بالأرقام')
}
