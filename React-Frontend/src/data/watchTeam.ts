import type { Bi } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/**
 * "Watch the AI team work" (v42 F31): one WhatsApp message walked through nine steps with the clock. Every string below is verbatim from the
 * prototype's `watchSteps()` block (the "Watch the AI team work" section of `PSI CX Portal.html`), English and Arabic. Nothing here is read from
 * the data: it is the path every event walks, shown on one sample message. The only substitutions are the customer's label, the masked mobile
 * and the environment name, which the page fills from the first sample person.
 */

/** The page's path under Settings and reference, listed right after "How the portal works (the AI team)". */
export const WATCH_PATH = '/settings/ai-team'

/** Play advances one step every 750 ms: nine steps, eight advances, 6 seconds from the first step to the last. */
export const WATCH_STEP_MS = 750

/** The agent a step belongs to: an agent number (1 to 10), the CX Supervisor, or `null` for the two "Source" steps (the message arrives; what people see). */
export type WatchAgent = number | 'supervisor' | null

export interface WatchStep {
  id: string
  /** The clock of the sample message, `hh:mm:ss`. */
  time: string
  agent: WatchAgent
  title: Bi
  /** Shown only once the step is reached. */
  description: Bi
  /** The output line, shown after the arrow (`→ ...`) once the step is reached. */
  output: Bi
  /** The supervisor's tick: this output was checked (`chk` in the prototype). */
  supervisorTick: boolean
}

/** What the page fills into the sample message. `mobile` arrives already masked for the role; `name` is the person's name or reference, as the role may see it. */
export interface WatchCustomer {
  name: Bi
  mobile: string
  env: Bi
}

/** The nine steps for one customer. The clock times are the prototype's. */
export function buildWatchSteps(c: WatchCustomer): WatchStep[] {
  return [
    {
      id: 'arrives',
      time: '09:14:02',
      agent: null,
      title: b('A WhatsApp message arrives', 'تصل رسالة واتساب'),
      description: b(
        `From ${c.mobile} on the official number: "Still waiting for the callback you promised on Tuesday."`,
        `من ${c.mobile} على الرقم الرسمي: "لسه بستنى الاتصال اللي وعدتوني فيه يوم الثلاثاء."`,
      ),
      output: b('Raw event, no person yet', 'حدث خام، بلا شخص بعد'),
      supervisorTick: false,
    },
    {
      id: 'match',
      time: '09:14:03',
      agent: 1,
      title: b('Agent 1 matches it to one person', 'الوكيل 1 يطابقها على شخص واحد'),
      description: b(
        `Mobile matches the CRM contact and the lead record (two keys, so it merges without review). Environment: ${c.env.en}. Language: Arabic. 7 earlier events on this person.`,
        `الجوال يطابق جهة اتصال CRM وسجل العميل المحتمل (مفتاحان، فيُدمج بلا مراجعة). البيئة: ${c.env.ar}. اللغة: عربية. 7 أحداث سابقة لهذا الشخص.`,
      ),
      output: b(`EV-9001 · ${c.name.en}`, `EV-9001 · ${c.name.ar}`),
      supervisorTick: true,
    },
    {
      id: 'classify',
      time: '09:14:04',
      agent: 2,
      title: b('Agent 2 classifies it', 'الوكيل 2 يصنّفها'),
      description: b(
        'Category: promise not kept. Reason code: callback. Evidence: the quoted sentence, and a CRM activity on Tuesday "callback promised 17:00" with no call after it. Confidence 92%.',
        'الفئة: وعد لم يُنفَّذ. رمز السبب: معاودة اتصال. الدليل: الجملة المقتبسة، ونشاط CRM يوم الثلاثاء "وعد بمعاودة اتصال 17:00" بلا مكالمة بعده. الثقة 92%.',
      ),
      output: b('Promise not kept · medium · agent id attached', 'وعد لم يُنفَّذ · متوسط · رقم الموظف مرفق'),
      supervisorTick: true,
    },
    {
      id: 'signal',
      time: '09:14:04',
      agent: 3,
      title: b('Agent 3 counts it as a signal', 'الوكيل 3 يعدّها إشارة'),
      description: b(
        `Same issue in ${c.env.en} in the last 30 days: 4 → now 5. Threshold is 5 on a sample of at least 10 (sample: 14). The line is crossed: a pattern opens.`,
        `المشكلة نفسها في ${c.env.ar} خلال 30 يوماً: 4 ← الآن 5. الحد 5 على عينة لا تقل عن 10 (العينة: 14). تجاوز الحد: يُفتح نمط.`,
      ),
      output: b('SG-9001 → PT-9001', 'SG-9001 → PT-9001'),
      supervisorTick: true,
    },
    {
      id: 'fix',
      time: '09:14:06',
      agent: 5,
      title: b('Agent 5 proposes one fix and routes it', 'الوكيل 5 يقترح حلاً واحداً ويوجّهه'),
      description: b(
        'Looks at closed fixes for this kind: "callback promises logged with a due time and a 16:00 daily sweep by the team lead" recovered the customer in 9 of 13 similar cases. Kind: process. From the matrix (PSI Real Estate): receiver Sales operations lead, informed Head of the environment, respond 4 h, resolve 45 h. Approval window: 5 working days. It is a suggestion; nothing starts without a yes.',
        'ينظر في الحلول المغلقة لهذا النوع: "تسجيل وعود معاودة الاتصال بموعد ومسح يومي 16:00 من قائد الفريق" أعاد الزبون في 9 من 13 حالة مشابهة. النوع: عملية. من المصفوفة (PSI العقارية): المستلم قائد عمليات المبيعات، المُبلَّغ رئيس البيئة، الرد 4 ساعات، الحل 45. نافذة الاعتماد: 5 أيام عمل. اقتراح فقط؛ لا يبدأ شيء بلا موافقة.',
      ),
      output: b('CA-9001 · proposed', 'CA-9001 · مقترح'),
      supervisorTick: true,
    },
    {
      id: 'supervisor',
      time: '09:14:06',
      agent: 'supervisor',
      title: b('The supervisor checks before anything moves', 'السوبرفايزر يفحص قبل أن يتحرك شيء'),
      description: b(
        'Six checks, in code, on every output above: schema complete; counts and windows recomputed (5 of 14, 30 days: same); access (no conversation text leaves CX, no name on the fix); evidence (a second model ties each claim to the quote and the CRM activity); Arabic and English say the same; risk gate (not legal, not critical, so no hand to a person). Result: pass. Had one failed, the output goes back once naming the check, then to a person.',
        'ست فحوصات، بالكود، على كل مخرج أعلاه: البنية مكتملة؛ الأعداد والنوافذ أُعيد حسابها (5 من 14، 30 يوماً: نفسها)؛ الصلاحيات (لا نص محادثة يغادر CX، لا اسم على الحل)؛ الدليل (نموذج ثانٍ يربط كل ادعاء بالاقتباس ونشاط CRM)؛ العربية والإنجليزية تقولان الشيء نفسه؛ بوابة المخاطر (ليس قانونياً ولا حرجاً، فلا يُحال لشخص). النتيجة: نجاح. لو فشل فحص، يعود المخرج مرة واحدة باسم الفحص، ثم إلى شخص.',
      ),
      output: b('6 of 6 passed', '6 من 6'),
      supervisorTick: false,
    },
    {
      id: 'call-list',
      time: '09:14:07',
      agent: 8,
      title: b('Agent 8 puts the person on the call list', 'الوكيل 8 يضع الشخص في قائمة الاتصال'),
      description: b(
        'A complaint counts as a detractor event. Severity medium (not VIP, no legal word). Brief written from the timeline: the Tuesday promise, the earlier slow reply, the two channels used. Assigned to the CX team, due in 2 working days, calling hours 09:00 to 18:00.',
        'الشكوى تُعدّ حدث زبون غير راضٍ. الشدة متوسطة (ليس VIP، لا كلمة قانونية). الملخص مكتوب من الخط الزمني: وعد الثلاثاء، الرد البطيء السابق، القناتان المستخدمتان. أُسند لفريق CX، خلال يومي عمل، ساعات الاتصال 09:00 إلى 18:00.',
      ),
      output: b('CL-9001 · to call', 'CL-9001 · للاتصال'),
      supervisorTick: true,
    },
    {
      id: 'survey',
      time: '09:14:07',
      agent: 10,
      title: b('Agent 10 decides not to survey', 'الوكيل 10 يقرر عدم إرسال استبيان'),
      description: b(
        'No instrument fires: the person is inside the 30-day CSAT cap and a complaint is being handled by a human. Logged as "skipped: in cap, complaint open".',
        'لا أداة تُرسل: الشخص داخل سقف الـ30 يوماً لـ CSAT وشكواه بيد إنسان. سُجّل: "تخطٍّ: داخل السقف، شكوى مفتوحة".',
      ),
      output: b('skipped, reason logged', 'تخطٍّ، السبب مسجّل'),
      supervisorTick: false,
    },
    {
      id: 'people-see',
      time: '09:14:08',
      agent: null,
      title: b('What people see', 'ما يراه الناس'),
      description: b(
        `CX manager inbox: "Approve, change, reject or investigate: callback promises · 5 working days left". Environment manager inbox: the same fix, read only until approved. CX team inbox: "Call ${c.name.en} · 2 working days". Tomorrow 07:00, Agent 9 writes the brief line: "5 promise-not-kept signals in ${c.env.en}, 1 fix waiting for a yes". Every id above is on the Trace card of each record.`,
        `صندوق مدير CX: "اعتمد أو عدّل أو ارفض أو حقّق: وعود معاودة الاتصال · 5 أيام عمل متبقية". صندوق مدير البيئة: الحل نفسه، للقراءة حتى الاعتماد. صندوق فريق CX: "اتصل بـ ${c.name.ar} · يوما عمل". غداً 07:00 يكتب الوكيل 9 سطر الموجز: "5 إشارات وعد لم يُنفَّذ في ${c.env.ar}، حل واحد ينتظر موافقة". كل رقم أعلاه على بطاقة الأثر في كل سجل.`,
      ),
      output: b("6 seconds from message to inbox; the decision is a person's", '6 ثوانٍ من الرسالة إلى الصندوق؛ والقرار لإنسان'),
      supervisorTick: false,
    },
  ]
}

/**
 * The mobile of the sample message, masked. Roles that may see names get the prototype's mask (country code, the first digit, three dots and
 * the last two digits: `+9715•••78`); a role that may not see a person's mobile (the Internal Audit and Marketing Lead) gets the country code only.
 * The mask is [Proposed] for that role: the prototype masks for everyone.
 */
export function maskMobile(mobile: string | undefined, mayShowDigits: boolean): string {
  const m = (mobile ?? '').replace(/\s+/g, '')
  if (m.length < 8) return '+9715•••'
  return mayShowDigits ? `${m.slice(0, 5)}•••${m.slice(-2)}` : `${m.slice(0, 4)}•••••••`
}

/** Page copy: the prototype's strings (title, intro, controls, the "this week" block and the "what you will not see" card). */
export const WATCH_COPY = {
  title: b('Watch the AI team work', 'شاهد فريق الذكاء يعمل'),
  intro: b(
    "One real message, step by step, from the moment it arrives to the moment it sits in someone's inbox. Nothing here is a mock-up of a screen; it is the path every event walks. Sample data.",
    'رسالة واحدة، خطوة خطوة، من لحظة وصولها حتى تستقر في صندوق أحدهم. لا شيء هنا تصميم شاشة؛ هذا المسار الذي يسلكه كل حدث. بيانات تجريبية.',
  ),
  play: b('Play (6 seconds)', 'شغّل (6 ثوانٍ)'),
  next: b('Next step', 'الخطوة التالية'),
  reset: b('Reset', 'إعادة'),
  step: b('Step', 'خطوة'),
  source: b('Source', 'المصدر'),
  supervisorTick: b('supervisor', 'السوبرفايزر'),
  weekHeading: b('This week, by the same team', 'هذا الأسبوع، من الفريق نفسه'),
  sample: b('sample', 'عينة'),
  weekHint: b(
    "What the ten agents did on the sample data; the supervisor counted every output. On live data these are the first numbers Shadow mode reports, against the CX team's manual work.",
    'ما فعله الوكلاء العشرة على البيانات التجريبية؛ السوبرفايزر عدّ كل مخرج. على البيانات الحية هذه أول أرقام يبلّغها وضع Shadow مقابل عمل فريق CX اليدوي.',
  ),
  notHeading: b('What you will not see here', 'ما لن تراه هنا'),
  notText: b(
    'The impact: hours saved, signals caught that a person would have missed, fixes that worked because they came a week earlier. Those numbers exist only after two weeks of Shadow on real data, where every agent suggestion is compared with what the team did by hand. Agreement of 9 in 10 is the gate to Limited; a critical miss in the weekly sample blocks Live. Any impact figure shown before that would be invented.',
    'الأثر: الساعات الموفَّرة، الإشارات التي التقطها الوكيل وكان إنسان سيفوّتها، الحلول التي نجحت لأنها جاءت قبل أسبوع. هذه الأرقام لا توجد إلا بعد أسبوعين من Shadow على بيانات حقيقية، حيث يُقارن كل اقتراح بما فعله الفريق يدوياً. اتفاق 9 من 10 هو بوابة Limited؛ وخطأ حرج في العينة الأسبوعية يمنع Live. أي رقم أثر يُعرض قبل ذلك مختلق.',
  ),
}

/** The eight counters under the replay, in the prototype's order. */
export type WatchCounterId = 'events' | 'signals' | 'patterns' | 'fixes' | 'waiting' | 'sentBack' | 'handedOver' | 'briefs'

export const WATCH_COUNTER_LABELS: Record<WatchCounterId, Bi> = {
  events: b('Events read', 'أحداث قُرئت'),
  signals: b('Signals counted', 'إشارات عُدّت'),
  patterns: b('Patterns over the line', 'أنماط تجاوزت الحد'),
  fixes: b('Fixes proposed', 'حلول مقترحة'),
  waiting: b('Waiting for a yes', 'تنتظر موافقة'),
  sentBack: b('Sent back by the supervisor', 'أعادها السوبرفايزر'),
  handedOver: b('Handed to a person', 'أُحيلت لشخص'),
  briefs: b('Briefs written', 'ملخصات كُتبت'),
}

