import type { Bi } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Weekly sample page copy (v40 S15). The day (Thursday), "wrong lowers the agent's pass rate", the composition and who may judge are [Proposed]: not in the agent spec. */
export const WEEKLY_SAMPLE_COPY = {
  title: b('Weekly sample', 'العينة الأسبوعية'),
  /** v41.1 (F29): the page says what each row now carries; strings as in the prototype. */
  intro: b(
    'Fifty outputs that passed the supervisor this week. For each one: what the agent saw, what it produced, what the supervisor checked, and the record behind it. Judge it in half a minute; open the record when in doubt. Every "wrong" becomes a new test for the supervisor and lowers that agent\'s pass rate.',
    'خمسون مخرجاً مرّت على السوبرفايزر هذا الأسبوع. لكل واحد: ماذا رأى الوكيل، ماذا أنتج، ماذا فحص السوبرفايزر، والسجل خلفه. احكم عليه في نصف دقيقة؛ افتح السجل عند الشك. كل "خطأ" يصبح اختباراً جديداً للسوبرفايزر ويخفض نسبة نجاح ذلك الوكيل.',
  ),
  /** v41.1 (F29): the card above the table. A row asks for a verdict, so the rule for the verdict sits on the same page. */
  howToJudge: {
    title: b('How to judge', 'كيف تحكم'),
    text: b(
      'Right means: given what the agent saw, a careful person would have produced the same thing. Wrong means a different category, a different fix, a wrong reason code, or a reading the timeline does not support. You are not judging whether the customer was right; you are judging the agent.',
      '"صح" تعني: بما رآه الوكيل، كان شخص متأنٍّ سينتج الشيء نفسه. "خطأ" تعني فئة مختلفة، أو حلاً مختلفاً، أو رمز سبب خاطئاً، أو قراءة لا يدعمها الخط الزمني. أنت لا تحكم على الزبون، بل على الوكيل.',
    ),
  },
  /** The six checks the supervisor ran on every output in the sample (all passed: the sample is outputs that passed). */
  supervisorLine: b(
    'Schema, recompute, access, evidence, bilingual, risk gate: 6 of 6 passed',
    'البنية، إعادة الحساب، الصلاحيات، الدليل، اللغتان، بوابة المخاطر: 6 من 6 اجتازت',
  ),
  open: b('Open', 'افتح'),
  /** Shown to a role that cannot open the record behind a row. */
  openNote: b(
    'The record behind a row opens for the CX manager and the CX team. You read ids and titles: what the agent saw and what it produced.',
    'يُفتح السجل خلف كل سطر لمدير تجربة العملاء وفريقه. أنت تقرأ الأرقام والعناوين: ماذا رأى الوكيل وماذا أنتج.',
  ),
  tiles: {
    read: b('Read', 'قُرئ'),
    wrong: b('Wrong (each becomes a test)', 'خطأ (كل واحد يصبح اختباراً)'),
    accuracy: b('Accuracy this week', 'الدقة هذا الأسبوع'),
    due: b('Due (every Thursday)', 'المهلة (كل خميس)'),
  },
  columns: {
    n: b('#', '#'),
    agent: b('Agent and kind', 'الوكيل والنوع'),
    saw: b('What it saw', 'ماذا رأى'),
    output: b('What it produced', 'ماذا أنتج'),
    supervisor: b('Supervisor', 'السوبرفايزر'),
    verdict: b('Verdict', 'الحكم'),
  },
  right: b('✓ Right', '✓ صح'),
  wrong: b('✗ Wrong', '✗ خطأ'),
  chipRight: b('Right', 'صح'),
  chipWrong: b('Wrong → new test', 'خطأ ← اختبار جديد'),
  /** The one rule `canViewCustomerNames` (decided 18 Nov: no customer names to Internal Audit): every role that works with people sees names; the Internal Audit and Marketing Lead sees a reference. */
  namesNote: b(
    'Customer names are shown to the roles that work with customers; the Internal Audit and Marketing Lead sees a reference (P-005), never a name.',
    'تظهر أسماء الزبائن للأدوار التي تعمل مع الزبائن؛ أما مسؤول التدقيق الداخلي والتسويق فيرى مرجعاً (P-005) ولا يرى اسماً أبداً.',
  ),
}
