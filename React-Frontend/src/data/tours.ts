import type { Bi, RoleId } from '../types'
import { canOpenPage } from '../auth/access'

/**
 * The guided tour (v41 F28, docs/V41_TOUR.md). One list of steps per role, each with a page, an optional query, the real element to
 * light up (`[data-tour="..."]`, added to the page's own markup), a title and a text. A step with `click` is "Do it and continue":
 * the tour performs the real action on the target before moving on. Titles and texts are the prototype's own, word for word.
 *
 * The prototype's keys differ from the React roles: cxm -> cxmgr, cx -> cxteam, em -> envmgmt, tl -> teamlead, lead -> aslead,
 * mk -> marketing, odm -> ld, ia -> auditmkt (and its product role `re` has no React role). [Proposed]
 */
export interface TourStep {
  /** React Router path to be on. `null` = stay where you are (the closing card). */
  route: string | null
  /** Query the page needs, with its `?` (for example `?status=proposed`). Compared exactly, so a step that names none is on the bare path. */
  search?: string
  /** CSS selector of the element to highlight. Missing or not found: the card is centred with no highlight and never blocks. */
  target?: string
  /** Highlight the closest ancestor of the target that matches this selector instead of the target itself. */
  highlightParent?: string
  title: Bi
  text: Bi
  /** "Do it and continue": the tour clicks the target, then moves on (the next step navigates anyway, so a closed phone menu does not stop it). */
  click?: boolean
}

const bi = (en: string, ar: string): Bi => ({ en, ar })

/** The visible words of the tour, from the prototype (the replay label, "Tour n / total", Skip, Back, Next, Done, "Do it and continue", the closing toast). */
export const TOUR_COPY = {
  replay: bi('How do I use this?', 'كيف أستخدمه؟'),
  tour: bi('Tour', 'جولة'),
  skip: bi('Skip', 'تخطَّ'),
  back: bi('Back', 'رجوع'),
  next: bi('Next', 'التالي'),
  done: bi('Done', 'تم'),
  doIt: bi('Do it and continue', 'نفّذ وتابع'),
  finished: bi('Tour finished. Replay it any time from the bottom of the menu.', 'انتهت الجولة. أعدها متى شئت من أسفل القائمة.'),
  /** Read out by assistive technology when a step appears (the visible "Tour n / total" is the prototype's). [Proposed] wording */
  progress: (n: number, total: number): Bi => bi(`Tour ${n} of ${total}`, `جولة ${n} من ${total}`),
}

// --- Building blocks, as the prototype composes them -----------------------------------------------------------------------------

const home: TourStep[] = [
  {
    route: '/home',
    target: '[data-tour="steps"]',
    title: bi('One line, six steps', 'خط واحد، ست خطوات'),
    text: bi(
      'Everything in the portal is one of these. Listen, signal, pattern, fix, check, report. Click a step and you are on its page.',
      'كل شيء في البورتال واحد من هذه. نسمع، إشارة، نمط، إصلاح، تحقق، تقرير. اضغط خطوة وتكون على صفحتها.',
    ),
  },
  {
    route: '/home',
    target: '[data-tour="brief"]',
    title: bi('Your daily brief', 'موجزك اليومي'),
    text: bi(
      'Written at 07:00 by Agent 9 for your role only. Each line is a number with its direction; click a line and it opens the page behind it.',
      'يكتبه الوكيل 9 الساعة 07:00 لدورك فقط. كل سطر رقم واتجاهه؛ اضغط السطر ويفتح صفحته.',
    ),
  },
  {
    route: '/home',
    target: '[data-tour="indicator-card"]',
    title: bi('How customers feel', 'كيف يشعر الزبائن'),
    text: bi(
      'NPS, CSAT and CES per product, with a plain sentence under each. The "?" explains the number with an example. Nothing is averaged across products.',
      'NPS وCSAT وCES لكل منتج، وتحت كل رقم جملة بسيطة. علامة "?" تشرح الرقم بمثال. لا يُجمع شيء بين المنتجات.',
    ),
  },
]

const work: TourStep[] = [
  {
    route: '/home',
    target: '[data-tour="nav-inbox"]',
    title: bi('Start your day here', 'ابدأ يومك من هنا'),
    text: bi(
      'My inbox holds everything that is on you, ordered by urgency, each with a day count. Open it.',
      'صندوقي فيه كل ما هو عليك، مرتباً بالأهمية، لكل بند عدّاد أيام. افتحه.',
    ),
    click: true,
  },
  {
    route: '/inbox',
    target: '[data-tour="inbox-row"]',
    title: bi('One row, one thing to do', 'سطر واحد، شيء واحد تعمله'),
    text: bi(
      'The chip says how many days are left; the text says what to do; Open takes you to the record. Red means late.',
      'الرقاقة تقول كم يوماً متبقياً؛ النص يقول ماذا تعمل؛ "افتح" يأخذك للسجل. الأحمر يعني متأخر.',
    ),
  },
]

/** The register filtered to the fixes still waiting for a yes: the React page reads `?status=proposed` (the prototype's "waiting for a yes" tab). */
const WAITING = '?status=proposed'

const fix: TourStep[] = [
  {
    route: '/actions/corrective',
    target: '[data-tour="nextbox"]',
    title: bi('Where you are, what happens next', 'أين أنت، وما الذي يحدث بعد ذلك'),
    text: bi(
      'Every page and every record has this box: the step you are on, and the next step with who and by when. You never have to guess.',
      'كل صفحة وكل سجل فيه هذا الصندوق: الخطوة التي أنت فيها، والخطوة التالية مع من ومتى. لا تحتاج أن تخمّن.',
    ),
  },
  {
    route: '/actions/corrective',
    search: WAITING,
    target: '[data-tour="fix-open"]',
    title: bi('Open a fix', 'افتح حلاً'),
    text: bi(
      'The register lists every fix with its owner, due date and status. The tabs filter it; this one shows fixes still waiting for a yes. Open one.',
      'السجل يعرض كل حل مع مالكه وموعده وحالته. التبويبات تصفّيه؛ هذا يعرض الحلول التي تنتظر موافقة. افتح واحداً.',
    ),
    click: true,
  },
  {
    route: '/actions/corrective',
    search: WAITING,
    target: '[data-tour="fix-decide"]',
    title: bi('Your decision', 'قرارك'),
    text: bi(
      'A fix is only ever suggested. The buttons are the decision: approve and assign, or reject with a reason. You have 5 working days; the inbox counts them.',
      'الحل دائماً مقترح فقط. الأزرار هي القرار: اعتمد وأسند، أو ارفض مع السبب. أمامك 5 أيام عمل؛ الصندوق يعدّها.',
    ),
  },
  {
    route: '/actions/corrective',
    search: WAITING,
    target: '[data-tour="trace"]',
    title: bi('The trace', 'الأثر'),
    text: bi(
      'Every id in the chain: back to the original message, forward to the report. Click any id to open it.',
      'كل رقم في السلسلة: رجوعاً إلى الرسالة الأصلية، وتقدماً إلى التقرير. اضغط أي رقم لفتحه.',
    ),
  },
]

const loop: TourStep[] = [
  {
    route: '/close-the-loop',
    target: '[data-tour="loop-call"]',
    title: bi('Close the loop', 'إغلاق الحلقة'),
    text: bi(
      'Every unhappy customer gets a human call. Interview opens the brief Agent 8 wrote from the timeline, then four questions and the reason code.',
      'كل زبون غير راضٍ يحصل على مكالمة من إنسان. "مقابلة" تفتح الملخص الذي كتبه الوكيل 8 من الخط الزمني، ثم أربعة أسئلة ورمز السبب.',
    ),
  },
]

const people: TourStep[] = [
  {
    route: '/customers',
    target: '[data-tour="customers-search"]',
    title: bi('Find anyone', 'ابحث عن أي شخص'),
    text: bi(
      'A name, a mobile, an ID. One record per person, every contact from every source on one timeline, with the AI reading of what happened.',
      'اسم، جوال، هوية. سجل واحد لكل شخص، كل تواصل من أي مصدر على خط زمني واحد، مع قراءة الذكاء لما حدث.',
    ),
  },
]

const nums: TourStep[] = [
  {
    route: '/overview',
    target: '[data-tour="overview-card"]',
    title: bi('All the numbers', 'كل الأرقام'),
    text: bi(
      'Per product, never pooled: NPS, CSAT, CES, the lead funnel, the public reputation index. The monthly pack is written from these same numbers.',
      'لكل منتج، لا تُجمع أبداً: NPS وCSAT وCES وقمع العملاء ومؤشر السمعة العامة. الحزمة الشهرية تُكتب من هذه الأرقام نفسها.',
    ),
  },
]

const end: TourStep = {
  route: null,
  title: bi('That is the whole portal', 'هذا هو البورتال كله'),
  text: bi(
    'Six steps, your inbox, and a next step on everything. "?" explains any term; the assistant answers questions in your words. You can replay this tour from the bottom of the menu.',
    'ست خطوات، صندوقك، وخطوة تالية على كل شيء. "?" تشرح أي مصطلح؛ والمساعد يجيب عن الأسئلة بكلماتك. يمكنك إعادة هذه الجولة من أسفل القائمة.',
  ),
}

const personas: TourStep = {
  route: '/customers',
  target: '[data-tour="tab-personas"]',
  title: bi('Personas and campaigns', 'الشخصيات والحملات'),
  text: bi(
    'Who our customers are, and who to target next, on which channel. Your part of the portal.',
    'من هم زبائننا، ومن نستهدف لاحقاً، وعلى أي قناة. جزؤك من البورتال.',
  ),
  click: true,
}

const ldBrief: TourStep = {
  route: '/settings/ld',
  target: '[data-tour="brief"]',
  title: bi('Your daily brief', 'موجزك اليومي'),
  text: bi('Only your categories: training-gap fixes and the signals behind them.', 'فئاتك فقط: حلول فجوات التدريب والإشارات خلفها.'),
}

/** The prototype names fix CA-203; in this sample L&D only sees training-gap fixes (CA-204), so the step lights the first fix L&D can see. [Proposed] */
const ldFix: TourStep = {
  route: '/actions/corrective',
  target: '[data-tour="fix-card"]',
  title: bi('Fixes that need L&D', 'حلول تحتاج L&D'),
  text: bi('Each one says what to deliver: a standard, a material or a session, with a date.', 'كل واحد يقول ماذا تسلّم: معياراً أو مادة أو جلسة، بتاريخ.'),
}

const auditBrief: TourStep = {
  route: '/overview',
  target: '[data-tour="brief"]',
  title: bi('Your daily brief', 'موجزك اليومي'),
  text: bi(
    'Aggregates only: NPS per product, drift, public mentions, and the weekly sample still to read.',
    'مجاميع فقط: NPS لكل منتج، الابتعاد، الإشارات العامة، والعينة الأسبوعية المتبقية.',
  ),
}

const auditFeeds: TourStep = {
  route: '/settings/feeds',
  target: '[data-tour="feeds"]',
  title: bi('Data feeds', 'تغذيات البيانات'),
  text: bi(
    'Where every number comes from and whether it arrived today. Three CRM environments, separate databases.',
    'من أين يأتي كل رقم وهل وصل اليوم. ثلاث بيئات CRM بقواعد بيانات منفصلة.',
  ),
}

const auditSample: TourStep = {
  route: '/settings/weekly-sample',
  target: '[data-tour="sample"]',
  title: bi('The weekly sample', 'العينة الأسبوعية'),
  text: bi('Fifty outputs, right or wrong. A wrong becomes a test for the supervisor.', 'خمسون مخرجاً، صح أو خطأ. الخطأ يصبح اختباراً للسوبرفايزر.'),
}

/** v42.1 (F33): the prototype's fourth step for the Internal Audit and Marketing Lead, after the weekly sample (its `.main .card table` is the checks card here). */
const auditCampaigns: TourStep = {
  route: '/settings/campaign-audit',
  target: '[data-tour="campaign-audit"]',
  title: bi('Campaign audit', 'تدقيق الحملات'),
  text: bi(
    'Every campaign before it runs and after: the right people, projects and developers, channel and message, and the money. Five checks, then clear it or send it back.',
    'كل حملة قبل تشغيلها وبعده: الأشخاص والمشاريع والمطورون والقناة والرسالة والمال. خمسة فحوصات، ثم إجازة أو إعادة.',
  ),
}

// --- One path per role -----------------------------------------------------------------------------------------------------------

const cxPath = [...home, ...work, ...fix, ...loop, ...people, ...nums, end]
/** Environment manager, team lead, After-Sales lead: the prototype code builds home + work + fix (four steps) + people + end = 11. The KB and the delta say 10 (no trace step); the code is followed. */
const leadPath = [...home, ...work, ...fix, ...people, end]

/**
 * Every role's tour before the page check, in the order it is told. The mystery shopper has none (the prototype leaves it out).
 * Use `tourStepsFor(role)`: it drops the steps a role cannot open.
 */
export const tours: Partial<Record<RoleId, readonly TourStep[]>> = {
  cxmgr: cxPath,
  cxteam: cxPath,
  envmgmt: leadPath,
  teamlead: leadPath,
  aslead: leadPath,
  marketing: [...home, personas, ...people, ...nums, end],
  ld: [ldBrief, ldFix, end],
  auditmkt: [auditBrief, auditFeeds, auditSample, auditCampaigns, end],
  // HR specialist, HR manager and executive: Home and the end card
  hrspec: [...home, end],
  hrmgr: [...home, end],
  exec: [...home, end],
}

/**
 * The steps a role actually gets: a step whose page the role may not open is dropped, so nobody is sent somewhere they cannot go. If
 * only the closing card is left (the HR roles have no Home) it is shown alone. Empty for a role without a tour (the mystery shopper).
 */
export function tourStepsFor(role: RoleId): TourStep[] {
  return (tours[role] ?? []).filter((s) => s.route === null || canOpenPage(role, s.route))
}

/** Whether the role has a tour at all (the replay button and the first-entry start depend on it). */
export function hasTour(role: RoleId): boolean {
  return tourStepsFor(role).length > 0
}
