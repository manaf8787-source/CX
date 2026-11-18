import type { Bi, CorrectiveActionStatus, NextStep, StepDef, StepId } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/**
 * The six-step line (v40 F02): Listen, Signal, Pattern, Fix, Check, Report.
 * Strings are verbatim from the v40 prototype (docs/V40_DELTA.md Appendix S1).
 * Targets are [Proposed] React routes (the prototype's targets differ in shape).
 */
export const STEPS: StepDef[] = [
  { id: 'ev', n: 1, name: b('1 Listen', '1 نسمع'), title: b('Every contact from every source lands on one person', 'كل تواصل من أي مصدر يصل إلى شخص واحد'), to: '/customers' },
  { id: 'sg', n: 2, name: b('2 Signal', '2 إشارة'), title: b('What hurt a customer is counted, not worked one by one', 'ما أذى الزبون يُعدّ ولا يُعالج واحداً واحداً'), to: '/actions/signals' },
  { id: 'pt', n: 3, name: b('3 Pattern', '3 نمط'), title: b('Repeats over the line become one pattern', 'التكرار فوق الحد يصبح نمطاً واحداً'), to: '/actions/signals', hash: '#patterns' },
  { id: 'ca', n: 4, name: b('4 Fix', '4 إصلاح'), title: b('One suggested fix; a person approves', 'حل واحد مقترح؛ إنسان يعتمده'), to: '/actions/corrective' },
  { id: 'vr', n: 5, name: b('5 Check', '5 تحقق'), title: b('Did it work, and did the customer recover', 'هل نفع، وهل تعافى الزبون'), to: '/close-the-loop' },
  { id: 'rp', n: 6, name: b('6 Report', '6 تقرير'), title: b('One line per product, every number traceable', 'سطر لكل منتج، كل رقم له أثر'), to: '/overview' },
]

export function stepById(id: StepId): StepDef {
  return STEPS.find((s) => s.id === id)!
}

/** Label of the "what happens next" box (F07). */
export const NEXT_LABEL: Bi = b('Next step', 'الخطوة التالية')

/** Home header (S1). */
export const HOME_COPY = {
  h1: b('What customers tell us, and what we fix', 'ما يقوله الزبائن، وما نصلحه'),
  lede: b('One line, six steps. Everything in the portal is one of them.', 'خط واحد، ست خطوات. كل شيء في البورتال واحد منها.'),
  tag: b('Prototype, sample data', 'نموذج تجريبي، بيانات افتراضية'),
}

export interface NextStepOptions {
  /** Approval window in working days (rules key `approveDays`, default 5). */
  approveDays?: number
  /** Verification window in days (rules key `verifyDays`, default 60). */
  verifyDays?: number
}

/**
 * The "where you are, what happens next" box on a fix (F07, S2). Step `ca` while the
 * fix is proposed, approved or in progress; step `vr` from the check onwards.
 * [Proposed] a partial verdict reads as the closing sentence ("Closed with a reason").
 */
export function fixNext(status: CorrectiveActionStatus, { approveDays = 5, verifyDays = 60 }: NextStepOptions = {}): NextStep {
  switch (status) {
    case 'proposed':
      return {
        step: 'ca',
        text: b('The responsible manager approves, changes, rejects, or asks for an investigation', 'المدير المسؤول يعتمد أو يعدّل أو يرفض أو يطلب تحقيقاً'),
        due: b(`within ${approveDays} working days`, `خلال ${approveDays} أيام عمل`),
      }
    case 'approved':
    case 'in_progress':
      return { step: 'ca', text: b('The owner does the fix and marks it done', 'المسؤول ينفّذ الحل ويعلّمه منجزاً'), due: b('by the due date', 'قبل تاريخ الاستحقاق') }
    case 'verification':
      return {
        step: 'vr',
        text: b('Agent 6 counts the same signals again and marks it effective, partial or failed', 'الوكيل 6 يعيد عدّ الإشارات نفسها ويحكم: فعّال، جزئي، فشل'),
        due: b(`at ${verifyDays} days`, `عند ${verifyDays} يوماً`),
      }
    case 'effective':
      return { step: 'vr', text: b('Nothing. It worked; it stays in the report as a fix that worked', 'لا شيء. نجح؛ يبقى في التقرير كحل نجح') }
    case 'failed':
      return { step: 'vr', text: b('The signal reopens and a new fix is proposed', 'تُفتح الإشارة من جديد ويُقترح حل آخر') }
    default:
      return { step: 'vr', text: b('Closed with a reason; nothing further', 'أُغلق بسبب؛ لا شيء بعده') }
  }
}

export type ActionsTabKind = 'signals' | 'investigations' | 'other'

/** Above the Actions tabs (F07): Signals = step sg, Investigations = step pt, every other tab = step ca. */
export function actionsNext(tab: ActionsTabKind): NextStep {
  if (tab === 'signals') return { step: 'sg', text: b('Signals that cross the line become a pattern; a pattern gets one suggested fix', 'الإشارات التي تتجاوز الحد تصبح نمطاً؛ النمط يحصل على حل واحد مقترح') }
  if (tab === 'investigations') return { step: 'pt', text: b('Interviews or a shopper check come back as evidence; only then is a fix proposed', 'المقابلات أو فحص المتسوق تعود كدليل؛ عندها فقط يُقترح حل') }
  return { step: 'ca', text: b('Open any fix to see who must say yes and by when', 'افتح أي حل لترى من يجب أن يوافق ومتى') }
}

/** Close the loop page (F07): step vr. */
export const CLOSE_LOOP_NEXT: NextStep = {
  step: 'vr',
  text: b('A person calls each unhappy customer, codes the reason, and the same question is asked again 7 to 14 days after the fix', 'إنسان يتصل بكل زبون غير راضٍ، يسجّل السبب، ويُطرح السؤال نفسه مجدداً بعد 7 إلى 14 يوماً من الحل'),
}

/** Overview page (F07): step rp, with a "Monthly pack" button. */
export const OVERVIEW_NEXT: NextStep = {
  step: 'rp',
  text: b('Agent 9 writes the Monthly CX pack from these same numbers on the first working day; the CX manager releases it', 'الوكيل 9 يكتب حزمة CX الشهرية من هذه الأرقام نفسها في أول يوم عمل؛ مدير CX يعتمدها'),
}

export const MONTHLY_PACK_BUTTON: Bi = b('Monthly pack', 'الحزمة الشهرية')

/** Customers, selected person (F07): step sg when drifting or with problems, else ev. */
export function journeyNext({ drifting, problems }: { drifting: boolean; problems: number }): NextStep {
  if (drifting) {
    return { step: 'sg', text: b('This person is drifting away; the reading below says what to do, and any fault found here is already counted as a signal', 'هذا الشخص يبتعد؛ القراءة أدناه تقول ماذا نفعل، وكل خطأ هنا محسوب أصلاً كإشارة') }
  }
  if (problems > 0) {
    return { step: 'sg', text: b(`${problems} problems found on this journey; each is a signal and is counted with the others`, `${problems} مشاكل رُصدت في هذه الرحلة؛ كل واحدة إشارة وتُعدّ مع غيرها`) }
  }
  return { step: 'ev', text: b('No problem found; nothing to do unless a new contact arrives', 'لا مشكلة مرصودة؛ لا شيء يُفعل حتى يصل تواصل جديد') }
}

/** Trace card "What happens next" sentences by how far the chain goes (S4). */
export const TRACE_NEXT = {
  report: null as Bi | null,
  check: b('Report: counted in the pack on the first working day', 'التقرير: يُحسب في الحزمة أول يوم عمل'),
  fix: b('Check: Agent 6 recounts at 60 days after done', 'التحقق: الوكيل 6 يعيد العدّ بعد 60 يوماً من الإنجاز'),
  pattern: b('Fix: Agent 5 proposes one, the manager approves', 'الإصلاح: الوكيل 5 يقترح واحداً، والمدير يعتمد'),
  signals: b('Pattern: forms when the same thing repeats over the line', 'النمط: يتكوّن عندما يتكرر الشيء نفسه فوق الحد'),
  event: b('Signal: only if this event hurt the customer', 'الإشارة: فقط إذا أذى هذا الحدث الزبون'),
}

/** Trace card copy (S4). */
export const TRACE_COPY = {
  title: b('Trace', 'الأثر'),
  hint: b('Every id in the chain, back to the original contact and forward to the report. Click any to open it.', 'كل رقم في السلسلة، رجوعاً إلى التواصل الأصلي وتقدماً إلى التقرير. اضغط أياً منها لفتحه.'),
  columns: [b('1 Event', '1 حدث'), b('2 Signal', '2 إشارة'), b('3 Pattern', '3 نمط'), b('4 Fix', '4 إصلاح'), b('5 Check', '5 تحقق'), b('6 Report', '6 تقرير')],
  nextLabel: b('What happens next', 'ما الذي يحدث بعد ذلك'),
  emptyEvent: b('none linked', 'لا شيء مرتبط'),
  emptyEventPublic: b('public mention, no person identified', 'إشارة عامة، لا شخص معرَّف'),
  emptySignal: b('not a signal', 'ليست إشارة'),
  emptyPattern: b('under the line', 'تحت الحد'),
  emptyFix: b('none yet', 'لا شيء بعد'),
  emptyCheck: b('not yet', 'ليس بعد'),
  emptyReport: b('not yet', 'ليس بعد'),
  reportLabel: b('November pack', 'حزمة نوفمبر'),
}
