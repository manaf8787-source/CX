import type { Bi, SampleCheck, SampleReader } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Weekly sample page copy (v40 S15). The day (Thursday), "wrong lowers the agent's pass rate", the composition and who may judge are [Proposed]: not in the agent spec. */
export const WEEKLY_SAMPLE_COPY = {
  title: b('Weekly sample', 'العينة الأسبوعية'),
  /**
   * v41.1 (F29): the page says what each row now carries; strings as in the prototype. [Proposed] v42.1: the prototype's list view still says "Fifty
   * outputs"; the sample is now split by reader (the CX team reads 26, Internal Audit 35), so the number is dropped and the sentence says "your part".
   */
  intro: b(
    "The outputs that passed the supervisor this week, in your part of the sample. For each one: what the agent saw, what it produced, what the supervisor checked, and the record behind it. Judge it in half a minute; open the record when in doubt. Every \"wrong\" becomes a new test for the supervisor and lowers that agent's pass rate.",
    'المخرجات التي مرّت على السوبرفايزر هذا الأسبوع، في جزئك من العينة. لكل واحد: ماذا رأى الوكيل، ماذا أنتج، ماذا فحص السوبرفايزر، والسجل خلفه. احكم عليه في نصف دقيقة؛ افتح السجل عند الشك. كل "خطأ" يصبح اختباراً جديداً للسوبرفايزر ويخفض نسبة نجاح ذلك الوكيل.',
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

// --- v42.1 (F32): the sample is split by reader -------------------------------------------------------------------------------------------

/**
 * The card above the table and the cards, per reader. Strings are the prototype v42.1's, verbatim: nobody approves or rejects a fix from the
 * sample, it is a quality audit of the AI. The Executive reads the content rows, so it gets the CX note (what the prototype shows it).
 */
export const SAMPLE_READER_NOTE: Record<SampleReader, { title: Bi; text: Bi }> = {
  audit: {
    title: b('Your part of the sample: what audit can judge', 'جزؤك من العينة: ما يستطيع التدقيق الحكم عليه'),
    text: b(
      'You are not approving or rejecting fixes; the responsible manager does that from the inbox. You are checking that the AI followed the rules: the fix went to the title the matrix says (routing), the category matches the quoted evidence (classification), nothing left the CX team that should not have (access), and a campaign points at the people the persona defines (targeting). Right means the rule was followed; Wrong means it was not, whatever you think of the fix itself.',
      'أنت لا تعتمد الحلول ولا ترفضها؛ المدير المسؤول يفعل ذلك من صندوقه. أنت تتحقق أن الذكاء اتّبع القواعد: الحل ذهب للمسمّى الذي تقوله المصفوفة (التوجيه)، الفئة تطابق الدليل المقتبس (التصنيف)، لم يغادر فريق CX ما لا يجوز (الصلاحيات)، والحملة تشير إلى الأشخاص الذين تعرّفهم الشخصية (الاستهداف). "صح" تعني أن القاعدة اتُّبعت؛ "خطأ" تعني أنها لم تُتّبع، أياً كان رأيك في الحل نفسه.',
    ),
  },
  cx: {
    title: b('Your part of the sample: what the CX team can judge', 'جزؤك من العينة: ما يستطيع فريق CX الحكم عليه'),
    text: b(
      'Proposed fixes, interview briefs and journey readings need someone who knows the work: is this the fix a careful CX person would propose from this pattern, is the brief what the timeline says, is the reading fair. The routing, access and targeting rows go to the Internal Audit and Marketing Lead.',
      'الحلول المقترحة وملخصات المقابلات وقراءات الرحلة تحتاج من يعرف العمل: هل هذا الحل الذي كان شخص CX متأنٍّ سيقترحه من هذا النمط، هل الملخص هو ما يقوله الخط الزمني، هل القراءة منصفة. سطور التوجيه والصلاحيات والاستهداف تذهب لمدير التدقيق الداخلي والتسويق.',
    ),
  },
}

/** The kind label of the three new audit rows (the list's "Agent and kind" cell). */
export const SAMPLE_AUDIT_KIND: Record<'routing' | 'access' | 'targeting', Bi> = {
  routing: b('Routing by the matrix', 'التوجيه بالمصفوفة'),
  access: b('Access check', 'فحص الصلاحيات'),
  targeting: b('Campaign targeting', 'استهداف الحملة'),
}

// --- v42.2 (F34): the card flow ------------------------------------------------------------------------------------------------------------

/** The one question of a card, per kind of work (the prototype's `wsQuestion`, verbatim). */
export const SAMPLE_QUESTION: Record<SampleCheck, Bi> = {
  fix: b('Is this a sensible fix for this pattern, and is it going to the right person?', 'هل هذا حل معقول لهذا النمط، وهل يذهب للشخص الصحيح؟'),
  classification: b('Is this really a complaint of this type?', 'هل هذه فعلاً شكوى من هذا النوع؟'),
  count: b('Should this count as a signal?', 'هل يجب أن تُعدّ هذه إشارة؟'),
  brief: b('Does this summary match what happened to the customer?', 'هل هذا الملخص يطابق ما حدث للزبون؟'),
  journey: b('Is this reading of the customer fair?', 'هل هذه القراءة للزبون منصفة؟'),
  routing: b('Did the fix go to the title the matrix says?', 'هل ذهب الحل للمسمّى الذي تقوله المصفوفة؟'),
  access: b('Is there anything here that should not have left the CX team?', 'هل هنا شيء ما كان يجب أن يغادر فريق CX؟'),
  targeting: b('Are these the right people for this campaign?', 'هل هؤلاء هم الأشخاص الصحيحون لهذه الحملة؟'),
}

/** The page of the card flow, strings as in the prototype v42.2 unless marked. */
export const SAMPLE_FLOW_COPY = {
  title: b("Check the AI's work this week", 'فحص شغل الذكاء هذا الأسبوع'),
  description: b('One piece at a time. Half a minute each.', 'قطعة واحدة كل مرة. نصف دقيقة لكل واحدة.'),
  introTitle: b('What this is, in one breath', 'ما هذا، بجملة واحدة'),
  introText: b(
    "The AI team is a new employee. Every week you check a few pieces of its work, one at a time, the way a supervisor listens to a few of a new agent's calls. Each card shows what the AI was given and what it decided. You answer one question: would you have done the same? You are not approving anything and nothing changes for the customer; a \"no\" just teaches the supervisor what to catch next time.",
    'فريق الذكاء موظف جديد. كل أسبوع تفحص بضع قطع من شغله، واحدة واحدة، كما يسمع المشرف بعض مكالمات موظف جديد. كل بطاقة تعرض ما أُعطي للذكاء وما قرره. تجيب عن سؤال واحد: هل كنت ستفعل الشيء نفسه؟ أنت لا تعتمد شيئاً ولا يتغير شيء للزبون؛ "لا" تعلّم السوبرفايزر ما يلتقطه المرة القادمة.',
  ),
  given: b('What the AI was given', 'ما أُعطي للذكاء'),
  decided: b('What it decided', 'ما قرره'),
  how: b('How', 'كيف'),
  yes: b('Yes, I would do the same', 'نعم، كنت سأفعل الشيء نفسه'),
  no: b('No, that is wrong', 'لا، هذا خطأ'),
  skip: b('Not sure, skip for now', 'لست متأكداً، تخطَّ الآن'),
  openFix: b('Open the fix', 'افتح الحل'),
  openSignal: b('Open the signal', 'افتح الإشارة'),
  checked: b('checked this week', 'فُحصت هذا الأسبوع'),
  markedWrong: b('marked wrong', 'عُلّمت خطأ'),
  dueThursday: b('due Thursday', 'المهلة الخميس'),
  seeList: b('See all as a list', 'عرض الكل كقائمة'),
  backToCards: b('Back to one at a time', 'العودة إلى واحد واحد'),
  doneTitle: b('All done for this week.', 'انتهى كل شيء لهذا الأسبوع.'),
  doneNone: b('Nothing wrong found.', 'لم يُعثر على خطأ.'),
  doneWrong: (n: number): Bi => b(`${n} wrong answers became tests for the supervisor.`, `${n} إجابات خاطئة صارت اختبارات للسوبرفايزر.`),
  /** [Proposed] New strings, not in the prototype: what is announced and shown beyond the card itself. */
  skippedNote: b('These are the ones you skipped.', 'هذه هي التي تخطيتها.'),
  announceChecked: (done: number, total: number): Bi => b(`${done} of ${total} checked.`, `${done} من ${total} مفحوصة.`),
  announceSkipped: (done: number, total: number): Bi => b(`Skipped for now. ${done} of ${total} checked.`, `تُخطّيت الآن. ${done} من ${total} مفحوصة.`),
  announceDone: b('All done for this week.', 'انتهى كل شيء لهذا الأسبوع.'),
  announceList: b('Showing everything as a list.', 'عرض الكل كقائمة.'),
  announceCards: b('Back to one at a time.', 'العودة إلى واحد واحد.'),
}

/**
 * The evidence on the cards (the prototype's `wsEvidence`), strings verbatim unless marked [Proposed]. Built into every row by
 * `utils/sampleCards.ts`; Arabic of the [Proposed] ones needs native review.
 */
export const SAMPLE_EVIDENCE_COPY = {
  pattern: b('The pattern', 'النمط'),
  moreSignals: (n: number): Bi => b(`+${n} more signals`, `+${n} إشارات أخرى`),
  type: b('Type', 'النوع'),
  severityLabel: b('Severity', 'الشدة'),
  countedAsSignal: b('Counted as a signal (not worked one by one)', 'عُدّت إشارة (لا تُعالج واحدة واحدة)'),
  howClassify: b(
    'The AI matched the words of the message to the type; the severity comes from the rules (critical only for legal, privacy, safety or a false promise).',
    'طابق الذكاء كلمات الرسالة مع النوع؛ والشدة من القواعد (حرجة فقط للقانوني والخصوصية والسلامة والوعد الكاذب).',
  ),
  kind: b('Kind', 'النوع'),
  to: b('to', 'إلى'),
  /** [Proposed] The prototype hard-codes "about 7 of 10"; here the figure is the pattern's own, so the line cannot contradict the card. */
  howFix: (outOfTen: number): Bi =>
    b(
      `In similar closed cases this kind of fix was followed by recovery in about ${outOfTen} of 10. It is a suggestion; the manager decides.`,
      `في حالات مغلقة مشابهة تبع هذا النوع من الحلول تعافٍ في نحو ${outOfTen} من 10. إنه اقتراح؛ والمدير يقرر.`,
    ),
  /** [Proposed] A fix with no pattern (from AI Insights, an investigation or the form) has no recovery figure to quote. */
  howFixNoFigure: b('No recovery figure for this kind of fix yet. It is a suggestion; the manager decides.', 'لا رقم تعافٍ بعد لهذا النوع من الحلول. إنه اقتراح؛ والمدير يقرر.'),
  routedTo: b('Routed to', 'وُجّه إلى'),
  matrixSays: b('The matrix says', 'المصفوفة تقول'),
  /** The list line ("Kind: … · product … · matrix says: …"). */
  matrixSaysShort: b('matrix says', 'المصفوفة تقول'),
  howRouting: b('Compare the two bold titles. If they differ, the routing is wrong.', 'قارن المسمّيين بالخط العريض. إن اختلفا فالتوجيه خطأ.'),
  /** [Proposed] The one check the build adds to a routing card: a Legal and privacy fix needs a legal, privacy or safety signal behind it. */
  kindCheck: b('Check the kind too', 'تحقق من النوع أيضاً'),
  kindCheckLegal: (issue: Bi): Bi =>
    b(
      `Legal and privacy is for legal, privacy or safety signals; none of this pattern's signals is one (it is about ${issue.en.toLowerCase()}).`,
      `القانوني والخصوصية لإشارات قانونية أو خصوصية أو سلامة؛ ولا إشارة من هذا النمط منها (النمط عن ${issue.ar}).`,
    ),
  /** The short form for the list's "What it produced" cell. */
  kindCheckShort: b('kind check: no legal, privacy or safety signal in this pattern', 'فحص النوع: لا إشارة قانونية أو خصوصية أو سلامة في هذا النمط'),
  product: b('product', 'المنتج'),
  respond: b('respond', 'الرد'),
  resolve: b('resolve', 'الحل'),
  receiverGot: b('What the receiver got', 'ما وصل للمستلم'),
  namesIn: b('Names in it', 'الأسماء فيه'),
  none: b('none', 'لا شيء'),
  agentIdInManagerLine: b('agent id, inside the direct-manager line only', 'رقم الموظف، داخل خط المدير المباشر فقط'),
  conversationText: b('conversation text', 'نص المحادثة'),
  /** [Proposed] The trace as the receiver sees it: ids only. */
  traceSent: b('Trace as sent', 'الأثر كما أُرسل'),
  howAccess: b('Only the CX team may see names and conversation text. A receiver gets the fix and the ids.', 'فريق CX وحده يرى الأسماء ونص المحادثة. المستلم يحصل على الحل والأرقام.'),
  accessSaw: b('Fix text, "How the AI found this", the trace, as sent to the receiver', 'نص الحل و"كيف وجده الذكاء" والأثر كما أُرسلت للمستلم'),
  accessContains: b('no conversation text, no customer name', 'لا نص محادثة، لا اسم زبون'),
  accessContainsAgentId: b('agent id only inside the direct-manager line, no conversation text, no customer name', 'رقم الموظف فقط داخل خط المدير المباشر، لا نص محادثة، لا اسم زبون'),
  supervisorRouting: b('Supervisor: schema and recompute only; whether the receiver matches the matrix is what you judge', 'السوبرفايزر: البنية وإعادة الحساب فقط؛ مطابقة المستلم للمصفوفة هي ما تحكم عليه'),
  supervisorAccess: b('Access check passed by code; you confirm by eye', 'فحص الصلاحيات نجح بالكود؛ تؤكده بالعين'),
  supervisorTargeting: b('Supervisor: counts recomputed; whether these are the right people is what you judge', 'السوبرفايزر: الأعداد أُعيد حسابها؛ هل هؤلاء الأشخاص الصحيحون هو ما تحكم عليه'),
  briefFor: b('Brief for the caller', 'ملخص للمتصل'),
  reasonSuggested: b('reason suggested', 'السبب المقترح'),
  critical: b('critical', 'حرج'),
  howBrief: b('The brief is written from the timeline only. The caller reads it before dialling.', 'الملخص مكتوب من الخط الزمني فقط. يقرؤه المتصل قبل الاتصال.'),
  events: b('events', 'حدثاً'),
  noProblemFound: b('No problem found on the timeline', 'لا مشكلة على الخط الزمني'),
  /** [Proposed] An event with no flag, on a brief card. */
  noProblemFlagged: b('No problem flagged', 'لا مشكلة مرصودة'),
  healthy: b('healthy', 'سليم'),
  howJourney: b("The reading comes from the problems found on the timeline, not from the agent's opinion.", 'القراءة من المشاكل المرصودة على الخط الزمني، لا من رأي الموظف.'),
  persona: b('Persona', 'الشخصية'),
  peopleOnRecord: b('people on record', 'شخصاً في السجل'),
  channelsTheyUse: b('channels they use', 'القنوات التي يستخدمونها'),
  who: b('Who', 'من'),
  channel: b('channel', 'القناة'),
  whoTargeted: b('Who the campaign targets', 'من تستهدف الحملة'),
  channelLabel: b('Channel', 'القناة'),
  /** [Proposed] The campaign's own title, first on the decided side of a targeting card. */
  campaign: b('Campaign', 'الحملة'),
  howTargeting: b('The campaign should point at the people the persona describes, on the channels they actually use.', 'يجب أن تشير الحملة إلى من تصفهم الشخصية، على القنوات التي يستخدمونها فعلاً.'),
}
