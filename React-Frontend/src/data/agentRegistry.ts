import type { AgentProfile, Bi, CorrectiveActionKind, RoutingRow } from '../types'

/** The ten single-task agents + one supervisor, transcribed from
 * `CX-Portal-AI-Agents-Specification.docx` — "nine single-task AI agents and
 * one supervisor" at spec time, now ten workers since Agent 10 (survey
 * triggers) was added 16 Nov. Nothing here is invented: task/trigger/runsOn/
 * escalatesTo/mustNot are each the spec's own sentence, trimmed to fit a
 * card. */
export const AGENT_REGISTRY: AgentProfile[] = [
  {
    id: 1,
    key: 'intake',
    name: { en: 'Intake and matching', ar: 'الاستقبال والمطابقة' },
    task: { en: 'Turn every incoming interaction from any channel into one event on one person’s timeline, with its source badge.', ar: 'تحويل كل تفاعل وارد من أي قناة إلى حدث واحد على الجدول الزمني لشخص واحد، مع شارة مصدره.' },
    trigger: { en: 'A new record on any feed — CRM, AI caller, IVR, WhatsApp, in-app chat, social, survey, mystery shopper.', ar: 'سجل جديد على أي تغذية — نظام العملاء، الاتصال الآلي، الواتساب، الدردشة داخل التطبيق، التواصل الاجتماعي، الاستبيانات، التسوق السري.' },
    runsOn: { en: 'Continuous, per incoming record; full feed reconciliation nightly. Within 5 minutes of arrival.', ar: 'مستمر مع كل سجل وارد؛ مطابقة كاملة ليلاً. خلال 5 دقائق من الوصول.' },
    escalatesTo: { en: 'CX team queue for unmatched or low-confidence events.', ar: 'قائمة فريق تجربة العملاء للأحداث غير المطابقة أو منخفضة الثقة.' },
    mustNot: { en: 'Create or edit CRM records; merge two persons automatically; read conversation text beyond the record being matched.', ar: 'إنشاء أو تعديل سجلات نظام العملاء؛ دمج شخصين تلقائياً؛ قراءة نص محادثة يتجاوز السجل قيد المطابقة.' },
  },
  {
    id: 2,
    key: 'classify',
    name: { en: 'Classification', ar: 'التصنيف' },
    task: { en: 'Give each event one category, one reason code, and the product, environment and responsible agent it belongs to.', ar: 'إعطاء كل حدث فئة واحدة ورمز سبب واحد، مع المنتج والبيئة والوكيل المسؤول.' },
    trigger: { en: 'A new event from Agent 1, or a reason code added by Agent 8 after an interview.', ar: 'حدث جديد من الوكيل 1، أو رمز سبب أضافه الوكيل 8 بعد مقابلة.' },
    runsOn: { en: 'Continuous, right after Agent 1.', ar: 'مستمر، مباشرة بعد الوكيل 1.' },
    escalatesTo: { en: 'CX team queue on low confidence or mismatch; CX manager for a genuinely new reason code.', ar: 'قائمة فريق تجربة العملاء عند انخفاض الثقة أو عدم التطابق؛ مدير تجربة العملاء لرمز سبب جديد فعلاً.' },
    mustNot: { en: 'Change the reason code list; assign an agent id not on the CRM activity; infer a category from identity or persona.', ar: 'تغيير قائمة رموز الأسباب؛ تعيين معرّف وكيل غير موجود في سجل النشاط؛ استنتاج فئة من الهوية أو الشخصية.' },
  },
  {
    id: 3,
    key: 'signals',
    name: { en: 'Signals and patterns', ar: 'الإشارات والأنماط' },
    task: { en: 'Decide when repeated classified events become a signal, find where it concentrates, and write the signal record with its evidence.', ar: 'تحديد متى تتحول الأحداث المصنَّفة المتكررة إلى إشارة، وإيجاد مكان تركزها، وكتابة سجل الإشارة بأدلتها.' },
    trigger: { en: 'Every new classification; a scheduled run each night over the rolling 30-day window.', ar: 'كل تصنيف جديد؛ تشغيل مجدول كل ليلة ضمن نافذة الثلاثين يوماً المتجددة.' },
    runsOn: { en: 'Counts live; new signals published after the nightly recount, critical ones at once.', ar: 'العد مباشر؛ تُنشر الإشارات الجديدة بعد إعادة العد الليلي، والحرجة فوراً.' },
    escalatesTo: { en: 'CX manager when a signal is critical; Internal Audit and Marketing Lead on a feed spike (3x its 90-day average).', ar: 'مدير تجربة العملاء عند إشارة حرجة؛ مسؤول التدقيق الداخلي والتسويق عند ارتفاع مفاجئ في إحدى التغذيات.' },
    mustNot: { en: 'Change thresholds; create a case; send the management note to anyone but the agent’s direct manager; expose agent names.', ar: 'تغيير الحدود؛ إنشاء حالة؛ إرسال الملاحظة الإدارية لغير المدير المباشر؛ كشف أسماء الوكلاء.' },
  },
  {
    id: 4,
    key: 'severity',
    name: { en: 'Mystery shopper severity', ar: 'خطورة التسوق السري' },
    task: { en: 'Place each mystery shopper finding on the critical/medium/low scale and open a case for critical ones the same day.', ar: 'تصنيف كل نتيجة تسوق سري على مقياس حرج/متوسط/منخفض وفتح حالة فورية للحرجة.' },
    trigger: { en: 'A new mystery shopper visit result.', ar: 'نتيجة زيارة تسوق سري جديدة.' },
    runsOn: { en: 'On each visit result; critical at once, same working day.', ar: 'عند كل نتيجة زيارة؛ الحرجة فوراً، خلال نفس يوم العمل.' },
    escalatesTo: { en: 'CX manager and Internal Audit and Marketing Lead for every finding not already in an example list.', ar: 'مدير تجربة العملاء ومسؤول التدقيق الداخلي والتسويق لكل نتيجة غير مدرجة في قائمة أمثلة.' },
    mustNot: { en: 'Downgrade a listed finding; open a case for medium or low; contact the shopper or the agent.', ar: 'تخفيض خطورة نتيجة مدرجة؛ فتح حالة لنتيجة متوسطة أو منخفضة؛ التواصل مع المتسوق أو الوكيل.' },
    phaseNote: { en: 'Not built in phase one — the mystery shopper programme runs on its own documents until then; Agent 5 may request a shopper check as an investigation in the meantime.', ar: 'لم يُبنَ في المرحلة الأولى — يعمل برنامج التسوق السري على وثائقه الخاصة حتى ذلك الحين؛ قد يطلب الوكيل 5 فحص تسوق سري كتحقيق في هذه الأثناء.' },
  },
  {
    id: 5,
    key: 'actions',
    name: { en: 'Corrective action and routing', ar: 'الإجراء التصحيحي والتوجيه' },
    task: { en: 'For every open signal, propose a corrective action grounded in what worked before, and route it to the right owner from the escalation matrix.', ar: 'لكل إشارة مفتوحة، اقتراح إجراء تصحيحي مبني على ما نجح سابقاً، وتوجيهه للمالك الصحيح وفق مصفوفة التصعيد.' },
    trigger: { en: 'A new or re-opened signal from Agent 3.', ar: 'إشارة جديدة أو أُعيد فتحها من الوكيل 3.' },
    runsOn: { en: 'Within the hour; CX team sees it first, the owner after routing.', ar: 'خلال ساعة؛ يراها فريق تجربة العملاء أولاً، ثم المالك بعد التوجيه.' },
    escalatesTo: { en: 'Direct manager (the owner) for approval within 5 working days; CX manager when no matrix row exists.', ar: 'المدير المباشر (المالك) للاعتماد خلال 5 أيام عمل؛ مدير تجربة العملاء عند عدم وجود صف مطابق في المصفوفة.' },
    mustNot: { en: 'Approve its own action; send anything to a customer; assign to HR directly; change the matrix.', ar: 'اعتماد إجرائه الخاص؛ إرسال أي شيء للعميل؛ التكليف المباشر للموارد البشرية؛ تغيير المصفوفة.' },
  },
  {
    id: 6,
    key: 'verify',
    name: { en: 'Verification', ar: 'التحقق' },
    task: { en: 'Run the action lifecycle clock, measure whether each done action worked, and compute recovery per customer.', ar: 'تشغيل ساعة دورة حياة الإجراء، وقياس ما إذا نجح كل إجراء منجز، واحتساب التعافي لكل عميل.' },
    trigger: { en: 'Daily schedule; status changes on actions; the end of each 60-day verification window.', ar: 'جدول يومي؛ تغييرات حالة الإجراءات؛ نهاية كل نافذة تحقق مدتها 60 يوماً.' },
    runsOn: { en: 'Daily at 06:00 and on every status change.', ar: 'يومياً الساعة 06:00 ومع كل تغيير حالة.' },
    escalatesTo: { en: 'Owner on partial; CX manager on failed; informed role when approval is overdue.', ar: 'المالك عند النتيجة الجزئية؛ مدير تجربة العملاء عند الفشل؛ الدور المُطلَع عند تأخر الاعتماد.' },
    mustNot: { en: 'Change an action’s text; close a signal without a verdict; count the detractor interview call itself as recovery.', ar: 'تغيير نص الإجراء؛ إغلاق إشارة دون نتيجة؛ احتساب مكالمة مقابلة المنتقد نفسها كتعافٍ.' },
  },
  {
    id: 7,
    key: 'journey',
    name: { en: 'Journey, runaway and personas', ar: 'الرحلة، الهروب، والشخصيات' },
    task: { en: 'Read one person’s whole timeline and say what happened, whether they are running away and of which type, and which persona they belong to.', ar: 'قراءة الجدول الزمني الكامل لشخص واحد وتحديد ما حدث، وهل هو في طريقه للهروب ومن أي نوع، وأي شخصية ينتمي إليها.' },
    trigger: { en: 'A search on the Customers page; nightly for people with new events; weekly persona refresh.', ar: 'بحث في صفحة العملاء؛ ليلاً لمن لديهم أحداث جديدة؛ تحديث أسبوعي للشخصيات.' },
    runsOn: { en: 'Search: seconds; personas: weekly after audit.', ar: 'البحث: ثوانٍ؛ الشخصيات: أسبوعياً بعد التدقيق.' },
    escalatesTo: { en: 'Internal Audit and Marketing Lead for every new or changed persona; CX team when a runaway customer is also on an open critical signal.', ar: 'مسؤول التدقيق الداخلي والتسويق لكل شخصية جديدة أو مُعدَّلة؛ فريق تجربة العملاء عند تقاطع عميل هارب مع إشارة حرجة مفتوحة.' },
    mustNot: { en: 'Show conversation text in the narrative; build a persona from fewer than 25 people; send a recommendation to Marketing before audit approval.', ar: 'عرض نص المحادثة في السرد؛ بناء شخصية من أقل من 25 شخصاً؛ إرسال توصية للتسويق قبل اعتماد التدقيق.' },
  },
  {
    id: 8,
    key: 'loop',
    name: { en: 'Close the loop with detractors', ar: 'إغلاق الحلقة مع المنتقدين' },
    task: { en: 'Decide who the CX team calls this month, prepare each call, and turn interview notes into coded events.', ar: 'تحديد من يتصل به فريق تجربة العملاء هذا الشهر، وتجهيز كل مكالمة، وتحويل ملاحظات المقابلة إلى أحداث مرمّزة.' },
    trigger: { en: 'A new detractor score or a CES of 1-2; the monthly capacity run; a submitted interview form.', ar: 'درجة منتقد جديدة أو CES بقيمة 1-2؛ تشغيل السعة الشهري؛ نموذج مقابلة مُرسَل.' },
    runsOn: { en: 'Call list daily; coverage KPI monthly.', ar: 'قائمة الاتصال يومياً؛ مؤشر التغطية شهرياً.' },
    escalatesTo: { en: 'CX manager when the call list exceeds capacity by more than 20% for two months; CX team for any critical flag from an interview.', ar: 'مدير تجربة العملاء عند تجاوز قائمة الاتصال السعة بأكثر من 20% لشهرين؛ فريق تجربة العملاء لأي إشارة حرجة من مقابلة.' },
    mustNot: { en: 'Call, message or email a customer itself; mark recovery; expose interview text outside the CX team and CX manager.', ar: 'الاتصال أو المراسلة مع عميل مباشرة؛ تحديد التعافي؛ كشف نص المقابلة خارج فريق ومدير تجربة العملاء.' },
  },
  {
    id: 9,
    key: 'report',
    name: { en: 'Reporting', ar: 'التقارير' },
    task: { en: 'Produce the monthly management report and role-specific summaries from the same computed figures the pages show.', ar: 'إعداد التقرير الإداري الشهري والملخصات الخاصة بكل دور من نفس الأرقام المحتسبة الظاهرة في الصفحات.' },
    // v40 (F36): Agent 9 also writes the daily brief, one per role, at 07:00 (the prototype's roster text). The monthly pack stays, released by the CX manager.
    trigger: { en: 'Every day at 07:00 for the daily brief (one per role); the first working day of the month for the Monthly CX pack; on demand by the CX manager.', ar: 'كل يوم الساعة 07:00 للموجز اليومي (واحد لكل دور)؛ أول يوم عمل في الشهر لحزمة CX الشهرية؛ وعند الطلب من مدير تجربة العملاء.' },
    runsOn: { en: 'Daily 07:00 for the brief; first working day of the month for the pack; on demand.', ar: 'يومياً 07:00 للموجز؛ أول يوم عمل في الشهر للحزمة؛ وعند الطلب.' },
    escalatesTo: { en: 'CX manager for release; nothing is sent automatically.', ar: 'مدير تجربة العملاء للإصدار؛ لا شيء يُرسل تلقائياً.' },
    mustNot: { en: 'Compute its own numbers; include anything outside the audience’s view.', ar: 'احتساب أرقامه الخاصة؛ تضمين ما يتجاوز صلاحية الجمهور المستهدف.' },
  },
  {
    id: 10,
    key: 'survey_triggers',
    name: { en: 'Survey triggers and delivery', ar: 'محفزات الاستبيانات وإرسالها' },
    task: { en: 'Watch every person’s events for a survey trigger, apply the caps and priority, and send the right instrument through the right channel.', ar: 'مراقبة أحداث كل شخص لرصد محفزات الاستبيان، وتطبيق الحدود والأولوية، وإرسال الأداة المناسبة عبر القناة المناسبة.' },
    trigger: { en: 'Every new event from Agent 1; a daily run at 09:00 for time-based triggers. Added 16 Nov 2026.', ar: 'كل حدث جديد من الوكيل 1؛ تشغيل يومي الساعة 09:00 للمحفزات المرتبطة بالوقت. أُضيف في 16 نوفمبر 2026.' },
    runsOn: { en: 'Continuous on events, daily at 09:00 for time-based triggers.', ar: 'مستمر مع الأحداث، ويومياً الساعة 09:00 للمحفزات الزمنية.' },
    escalatesTo: { en: 'CX manager when a template is not approved or a channel is down; CX team when a person asks a question inside a survey answer.', ar: 'مدير تجربة العملاء عند عدم اعتماد قالب أو تعطل قناة؛ فريق تجربة العملاء عند طرح سؤال داخل إجابة استبيان.' },
    mustNot: { en: 'Send outside working hours for calls; exceed the caps for any reason including a campaign; send to a public-channel handle; change an instrument’s questions.', ar: 'الإرسال خارج ساعات العمل للمكالمات؛ تجاوز الحدود لأي سبب بما في ذلك الحملات؛ الإرسال لحساب قناة عامة؛ تغيير أسئلة الأداة.' },
  },
  {
    id: 'supervisor',
    key: 'supervisor',
    name: { en: 'CX Supervisor', ar: 'المشرف الذكي' },
    task: { en: 'Verify a worker’s output against code rules and an evidence check, then approve, return with a reason, or escalate.', ar: 'التحقق من مخرجات أحد الوكلاء مقابل قواعد الكود وفحص الأدلة، ثم الاعتماد أو الإعادة بسبب أو التصعيد.' },
    trigger: { en: 'Every worker output with an empty supervisor verdict.', ar: 'كل مخرج من وكيل دون قرار إشراف.' },
    runsOn: { en: 'With the worker it checks; a weekly sample of 50 approved outputs reviewed by the CX team and Internal Audit and Marketing Lead.', ar: 'مع الوكيل الذي يراجعه؛ عينة أسبوعية من 50 مخرجاً معتمداً يراجعها فريق تجربة العملاء ومسؤول التدقيق الداخلي والتسويق.' },
    escalatesTo: { en: 'The human role named in the worker agent’s own row, with the checks that failed.', ar: 'الدور البشري المحدد في صف الوكيل نفسه، مع بيان الفحوصات التي فشلت.' },
    mustNot: { en: 'Edit the worker’s output; approve its own escalation; skip the deterministic layer when the model layer passes.', ar: 'تعديل مخرج الوكيل؛ اعتماد تصعيده الخاص؛ تجاوز طبقة الفحص الحتمية عند نجاح طبقة النموذج.' },
  },
]

/** "Routing of corrective actions by classification" — one row per
 * `CorrectiveActionKind`, so this table and the Actions page's kind badges
 * describe the same eight-way split (AI Agents Specification). */
export const ROUTING_MATRIX: Record<CorrectiveActionKind, RoutingRow> = {
  employee: {
    typicalSignal: { en: 'Same agent in 3+ incidents; a shopper finding on one agent.', ar: 'نفس الوكيل في 3 حوادث أو أكثر؛ نتيجة تسوق سري على وكيل واحد.' },
    path: { en: 'Management note, never a case.', ar: 'ملاحظة إدارية، وليست حالة أبداً.' },
    receiver: { en: 'Direct manager of that agent only.', ar: 'المدير المباشر لذلك الوكيل فقط.' },
    whatTheyReceive: { en: 'Counts and evidence references, no conversation text.', ar: 'أعداد ومراجع أدلة، دون نص محادثة.' },
    whatComesBack: { en: 'Acknowledged; an action only if the manager opens one.', ar: 'إقرار بالاستلام؛ إجراء فقط إذا فتحه المدير.' },
  },
  service_behaviour: {
    typicalSignal: { en: 'Late callbacks in one office; wrong information in one pool.', ar: 'تأخر الرد على المكالمات في مكتب واحد؛ معلومات خاطئة في مجموعة واحدة.' },
    path: { en: 'Corrective action for approval.', ar: 'إجراء تصحيحي بانتظار الاعتماد.' },
    receiver: { en: 'Direct manager of the team; informed: head.', ar: 'المدير المباشر للفريق؛ للعلم: الرئيس.' },
    whatTheyReceive: { en: 'Action text, basis from past actions, due date, how found.', ar: 'نص الإجراء، الأساس من إجراءات سابقة، تاريخ الاستحقاق، كيفية الاكتشاف.' },
    whatComesBack: { en: 'Approved or changed; status; done date.', ar: 'معتمد أو مُعدَّل؛ الحالة؛ تاريخ الإنجاز.' },
  },
  training_gap: {
    typicalSignal: { en: 'Same knowledge error across agents and environments.', ar: 'نفس الخطأ المعرفي عبر وكلاء وبيئات متعددة.' },
    path: { en: 'Corrective action plus a standards request.', ar: 'إجراء تصحيحي مع طلب معيار.' },
    receiver: { en: 'L&D head; champion of the environment.', ar: 'رئيس التعلم والتطوير؛ رائد البيئة.' },
    whatTheyReceive: { en: 'The gap, the standard it touches, the low findings statistics.', ar: 'الفجوة، المعيار المتأثر، إحصاءات النتائج المنخفضة.' },
    whatComesBack: { en: 'Updated standard or training plan, with a date.', ar: 'معيار محدَّث أو خطة تدريب، بتاريخ محدد.' },
  },
  process: {
    typicalSignal: { en: 'Hand-offs lost between lead call and After-Sales.', ar: 'فقدان التسليم بين مكالمة العميل المحتمل وما بعد البيع.' },
    path: { en: 'Corrective action.', ar: 'إجراء تصحيحي.' },
    receiver: { en: 'Owner of the process in the matrix; informed: product owner.', ar: 'مالك العملية في المصفوفة؛ للعلم: مالك المنتج.' },
    whatTheyReceive: { en: 'Action with the process step named and the events that broke it.', ar: 'إجراء يحدد خطوة العملية والأحداث التي عطّلتها.' },
    whatComesBack: { en: 'Changed procedure, status.', ar: 'إجراء مُعدَّل، الحالة.' },
  },
  product_app: {
    typicalSignal: { en: 'Upload failures, chat left unanswered in the app, valuation questions.', ar: 'فشل الرفع، دردشة دون رد في التطبيق، أسئلة تقييم.' },
    path: { en: 'Product request.', ar: 'طلب منتج.' },
    receiver: { en: 'Product owner and IT of that product.', ar: 'مالك المنتج وتقنية المعلومات لذلك المنتج.' },
    whatTheyReceive: { en: 'Signal with reproduction evidence, counts by version and device.', ar: 'إشارة مع دليل إعادة الإنتاج، أعداد حسب الإصدار والجهاز.' },
    whatComesBack: { en: 'Fix version and date.', ar: 'إصدار الإصلاح وتاريخه.' },
  },
  environment: {
    typicalSignal: { en: 'Branch privacy, waiting, physical environment findings.', ar: 'خصوصية الفرع، الانتظار، نتائج تتعلق بالبيئة المادية.' },
    path: { en: 'Corrective action.', ar: 'إجراء تصحيحي.' },
    receiver: { en: 'Branch or environment manager.', ar: 'مدير الفرع أو البيئة.' },
    whatTheyReceive: { en: 'Shopper findings and customer events for that place.', ar: 'نتائج التسوق السري وأحداث العملاء لذلك الموقع.' },
    whatComesBack: { en: 'Status, done date.', ar: 'الحالة، تاريخ الإنجاز.' },
  },
  legal_privacy: {
    typicalSignal: { en: 'Any single occurrence.', ar: 'أي حدوث واحد.' },
    path: { en: 'Case at once.', ar: 'حالة فورية.' },
    receiver: { en: 'Legal; informed: CX manager.', ar: 'الشؤون القانونية؛ للعلم: مدير تجربة العملاء.' },
    whatTheyReceive: { en: 'The event, the rule broken, the customer impact.', ar: 'الحدث، القاعدة المخالَفة، أثره على العميل.' },
    whatComesBack: { en: 'Decision.', ar: 'قرار.' },
  },
  marketing: {
    typicalSignal: { en: 'Persona recommendation; a runaway segment.', ar: 'توصية شخصية؛ شريحة هاربة.' },
    path: { en: 'Recommendation after audit.', ar: 'توصية بعد التدقيق.' },
    receiver: { en: 'Internal Audit and Marketing Lead, then Marketing.', ar: 'مسؤول التدقيق الداخلي والتسويق، ثم التسويق.' },
    whatTheyReceive: { en: 'Persona, size, channel, campaign type.', ar: 'الشخصية، الحجم، القناة، نوع الحملة.' },
    whatComesBack: { en: 'Campaign and its result.', ar: 'الحملة ونتيجتها.' },
  },
}

/** The Supervisor's own "order of checks", verbatim order from the spec —
 * schema first, then deterministic re-computation, then access rules, then
 * the model-based evidence/bilingual checks, and a risk gate last that can
 * still force an escalation even after everything else passes. */
export const SUPERVISOR_CHECK_ORDER: Bi[] = [
  { en: 'Schema and required fields.', ar: 'المخطط والحقول المطلوبة.' },
  { en: 'Deterministic re-computation of every count, window, rate and lookup.', ar: 'إعادة احتساب حتمية لكل عدد ونافذة ومعدل وبحث.' },
  { en: 'Access rules: no text, no names, audience limits.', ar: 'قواعد الوصول: لا نص، لا أسماء، حدود الجمهور.' },
  { en: 'Evidence check by model: each claim is matched to an evidence item; an unmatched claim fails.', ar: 'فحص الأدلة بالنموذج: تُطابَق كل مطالبة بعنصر دليل؛ المطالبة غير المطابَقة تفشل.' },
  { en: 'Bilingual check: English and Arabic carry the same claims.', ar: 'فحص ثنائي اللغة: تحمل الإنجليزية والعربية نفس المطالبات.' },
  { en: 'Risk gate: critical impact, legal or privacy category, or external effect — always escalate even when checks pass.', ar: 'بوابة المخاطر: أثر حرج، فئة قانونية أو خصوصية، أو أثر خارجي — تصعيد دائم حتى لو نجحت الفحوصات.' },
]

/** The output envelope's own eleven fields, grouped for the explainer header
 * — "one contract, every agent" (AI Agents Specification, "the common
 * contract"). */
export const ENVELOPE_FIELD_GROUPS: { title: Bi; fields: Bi }[] = [
  { title: { en: 'Identity', ar: 'الهوية' }, fields: { en: 'agent_id, run_id, subject_type, subject_id', ar: 'معرّف الوكيل، معرّف التشغيل، نوع الموضوع، معرّف الموضوع' } },
  { title: { en: 'Content', ar: 'المحتوى' }, fields: { en: 'payload, evidence[], confidence, rules_applied[]', ar: 'الحمولة، الأدلة، مستوى الثقة، القواعد المطبَّقة' } },
  { title: { en: 'Provenance', ar: 'المصدر' }, fields: { en: 'model, lang, supervisor_verdict, created_at', ar: 'النموذج، اللغة، قرار المشرف، تاريخ الإنشاء' } },
]
