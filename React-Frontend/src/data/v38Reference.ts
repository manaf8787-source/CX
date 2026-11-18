import type { Bi, CorrectiveActionKind, ProductId } from '../types'

/**
 * Reference data transcribed from the v38 prototype export
 * (`Documents/PSI CX Portal.html`) and the Modules KB. Every figure is the
 * prototype's own sample figure, not a real number — and nothing here is
 * invented for this build. Each block names where it was taken from.
 */

const b = (en: string, ar: string): Bi => ({ en, ar })

// --- Standards register: 26 standards, M-01 to M-26 (KB §15; prototype STDREG) ---

export type StandardArea = 'env' | 'priv' | 'app' | 'beh' | 'com' | 'sell' | 'fol'
export type RegisterStatus = 'obs' | 'draft' | 'appr'
export type RegisterSource = 'policy' | 'bench' | 'work' | 'legal' | 'cx'

export interface RegisterStandard {
  code: string
  area: StandardArea
  name: Bi
  rule: Bi
  owner: Bi
  source: RegisterSource
  status: RegisterStatus
  effective?: Bi
  /** Scored from the first wave; a breach opens a case. */
  critical?: boolean
}

export const STANDARD_AREA_LABEL: Record<StandardArea, Bi> = {
  env: b('Physical environment', 'البيئة المادية'),
  priv: b('Meeting room and privacy', 'غرفة الاجتماعات والخصوصية'),
  app: b('Appearance', 'المظهر'),
  beh: b('Behaviour', 'السلوك'),
  com: b('Communication', 'التواصل'),
  sell: b('Selling skills', 'مهارات البيع'),
  fol: b('Follow-up', 'المتابعة'),
}

export const REGISTER_STATUS: Record<RegisterStatus, { label: Bi; description: Bi }> = {
  obs: { label: b('Observe only', 'ملاحظة فقط'), description: b('Shoppers record what happens. Not scored.', 'يسجّل المتسوّقون ما يحدث. لا يُحتسب.') },
  draft: { label: b('Draft standard', 'معيار مسودة'), description: b('A rule is proposed and under review. Not scored yet.', 'قاعدة مقترحة قيد المراجعة. لا تُحتسب بعد.') },
  appr: { label: b('Approved and scored', 'معتمد ومحتسب'), description: b('Published and communicated. Counts in the score.', 'منشور ومُبلَّغ. يُحتسب في النتيجة.') },
}

export const REGISTER_SOURCE: Record<RegisterSource, Bi> = {
  policy: b('PSI policy', 'سياسة PSI'),
  bench: b('Baseline benchmark', 'مرجع من الخط القاعدي'),
  work: b('Standards workshop', 'ورشة المعايير'),
  legal: b('Legal confirmation', 'تأكيد قانوني'),
  cx: b('CX rule (decided)', 'قاعدة CX (مقررة)'),
}

const OWN_SS = b('Sales support lead', 'مسؤول دعم المبيعات')
const OWN_HR = b('HR', 'الموارد البشرية')
const OWN_OPS = b('Operations', 'العمليات')
const OWN_CX = b('CX manager', 'مدير تجربة العملاء')
const OWN_LG = b('Legal / Compliance', 'الشؤون القانونية / الامتثال')
const AFTER_BASELINE = b('To be set after the baseline wave.', 'تُحدد بعد موجة الخط القاعدي.')
const FIRST_WAVE = b('From the first wave', 'من الموجة الأولى')

export const STANDARDS_REGISTER: RegisterStandard[] = [
  { code: 'M-01', area: 'env', name: b('Entrance, signage and general cleanliness', 'المدخل واللافتات والنظافة العامة'), rule: AFTER_BASELINE, owner: OWN_OPS, source: 'bench', status: 'obs' },
  { code: 'M-02', area: 'env', name: b('Reception and waiting area: seating, refreshments, brochures', 'الاستقبال ومنطقة الانتظار: المقاعد والضيافة والكتيّبات'), rule: AFTER_BASELINE, owner: OWN_OPS, source: 'bench', status: 'obs' },
  { code: 'M-03', area: 'env', name: b('Sales tools: models, screens and approved materials ready', 'أدوات البيع: المجسمات والشاشات والمواد المعتمدة جاهزة'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-04', area: 'env', name: b('Restrooms and facilities', 'دورات المياه والمرافق'), rule: AFTER_BASELINE, owner: OWN_OPS, source: 'bench', status: 'obs' },
  { code: 'M-05', area: 'priv', name: b('Private meeting room available at each branch or gallery', 'غرفة اجتماعات خاصة متاحة في كل فرع أو معرض'), rule: b('Proposed: a private room is available, or a quiet corner where one is not possible. To be decided by PSI.', 'مقترح: غرفة خاصة متاحة، أو ركن هادئ إن تعذّر ذلك. يقرره PSI.'), owner: OWN_OPS, source: 'work', status: 'draft' },
  { code: 'M-06', area: 'priv', name: b('Agent offers the room when price, payment plan or documents are discussed', 'يعرض الموظف الغرفة عند مناقشة السعر أو الدفعات أو المستندات'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-07', area: 'priv', name: b('Room is clean, quiet and free of interruptions', 'الغرفة نظيفة وهادئة دون مقاطعة'), rule: AFTER_BASELINE, owner: OWN_OPS, source: 'bench', status: 'obs' },
  { code: 'M-08', area: 'priv', name: b('Documents, IDs and prices handled discreetly', 'المستندات والهويات والأسعار تُعالج بسرية'), rule: b('Proposed: no documents or prices left visible; ID copies handled per the data protection policy (Legal to confirm).', 'مقترح: لا تُترك مستندات أو أسعار ظاهرة؛ نسخ الهوية وفق سياسة حماية البيانات (تأكيد القانونية).'), owner: OWN_LG, source: 'legal', status: 'draft' },
  { code: 'M-09', area: 'priv', name: b('Room suits families and groups; refreshments offered', 'الغرفة تناسب العائلات والمجموعات؛ تُعرض الضيافة'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-10', area: 'app', name: b('Dress code', 'الزي الرسمي'), rule: b('Awaiting the HR dress code document.', 'بانتظار وثيقة الزي الرسمي من الموارد البشرية.'), owner: OWN_HR, source: 'policy', status: 'obs' },
  { code: 'M-11', area: 'app', name: b('Personal hygiene, grooming and ID badge', 'النظافة الشخصية والمظهر وبطاقة التعريف'), rule: AFTER_BASELINE, owner: OWN_HR, source: 'policy', status: 'obs' },
  { code: 'M-12', area: 'beh', name: b('Time to greet a walk-in visitor', 'وقت الترحيب بالزائر'), rule: b('Proposed: greeted within 1 minute of entering.', 'مقترح: الترحيب خلال دقيقة من الدخول.'), owner: OWN_SS, source: 'work', status: 'draft' },
  { code: 'M-13', area: 'beh', name: b('Walk-in assignment and waiting time', 'توزيع الزوار وزمن الانتظار'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-14', area: 'beh', name: b('Respect, patience and no pressure; local etiquette', 'الاحترام والصبر وعدم الضغط؛ مراعاة الأعراف المحلية'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-15', area: 'com', name: b('Language and tone: Arabic and English, switching when asked', 'اللغة والنبرة: العربية والإنجليزية والتبديل عند الطلب'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-16', area: 'com', name: b('Active listening and clear explanations', 'الإصغاء الفعّال والشرح الواضح'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-17', area: 'sell', name: b('Needs discovery: budget, purpose, timing, family', 'استكشاف الاحتياج: الميزانية والغرض والتوقيت والعائلة'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-18', area: 'sell', name: b('Presentation and product knowledge', 'العرض والمعرفة بالمنتج'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-19', area: 'sell', name: b('Objection and price handling', 'التعامل مع الاعتراضات والسعر'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-20', area: 'sell', name: b('Accurate information and no unapproved promises or discounts', 'معلومات دقيقة ولا وعود أو خصومات غير معتمدة'), rule: b('Always scored from the first wave. A breach opens a case in the portal.', 'يُحتسب دائماً من الموجة الأولى. المخالفة تفتح حالة في البوابة.'), owner: OWN_CX, source: 'cx', status: 'appr', effective: FIRST_WAVE, critical: true },
  { code: 'M-21', area: 'sell', name: b('Close and next step; lead captured when the customer agrees', 'الإغلاق والخطوة التالية؛ تسجيل العميل عند موافقته'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-22', area: 'fol', name: b('First contact after a visit or enquiry', 'أول تواصل بعد الزيارة أو الاستفسار'), rule: b('Proposed: within 1 working day. Awaiting the SLA document.', 'مقترح: خلال يوم عمل. بانتظار وثيقة مدد الخدمة.'), owner: OWN_SS, source: 'work', status: 'draft' },
  { code: 'M-23', area: 'fol', name: b('Channel and number of attempts (WhatsApp first, then a call)', 'القناة وعدد المحاولات (واتساب أولاً ثم اتصال)'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-24', area: 'fol', name: b('Quality of follow-up messages and calls; matches what was said in the visit', 'جودة رسائل ومكالمات المتابعة؛ تطابق ما قيل في الزيارة'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-25', area: 'fol', name: b('Persistence without pressure; proposal or offer sent', 'المثابرة دون ضغط؛ إرسال العرض أو المقترح'), rule: AFTER_BASELINE, owner: OWN_SS, source: 'bench', status: 'obs' },
  { code: 'M-26', area: 'fol', name: b('Official channels only; no move to a personal number', 'القنوات الرسمية فقط؛ لا انتقال إلى رقم شخصي'), rule: b('Always scored from the first wave. Policy to be confirmed with Legal.', 'يُحتسب دائماً من الموجة الأولى. السياسة بانتظار تأكيد القانونية.'), owner: OWN_LG, source: 'legal', status: 'appr', effective: FIRST_WAVE, critical: true },
]

// --- Intelligent CX team: job descriptions (KB §11; prototype AGENTS, SUPV) ---

export type AgentStage = 'shadow' | 'limited' | 'live' | 'phase2'

export interface AgentJobDescription {
  id: number
  inputs: Bi
  output: Bi
  rules: Bi
  model: Bi
  supervisorChecks: Bi
  showsOn: Bi
  stage: AgentStage
  /** Share of outputs the supervisor approved first time (sample); null = not running. A "wrong" in the weekly sample lowers it (see `utils/passRate.ts`); this field holds the current figure. */
  approvalPct: number | null
  /** The figure before the weekly sample's verdicts; filled at load from `approvalPct`. */
  baseApprovalPct?: number | null
  /** "Wrong" verdicts this week, and the supervisor tests they became. */
  wrongThisWeek?: number
  supervisorTests?: number
}

export const AGENT_STAGE_LABEL: Record<AgentStage, Bi> = {
  shadow: b('Shadow', 'ظل'),
  limited: b('Limited', 'محدود'),
  live: b('Live', 'مباشر'),
  phase2: b('Phase 2', 'المرحلة 2'),
}

export const AGENT_JDS: AgentJobDescription[] = [
  { id: 1, stage: 'limited', approvalPct: 97, inputs: b('CRM, AI caller and IVR, WhatsApp, app chats, website and app enquiries, Club ratings, shopper results, public channels', 'CRM، الاتصال الآلي والرد الآلي، واتساب، دردشات التطبيقات، استفسارات الموقع والتطبيق، تقييمات النادي، نتائج المتسوق، القنوات العامة'), output: b('event {person or unidentified, channel, source, direction, reason, flags}', 'حدث {شخص أو غير معرَّف، قناة، مصدر، اتجاه، سبب، أعلام}'), rules: b('Identity key order; normalised match; no match = unmatched, never dropped; public = unidentified pool; dedup 2 min', 'ترتيب مفتاح الهوية؛ مطابقة موحّدة؛ بلا مطابقة = غير مطابق ولا يُحذف؛ العام = مجمّع غير معرَّف؛ إزالة تكرار دقيقتان'), model: b('Only to pick between two candidate people', 'فقط للاختيار بين مرشحَين'), supervisorChecks: b('Fields, window, badge in list, no text copied; 5% re-judged', 'الحقول، النافذة، الشارة ضمن القائمة، لا نص منسوخ؛ 5% يُعاد الحكم عليها'), showsOn: b('Customers timeline, source badges, unmatched queue', 'خط العملاء الزمني، شارات المصدر، طابور غير المطابق') },
  { id: 2, stage: 'limited', approvalPct: 94, inputs: b('The event and its text, reason code lists per product, CRM agent and environment', 'الحدث ونصه، قوائم الرموز لكل منتج، الموظف والبيئة من CRM'), output: b('classification {category, reason code, product, environment, agent id, confidence, evidence span}', 'تصنيف {فئة، رمز، منتج، بيئة، موظف، ثقة، مقطع الدليل}'), rules: b('Product, environment and agent from CRM, never from text; survey answers map by rule', 'المنتج والبيئة والموظف من CRM لا من النص؛ إجابات الاستبيان تُربط بقاعدة'), model: b('Choose category and reason code from the text, write a one-line reason in both languages', 'اختيار الفئة والرمز من النص وكتابة سبب بسطر واحد باللغتين'), supervisorChecks: b('Codes exist; CRM fields match; confidence under 0.7 re-classified on the other model', 'الرموز موجودة؛ حقول CRM مطابقة؛ الثقة تحت 0.7 تُعاد على النموذج الآخر'), showsOn: b('Event detail, reason code filters, low-confidence queue', 'تفاصيل الحدث، فلاتر الرموز، طابور منخفض الثقة') },
  { id: 3, stage: 'limited', approvalPct: 96, inputs: b('Classifications in the 30-day window, thresholds, impact rules, public pool', 'التصنيفات في نافذة 30 يوماً، العتبات، قواعد الأثر، المجمّع العام'), output: b('signal {reason code, product, environment, count, concentration, impact, evidence, detection}', 'إشارة {رمز، منتج، بيئة، عدد، تركّز، أثر، دليل، كشف}'), rules: b('30 days · same issue 5 · same agent 3 · concentration 50% · min sample 10 · legal, privacy, safety at count 1', '30 يوماً · نفس المشكلة 5 · نفس الموظف 3 · تركّز 50% · عينة 10 · القانوني والخصوصية والسلامة من أول مرة'), model: b('Title and a three-sentence explanation from the evidence only', 'عنوان وشرح من ثلاث جمل من الدليل فقط'), supervisorChecks: b('Every count recomputed; evidence ids exist; explanation names nothing absent from the evidence', 'كل عدد يُعاد حسابه؛ معرّفات الدليل موجودة؛ الشرح لا يذكر ما ليس في الدليل'), showsOn: b('Actions page (Signals tab), home tiles, "How the AI found this"', 'صفحة الإجراءات (تبويب الإشارات)، بلاطات الرئيسية، "كيف وجد الذكاء الاصطناعي هذا"') },
  { id: 4, stage: 'phase2', approvalPct: null, inputs: b('Visit results, finding examples per level, L&D standards, escalation matrix', 'نتائج الزيارات، أمثلة كل مستوى، معايير التعلم والتطوير، مصفوفة التصعيد'), output: b('finding {level, justification, standard}; case for critical', 'ملاحظة {مستوى، تبرير، معيار}؛ حالة للحرج'), rules: b('Listed finding takes its level; visit under 60% is at least medium; critical: 1 day respond, 5 resolve', 'الملاحظة المدرجة تأخذ مستواها؛ زيارة تحت 60% متوسطة على الأقل؛ الحرج: يوم للرد، 5 للحل'), model: b('Only for a finding not in any list: propose a level, never applied automatically', 'فقط لملاحظة غير مدرجة: اقتراح مستوى لا يُطبّق تلقائياً'), supervisorChecks: b('Level matches the list; SLAs from configuration; a case for every critical and nothing else', 'المستوى يطابق القائمة؛ المدد من الإعدادات؛ حالة لكل حرج ولا شيء غيره'), showsOn: b('Shopper cases tab, L&D statistics', 'تبويب حالات المتسوق، إحصاءات التعلم والتطوير') },
  { id: 5, stage: 'shadow', approvalPct: 88, inputs: b('The signal and evidence, the action history with outcomes, the matrix, L&D standards', 'الإشارة ودليلها، تاريخ الإجراءات ونتائجها، المصفوفة، معايير التعلم والتطوير'), output: b('action {text en/ar, classification, owner role, backup, informed, due, basis, how found} or investigation request', 'إجراء {نص بلغتين، تصنيف، دور المسؤول، بديل، مُبلَّغ، موعد، أساس، كيف وُجد} أو طلب استقصاء'), rules: b('Candidates ranked by effective rate; under 5 past cases = "first time", no percentage; owner from the matrix, never a head; due within 14 days', 'المرشحون مرتبون بنسبة الفعالية؛ أقل من 5 حالات = "أول مرة" بلا نسبة؛ المسؤول من المصفوفة لا رئيس؛ الموعد خلال 14 يوماً'), model: b('Write the action: what, who (role), by when, how success is seen, in both languages', 'كتابة الإجراء: ماذا، من (دور)، متى، كيف يُرى النجاح، باللغتين'), supervisorChecks: b('Owner exists in the matrix and is not a head; basis recomputed; no promise to a customer; Arabic equals English', 'المسؤول في المصفوفة وليس رئيساً؛ الأساس يُعاد حسابه؛ لا وعد لعميل؛ العربية تطابق الإنجليزية'), showsOn: b('Actions page, owner’s team view, receivers’ queue', 'صفحة الإجراءات، عرض فريق المسؤول، طابور المستلمين') },
  { id: 6, stage: 'shadow', approvalPct: 99, inputs: b('Actions and status history, events before and after, scores, CRM transactions, runaway flags', 'الإجراءات وتاريخ حالاتها، الأحداث قبل وبعد، التقييمات، صفقات CRM، أعلام الهاربين'), output: b('verification {before, after, drop, verdict, note}; recovery {person, recovered or null}', 'تحقق {قبل، بعد، انخفاض، حكم، ملاحظة}؛ تعافٍ {شخص، تعافى أو غير محدد}'), rules: b('Approve within 5 working days; 60-day window; drop ≥ 50% and no return in 90 days = effective; recovered = 4+ rating, promoter or passive, transaction, or new contact without a complaint within 60 days', 'اعتماد خلال 5 أيام عمل؛ نافذة 60 يوماً؛ انخفاض ≥ 50% بلا عودة خلال 90 يوماً = فعّال؛ تعافى = تقييم 4+، مروّج أو محايد، صفقة، أو تواصل جديد بلا شكوى خلال 60 يوماً'), model: b('Only the verification note', 'ملاحظة التحقق فقط'), supervisorChecks: b('Every number recomputed; windows correct; recovered null before 60 days', 'كل رقم يُعاد حسابه؛ النوافذ صحيحة؛ التعافي غير محدد قبل 60 يوماً'), showsOn: b('Action status, effective rate on AI Insights, recovery on journeys', 'حالة الإجراء، نسبة الفعالية في رؤى الذكاء الاصطناعي، التعافي على الرحلات') },
  { id: 7, stage: 'shadow', approvalPct: 91, inputs: b('All events, classifications, scores, allowed CRM profile fields, transactions', 'كل الأحداث والتصنيفات والتقييمات وحقول CRM المسموحة والصفقات'), output: b('journey {narrative, problems, channels, reach index, runaway type, persona}; persona {rules, size, recommendation, audit status}', 'رحلة {سرد، مشاكل، قنوات، مؤشر وصول، نوع هروب، شخصية}؛ شخصية {قواعد، حجم، توصية، حالة التدقيق}'), rules: b('Runaway types by rule; forced switch 48 h; persona by rules first; minimum persona size 25', 'أنواع الهروب بقاعدة؛ انتقال قسري 48 ساعة؛ الشخصية بالقواعد أولاً؛ أدنى حجم للشخصية 25'), model: b('The narrative, every claim tied to an event id; the persona pattern and recommendation', 'السرد وكل ادعاء مربوط بمعرّف حدث؛ نمط الشخصية والتوصية'), supervisorChecks: b('Cited events exist; allowed fields only; no sensitive inference', 'الأحداث المذكورة موجودة؛ الحقول المسموحة فقط؛ لا استنتاج حساس'), showsOn: b('Customers, Runaway, Personas pages', 'صفحات العملاء والهاربين والشخصيات') },
  { id: 8, stage: 'shadow', approvalPct: 93, inputs: b('Detractor events, capacity settings, interview forms, reason codes, campaign scripts and rules', 'أحداث المنتقدين، إعدادات السعة، نماذج المقابلات، رموز الأسباب، نصوص الحملات وقواعدها'), output: b('call item {priority, due, brief}; interview {outcome, answers, codes, summary, interviewer human or AI}', 'سطر اتصال {أولوية، موعد، ملخص}؛ مقابلة {نتيجة، إجابات، رموز، ملخص، المحاوِر بشري أو ذكاء اصطناعي}'), rules: b('Capacity = people × hours × 4 × working days; critical always 100% and always a person; cooldown 90 days; hand-off rules on every campaign', 'السعة = أشخاص × ساعات × 4 × أيام العمل؛ الحرج 100% ودائماً شخص؛ فترة راحة 90 يوماً؛ قواعد التحويل على كل حملة'), model: b('The brief before the call; the coded summary after it', 'الملخص قبل المكالمة؛ الملخص المرمّز بعدها'), supervisorChecks: b('Capacity arithmetic; critical coverage 100%; brief contains only facts from events', 'حساب السعة؛ تغطية الحرج 100%؛ الملخص من وقائع الأحداث فقط'), showsOn: b('Close the loop page, journey events, report KPI', 'صفحة إغلاق الحلقة، أحداث الرحلة، مؤشر التقرير') },
  { id: 9, stage: 'shadow', approvalPct: 100, inputs: b('The metric store only', 'مخزن المؤشرات فقط'), output: b('The daily brief per role; the Monthly CX pack; the role summaries; every figure traceable to its register', 'الموجز اليومي لكل دور؛ حزمة CX الشهرية؛ ملخصات الأدوار؛ كل رقم له أثر إلى سجله'), rules: b('Every figure from the store with its sample size; below minimum sample = "too early"; no group NPS; audience rules', 'كل رقم من المخزن مع حجم عينته؛ تحت العينة = "مبكر"؛ لا NPS مجمّع؛ قواعد الجمهور'), model: b('The narrative, every sentence tied to a figure', 'السرد وكل جملة مربوطة برقم'), supervisorChecks: b('Every number in the narrative appears in the table with the same value', 'كل رقم في السرد موجود في الجدول بنفس القيمة'), showsOn: b('Daily brief on Home and on each role’s landing page; Monthly CX pack, per audience', 'الموجز اليومي في الرئيسية وفي صفحة هبوط كل دور؛ الحزمة الشهرية لكل جمهور') },
  { id: 10, stage: 'shadow', approvalPct: 98, inputs: b('Events and CRM stages, instrument definitions, caps, survey history, consent flags, approved templates, original source and service', 'الأحداث ومراحل CRM، تعريفات الأدوات، السقوف، سجل الاستبيانات، أعلام الموافقة، القوالب المعتمدة، المصدر الأصلي والخدمة'), output: b('survey_send {person, instrument, trigger, channel, source, stage}; survey_answer; survey_skip {reason}', 'إرسال {شخص، أداة، محفّز، قناة، مصدر، مرحلة}؛ إجابة؛ تخطٍّ {السبب}'), rules: b('NPS only on a completed milestone · interaction survey once per 30 days, viewing > offer > call · NPS once per 90 days, relationship NPS yearly · "What stopped you?" once per lead at 14 days silent · re-survey 7 to 14 days after resolution, exempt · nobody unidentified, opted out or on an open case', 'NPS فقط عند معلم مكتمل · استبيان تفاعل مرة كل 30 يوماً، معاينة > عرض > مكالمة · NPS مرة كل 90 يوماً، NPS العلاقة سنوياً · "ما الذي أوقفك" مرة لكل عميل محتمل بعد 14 يوم صمت · إعادة الاستبيان بعد 7 إلى 14 يوماً من الحل، معفاة · لا أحد غير معرَّف أو رافض أو في حالة مفتوحة'), model: b('Only the greeting line in the person’s language; the scored questions are fixed text', 'فقط سطر التحية بلغة الشخص؛ الأسئلة المقيَّمة نص ثابت'), supervisorChecks: b('Trigger exists and is allowed for the instrument; caps recomputed; no send to unidentified, opted-out or open-case people; template approved; never NPS without a milestone', 'المحفّز موجود ومسموح للأداة؛ السقوف تُعاد حسابها؛ لا إرسال لغير المعرَّفين أو الرافضين أو أصحاب الحالات المفتوحة؛ القالب معتمد؛ لا NPS بلا معلم'), showsOn: b('Surveys and triggers page (sent, answered, skipped and why), each product page', 'صفحة الاستبيانات والمحفّزات (أُرسل، أُجيب، تُخطّي ولماذا)، صفحة كل منتج') },
]

// The weekly sample changes `approvalPct` in place (the mock store); keep the starting figure.
for (const jd of AGENT_JDS) {
  jd.baseApprovalPct = jd.approvalPct
  jd.wrongThisWeek = 0
  jd.supervisorTests = 0
}

export const SUPERVISOR_VERDICTS = b(
  'Approved · Returned (once, with the failed check named) · Escalated (to the human role for that agent)',
  'معتمد · مُعاد (مرة واحدة باسم الفحص الفاشل) · مصعَّد (للدور البشري لذلك الوكيل)',
)
export const SUPERVISOR_CALIBRATION = b(
  '50 approved outputs a week read by the CX team and the Internal Audit and Marketing Lead; each disagreement becomes a test case.',
  '50 مخرجاً معتمداً أسبوعياً يقرؤها فريق تجربة العملاء ومسؤول التدقيق الداخلي والتسويق؛ كل خلاف يصبح حالة اختبار.',
)
export const WHAT_STAYS_WITH_PEOPLE = b(
  'People approve, read the customers’ words, see names and call customers. CX manager: owns the rules, approves anything with external effect, decides escalations. Direct managers: approve and run corrective actions. Internal Audit and Marketing Lead: marks feeds and standards as trusted, audits personas and campaigns, reads the weekly sample.',
  'الناس يعتمدون ويقرؤون كلمات العملاء ويرون الأسماء ويتصلون بالعملاء. مدير تجربة العملاء: يملك القواعد ويعتمد كل ما له أثر خارجي ويقرر التصعيد. المدراء المباشرون: يعتمدون الإجراءات التصحيحية وينفذونها. مسؤول التدقيق الداخلي والتسويق: يعتمد موثوقية التغذيات والمعايير ويدقق الشخصيات والحملات ويقرأ العينة الأسبوعية.',
)

/** KB §11 "How it is switched on". */
export const SWITCH_ON_STAGES: { stage: Bi; what: Bi; exit: Bi }[] = [
  { stage: b('Shadow', 'ظل'), what: b('Agents run on real data but only suggest; the CX team does the work by hand and compares', 'تعمل الوكلاء على بيانات حقيقية لكنها تقترح فقط؛ يعمل فريق تجربة العملاء يدوياً ويقارن'), exit: b('Agreement 9 in 10 for two weeks', 'اتفاق 9 من 10 لمدة أسبوعين') },
  { stage: b('Limited', 'محدود'), what: b('Fixes really go to managers, in one environment, for four weeks; nothing reaches a customer without a person’s approval', 'تصل الإصلاحات فعلاً إلى المدراء في بيئة واحدة لمدة أربعة أسابيع؛ لا يصل شيء إلى عميل دون موافقة شخص'), exit: b('No critical miss in the weekly sample', 'لا خطأ حرج في العينة الأسبوعية') },
  { stage: b('Live', 'مباشر'), what: b('All launched products; the weekly sample continues', 'كل المنتجات المطلقة؛ تستمر العينة الأسبوعية'), exit: b('Ongoing', 'مستمر') },
]

// --- Public channels (KB §10; prototype PUB, repIndex) ---

export type PublicPlatform = 'facebook' | 'instagram' | 'linkedin' | 'google'

export interface PublicMention {
  id: string
  platform: PublicPlatform
  date: string
  environment: string
  text: string
  sentiment: -1 | 0 | 1
  replied: boolean
  replyHours: number | null
  /** The person later identified themselves on a private channel. */
  becameIdentified: boolean
  /** v40 (F30): who owns the public reply: Marketing, the channel owner (decided 18 Nov). CX watches the 48-hour clock and raises a signal when it is missed; the Internal Audit and Marketing Lead audits monthly. */
  owner: Bi
  /** v40 (F30): when the mention was marked replied (ISO), set by `useMarkReplied`. */
  repliedAt?: string
  /** v40 (F30): the private channel a person moved to. The prototype says "WhatsApp" whatever the channel; this says it per row when known. */
  channelMovedTo?: 'whatsapp' | 'app'
}

/** The owner column of the public mentions page (decided 18 Nov: Marketing, channel owner). */
export const PUBLIC_REPLY_OWNER: Bi = b('Marketing · channel owner', 'التسويق · مسؤول القناة')

const PUB_ROWS: [PublicPlatform, string, string, string, -1 | 0 | 1, boolean, boolean][] = [
  ['facebook', '2026-10-03', 'Abu Dhabi', 'Nobody called me back after I filled the form on your page.', -1, true, true],
  ['instagram', '2026-10-05', 'Dubai', 'Beautiful listing but the agent never replied to my DM.', -1, true, false],
  ['google', '2026-10-06', 'Abu Dhabi', '4 stars. Smooth viewing, handover paperwork took too long.', 1, false, false],
  ['google', '2026-10-08', 'Dubai', 'Was quoted a payment plan on the phone that did not exist. 1 star.', -1, true, true],
  ['linkedin', '2026-10-09', 'Dubai', 'Congratulations on the award. As an investor I would like clearer service charge info.', 0, false, false],
  ['facebook', '2026-10-11', 'PSI Assets', 'Rental maintenance request ignored for two weeks.', -1, true, true],
  ['instagram', '2026-10-12', 'Abu Dhabi', 'Great team at the Reem Island office, thank you!', 1, false, false],
  ['google', '2026-10-14', 'PSI Assets', 'Called outside working hours twice. 2 stars.', -1, false, false],
  ['facebook', '2026-10-16', 'Dubai', 'Price on the website differs from what the agent said.', -1, true, true],
  ['instagram', '2026-10-18', 'Dubai', 'Why do I have to repeat my details on every channel?', -1, false, false],
  ['google', '2026-10-20', 'Abu Dhabi', '5 stars, the app made the paperwork easy.', 1, false, false],
  ['linkedin', '2026-10-22', 'Abu Dhabi', 'Looking for a contact for corporate leasing; the form on the site did not work.', -1, true, true],
  ['facebook', '2026-10-24', 'PSI Assets', 'Nobody picked up the number on the listing.', -1, false, false],
  ['google', '2026-10-26', 'Dubai', '3 stars. Good agent, slow documents.', 0, false, false],
  ['instagram', '2026-10-28', 'Abu Dhabi', 'Still waiting for someone to reply to my DM from last week.', -1, true, false],
  ['google', '2026-10-30', 'Dubai', 'Excellent viewing experience, 5 stars.', 1, false, false],
]
const REPLY_HOURS = [6, 30, 20, 52, 40, 12, 9, 18]

export const PUBLIC_MENTIONS: PublicMention[] = PUB_ROWS.map(([platform, date, environment, text, sentiment, replied, becameIdentified], k) => ({
  id: `PUB-${301 + k}`,
  platform,
  date,
  environment,
  text,
  sentiment,
  replied,
  replyHours: replied ? REPLY_HOURS[k % REPLY_HOURS.length] : null,
  becameIdentified,
  owner: PUBLIC_REPLY_OWNER,
}))

/** Google rating, average of the last 90 days (prototype repIndex sample). */
export const GOOGLE_RATING_90D = 4.1

// --- Overview charts (KB §15; prototype TREND, VOC, REASONS) ---

/** NPS by month, six months, per product (oldest first). */
export const NPS_TREND: Record<ProductId, number[]> = {
  re: [29, 31, 33, 34, 38, 41],
  af: [44, 46, 45, 49, 52, 55],
  cl: [52, 55, 54, 58, 61, 63],
  to: [44, 47, 49, 52, 50, 55],
  ev: [36, 38, 41, 40, 44, 46],
  wl: [],
}

/** "Why detractors are unhappy", share of detractor reasons in %. */
export const DETRACTOR_REASONS: { reason: Bi; pct: number }[] = [
  { reason: b('Slow or missing follow-up', 'متابعة بطيئة أو غائبة'), pct: 31 },
  { reason: b('Price or payment plan', 'السعر أو خطة الدفع'), pct: 22 },
  { reason: b('Information was inaccurate', 'معلومات غير دقيقة'), pct: 17 },
  { reason: b('Agent attitude', 'أسلوب الموظف'), pct: 14 },
  { reason: b('Handover or snagging delays', 'تأخر التسليم أو الملاحظات'), pct: 11 },
  { reason: b('Other', 'أخرى'), pct: 5 },
]

// --- Surveys (KB §9; prototype SVS and the Agent 10 note) ---

export interface SurveyInstrument {
  id: string
  name: Bi
  kind: Bi
  trigger: Bi
  channel: Bi
  cap: Bi
  never: Bi
  sent: number
  answered: number
}

export const SURVEY_INSTRUMENTS: SurveyInstrument[] = [
  { id: 'nps', name: b('NPS after a milestone', 'NPS بعد معلم'), kind: b('NPS', 'NPS'), trigger: b('Deal signed · handover · lease renewal · 3 months after moving in · property let or sold for an owner · end of tour (Tour Estate) · end of a Club nomination cycle', 'توقيع · تسليم · تجديد · 3 أشهر بعد السكن · عقار أُجّر أو بيع لمالك · نهاية جولة (تور إستيت) · نهاية دورة ترشيح (النادي)'), channel: b('AI caller or WhatsApp template; in-app for the app products', 'الاتصال الآلي أو قالب واتساب؛ داخل التطبيق لمنتجات التطبيق'), cap: b('Once per milestone, once per 90 days per person', 'مرة لكل معلم، مرة كل 90 يوماً للشخص'), never: b('Any lead that has not signed', 'أي عميل محتمل لم يوقّع'), sent: 148, answered: 96 },
  { id: 'tx', name: b('After an interaction: CSAT + CES', 'بعد تفاعل: CSAT + CES'), kind: b('CSAT · CES', 'CSAT · CES'), trigger: b('Agent call over 2 minutes · viewing · offer received · chatbot session · booked tour · document upload · handover visit', 'مكالمة موظف فوق دقيقتين · معاينة · استلام عرض · جلسة روبوت دردشة · حجز جولة · رفع مستند · زيارة تسليم'), channel: b('Same channel as the interaction', 'نفس قناة التفاعل'), cap: b('Once per 30 days per person', 'مرة كل 30 يوماً للشخص'), never: b('After a bare enquiry or a page visit', 'بعد استفسار مجرد أو زيارة صفحة'), sent: 2140, answered: 811 },
  { id: 'why', name: b('"What stopped you?"', '"ما الذي أوقفك؟"'), kind: b('Why not', 'لماذا لا'), trigger: b('A contacted lead silent for 14 days (no reply on any channel)', 'عميل محتمل تم التواصل معه وصمت 14 يوماً (لا رد على أي قناة)'), channel: b('WhatsApp first, AI caller if no reply in 48 h', 'واتساب أولاً، ثم الاتصال الآلي إن لم يرد خلال 48 ساعة'), cap: b('Once per lead, ever', 'مرة واحدة لكل عميل محتمل'), never: b('More than once; a lead already in a close-the-loop call', 'أكثر من مرة؛ عميل محتمل موجود أصلاً في قائمة إغلاق الحلقة'), sent: 5200, answered: 1860 },
  { id: 're', name: b('Re-survey after resolution', 'إعادة الاستبيان بعد الحل'), kind: b('Same as the original', 'نفس الأصلي'), trigger: b('A detractor was interviewed and the problem resolved; 7 to 14 days later', 'منتقد قوبل وحُلّت مشكلته؛ بعد 7 إلى 14 يوماً'), channel: b('Same channel as the first survey', 'نفس قناة الاستبيان الأول'), cap: b('Exempt from the caps: it belongs to the case', 'معفى من السقوف: يتبع الحالة'), never: b('Before the problem is resolved', 'قبل حل المشكلة'), sent: 41, answered: 29 },
  { id: 'call', name: b('No survey: a person calls', 'لا استبيان: يتصل شخص'), kind: b('Interview', 'مقابلة'), trigger: b('Signed then stalled or cancelled; any critical category; any detractor on the call list', 'وقّع ثم تجمّد أو ألغى؛ أي فئة حرجة؛ أي منتقد في قائمة المكالمات'), channel: b('Phone', 'هاتف'), cap: b('Within 5 working days', 'خلال 5 أيام عمل'), never: b('Critical detractors are never in an AI campaign', 'المنتقدون الحرجون لا يدخلون حملة ذكاء اصطناعي أبداً'), sent: 16, answered: 11 },
]

/** People flagged DNCR in the sample (index 4, 13 and 22 of the 30). A test keeps this equal to the mock people. */
export const DNCR_PEOPLE_IN_SAMPLE = 3

/**
 * Agent 10's log for last month (prototype sample). v40 (F25): one model of skip reasons, with sums equal to the
 * total skipped. [Proposed] the prototype pastes "(DNCR n, cap 31, no consent 6, duplicate 9)" into the page text
 * and contradicts its own log line; here the six reasons are data and the total is their sum. The spec's
 * `survey_skip` enum (cap, not_identified, opted_out, open_case, no_milestone) lacks dncr, no_consent and duplicate.
 */
const SKIPPED_BY = [
  { reason: b('Inside a cap', 'داخل سقف'), count: 2210 },
  { reason: b('Not identified', 'غير معرَّف'), count: 640 },
  { reason: b('Opted out', 'رافض'), count: 290 },
  { reason: b('DNCR', 'DNCR'), count: DNCR_PEOPLE_IN_SAMPLE },
  { reason: b('No consent', 'بلا موافقة'), count: 6 },
  { reason: b('Duplicate', 'مكرر'), count: 9 },
]

export const SURVEY_DELIVERY_LAST_MONTH = {
  sent: 7609,
  answered: 2808,
  skipped: SKIPPED_BY.reduce((s, r) => s + r.count, 0),
  skippedBy: SKIPPED_BY,
}

// --- Per product: "When this product asks" (KB §9/§16; prototype PROD_SV) ---

export interface ProductSurveyRule {
  product: ProductId
  completed: Bi
  nps: Bi
  csat: Bi
  ces: Bi
  whatStoppedYou: Bi
  sources: Bi
}

export const PRODUCT_SURVEY_RULES: ProductSurveyRule[] = [
  { product: 're', completed: b('Sale or tenancy contract signed; handover; renewal', 'عقد بيع أو إيجار موقّع؛ تسليم؛ تجديد'), nps: b('Transactional: within 7 days of signing, at handover, at renewal, 3 months after moving in. Relationship: yearly to active owners, tenants and investors.', 'معاملة: خلال 7 أيام من التوقيع، عند التسليم، عند التجديد، بعد 3 أشهر من السكن. علاقة: سنوياً للملاك والمستأجرين والمستثمرين النشطين.'), csat: b('After an agent call over 2 min, a viewing, a valuation, a handover visit, a branch visit', 'بعد مكالمة موظف فوق دقيقتين، معاينة، تقييم عقار، زيارة تسليم، زيارة فرع'), ces: b('After an offer, a document upload, a payment, a maintenance or complaint ticket closed; after an abandoned booking or form by an identified person', 'بعد عرض، رفع مستند، دفعة، إغلاق تذكرة صيانة أو شكوى؛ بعد حجز أو نموذج متروك من شخص معرَّف'), whatStoppedYou: b('14 days after a contacted lead goes silent; 14 days after a renewal offer with no reply', 'بعد 14 يوماً من صمت عميل محتمل تم التواصل معه؛ بعد 14 يوماً من عرض تجديد بلا رد'), sources: b('Website, PSI Real Estate app, WhatsApp, advert, walk-in, event, PSI Club referral (VIP tag)', 'الموقع، تطبيق PSI العقاري، واتساب، إعلان، زيارة، فعالية، إحالة نادي PSI (وسم VIP)') },
  { product: 'af', completed: b('Handover done; snagging closed', 'تم التسليم؛ أُغلقت قائمة الملاحظات'), nps: b('At handover and 3 months after, by the After-Sales call survey', 'عند التسليم وبعد 3 أشهر، باستبيان مكالمة ما بعد البيع'), csat: b('After the handover visit; after each After-Sales call', 'بعد زيارة التسليم؛ بعد كل مكالمة ما بعد البيع'), ces: b('After a snagging or maintenance request is closed', 'بعد إغلاق طلب ملاحظات أو صيانة'), whatStoppedYou: b('Not applicable', 'لا ينطبق'), sources: b('CRM handover queue', 'قائمة التسليم في CRM') },
  { product: 'cl', completed: b('Same as Real Estate: the referred lead signs. Plus: the nomination cycle ends for the member', 'مثل العقارات: العميل المُحال يوقّع. إضافة: تنتهي دورة الترشيح للعضو'), nps: b('The referred lead: the Real Estate rule exactly, on the VIP-tagged lead. The member: NPS at the end of each nomination cycle and yearly.', 'العميل المُحال: قاعدة العقارات نفسها على العميل الموسوم VIP. العضو: NPS في نهاية كل دورة ترشيح وسنوياً.'), csat: b('The lead rates the agent after each call and viewing; the member rates the agent who handled their nominee', 'العميل يقيّم الموظف بعد كل مكالمة ومعاينة؛ العضو يقيّم الموظف الذي تولّى مرشحه'), ces: b('Member: after submitting a nomination in the Club app, after a reward is claimed', 'العضو: بعد تقديم ترشيح في تطبيق النادي، بعد المطالبة بمكافأة'), whatStoppedYou: b('Lead: as Real Estate. Member: if no nomination for 90 days, one question on why', 'العميل: كالعقارات. العضو: إن لم يرشّح 90 يوماً، سؤال واحد عن السبب'), sources: b('Every Club lead carries source = PSI Club referral and the VIP tag from the CRM', 'كل عميل من النادي يحمل المصدر = إحالة النادي ووسم VIP من CRM') },
  { product: 'to', completed: b('The tour is completed (driver ends the trip in the app)', 'اكتملت الجولة (السائق ينهي الرحلة في التطبيق)'), nps: b('End of a completed tour only, in the app, on the same screen as the ratings. A cancelled or unfinished tour gets no NPS.', 'نهاية جولة مكتملة فقط، في التطبيق، على نفس شاشة التقييمات. جولة ملغاة أو غير مكتملة بلا NPS.'), csat: b('Driver, guide, the ride, the car and its cleanliness, overall; one screen at the end of the tour', 'السائق، المرشد، الرحلة، السيارة ونظافتها، الإجمالي؛ شاشة واحدة في نهاية الجولة'), ces: b('After booking and payment in the app; after an abandoned booking by a signed-in user', 'بعد الحجز والدفع في التطبيق؛ بعد حجز متروك من مستخدم مسجّل'), whatStoppedYou: b('Booking started, not completed, 48 hours later (CES form)', 'بدأ الحجز ولم يكمله، بعد 48 ساعة (نموذج CES)'), sources: b('Tour Estate app only. The stops survey goes to the commercial team, not the portal.', 'تطبيق تور إستيت فقط. استبيان المحطات يذهب للفريق التجاري لا للبوابة.') },
  { product: 'ev', completed: b('Event attended; lead opened at the event; deal signed later (then Real Estate rules)', 'حضر الفعالية؛ فُتح عميل محتمل في الفعالية؛ وُقّعت صفقة لاحقاً (ثم قواعد العقارات)'), nps: b('None at the event. A lead opened at an event is NPS-eligible only when it signs, under the Real Estate rule.', 'لا شيء في الفعالية. العميل المفتوح في فعالية يستحق NPS فقط عند التوقيع بقاعدة العقارات.'), csat: b('External QR rating at the booth; internal staff evaluation shown to the agent’s manager only', 'تقييم QR خارجي في البوث؛ تقييم داخلي للموظفين يراه مدير الموظف فقط'), ces: b('After registration or check-in (if digital)', 'بعد التسجيل أو تسجيل الحضور (إن كان رقمياً)'), whatStoppedYou: b('Not asked; leads from the event follow the Real Estate rule', 'لا يُسأل؛ عملاء الفعالية يتبعون قاعدة العقارات'), sources: b('QR per booth (external), event team form (internal), lead source = event in the CRM', 'QR لكل بوث (خارجي)، نموذج فريق الفعالية (داخلي)، مصدر العميل = فعالية في CRM') },
  { product: 'wl', completed: b('Investor onboarded with properties and documents added', 'انضم المستثمر وأضاف عقارات ومستندات'), nps: b('30 days after onboarding, then yearly (relationship)', 'بعد 30 يوماً من الانضمام ثم سنوياً (علاقة)'), csat: b('After a suggestion is acted on', 'بعد تنفيذ اقتراح'), ces: b('After a document upload (succeeded or failed), after adding a property', 'بعد رفع مستند (نجح أو فشل)، بعد إضافة عقار'), whatStoppedYou: b('Invited and not onboarded after 30 days: one question', 'دُعي ولم ينضم بعد 30 يوماً: سؤال واحد'), sources: b('PSI Wallet app only; indicators on Wallet’s own line', 'تطبيق محفظة PSI فقط؛ المؤشرات على سطر المحفظة') },
]

// --- Teams and structure (KB §15; prototype ROUTE and the CRM tab) ---

export interface ProductRouting {
  key: ProductId | 'hr'
  label?: Bi
  mode: Bi
  caseOwner: Bi
  assignedTo: Bi
  actionOwner: Bi
  informed: Bi
  byEnvironment: boolean
}

export const PRODUCT_ROUTING: ProductRouting[] = [
  { key: 're', mode: b('Automatic by type and environment, CX can change it', 'تلقائي حسب النوع والبيئة ويستطيع فريق تجربة العملاء تغييره'), caseOwner: b('CX team', 'فريق تجربة العملاء'), assignedTo: b('Sales manager of the environment, then team lead, then the agent pool (read from the CRM)', 'مدير مبيعات البيئة ثم قائد الفريق ثم مجموعة الموظفين (من CRM)'), actionOwner: b('Direct management of the pool', 'الإدارة المباشرة للمجموعة'), informed: b('Head of Sales', 'رئيس المبيعات'), byEnvironment: true },
  { key: 'af', mode: b('Automatic by type (handover, snagging, payment, maintenance)', 'تلقائي حسب النوع (التسليم، الملاحظات، الدفعات، الصيانة)'), caseOwner: b('CX team', 'فريق تجربة العملاء'), assignedTo: b('After-Sales lead, developer liaison, finance contact, maintenance lead, leasing manager', 'مسؤول ما بعد البيع، منسق المطور، جهة المالية، مسؤول الصيانة، مدير التأجير'), actionOwner: b('After-Sales lead', 'مسؤول ما بعد البيع'), informed: b('Head of After-Sales', 'رئيس ما بعد البيع'), byEnvironment: true },
  { key: 'cl', mode: b('Manual: CX assigns each case by hand', 'يدوي: يعيّن فريق تجربة العملاء كل حالة بنفسه'), caseOwner: b('CX team', 'فريق تجربة العملاء'), assignedTo: b('Sales agents pool of the environment, or its team lead', 'مجموعة موظفي المبيعات في البيئة أو قائد فريقها'), actionOwner: b('Direct management of the pool', 'الإدارة المباشرة للمجموعة'), informed: b('C-level (informed only)', 'الإدارة العليا (للعلم فقط)'), byEnvironment: true },
  { key: 'to', mode: b('Handed to the product CX team, who follow up with the owners', 'تُسلَّم لفريق تجربة العملاء الخاص بالمنتج'), caseOwner: b('CX team inside Tour Estate', 'فريق تجربة العملاء داخل تور إستيت'), assignedTo: b('Operations, guide or driver supervisor', 'العمليات أو مشرف المرشدين أو السائقين'), actionOwner: b('Tour operations management', 'إدارة عمليات الجولات'), informed: b('Head of Club and Tours', 'رئيس النادي والجولات'), byEnvironment: false },
  { key: 'ev', mode: b('Automatic by type', 'تلقائي حسب النوع'), caseOwner: b('CX team', 'فريق تجربة العملاء'), assignedTo: b('Events lead', 'مسؤول الفعاليات'), actionOwner: b('Head of Events', 'رئيس الفعاليات'), informed: b('Head of Events', 'رئيس الفعاليات'), byEnvironment: false },
  { key: 'hr', label: b('Attitude and conduct (HR)', 'السلوك (الموارد البشرية)'), mode: b('CX assigns attitude and conduct cases to the HR pool by hand', 'يعيّن فريق تجربة العملاء حالات السلوك للموارد البشرية يدوياً'), caseOwner: b('CX team', 'فريق تجربة العملاء'), assignedTo: b('HR specialist from the HR pool', 'أخصائي من مجموعة الموارد البشرية'), actionOwner: b('HR specialist writes it; the agent’s direct manager reviews it', 'يكتبه الأخصائي ويراجعه المدير المباشر للموظف'), informed: b('HR manager: team report, and an alert only when the team is late', 'مدير الموارد البشرية: تقرير الفريق وتنبيه عند تأخر الفريق فقط'), byEnvironment: false },
]

export const CRM_FIELDS: { field: string; usedFor: Bi }[] = [
  { field: 'environment', usedFor: b('Routing, filters, hotspots', 'التوجيه والفلاتر والبؤر') },
  { field: 'pool, team lead', usedFor: b('Drill-down, assigning', 'التفصيل والتعيين') },
  { field: 'responsible agent (primary), other agents who took part', usedFor: b('Drill-down from a score to the agent (names only for roles allowed)', 'التفصيل من النتيجة إلى الموظف (الأسماء للأدوار المسموحة فقط)') },
  { field: 'service: investment, rental, buying', usedFor: b('Filters, AI hotspots', 'الفلاتر وبؤر الذكاء الاصطناعي') },
  { field: 'unit status, deal date, mobile', usedFor: b('After-Sales survey version and timing', 'نسخة استبيان ما بعد البيع وتوقيته') },
  { field: 'lead opened (yes or no)', usedFor: b('Digital channels are rated only when a lead opens', 'القنوات الرقمية تُقيَّم فقط عند فتح عميل محتمل') },
]

// --- Escalation matrix: template and principles (KB §12) ---

export const ESCALATION_ROWS: { key: CorrectiveActionKind | 'shopper_critical' | 'legal_case'; label: Bi }[] = [
  { key: 'employee', label: b('Employee', 'موظف') },
  { key: 'service_behaviour', label: b('Service and behaviour', 'الخدمة والسلوك') },
  { key: 'training_gap', label: b('Training gap', 'فجوة تدريبية') },
  { key: 'product_app', label: b('Product and app', 'المنتج والتطبيق') },
  { key: 'process', label: b('Process', 'العملية') },
  { key: 'environment', label: b('Environment', 'البيئة') },
  { key: 'legal_privacy', label: b('Legal and privacy', 'قانوني وخصوصية') },
  { key: 'marketing', label: b('Marketing', 'التسويق') },
  { key: 'shopper_critical', label: b('Case: critical shopper finding', 'حالة: نتيجة تسوق سري حرجة') },
  { key: 'legal_case', label: b('Case: legal', 'حالة: قانونية') },
]

export const ESCALATION_COLUMNS: Bi[] = [
  b('First receiver', 'المستلم الأول'),
  b('Informed', 'للعلم'),
  b('Backup', 'البديل'),
  b('Response (working hours)', 'الرد (ساعات عمل)'),
  b('Resolution (working hours)', 'الحل (ساعات عمل)'),
]

export const ESCALATION_PRINCIPLES: Bi[] = [
  b('The receiver is the person who can fix it, never top management.', 'المستلم هو من يستطيع الإصلاح، وليس الإدارة العليا أبداً.'),
  b('Heads and C-level are informed only.', 'الرؤساء والإدارة العليا للعلم فقط.'),
  b('An employee kind goes to the direct manager and nowhere else.', 'نوع "موظف" يذهب إلى المدير المباشر فقط.'),
  b('Legal goes to Legal first.', 'القانوني يذهب إلى القانونية أولاً.'),
  b('Anything touching a customer’s contact goes through the CX team.', 'كل ما يمس تواصلاً مع عميل يمر عبر فريق تجربة العملاء.'),
  b('Every cell names a title, not a person; the CRM supplies who holds the title.', 'كل خلية تذكر مسمى وظيفياً لا شخصاً؛ ويحدد CRM من يشغله.'),
]

// --- L&D: complaint types, materials and training plan (KB §15; prototype OD_TYPES, TRN, TSES) ---

export type LdComplaintType = 'od_script' | 'od_dress' | 'od_comm' | 'od_know' | 'od_mat' | 'ai_fact' | 'discount' | 'lang'

/** The first five are KB §15's own list; the last three are the prototype's
 * additions to L&D's area (wrong information, unapproved discount, wrong language). */
export const LD_COMPLAINT_TYPE: Record<LdComplaintType, Bi> = {
  od_script: b('Script', 'النص'),
  od_dress: b('Dress code', 'الزي الرسمي'),
  od_comm: b('Communication skills', 'مهارات التواصل'),
  od_know: b('Product knowledge', 'المعرفة بالمنتج'),
  od_mat: b('Outdated materials', 'مواد قديمة'),
  ai_fact: b('Wrong information', 'معلومات خاطئة'),
  discount: b('Unapproved discount', 'خصم غير معتمد'),
  lang: b('Wrong language', 'لغة خاطئة'),
}

export type MaterialStatus = 'idea' | 'plan' | 'dev' | 'ready'

export const MATERIAL_STATUS: Record<MaterialStatus, Bi> = {
  idea: b('Idea', 'فكرة'),
  plan: b('Planned', 'مخطط'),
  dev: b('In development', 'قيد الإعداد'),
  ready: b('Published', 'منشورة'),
}

export interface TrainingMaterial {
  id: string
  name: Bi
  standard?: string
  status: MaterialStatus
  due?: string
  covers: LdComplaintType[]
}

export const TRAINING_MATERIALS: TrainingMaterial[] = [
  { id: 'm1', name: b('Dress code and appearance guide for galleries (Arabic and English)', 'دليل الزي والمظهر للمعارض (عربي وإنجليزي)'), standard: 'M-10', status: 'dev', due: '2026-11-15', covers: ['od_dress'] },
  { id: 'm2', name: b('Welcome and greeting standard card', 'بطاقة معيار الترحيب والاستقبال'), standard: 'M-12', status: 'plan', due: '2026-11-22', covers: ['od_script'] },
  { id: 'm3', name: b('Needs discovery question guide', 'دليل أسئلة استكشاف الاحتياج'), standard: 'M-17', status: 'plan', due: '2026-11-30', covers: ['od_script'] },
  { id: 'm4', name: b('Approved payment plans sheet for agents and the AI script', 'ورقة خطط الدفع المعتمدة للموظفين ونص الذكاء الاصطناعي'), status: 'dev', due: '2026-10-24', covers: ['ai_fact'] },
  { id: 'm5', name: b('Price negotiation and discount approval rules', 'قواعد التفاوض على السعر واعتماد الخصومات'), standard: 'M-20', status: 'dev', due: '2026-11-10', covers: ['discount'] },
  { id: 'm6', name: b('Language and tone guide (Arabic Gulf dialect and English)', 'دليل اللغة والنبرة (العربية الخليجية والإنجليزية)'), standard: 'M-15', status: 'ready', due: '2026-10-20', covers: ['lang', 'od_comm'] },
  { id: 'm7', name: b('Follow-up playbook: WhatsApp and calls', 'دليل المتابعة: واتساب والاتصال'), standard: 'M-22', status: 'idea', covers: [] },
]

export interface TrainingSession {
  id: string
  name: Bi
  audience: Bi
  date: string
  mode: Bi
  covers: LdComplaintType[]
  status: 'planned' | 'done'
}

export const TRAINING_SESSIONS: TrainingSession[] = [
  { id: 's1', name: b('Dress code and appearance briefing', 'إحاطة الزي والمظهر'), audience: b('Gallery staff, Dubai and Abu Dhabi', 'موظفو المعارض، دبي وأبوظبي'), date: '2026-11-12', mode: b('In person', 'حضوري'), covers: ['od_dress'], status: 'planned' },
  { id: 's2', name: b('Discount approval and objection handling', 'اعتماد الخصومات والتعامل مع الاعتراضات'), audience: b('All sales pools', 'كل مجموعات المبيعات'), date: '2026-11-18', mode: b('In person', 'حضوري'), covers: ['discount', 'od_script'], status: 'planned' },
  { id: 's3', name: b('Listening and tone on calls and chat', 'الإصغاء والنبرة في المكالمات والمحادثات'), audience: b('Dubai pool', 'مجموعة دبي'), date: '2026-11-25', mode: b('Online', 'عن بُعد'), covers: ['od_comm', 'lang'], status: 'planned' },
  { id: 's4', name: b('Product knowledge refresh: payment plans', 'تحديث المعرفة بالمنتج: خطط الدفع'), audience: b('All pools and After-Sales', 'كل المجموعات وما بعد البيع'), date: '2026-12-02', mode: b('Online', 'عن بُعد'), covers: ['ai_fact', 'od_know'], status: 'planned' },
]

// --- Who uses it and what each one sees (Modules KB §2, verbatim) ---

export const ROLE_SCOPE: { role: import('../types').RoleId; pages: Bi; sees: Bi; can: Bi }[] = [
  { role: 'cxmgr', pages: b('All pages, plus Settings and reference', 'كل الصفحات، والإعدادات والمرجع'), sees: b('Everything, all categories, all environments, agent names, conversation text', 'كل شيء، كل الفئات والبيئات، أسماء الموظفين، نص المحادثات'), can: b('Approve corrective actions, set thresholds, set who sees what, approve standards for scoring', 'اعتماد الإجراءات التصحيحية، ضبط الحدود، تحديد من يرى ماذا، اعتماد المعايير للتقييم') },
  { role: 'cxteam', pages: b('All pages, plus Settings and reference', 'كل الصفحات، والإعدادات والمرجع'), sees: b('Everything, agent names, conversation text', 'كل شيء، أسماء الموظفين، نص المحادثات'), can: b('Create corrective actions, send AI suggestions to cases, triage shopper cases, run the assistant', 'إنشاء الإجراءات التصحيحية، إرسال اقتراحات الذكاء الاصطناعي إلى الحالات، فرز حالات التسوق، تشغيل المساعد') },
  { role: 'envmgmt', pages: b('Home, Customers, Runaway, Actions, PSI Real Estate', 'الرئيسية، العملاء، الهاربون، الإجراءات، العقارية'), sees: b('Only its own environment, with agent names; no conversation text', 'بيئته فقط، مع أسماء الموظفين؛ دون نص المحادثات'), can: b('Own and run its corrective actions, decide on proposed actions on shopper cases', 'امتلاك إجراءاته التصحيحية وتنفيذها، والبت في الإجراءات المقترحة على حالات التسوق') },
  { role: 'teamlead', pages: b('Home, Customers, Actions', 'الرئيسية، العملاء، الإجراءات'), sees: b('Its pool’s agents and cases', 'موظفو مجموعته وحالاتها'), can: b('Follow actions for its pool', 'متابعة إجراءات مجموعته') },
  { role: 'aslead', pages: b('Home, Customers, Actions, Voice of Customer, After-Sales', 'الرئيسية، العملاء، الإجراءات، صوت العميل، ما بعد البيع'), sees: b('Process, speed and communication signals', 'إشارات العملية والسرعة والتواصل'), can: b('Own After-Sales actions', 'امتلاك إجراءات ما بعد البيع') },
  { role: 'ld', pages: b('Actions, Standards register, Training', 'الإجراءات، سجل المعايير، التدريب'), sees: b('Communication, product knowledge and attitude signals; its own L&D requests', 'إشارات التواصل والمعرفة بالمنتج والسلوك؛ طلبات التعلم والتطوير الخاصة به'), can: b('Deliver training and materials, write the standards it owns (the CX manager approves them for scoring)', 'تقديم التدريب والمواد، كتابة المعايير التي يملكها (يعتمدها مدير تجربة العملاء للتقييم)') },
  { role: 'hrspec', pages: b('Actions, HR team', 'الإجراءات، فريق الموارد البشرية'), sees: b('Attitude signals; cases assigned to the HR pool', 'إشارات السلوك؛ الحالات المعيّنة لمجموعة الموارد البشرية'), can: b('Write corrective actions on conduct; the agent’s direct manager reviews them', 'كتابة إجراءات تصحيحية على السلوك؛ يراجعها المدير المباشر للموظف') },
  { role: 'hrmgr', pages: b('HR team performance', 'أداء فريق الموارد البشرية'), sees: b('Team numbers and late alerts only', 'أرقام الفريق وتنبيهات التأخير فقط'), can: b('Nothing on cases (informed only)', 'لا شيء على الحالات (للعلم فقط)') },
  { role: 'marketing', pages: b('Home, Customers, Runaway, Personas', 'الرئيسية، العملاء، الهاربون، الشخصيات'), sees: b('Personas, campaign recommendations, runaway types; no conversation text, no agent names', 'الشخصيات، توصيات الحملات، أنواع الهروب؛ دون نص محادثات ولا أسماء موظفين'), can: b('Receive campaign briefs', 'استلام ملخصات الحملات') },
  { role: 'auditmkt', pages: b('Overview, Intelligent CX team, Personas, Runaway, Standards, Monthly pack, Settings', 'النظرة العامة، فريق تجربة العملاء الذكي، الشخصيات، الهاربون، المعايير، الحزمة الشهرية، الإعدادات'), sees: b('Aggregates and audit views; no cases, no conversation text, no agent names', 'الإجماليات وعروض التدقيق؛ دون حالات أو نص محادثات أو أسماء موظفين'), can: b('Mark feeds and standards as trusted, audit personas and campaign criteria, fill the escalation matrix with the product owners, read the weekly supervisor sample', 'اعتماد موثوقية التغذيات والمعايير، تدقيق الشخصيات ومعايير الحملات، ملء مصفوفة التصعيد مع مالكي المنتجات، قراءة العينة الأسبوعية للمشرف') },
  { role: 'exec', pages: b('Home, Customers, Runaway, Actions, Personas, Overview, Monthly pack', 'الرئيسية، العملاء، الهاربون، الإجراءات، الشخصيات، النظرة العامة، الحزمة الشهرية'), sees: b('Everything, read only, no agent names', 'كل شيء، قراءة فقط، دون أسماء موظفين'), can: b('Nothing (informed)', 'لا شيء (للعلم)') },
  { role: 'shopper', pages: b('Own tasks only', 'مهامه فقط'), sees: b('Briefs, deadlines, forms', 'الملخصات، المواعيد، النماذج'), can: b('Fill the forms, ask questions', 'تعبئة النماذج، طرح الأسئلة') },
]

/** "Who is informed" (prototype Teams and structure). */
export const INFORMED_RULE = b(
  'Informed means a notice, never a task. Top management does not get one email per case: they get a digest, and an immediate alert only for a high-priority case past its SLA or for a repeating pattern.',
  '"للعلم" تعني إشعاراً لا مهمة. لا تصل الإدارة العليا رسالة لكل حالة: تصلهم خلاصة دورية، وتنبيه فوري فقط لحالة عالية الأولوية تجاوزت مدتها أو لنمط متكرر.',
)

// --- Products (Modules KB §16) ---

export const PRODUCT_COVERAGE: Record<ProductId, Bi> = {
  re: b('Sales journey from enquiry to signed deal: leads, viewings, offers, bookings; sources PSI Website and PSI Real Estate app', 'رحلة البيع من الاستفسار إلى الصفقة الموقّعة: العملاء المحتملون، المعاينات، العروض، الحجوزات؛ المصادر موقع PSI وتطبيق PSI العقاري'),
  af: b('Handover, snagging, finishing, payments, maintenance and renewals (PSI Assets rental)', 'التسليم، الملاحظات، التشطيب، الدفعات، الصيانة والتجديدات (تأجير PSI للأصول)'),
  cl: b('VIP and influencer lead nominations; leads ride the Real Estate journey with a VIP tag; its own escalation matrix handles late steps, the portal reads the breach log as signals', 'ترشيحات العملاء من كبار الأعضاء والمؤثرين؛ يسير العملاء في رحلة العقارات بوسم VIP؛ مصفوفة تصعيده الخاصة تعالج التأخير، والبوابة تقرأ سجل الخروقات كإشارات'),
  to: b('Tours, guides, drivers and cars; has its own CX team', 'الجولات والمرشدون والسائقون والسيارات؛ له فريق تجربة عملاء خاص'),
  ev: b('Launches, investor evenings and VIP events', 'الإطلاقات وأمسيات المستثمرين وفعاليات كبار العملاء'),
  wl: b('The investor’s portfolio in one place: properties across countries, documents, cash flow and AI suggestions', 'محفظة المستثمر في مكان واحد: عقارات عبر الدول، مستندات، تدفق نقدي واقتراحات ذكاء اصطناعي'),
}

/** KB §16: PSI Wallet's four complaint types with owners. */
export const WALLET_COMPLAINT_TYPES: { type: Bi; owner: Bi }[] = [
  { type: b('Upload and sync failures', 'فشل الرفع والمزامنة'), owner: b('Wallet product team', 'فريق منتج المحفظة') },
  { type: b('Suggestion complaints', 'شكاوى الاقتراحات'), owner: b('Wallet product team', 'فريق منتج المحفظة') },
  { type: b('Wrong value or cash flow', 'قيمة أو تدفق نقدي خاطئ'), owner: b('Account manager', 'مدير الحساب') },
  { type: b('Privacy worries', 'مخاوف الخصوصية'), owner: b('Wallet team, with Legal as backup', 'فريق المحفظة، والقانونية كبديل') },
]

/** CES sample figure per product (prototype CES_DEMO); null = not asked yet. */
export const CES_SAMPLE: Record<ProductId, number | null> = { re: 71, af: 66, cl: null, to: null, ev: null, wl: 74 }
