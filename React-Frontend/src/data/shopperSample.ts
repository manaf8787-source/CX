import type { Bi, ShopperCase, ShopperProposedAction, ShopperVisit } from '../types'

/**
 * Sample mystery shopper cases (owner, 24 Nov: "fill it with dummy data, I want to see what reaches the environment manager").
 * Each case carries the visit itself (where, when, who by title, the scenario, what the shopper wrote, the checklist, the evidence) and
 * real proposed actions. The flow: the CX manager checks the evidence (status `open`), then the owner decides every proposed action with
 * a comment and a date (`owner_decision`), marks each one done, and the CX manager closes the case.
 */
const b = (en: string, ar: string): Bi => ({ en, ar })
const DAY = 86_400_000
const iso = (daysFromNow: number, hour = 10) => {
  const d = new Date(Date.now() + daysFromNow * DAY)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const day = (daysFromNow: number) => iso(daysFromNow).slice(0, 10)

const act = (n: number, kind: ShopperProposedAction['kind'], text: Bi, why: Bi, extra: Partial<ShopperProposedAction> = {}): ShopperProposedAction => ({
  n,
  kind,
  text,
  why,
  decision: 'pending',
  ...extra,
})

interface Seed {
  id: string
  envId: ShopperCase['envId']
  environment: string
  product: ShopperCase['product']
  severity: ShopperCase['severity']
  category: string
  score: number
  visitDaysAgo: number
  status: ShopperCase['status']
  owner?: string
  conduct?: boolean
  visit: Omit<ShopperVisit, 'date'>
  actions: ShopperProposedAction[]
  review?: { daysAgo: number; note?: string }
  closedDaysAgo?: number
}

const CX = 'CX manager'

const SEEDS: Seed[] = [
  // --- PSI Assets (rental) ----------------------------------------------------------------------------------------------------------
  {
    id: 'sc-401',
    envId: 'ast',
    environment: 'PSI Assets',
    product: 're',
    severity: 'critical',
    category: 'follow_up_commitment',
    score: 48,
    visitDaysAgo: 2,
    status: 'owner_decision',
    review: { daysAgo: 1, note: 'Call recording and the WhatsApp thread confirm it. The callback was promised twice and never made.' },
    visit: {
      where: b('PSI Assets leasing line · Abu Dhabi', 'خط تأجير PSI للأصول · أبوظبي'),
      channel: b('Phone call, then WhatsApp', 'مكالمة هاتفية ثم واتساب'),
      staff: b('Leasing consultant · AG-214', 'مستشار تأجير · AG-214'),
      scenario: b(
        'A tenant whose lease ends in 30 days asks to renew and to know the new rent.',
        'مستأجر ينتهي عقده خلال 30 يوماً يطلب التجديد ومعرفة الإيجار الجديد.',
      ),
      shopperNote: b(
        'The consultant was polite but did not know the renewal rent and said he would call back the same day. No call came. I sent a WhatsApp two days later; it was read and not answered.',
        'كان المستشار مهذباً لكنه لم يعرف إيجار التجديد وقال إنه سيتصل في اليوم نفسه. لم يتصل. أرسلت رسالة واتساب بعد يومين؛ قُرئت ولم يُرد عليها.',
      ),
      items: [
        { label: b('Answered within 3 rings', 'الرد خلال 3 رنات'), pass: true },
        { label: b('Greeted and gave his name', 'رحّب وذكر اسمه'), pass: true },
        {
          label: b('Knew the renewal process', 'يعرف إجراءات التجديد'),
          pass: false,
          note: b('Did not know the renewal rent or who sets it', 'لم يعرف إيجار التجديد ولا من يحدده'),
        },
        { label: b('Gave a clear next step and time', 'أعطى خطوة تالية ووقتاً واضحاً'), pass: true },
        {
          label: b('Kept the promised callback', 'التزم بالاتصال الموعود'),
          pass: false,
          note: b('No call; WhatsApp read, no reply', 'لا اتصال؛ واتساب مقروء بلا رد'),
        },
        { label: b('Logged the request in the CRM', 'سجّل الطلب في CRM'), pass: false, note: b('No activity on the lead', 'لا نشاط على العميل') },
      ],
      evidence: [
        { kind: 'recording', label: b('Call recording, 4 min 12 s', 'تسجيل المكالمة، 4 د 12 ث') },
        { kind: 'chat', label: b('WhatsApp thread (2 messages, read, no reply)', 'محادثة واتساب (رسالتان، مقروءة، بلا رد)') },
        { kind: 'form', label: b('Shopper checklist form', 'نموذج قائمة المتسوق') },
      ],
    },
    actions: [
      act(
        1,
        'training',
        b(
          'A 1-hour refresher for the leasing line on lease renewals: the renewal rent rules and who approves them.',
          'جلسة تذكير لمدة ساعة لخط التأجير حول تجديد العقود: قواعد إيجار التجديد ومن يعتمدها.',
        ),
        b('The consultant could not answer the most common renewal question.', 'لم يستطع المستشار الإجابة عن أكثر سؤال تجديد شيوعاً.'),
      ),
      act(
        2,
        'process',
        b(
          'Every promised callback is logged as a CRM task with a due time; the team leader sees the overdue ones every morning.',
          'كل اتصال موعود يُسجل كمهمة في CRM بموعد؛ ويرى قائد الفريق المتأخر منها كل صباح.',
        ),
        b('The promise was not logged, so nothing reminded him.', 'لم يُسجل الوعد، فلم يذكّره شيء.'),
      ),
      act(
        3,
        'coaching',
        b(
          'The direct manager listens to the recording with AG-214 and agrees how to handle a question he cannot answer.',
          'يستمع المدير المباشر للتسجيل مع AG-214 ويتفقان على طريقة التعامل مع سؤال لا يعرف إجابته.',
        ),
        b('One person, one missed promise: a conversation, not a disciplinary case.', 'شخص واحد ووعد فائت: حديث وليس حالة تأديبية.'),
      ),
    ],
  },
  {
    id: 'sc-402',
    envId: 'ast',
    environment: 'PSI Assets',
    product: 're',
    severity: 'medium',
    category: 'pricing_disclosure',
    score: 64,
    visitDaysAgo: 5,
    status: 'owner_decision',
    review: { daysAgo: 3, note: 'The quote and the final contract draft differ by AED 1,500 in fees. Checked against the fee schedule.' },
    visit: {
      where: b('PSI Assets office · Al Reem Island', 'مكتب PSI للأصول · جزيرة الريم'),
      channel: b('Walk-in visit', 'زيارة شخصية'),
      staff: b('Leasing consultant · AG-231', 'مستشار تأجير · AG-231'),
      scenario: b('A family asks for a 2-bedroom flat and the full yearly cost.', 'عائلة تسأل عن شقة غرفتين والتكلفة السنوية الكاملة.'),
      shopperNote: b(
        'I was given the rent only. The agency fee, the security deposit and the municipality fee came up only when I asked for the contract draft, AED 1,500 more than I expected.',
        'أُعطيت الإيجار فقط. رسوم الوكالة والتأمين ورسوم البلدية ظهرت فقط عندما طلبت مسودة العقد، أي 1,500 درهم أكثر مما توقعت.',
      ),
      items: [
        { label: b('Greeted within 2 minutes', 'الترحيب خلال دقيقتين'), pass: true },
        { label: b('Asked about needs and budget', 'سأل عن الاحتياج والميزانية'), pass: true },
        { label: b('Showed suitable units', 'عرض وحدات مناسبة'), pass: true },
        { label: b('Gave the full yearly cost up front', 'أعطى التكلفة السنوية الكاملة مسبقاً'), pass: false, note: b('Fees not mentioned', 'لم تُذكر الرسوم') },
        { label: b('Gave the cost in writing', 'أعطى التكلفة كتابياً'), pass: false },
      ],
      evidence: [
        { kind: 'photo', label: b('Photo of the handwritten quote', 'صورة عرض السعر المكتوب باليد') },
        { kind: 'form', label: b('Contract draft (PDF)', 'مسودة العقد (PDF)') },
        { kind: 'form', label: b('Shopper checklist form', 'نموذج قائمة المتسوق') },
      ],
    },
    actions: [
      act(
        1,
        'process',
        b(
          'A one-page cost sheet (rent, agency fee, deposit, municipality fee) is printed and given at every first meeting.',
          'ورقة تكلفة من صفحة واحدة (الإيجار، رسوم الوكالة، التأمين، رسوم البلدية) تُطبع وتُعطى في كل لقاء أول.',
        ),
        b('The fees surprised the customer at the contract stage.', 'فاجأت الرسوم العميل عند مرحلة العقد.'),
      ),
      act(
        2,
        'training',
        b('15 minutes in the weekly team meeting on how to present the full yearly cost.', '15 دقيقة في الاجتماع الأسبوعي حول عرض التكلفة السنوية الكاملة.'),
        b('Second time this quarter fees were missed in this office.', 'ثاني مرة هذا الربع تُغفل فيها الرسوم في هذا المكتب.'),
      ),
    ],
  },
  {
    id: 'sc-403',
    envId: 'ast',
    environment: 'PSI Assets',
    product: 're',
    severity: 'medium',
    category: 'handover_process',
    score: 58,
    visitDaysAgo: 1,
    status: 'open',
    visit: {
      where: b('PSI Assets maintenance line', 'خط الصيانة في PSI للأصول'),
      channel: b('App request, then phone', 'طلب عبر التطبيق ثم الهاتف'),
      staff: b('Maintenance coordinator · MC-07', 'منسق صيانة · MC-07'),
      scenario: b('A tenant reports an AC leak through the app and calls the next day.', 'مستأجر يبلّغ عن تسرب في المكيف عبر التطبيق ويتصل في اليوم التالي.'),
      shopperNote: b(
        'The app request got no reference number. On the phone they could not find it and opened a new one. The technician slot offered was 6 days away.',
        'لم يحصل طلب التطبيق على رقم مرجعي. على الهاتف لم يجدوه وفتحوا طلباً جديداً. وكان موعد الفني المعروض بعد 6 أيام.',
      ),
      items: [
        { label: b('Request acknowledged with a reference', 'إقرار الطلب برقم مرجعي'), pass: false },
        { label: b('Found the request on the call', 'وجد الطلب أثناء المكالمة'), pass: false },
        { label: b('Offered a visit within 48 hours', 'عرض زيارة خلال 48 ساعة'), pass: false },
        { label: b('Polite and clear', 'مهذب وواضح'), pass: true },
      ],
      evidence: [
        { kind: 'photo', label: b('Screenshot of the app request (no reference)', 'لقطة لطلب التطبيق (بلا رقم مرجعي)') },
        { kind: 'recording', label: b('Call recording, 6 min 40 s', 'تسجيل المكالمة، 6 د 40 ث') },
      ],
    },
    actions: [
      act(
        1,
        'facility',
        b(
          'IT fixes the app so every maintenance request gets a reference number and a confirmation message.',
          'تُصلح التقنية التطبيق ليحصل كل طلب صيانة على رقم مرجعي ورسالة تأكيد.',
        ),
        b('The tenant had no proof the request existed.', 'لم يكن لدى المستأجر ما يثبت وجود الطلب.'),
      ),
      act(
        2,
        'process',
        b('AC leaks are handled as urgent: a technician within 48 hours.', 'تسربات المكيفات تُعامل كعاجلة: فني خلال 48 ساعة.'),
        b('A 6-day slot for a leak risks damage to the unit.', 'موعد بعد 6 أيام لتسرب يعرّض الوحدة للضرر.'),
      ),
    ],
  },
  {
    id: 'sc-404',
    envId: 'ast',
    environment: 'PSI Assets',
    product: 're',
    severity: 'low',
    category: 'greeting',
    score: 81,
    visitDaysAgo: 16,
    status: 'closed',
    review: { daysAgo: 15 },
    closedDaysAgo: 3,
    visit: {
      where: b('PSI Assets office · Khalifa City', 'مكتب PSI للأصول · مدينة خليفة'),
      channel: b('Walk-in visit', 'زيارة شخصية'),
      staff: b('Receptionist · RC-02', 'موظفة استقبال · RC-02'),
      scenario: b('A walk-in asks about available studios.', 'زائر يسأل عن استوديوهات متاحة.'),
      shopperNote: b(
        'Waited 7 minutes without being acknowledged while the receptionist was on a personal call. The rest of the visit was good.',
        'انتظرت 7 دقائق دون أن يلتفت إليّ أحد بينما كانت موظفة الاستقبال في مكالمة شخصية. باقي الزيارة كان جيداً.',
      ),
      items: [
        { label: b('Acknowledged within 1 minute', 'الالتفات خلال دقيقة'), pass: false },
        { label: b('Offered a seat and water', 'عرض الجلوس والماء'), pass: true },
        { label: b('Handed to a consultant quickly', 'التحويل لمستشار بسرعة'), pass: true },
      ],
      evidence: [{ kind: 'form', label: b('Shopper checklist form', 'نموذج قائمة المتسوق') }],
    },
    actions: [
      act(
        1,
        'coaching',
        b('A short talk with the receptionist on the 1-minute acknowledgement rule.', 'حديث قصير مع موظفة الاستقبال حول قاعدة الالتفات خلال دقيقة.'),
        b('One-off, the rest of the visit scored well.', 'حالة فردية، وباقي الزيارة جيد.'),
        {
          decision: 'confirmed',
          decisionNote: 'Agreed. I will talk to her myself on Sunday.',
          plannedFor: day(-12),
          decidedBy: 'Environment manager',
          decidedAt: iso(-14),
          doneAt: iso(-11),
          doneNote: 'Done on Sunday. She knows the rule; reception phone only for work calls.',
        },
      ),
    ],
  },
  // --- Dubai -------------------------------------------------------------------------------------------------------------------------
  {
    id: 'sc-405',
    envId: 'dub',
    environment: 'Dubai',
    product: 're',
    severity: 'critical',
    category: 'needs_discovery',
    score: 42,
    visitDaysAgo: 1,
    status: 'open',
    visit: {
      where: b('PSI Dubai · Business Bay office', 'PSI دبي · مكتب الخليج التجاري'),
      channel: b('Walk-in visit', 'زيارة شخصية'),
      staff: b('Sales agent · AG-118', 'وكيل مبيعات · AG-118'),
      scenario: b('An investor with AED 2M asks for off-plan options.', 'مستثمر بميزانية مليوني درهم يسأل عن خيارات على المخطط.'),
      shopperNote: b(
        'The agent pushed one project only, said the offer "ends today", and made a remark about my nationality. I left without a brochure.',
        'ركّز الوكيل على مشروع واحد فقط، وقال إن العرض "ينتهي اليوم"، وأدلى بتعليق عن جنسيتي. غادرت دون كتيّب.',
      ),
      items: [
        { label: b('Asked about goals and budget', 'سأل عن الأهداف والميزانية'), pass: false },
        { label: b('Offered more than one option', 'عرض أكثر من خيار'), pass: false },
        { label: b('No pressure tactics', 'دون أساليب ضغط'), pass: false },
        { label: b('Respectful language', 'لغة محترمة'), pass: false, note: b('Remark about nationality', 'تعليق عن الجنسية') },
      ],
      evidence: [
        { kind: 'recording', label: b('Audio from the visit, 11 min', 'تسجيل صوتي من الزيارة، 11 د') },
        { kind: 'form', label: b('Shopper checklist form', 'نموذج قائمة المتسوق') },
      ],
    },
    actions: [
      act(
        1,
        'hr',
        b('Refer to HR for a conduct review of AG-118.', 'إحالة إلى الموارد البشرية لمراجعة سلوك AG-118.'),
        b('A remark about nationality breaks the conduct code.', 'التعليق عن الجنسية يخالف مدونة السلوك.'),
      ),
      act(
        2,
        'training',
        b('Needs-discovery training for the Business Bay team.', 'تدريب على اكتشاف الاحتياجات لفريق الخليج التجاري.'),
        b('No questions about the investor’s goals.', 'لا أسئلة عن أهداف المستثمر.'),
      ),
    ],
  },
  {
    id: 'sc-406',
    envId: 'dub',
    environment: 'Dubai',
    product: 're',
    severity: 'medium',
    category: 'follow_up_commitment',
    score: 67,
    visitDaysAgo: 6,
    status: 'owner_decision',
    review: { daysAgo: 4 },
    visit: {
      where: b('PSI Dubai · WhatsApp line', 'PSI دبي · خط واتساب'),
      channel: b('WhatsApp', 'واتساب'),
      staff: b('Sales agent · AG-102', 'وكيل مبيعات · AG-102'),
      scenario: b('A buyer asks for floor plans and the payment plan.', 'مشترٍ يطلب المخططات وخطة الدفع.'),
      shopperNote: b('Floor plans came after 26 hours; the payment plan never came.', 'وصلت المخططات بعد 26 ساعة؛ وخطة الدفع لم تصل أبداً.'),
      items: [
        { label: b('First reply within 15 minutes', 'أول رد خلال 15 دقيقة'), pass: true },
        { label: b('Sent what was asked', 'أرسل المطلوب'), pass: false },
      ],
      evidence: [{ kind: 'chat', label: b('WhatsApp thread', 'محادثة واتساب') }],
    },
    actions: [
      act(
        1,
        'process',
        b('Payment plans for every live project are saved as WhatsApp quick replies.', 'تُحفظ خطط الدفع لكل مشروع قائم كردود سريعة في واتساب.'),
        b('The agent had to look for it and forgot.', 'اضطر الوكيل للبحث عنها فنسي.'),
      ),
      act(
        2,
        'training',
        b(
          'WhatsApp sales training for the Dubai WhatsApp line: sending what was asked within the hour, with the quick replies.',
          'تدريب مبيعات واتساب لخط دبي: إرسال المطلوب خلال ساعة باستخدام الردود السريعة.',
        ),
        b('Third WhatsApp follow-up finding in Dubai this quarter.', 'ثالث ملاحظة متابعة على واتساب في دبي هذا الربع.'),
        {
          decision: 'confirmed',
          decisionNote: 'Approved. The whole WhatsApp line (8 agents) should attend, not only AG-102. Before the end of the month please.',
          plannedFor: day(6),
          decidedBy: 'Dubai environment manager',
          decidedAt: iso(-2),
          deliveredBy: 'ld',
          ld: { status: 'requested' },
        },
      ),
    ],
  },
  // --- Abu Dhabi ---------------------------------------------------------------------------------------------------------------------
  {
    id: 'sc-407',
    envId: 'auh',
    environment: 'Abu Dhabi',
    product: 're',
    severity: 'medium',
    category: 'handover_process',
    score: 61,
    visitDaysAgo: 4,
    status: 'owner_decision',
    review: { daysAgo: 2 },
    visit: {
      where: b('PSI Abu Dhabi · handover desk, Yas Island', 'PSI أبوظبي · مكتب التسليم، جزيرة ياس'),
      channel: b('Walk-in visit', 'زيارة شخصية'),
      staff: b('Handover officer · HO-04', 'موظف تسليم · HO-04'),
      scenario: b('A buyer comes to collect keys with a snagging list.', 'مشترٍ يأتي لاستلام المفاتيح ومعه قائمة ملاحظات.'),
      shopperNote: b(
        'Keys given, but nobody took the snagging list or gave a date to fix it.',
        'سُلّمت المفاتيح، لكن لم يأخذ أحد قائمة الملاحظات ولم يُعطَ موعد لإصلاحها.',
      ),
      items: [
        { label: b('Appointment on time', 'الموعد في وقته'), pass: true },
        { label: b('Snagging list recorded', 'تسجيل قائمة الملاحظات'), pass: false },
        { label: b('Date given for the fixes', 'إعطاء موعد للإصلاحات'), pass: false },
      ],
      evidence: [{ kind: 'photo', label: b('Photo of the unsigned snagging list', 'صورة قائمة الملاحظات غير الموقعة') }],
    },
    actions: [
      act(
        1,
        'process',
        b('No keys without a signed snagging list and a fix date in the CRM.', 'لا مفاتيح دون قائمة ملاحظات موقعة وموعد إصلاح في CRM.'),
        b('Fixes are lost when the list stays with the buyer.', 'تضيع الإصلاحات حين تبقى القائمة مع المشتري.'),
      ),
    ],
  },
  // --- PSI-AI ------------------------------------------------------------------------------------------------------------------------
  {
    id: 'sc-408',
    envId: 'ai',
    environment: 'PSI-AI',
    product: 're',
    severity: 'low',
    category: 'greeting',
    score: 84,
    visitDaysAgo: 3,
    // 25 Nov (owner): checked by CX, so the PSI-AI owner has a case to decide too
    status: 'owner_decision',
    review: { daysAgo: 1, note: 'Chat log confirms the 9-minute hand-over and the repeated questions.' },
    visit: {
      where: b('PSI-AI chat on the website', 'محادثة PSI-AI على الموقع'),
      channel: b('Website chat', 'محادثة الموقع'),
      staff: b('AI assistant, then agent · AG-305', 'المساعد الذكي ثم الوكيل · AG-305'),
      scenario: b('A visitor asks the chatbot to talk to a person.', 'زائر يطلب من المساعد التحدث مع شخص.'),
      shopperNote: b(
        'The hand-over to a person took 9 minutes; the agent did not read the chat history and asked everything again.',
        'استغرق التحويل لشخص 9 دقائق؛ ولم يقرأ الوكيل سجل المحادثة وسأل كل شيء من جديد.',
      ),
      items: [
        { label: b('Handed to a person within 3 minutes', 'التحويل لشخص خلال 3 دقائق'), pass: false },
        { label: b('Agent read the history', 'قرأ الوكيل السجل'), pass: false },
      ],
      evidence: [{ kind: 'chat', label: b('Chat transcript', 'نص المحادثة') }],
    },
    actions: [
      act(
        1,
        'coaching',
        b('Agents open the chat history before the first reply.', 'يفتح الوكلاء سجل المحادثة قبل أول رد.'),
        b('The visitor had to repeat everything.', 'اضطر الزائر لتكرار كل شيء.'),
      ),
    ],
  },
]

export function buildShopperSample(): ShopperCase[] {
  return SEEDS.map((s) => {
    const openedAt = iso(-s.visitDaysAgo, 15)
    const critical = s.severity === 'critical'
    const respondedAt = s.review ? iso(-s.review.daysAgo, 11) : undefined
    return {
      id: s.id,
      severity: s.severity,
      assignmentId: `asn-${s.id.slice(3)}`,
      product: s.product,
      environment: s.environment,
      envId: s.envId,
      openedAt,
      respondDueAt: new Date(new Date(openedAt).getTime() + (critical ? 1 : 3) * DAY).toISOString(),
      resolveDueAt: new Date(new Date(openedAt).getTime() + (critical ? 5 : 10) * DAY).toISOString(),
      status: s.status,
      proposedActions: s.actions,
      category: s.category,
      visitScorePct: s.score,
      ownerTitle: s.owner ?? 'Environment manager',
      isConductIssue: !!s.conduct,
      respondedAt,
      closedAt: s.closedDaysAgo !== undefined ? iso(-s.closedDaysAgo, 16) : undefined,
      visit: { ...s.visit, date: openedAt },
      cxReview: s.review ? { by: CX, at: respondedAt!, note: s.review.note } : undefined,
    }
  })
}

/**
 * Prototype persistence: the cases with their decisions are kept in this browser so the flow can be walked across users (CX manager →
 * environment manager → CX manager). The back end replaces this with `GET /api/mystery-shopper/cases`.
 */
// v2 (24 Nov): the L&D leg was added to the sample; older saved copies are ignored
const SAVE_KEY = 'psicx.shopperCases.v2'

export function loadShopperCases(): ShopperCase[] {
  const base = buildShopperSample()
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const byId = new Map((JSON.parse(raw) as ShopperCase[]).map((c) => [c.id, c]))
      return base.map((c) => byId.get(c.id) ?? c)
    }
  } catch {
    /* no browser storage: the sample */
  }
  return base
}

export function saveShopperCases(cases: ShopperCase[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cases))
  } catch {
    /* in memory only */
  }
}
