import type { Bi, CategoryTemplateRow, CorrectiveActionKind, MatrixCells, MatrixField, MatrixKind, MatrixRow, ProductId } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Escalation matrix page copy (v40 S9). */
export const MATRIX_COPY = {
  title: b('Escalation matrix', 'مصفوفة التصعيد'),
  intro: b(
    'Who, by title, receives each kind of fix or case, who is informed, who is the backup, and the clocks in working hours. One table per product; the product owners fill the cells with the Internal Audit and Marketing Lead by 28 November. Titles only; the CRM supplies who holds the title.',
    'من يستلم كل نوع من الحلول أو الحالات بالمسمّى، ومن يُبلَّغ، ومن البديل، والمهل بساعات العمل. جدول لكل منتج؛ يعبّئ مالكو المنتجات الخلايا مع مدير التدقيق الداخلي والتسويق قبل 28 نوفمبر. مسمّيات فقط؛ CRM يحدد من يشغلها.',
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
    "Principles: the receiver is the person who can fix it, never top management; heads and C-level are informed only; an employee kind goes to the direct manager and nowhere else; legal goes to Legal first; anything touching a customer's contact goes through the CX team. Values marked with defaults are proposals until the owners confirm them.",
    'المبادئ: المستلم هو من يستطيع الإصلاح، لا الإدارة العليا؛ الرؤساء والإدارة التنفيذية يُبلَّغون فقط؛ نوع الموظف يذهب للمدير المباشر ولا غيره؛ القانوني يذهب للقانونية أولاً؛ كل ما يمس تواصل الزبون يمر بفريق CX. القيم الافتراضية مقترحات حتى يؤكدها المالكون.',
  ),
  defaultsAreProposals: b('Defaults are proposals', 'القيم الافتراضية مقترحات'),
  /** Hours are working hours; 9 = one working day (09:00 to 18:00). */
  hoursHint: b('Hours are working hours: 9 = one working day, 09:00 to 18:00.', 'الساعات هي ساعات عمل: 9 = يوم عمل واحد، من 09:00 إلى 18:00.'),
  matrixButton: b('Matrix', 'المصفوفة'),
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
}

export const MATRIX_KINDS: MatrixKind[] = ['employee', 'service', 'training', 'process', 'product', 'environment', 'legal', 'marketing', 'shopper_critical', 'legal_case']

export const MATRIX_FIELDS: MatrixField[] = ['receiver', 'informed', 'backup', 'respondH', 'resolveH']

/** Key map, React fix kind to matrix row. */
export const MATRIX_KEY_BY_FIX_KIND: Record<CorrectiveActionKind, MatrixKind> = {
  employee: 'employee',
  service_behaviour: 'service',
  training_gap: 'training',
  process: 'process',
  product_app: 'product',
  environment: 'environment',
  legal_privacy: 'legal',
  marketing: 'marketing',
}

const CX_MANAGER = b('CX manager', 'مدير تجربة العملاء')
const HEAD_ENV = b('Head of the environment', 'رئيس البيئة')

/**
 * v40 defaults, identical for every product. [Proposed]: the owners fill the
 * real cells by 28 Nov (Programme KB 43.1). Arabic titles are written for this
 * build and need native review. Hours are working hours (9 = one working day).
 * The two case rows are "1 day / 5 days" in the prototype, stored here as hours.
 */
export const MATRIX_DEFAULTS: Record<MatrixKind, MatrixCells> = {
  employee: { receiver: b('Direct manager of the agent', 'المدير المباشر للموظف'), informed: null, backup: b('Head of the team', 'رئيس الفريق'), respondH: null, resolveH: null },
  service: { receiver: b('Team manager', 'مدير الفريق'), informed: HEAD_ENV, backup: CX_MANAGER, respondH: 9, resolveH: 45 },
  training: { receiver: b('L&D head', 'رئيس التعلم والتطوير'), informed: b('Environment champion', 'ممثل البيئة'), backup: CX_MANAGER, respondH: 9, resolveH: 90 },
  process: { receiver: b('Process owner (matrix)', 'مالك العملية (حسب المصفوفة)'), informed: b('Product owner', 'مالك المنتج'), backup: CX_MANAGER, respondH: 9, resolveH: 45 },
  product: { receiver: b('Product owner', 'مالك المنتج'), informed: b('IT lead', 'قائد تقنية المعلومات'), backup: CX_MANAGER, respondH: 9, resolveH: 90 },
  environment: { receiver: b('Branch or office manager', 'مدير الفرع أو المكتب'), informed: HEAD_ENV, backup: null, respondH: 9, resolveH: 45 },
  legal: { receiver: b('Legal', 'القانونية'), informed: CX_MANAGER, backup: null, respondH: 1, resolveH: 5 },
  marketing: { receiver: b('Internal Audit and Marketing Lead', 'مسؤول التدقيق الداخلي والتسويق'), informed: b('Marketing manager', 'مدير التسويق'), backup: CX_MANAGER, respondH: 18, resolveH: 45 },
  shopper_critical: { receiver: b('CX team (triage)', 'فريق CX (الفرز)'), informed: b('Direct manager', 'المدير المباشر'), backup: b('HR pool (conduct)', 'مجموعة الموارد البشرية (السلوك)'), respondH: 9, resolveH: 45 },
  legal_case: { receiver: b('Legal', 'القانونية'), informed: CX_MANAGER, backup: null, respondH: 9, resolveH: 45 },
}

const PRODUCT_IDS: ProductId[] = ['re', 'af', 'cl', 'to', 'ev', 'wl']

function defaultRow(kind: MatrixKind): MatrixRow {
  const d = MATRIX_DEFAULTS[kind]
  return {
    kind,
    label: MATRIX_KIND_LABEL[kind],
    cells: { ...d },
    isDefault: { receiver: true, informed: true, backup: true, respondH: true, resolveH: true },
  }
}

/** A fresh, editable matrix: ten rows per product, every cell still the default. */
export function buildMatrix(): Record<ProductId, MatrixRow[]> {
  return Object.fromEntries(PRODUCT_IDS.map((p) => [p, MATRIX_KINDS.map(defaultRow)])) as Record<ProductId, MatrixRow[]>
}

/**
 * The Rules and Definitions Decision 4 template, per complaint category (Owner, Backup,
 * Informed, Routing). It conflicts with the v40 page, which is per kind and adds the clocks,
 * and the document says Real Estate keeps one matrix per environment (V40_DELTA B16): the
 * owner decides which is the contract, so both are kept. Cells are blank in the document,
 * except Legal and privacy (owner Legal, routing automatic).
 */
export const ESCALATION_TEMPLATE_BY_CATEGORY: CategoryTemplateRow[] = [
  { id: 'behaviour', category: b('Behaviour and attitude', 'السلوك والموقف'), owner: null, backup: null, informed: null, routing: null },
  { id: 'process', category: b('Process and follow-up', 'العملية والمتابعة'), owner: null, backup: null, informed: null, routing: null },
  { id: 'knowledge', category: b('Knowledge and wrong information', 'المعرفة والمعلومات الخاطئة'), owner: null, backup: null, informed: null, routing: null },
  { id: 'app', category: b('App and digital', 'التطبيق والرقمي'), owner: null, backup: null, informed: null, routing: null },
  { id: 'legal', category: b('Legal and privacy', 'قانوني وخصوصية'), owner: b('Legal', 'القانونية'), backup: null, informed: null, routing: b('Automatic', 'تلقائي') },
]

/** Real Estate has one matrix per environment in the Rules document; the v40 page has one per product. */
export const TEMPLATE_PER_ENVIRONMENT_NOTE = b(
  'The Rules and Definitions document asks for one matrix per environment for Real Estate; the v40 page keeps one per product. The owner decides.',
  'يطلب مستند القواعد والتعريفات مصفوفة لكل بيئة في العقارات؛ أما صفحة النموذج فتحتفظ بواحدة لكل منتج. القرار للمالك.',
)
