import type { Bi } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Weekly sample page copy (v40 S15). The day (Thursday), "wrong lowers the agent's pass rate", the composition and who may judge are [Proposed]: not in the agent spec. */
export const WEEKLY_SAMPLE_COPY = {
  title: b('Weekly sample', 'العينة الأسبوعية'),
  intro: b(
    'Fifty outputs that passed the supervisor this week, read by eye by the CX team and the Internal Audit and Marketing Lead. Every "wrong" becomes a new test for the supervisor and lowers that agent\'s pass rate.',
    'خمسون مخرجاً مرّت على السوبرفايزر هذا الأسبوع، يقرؤها فريق CX ومدير التدقيق الداخلي والتسويق بالعين. كل "خطأ" يصبح اختباراً جديداً للسوبرفايزر ويخفض نسبة نجاح ذلك الوكيل.',
  ),
  tiles: {
    read: b('Read', 'قُرئ'),
    wrong: b('Wrong (each becomes a test)', 'خطأ (كل واحد يصبح اختباراً)'),
    accuracy: b('Accuracy this week', 'الدقة هذا الأسبوع'),
    due: b('Due (every Thursday)', 'المهلة (كل خميس)'),
  },
  columns: {
    n: b('#', '#'),
    agent: b('Agent', 'الوكيل'),
    kind: b('Kind', 'النوع'),
    output: b('Output', 'المخرج'),
    verdict: b('Verdict', 'الحكم'),
  },
  right: b('✓ Right', '✓ صح'),
  wrong: b('✗ Wrong', '✗ خطأ'),
  chipRight: b('Right', 'صح'),
  chipWrong: b('Wrong → new test', 'خطأ ← اختبار جديد'),
  /** Names are shown only to the CX manager and the CX team; everyone else sees a reference. */
  namesNote: b('Customer names are shown only to the CX manager and the CX team; others see a reference.', 'تظهر أسماء الزبائن لمدير فريق CX وفريقه فقط؛ الآخرون يرون مرجعاً.'),
}
