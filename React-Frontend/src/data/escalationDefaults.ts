import type { Bi, CorrectiveActionKind, MatrixCellKind, MatrixCellRow, MatrixCells, MatrixField, MatrixKind, MatrixRow, MatrixRuleRow, ProductId, VipRule } from '../types'
import { HOURS_PER_DAY } from '../utils/matrixFormat'

const b = (en: string, ar: string): Bi => ({ en, ar })

/**
 * Escalation matrix copy (v40 S9, v42 F30). The cells were set on 19 November 2026 by the CX manager (Decision 4 is closed); product owners
 * may adjust a title with the Internal Audit and Marketing Lead before 28 November; the clocks stay. Strings of the header, the three
 * rules and the legend are the prototype v42's, verbatim.
 */
export const MATRIX_COPY = {
  title: b('Escalation matrix', 'مصفوفة التصعيد'),
  intro: b(
    'Who, by title, receives each kind of fix or case, who is informed, who is the backup, and the clocks in working hours. One table per product. Cells set on 19 November by the CX manager; product owners may adjust a title with the Internal Audit and Marketing Lead before 28 November, the clocks stay. Titles only; the CRM supplies who holds the title.',
    'من يستلم كل نوع من الحلول أو الحالات بالمسمّى، ومن يُبلَّغ، ومن البديل، والمهل بساعات العمل. جدول لكل منتج. الخلايا حُدّدت في 19 نوفمبر من مدير تجربة العملاء؛ يمكن لمالكي المنتجات تعديل مسمّى مع مدير التدقيق الداخلي والتسويق قبل 28 نوفمبر، والمهل ثابتة. مسمّيات فقط؛ CRM يحدد من يشغلها.',
  ),
  columns: {
    kind: b('Kind', 'النوع'),
    receiver: b('First receiver', 'المستلم الأول'),
    informed: b('Informed', 'مُبلَّغ'),
    backup: b('Backup', 'البديل'),
    respondH: b('Respond (h)', 'الرد (ساعة)'),
    resolveH: b('Resolve (h)', 'الحل (ساعة)'),
  } satisfies Record<'kind' | MatrixField, Bi>,
  principles: b(
    "Principles: the receiver is the person who can fix it, never top management; heads and C-level are informed only; an employee kind goes to the direct manager and nowhere else; legal goes to Legal first; anything touching a customer's contact goes through the CX team.",
    'المبادئ: المستلم هو من يستطيع الإصلاح، لا الإدارة العليا؛ الرؤساء والإدارة التنفيذية يُبلَّغون فقط؛ نوع الموظف يذهب للمدير المباشر ولا غيره؛ القانوني يذهب للقانونية أولاً؛ كل ما يمس تواصل الزبون يمر بفريق CX.',
  ),
  /** What stood as "cells still at their default are proposals" is now the decided state: set 19 Nov, titles adjustable until 28 Nov. Not a [Proposed] badge. */
  setNote: b('Set 19 Nov · titles adjustable until 28 Nov', 'حُدّدت في 19 نوفمبر · المسمّيات قابلة للتعديل حتى 28 نوفمبر'),
  matrixButton: b('Matrix', 'المصفوفة'),
  /** A cell someone changed after the 19 Nov set. [Proposed] marker: the build's own, not in the prototype. */
  edited: b('Edited', 'مُعدَّل'),
  /** On a fix whose pattern includes a person tagged VIP in the CRM. */
  vipTag: b('VIP · clocks halved', 'VIP · المهل مُنصَّفة'),
  /** Under the matrix line of a VIP fix. */
  vipApplied: b(
    'VIP rule applied: both clocks halved, the head of the environment informed at once, the CX manager as backup.',
    'طُبّقت قاعدة VIP: تُنصَّف المهلتان، ويُبلَّغ رئيس البيئة فوراً، ويكون مدير تجربة العملاء البديل.',
  ),
  /** The VIP row is a rule, not a receiver: its cells are not edited. A short tag in the row, the sentence under the table. */
  ruleTag: b('Rule', 'قاعدة'),
  vipRowNote: b('The last row is a rule, not a receiver: the clocks are halved for a VIP, so it is fixed.', 'السطر الأخير قاعدة وليس مستلماً: تُنصَّف المهل لعميل VIP، لذا هو ثابت.'),
  /** The employee row's Resolve is "–": no resolve clock, so a fix of that kind falls back to Agent 5's 14 days. */
  noResolveClock: b(
    'no resolve clock in the matrix for this kind (a management note is measured by the 60-day check): Agent 5’s 14-day fallback',
    'لا مهلة حل في المصفوفة لهذا النوع (الملاحظة الإدارية يقيسها فحص الـ60 يوماً): البديل 14 يوماً من الوكيل 5',
  ),
  /** The card above the product tabs. */
  rules: {
    title: b('Three rules behind the cells', 'ثلاث قواعد خلف الخلايا'),
    items: [
      {
        lead: b('Every customer is treated as a VIP; a delay is a failure.', 'كل زبون يُعامل كـ VIP؛ التأخير فشل.'),
        body: b(
          'Respond clocks are 1 to 4 working hours for anything a customer can feel, never a day. When the person is tagged VIP in the CRM (Club member, investor, portfolio owner), both clocks are halved, the head of the environment is informed at once, and the CX manager is the backup. Resolve clocks are the plan and the first visible step, not the end of the work: a training programme or an app change may take longer, but the customer-facing effect (a notice, a call, a corrected sheet) must be there inside the clock.',
          'مهل الرد من ساعة إلى أربع ساعات عمل لكل ما يشعر به الزبون، ولا تكون يوماً أبداً. عندما يكون الشخص موسوماً VIP في CRM (عضو نادي، مستثمر، مالك محفظة) تُنصَّف المهلتان، ويُبلَّغ رئيس البيئة فوراً، ويكون مدير تجربة العملاء البديل. مهلة الحل هي الخطة وأول خطوة ظاهرة لا نهاية العمل: برنامج التدريب أو تعديل التطبيق قد يطول، لكن الأثر الذي يراه الزبون (تنبيه، مكالمة، جدول مصحح) يجب أن يكون داخل المهلة.',
        ),
      },
      {
        lead: b('Information security sits beside Legal on anything that touches data.', 'أمن المعلومات بجانب القانونية في كل ما يمس البيانات.'),
        body: b(
          "A customer's details shared on a group, a document to the wrong person, a screenshot of a record, a lost device, an account used by someone else: the Information Security lead receives or is informed within one working hour, with Legal; a data-exposure incident is its own row. The Wallet and the Club carry financial and identity data, so their product row informs Information Security by default. Conversation text and names never leave the CX team in any escalation; the receiver gets the fix and the ids, not the transcript.",
          'مشاركة بيانات زبون في مجموعة، مستند لشخص خاطئ، لقطة شاشة لسجل، جهاز مفقود، حساب يستخدمه غير صاحبه: يستلم مسؤول أمن المعلومات أو يُبلَّغ خلال ساعة عمل مع القانونية؛ وحادثة تسريب البيانات لها سطرها الخاص. المحفظة والنادي يحملان بيانات مالية وهوية، فسطر المنتج فيهما يُبلِّغ أمن المعلومات افتراضياً. نص المحادثات والأسماء لا تغادر فريق CX في أي تصعيد؛ المستلم يحصل على الحل والأرقام لا النص.',
        ),
      },
      {
        lead: b('The receiver is the one who can fix it; the customer hears from one person.', 'المستلم هو من يستطيع الإصلاح؛ والزبون يسمع من شخص واحد.'),
        body: b(
          'Never top management as receiver; heads are informed. An employee kind goes to the direct manager only. Whoever is the receiver, the CX team keeps the customer side (the call, the apology, the re-survey) so the customer is never passed between teams while the fix is being made. Satisfaction is measured after the fix by the re-survey and the recovered flag, and a fix that does not recover the customer is a failed fix whatever the clock said.',
          'لا تكون الإدارة العليا مستلماً أبداً؛ الرؤساء يُبلَّغون. نوع الموظف يذهب للمدير المباشر فقط. أياً كان المستلم، يحتفظ فريق CX بجانب الزبون (المكالمة، الاعتذار، إعادة الاستبيان) حتى لا يُمرَّر الزبون بين الفرق أثناء الإصلاح. يُقاس الرضا بعد الإصلاح بإعادة الاستبيان وعلامة التعافي، والحل الذي لا يعيد الزبون حل فاشل مهما قالت المهلة.',
        ),
      },
    ],
  },
  /** The clock legend under the rules. */
  legend: b(
    'Clocks in working hours (Monday to Friday, 09:00 to 18:00): 1 h = the same hour; 4 h = the same half day; 9 h = one working day; 18 h = two; 27 h = three; 45 h = one week; 90 h = two weeks. "–" on the employee row: a management note has no resolve clock; the 60-day check measures it.',
    'المهل بساعات العمل (الاثنين إلى الجمعة، 09:00 إلى 18:00): ساعة = الساعة نفسها؛ 4 = نصف اليوم نفسه؛ 9 = يوم عمل؛ 18 = يومان؛ 27 = ثلاثة؛ 45 = أسبوع؛ 90 = أسبوعان. "–" في سطر الموظف: الملاحظة الإدارية بلا مهلة حل؛ فحص الـ60 يوماً يقيسها.',
  ),
}

/** "From the matrix ({product}): receiver {x} · informed {y} · backup {z} · respond {n} h · resolve {m} h" (S9), as separate labels. */
export const MATRIX_LINE_LABELS = {
  from: b('From the matrix', 'من المصفوفة'),
  receiver: b('receiver', 'المستلم'),
  informed: b('informed', 'مُبلَّغ'),
  backup: b('backup', 'البديل'),
  respond: b('respond', 'الرد'),
  resolve: b('resolve', 'الحل'),
}

export const MATRIX_KIND_LABEL: Record<MatrixKind, Bi> = {
  employee: b('Employee', 'موظف'),
  service: b('Service and behaviour', 'خدمة وسلوك'),
  training: b('Training gap', 'فجوة تدريب'),
  process: b('Process', 'عملية'),
  product: b('Product and app', 'منتج وتطبيق'),
  environment: b('Environment', 'بيئة'),
  legal: b('Legal and privacy', 'قانوني وخصوصية'),
  marketing: b('Marketing', 'تسويق'),
  shopper_critical: b('Shopper case · critical', 'حالة متسوق · حرجة'),
  legal_case: b('Legal or privacy case', 'حالة قانونية أو خصوصية'),
  infosec: b('Data exposure or system access incident', 'تسريب بيانات أو حادثة وصول للأنظمة'),
  vip: b('Any kind, VIP customer involved', 'أي نوع، زبون VIP معني'),
}

/** The twelve rows, in the order of the document: the eleven with cells, then the VIP rule. */
export const MATRIX_KINDS: MatrixKind[] = ['employee', 'service', 'training', 'process', 'product', 'environment', 'legal', 'marketing', 'shopper_critical', 'legal_case', 'infosec', 'vip']

/** The rows that hold cells (the VIP row is a rule). */
export const MATRIX_CELL_KINDS: MatrixCellKind[] = MATRIX_KINDS.filter((k): k is MatrixCellKind => k !== 'vip')

export const MATRIX_FIELDS: MatrixField[] = ['receiver', 'informed', 'backup', 'respondH', 'resolveH']

/** Key map, React fix kind to matrix row. */
export const MATRIX_KEY_BY_FIX_KIND: Record<CorrectiveActionKind, MatrixCellKind> = {
  employee: 'employee',
  service_behaviour: 'service',
  training_gap: 'training',
  process: 'process',
  product_app: 'product',
  environment: 'environment',
  legal_privacy: 'legal',
  marketing: 'marketing',
}

/**
 * The Arabic form of every title the matrix uses, one entry per English title (a cell with two or three titles joins them with " · " and
 * its Arabic joins the Arabic forms the same way). Written for this build: NEEDS NATIVE REVIEW (docs/V42_MATRIX.md lists them). Forms
 * that already exist elsewhere (the roles, the v40 matrix) are reused unchanged, so a title reads the same everywhere. A title missing
 * here fails loudly (`title()` throws, the seed test catches it): nothing is translated by guessing.
 */
export const MATRIX_TITLES_AR: Readonly<Record<string, string>> = {
  // Real Estate
  'Direct manager of the agent': 'المدير المباشر للموظف',
  'Head of the sales team (environment)': 'رئيس فريق المبيعات (البيئة)',
  'Sales manager (environment)': 'مدير المبيعات (البيئة)',
  'Head of the environment': 'رئيس البيئة',
  'CX manager': 'مدير تجربة العملاء',
  'L&D head': 'رئيس التعلم والتطوير',
  'Environment champion': 'ممثل البيئة',
  'Sales operations lead': 'قائد عمليات المبيعات',
  'Web and app product owner': 'مالك منتج الموقع والتطبيق',
  'IT lead': 'قائد تقنية المعلومات',
  'Branch or gallery manager': 'مدير الفرع أو المعرض',
  Legal: 'القانونية',
  'Information Security lead': 'مسؤول أمن المعلومات',
  'Internal Audit and Marketing Lead': 'مسؤول التدقيق الداخلي والتسويق',
  'Marketing manager': 'مدير التسويق',
  'CX team (triage)': 'فريق CX (الفرز)',
  'HR pool (conduct)': 'مجموعة الموارد البشرية (السلوك)',
  'Information Security lead (IT)': 'مسؤول أمن المعلومات (تقنية المعلومات)',
  // After-Sales
  'After-Sales team lead (direct manager)': 'قائد فريق ما بعد البيع (المدير المباشر)',
  'Head of After-Sales': 'رئيس ما بعد البيع',
  'After-Sales team lead': 'قائد فريق ما بعد البيع',
  'After-Sales champion': 'ممثل ما بعد البيع',
  'After-Sales operations lead': 'قائد عمليات ما بعد البيع',
  'App product owner': 'مالك منتج التطبيق',
  'Property or community manager (PSI Assets)': 'مدير العقار أو المجتمع (PSI للأصول)',
  // PSI Club
  'Club relations manager': 'مدير علاقات النادي',
  'Head of PSI Club': 'رئيس نادي بي إس آي',
  'Club champion': 'ممثل النادي',
  'Club operations lead': 'قائد عمليات النادي',
  'Club app product owner': 'مالك منتج تطبيق النادي',
  // Tour Estate
  'Tour operations supervisor (direct manager)': 'مشرف عمليات الجولات (المدير المباشر)',
  'Tour Estate CX lead': 'قائد تجربة العملاء في تور إستيت',
  'Tour operations manager': 'مدير عمليات الجولات',
  'Tour Estate champion': 'ممثل تور إستيت',
  'Head of Tour Estate': 'رئيس تور إستيت',
  'Tour app product owner': 'مالك منتج تطبيق الجولات',
  'Fleet and guides supervisor': 'مشرف الأسطول والمرشدين',
  'Tour Estate CX lead (triage)': 'قائد تجربة العملاء في تور إستيت (الفرز)',
  // PSI Events
  'Events manager (direct manager)': 'مدير الفعاليات (المدير المباشر)',
  'Head of Events': 'رئيس الفعاليات',
  'Events manager': 'مدير الفعاليات',
  'Events champion': 'ممثل الفعاليات',
  'Events operations lead': 'قائد عمليات الفعاليات',
  'Registration platform owner': 'مالك منصة التسجيل',
  'Venue or booth lead': 'قائد الموقع أو الجناح',
  // PSI Wallet
  'Account manager lead (direct manager)': 'قائد مديري الحسابات (المدير المباشر)',
  'Head of Investor Relations': 'رئيس علاقات المستثمرين',
  'Account manager lead': 'قائد مديري الحسابات',
  'Wallet champion': 'ممثل المحفظة',
  'Wallet operations lead': 'قائد عمليات المحفظة',
  'Wallet product owner': 'مالك منتج المحفظة',
  // The VIP rule row
  'Same receiver, clocks halved': 'المستلم نفسه، المهل مُنصَّفة',
  'Head of the environment at once': 'رئيس البيئة فوراً',
}

const SEPARATOR = ' · '

/** A title cell in both languages: "–" is nobody (null); "A · B" is two titles in one string, each looked up. Throws on a title with no Arabic form. */
export function title(en: string): Bi | null {
  if (en === '–') return null
  const parts = en.split(SEPARATOR)
  const ar = parts.map((p) => {
    const form = MATRIX_TITLES_AR[p]
    if (!form) throw new Error(`Escalation matrix: no Arabic form for the title "${p}"`)
    return form
  })
  return { en, ar: ar.join(SEPARATOR) }
}

/** "4" is 4 hours; "1 day" and "5 days" are 9 and 45 working hours shown as days; "–" is no clock. */
function clock(text: string): { hours: number | null; asDays: boolean } {
  if (text === '–') return { hours: null, asDays: false }
  const days = /^(\d+) days?$/.exec(text)
  if (days) return { hours: Number(days[1]) * HOURS_PER_DAY, asDays: true }
  if (!/^\d+$/.test(text)) throw new Error(`Escalation matrix: not a clock "${text}"`)
  return { hours: Number(text), asDays: false }
}

/** receiver, informed, backup, respond, resolve: the five cells of a row exactly as ESCALATION-MATRIX-2026-11-19.md writes them. */
type CellSeed = readonly [receiver: string, informed: string, backup: string, respond: string, resolve: string]

/** The ten rows of each product that differ by product (set 19 Nov). `infosec` and `vip` are the same for every product. */
type ProductSeed = Record<Exclude<MatrixCellKind, 'infosec'>, CellSeed>

export const MATRIX_SEED: Record<ProductId, ProductSeed> = {
  re: {
    employee: ['Direct manager of the agent', '–', 'Head of the sales team (environment)', '9', '–'],
    service: ['Sales manager (environment)', 'Head of the environment', 'CX manager', '4', '27'],
    training: ['L&D head', 'Environment champion', 'CX manager', '9', '90'],
    process: ['Sales operations lead', 'Head of the environment', 'CX manager', '4', '45'],
    product: ['Web and app product owner', 'IT lead', 'CX manager', '4', '45'],
    environment: ['Branch or gallery manager', 'Head of the environment', 'CX manager', '4', '27'],
    legal: ['Legal', 'Information Security lead · CX manager', 'Head of the environment', '1', '9'],
    marketing: ['Internal Audit and Marketing Lead', 'Marketing manager', 'CX manager', '9', '45'],
    shopper_critical: ['CX team (triage)', 'Sales manager (environment)', 'HR pool (conduct)', '1 day', '5 days'],
    legal_case: ['Legal', 'CX manager · Head of the environment', 'Information Security lead', '1 day', '5 days'],
  },
  af: {
    employee: ['After-Sales team lead (direct manager)', '–', 'Head of After-Sales', '9', '–'],
    service: ['After-Sales team lead', 'Head of After-Sales', 'CX manager', '4', '27'],
    training: ['L&D head', 'After-Sales champion', 'CX manager', '9', '90'],
    process: ['After-Sales operations lead', 'Head of After-Sales', 'CX manager', '4', '45'],
    product: ['App product owner', 'IT lead', 'CX manager', '4', '45'],
    environment: ['Property or community manager (PSI Assets)', 'Head of After-Sales', 'CX manager', '4', '18'],
    legal: ['Legal', 'Information Security lead · CX manager', 'Head of After-Sales', '1', '9'],
    marketing: ['Internal Audit and Marketing Lead', 'Marketing manager', 'CX manager', '9', '45'],
    shopper_critical: ['CX team (triage)', 'After-Sales team lead', 'HR pool (conduct)', '1 day', '5 days'],
    legal_case: ['Legal', 'CX manager · Head of After-Sales', 'Information Security lead', '1 day', '5 days'],
  },
  cl: {
    employee: ['Direct manager of the agent', '–', 'Club relations manager', '4', '–'],
    service: ['Club relations manager', 'Head of PSI Club', 'CX manager', '2', '18'],
    training: ['L&D head', 'Club champion', 'CX manager', '9', '45'],
    process: ['Club operations lead', 'Head of PSI Club', 'CX manager', '2', '27'],
    product: ['Club app product owner', 'IT lead', 'CX manager', '2', '27'],
    environment: ['Club relations manager', 'Head of PSI Club', '–', '2', '18'],
    legal: ['Legal', 'Information Security lead · CX manager · Head of PSI Club', '–', '1', '9'],
    marketing: ['Internal Audit and Marketing Lead', 'Marketing manager · Head of PSI Club', 'CX manager', '4', '27'],
    shopper_critical: ['CX team (triage)', 'Club relations manager', 'HR pool (conduct)', '4', '27'],
    legal_case: ['Legal', 'CX manager · Head of PSI Club', 'Information Security lead', '4', '27'],
  },
  to: {
    employee: ['Tour operations supervisor (direct manager)', '–', 'Tour Estate CX lead', '4', '–'],
    service: ['Tour Estate CX lead', 'Tour operations manager', 'CX manager', '2', '18'],
    training: ['L&D head', 'Tour Estate champion', 'Tour Estate CX lead', '9', '45'],
    process: ['Tour operations manager', 'Head of Tour Estate', 'CX manager', '2', '27'],
    product: ['Tour app product owner', 'IT lead', 'CX manager', '4', '45'],
    environment: ['Fleet and guides supervisor', 'Tour operations manager', 'Tour Estate CX lead', '1', '9'],
    legal: ['Legal', 'Information Security lead · CX manager', 'Head of Tour Estate', '1', '9'],
    marketing: ['Internal Audit and Marketing Lead', 'Marketing manager', 'CX manager', '9', '45'],
    shopper_critical: ['Tour Estate CX lead (triage)', 'Tour operations manager', 'HR pool (conduct)', '4', '27'],
    legal_case: ['Legal', 'CX manager · Head of Tour Estate', 'Information Security lead', '4', '27'],
  },
  ev: {
    employee: ['Events manager (direct manager)', '–', 'Head of Events', '4', '–'],
    service: ['Events manager', 'Head of Events', 'CX manager', '1', '9'],
    training: ['L&D head', 'Events champion', 'CX manager', '9', '45'],
    process: ['Events operations lead', 'Head of Events', 'CX manager', '2', '18'],
    product: ['Registration platform owner', 'IT lead', 'CX manager', '2', '18'],
    environment: ['Venue or booth lead', 'Events manager', '–', '1', '9'],
    legal: ['Legal', 'Information Security lead · CX manager', 'Head of Events', '1', '9'],
    marketing: ['Marketing manager', 'Internal Audit and Marketing Lead', 'CX manager', '4', '27'],
    shopper_critical: ['CX team (triage)', 'Events manager', 'HR pool (conduct)', '4', '27'],
    legal_case: ['Legal', 'CX manager · Head of Events', 'Information Security lead', '4', '27'],
  },
  wl: {
    employee: ['Account manager lead (direct manager)', '–', 'Head of Investor Relations', '4', '–'],
    service: ['Account manager lead', 'Head of Investor Relations', 'CX manager', '2', '18'],
    training: ['L&D head', 'Wallet champion', 'CX manager', '9', '45'],
    process: ['Wallet operations lead', 'Head of Investor Relations', 'CX manager', '2', '27'],
    product: ['Wallet product owner', 'Information Security lead · IT lead', 'CX manager', '2', '18'],
    environment: ['Account manager lead', 'Head of Investor Relations', '–', '4', '27'],
    legal: ['Legal', 'Information Security lead · CX manager · Head of Investor Relations', '–', '1', '9'],
    marketing: ['Internal Audit and Marketing Lead', 'Marketing manager', 'CX manager', '9', '45'],
    shopper_critical: ['CX team (triage)', 'Account manager lead', 'HR pool (conduct)', '4', '27'],
    legal_case: ['Legal', 'CX manager · Head of Investor Relations', 'Information Security lead', '1', '9'],
  },
}

/** "Data exposure or system access incident": the same for every product (rule 2). */
export const INFOSEC_SEED: CellSeed = ['Information Security lead (IT)', 'Legal · CX manager', 'IT lead', '1', '9']

/** "Any kind, VIP customer involved": a rule, the same for every product (rule 1). Both clocks halved: a factor of 0.5, not 0.5 hours. */
export const VIP_FACTOR = 0.5
export const VIP_RULE_SEED: VipRule = {
  factor: VIP_FACTOR,
  receiver: title('Same receiver, clocks halved')!,
  informed: title('Head of the environment at once')!,
  informedTitle: title('Head of the environment')!,
  backup: title('CX manager')!,
}

function cellsFrom(seed: CellSeed): MatrixCells {
  const respond = clock(seed[3])
  const resolve = clock(seed[4])
  const asDays = { ...(respond.asDays ? { respondH: true as const } : {}), ...(resolve.asDays ? { resolveH: true as const } : {}) }
  return {
    receiver: title(seed[0]),
    informed: title(seed[1]),
    backup: title(seed[2]),
    respondH: respond.hours,
    resolveH: resolve.hours,
    ...(Object.keys(asDays).length ? { asDays } : {}),
  }
}

const NOT_EDITED: Record<MatrixField, boolean> = { receiver: false, informed: false, backup: false, respondH: false, resolveH: false }

function seededRow(kind: MatrixCellKind, seed: CellSeed): MatrixCellRow {
  return { kind, label: MATRIX_KIND_LABEL[kind], cells: cellsFrom(seed), edited: { ...NOT_EDITED } }
}

function vipRow(): MatrixRuleRow {
  return { kind: 'vip', label: MATRIX_KIND_LABEL.vip, rule: { ...VIP_RULE_SEED } }
}

/**
 * A fresh, editable matrix, the cells of 19 Nov 2026: twelve rows per product (eleven with cells, then the VIP rule), no cell edited.
 * Each product's table is its own copy, so editing one never touches another.
 */
export function buildMatrix(): Record<ProductId, MatrixRow[]> {
  const out = {} as Record<ProductId, MatrixRow[]>
  for (const product of Object.keys(MATRIX_SEED) as ProductId[]) {
    const seed = MATRIX_SEED[product]
    out[product] = MATRIX_KINDS.map((kind): MatrixRow => {
      if (kind === 'vip') return vipRow()
      if (kind === 'infosec') return seededRow(kind, INFOSEC_SEED)
      return seededRow(kind, seed[kind])
    })
  }
  return out
}

/** Every title of every seeded cell (a cell with two titles is one entry, as written), for the owner-title lookup. The VIP rule contributes the two titles it names. */
export function matrixTitles(): Bi[] {
  const out: Bi[] = []
  for (const rows of Object.values(buildMatrix())) {
    for (const r of rows) {
      if (r.kind === 'vip') out.push(r.rule.informedTitle, r.rule.backup)
      else for (const v of [r.cells.receiver, r.cells.informed, r.cells.backup]) if (v) out.push(v)
    }
  }
  return out
}
