import type { Bi, CorrectiveActionKind } from '@/types'

/**
 * The problem behind a fix, in plain words (24 Nov, owner: "I don't understand the problem, no details"). Per signal category: what
 * customers went through, three sample customer lines, the likely cause, and the standard the fix restores. Sample wording; in the real
 * platform the lines are Agent 2's summaries of the actual conversations (no names).
 */
export interface ProblemCopy {
  headline: Bi
  experience: Bi
  quotes: Bi[]
  cause: Bi
  standard: Bi
}

const b = (en: string, ar: string): Bi => ({ en, ar })

export const PROBLEM: Record<string, ProblemCopy> = {
  slow_response: {
    headline: b('Customers are waiting too long for a reply', 'العملاء ينتظرون وقتاً طويلاً للحصول على رد'),
    experience: b(
      'Customers sent a question or a request and nobody answered within the reply time. Some waited days, and several chased us again before anyone replied.',
      'أرسل العملاء سؤالاً أو طلباً ولم يرد عليهم أحد ضمن وقت الرد. بعضهم انتظر أياماً، وعدد منهم لاحقنا مرة أخرى قبل أن يرد أحد.',
    ),
    quotes: [
      b('I sent my documents on Sunday and nobody has replied yet.', 'أرسلت أوراقي يوم الأحد ولم يرد أحد حتى الآن.'),
      b('This is the third message I send about the same unit.', 'هذه ثالث رسالة أرسلها بخصوص الوحدة نفسها.'),
      b('I am ready to pay but I cannot get an answer.', 'أنا جاهز للدفع لكن لا أحصل على إجابة.'),
    ],
    cause: b(
      'Messages pile up at peak times and there is no one watching the queue; nothing reminds the agent before the reply time runs out.',
      'تتراكم الرسائل في أوقات الذروة ولا أحد يراقب الطابور، ولا شيء يذكّر الوكيل قبل انتهاء وقت الرد.',
    ),
    standard: b('the reply-time standard (first reply within the agreed time)', 'معيار وقت الرد (أول رد ضمن الوقت المتفق عليه)'),
  },
  repeat_contact: {
    headline: b('Customers have to contact us again for the same issue', 'العملاء يضطرون للتواصل معنا مجدداً للمشكلة نفسها'),
    experience: b(
      'The case was marked as done, but the customer came back within days because the issue was not actually solved, or nobody told them what happened.',
      'أُغلقت الحالة، لكن العميل عاد خلال أيام لأن المشكلة لم تُحل فعلاً، أو لم يُخبره أحد بما حصل.',
    ),
    quotes: [
      b('I was told it was fixed, but the maintenance team never came.', 'قالوا لي إنها حُلّت، لكن فريق الصيانة لم يأتِ.'),
      b('Every time I call I have to explain everything from the start.', 'في كل مرة أتصل أضطر لشرح كل شيء من البداية.'),
      b('Still waiting for the refund you confirmed last week.', 'ما زلت أنتظر الاسترداد الذي أكدتموه الأسبوع الماضي.'),
    ],
    cause: b(
      'Cases are closed before the customer confirms, and the hand-over to the next team (maintenance, finance) is not followed up.',
      'تُغلق الحالات قبل أن يؤكد العميل، ولا تتم متابعة التسليم للفريق التالي (الصيانة، المالية).',
    ),
    standard: b(
      'solving the issue on the first contact and confirming with the customer before closing',
      'حل المشكلة من أول تواصل والتأكد مع العميل قبل الإغلاق',
    ),
  },
  wrong_language: {
    headline: b('Customers get replies in a language they did not use', 'العملاء يتلقون ردوداً بلغة لم يستخدموها'),
    experience: b(
      'The customer wrote in Arabic (or another language) and got the answer in English, or a mix, and had to ask again or gave up.',
      'كتب العميل بالعربية (أو لغة أخرى) وجاءه الرد بالإنجليزية أو بخليط، فاضطر للسؤال مرة أخرى أو توقف.',
    ),
    quotes: [
      b('I wrote in Arabic, please reply in Arabic.', 'كتبت بالعربي، أرجو الرد بالعربي.'),
      b('I did not understand the email you sent me.', 'لم أفهم الإيميل الذي أرسلتموه لي.'),
      b('Is there someone who speaks Russian?', 'هل يوجد أحد يتكلم الروسية؟'),
    ],
    cause: b(
      'Templates exist in English only, and conversations are not routed to an agent who speaks the customer’s language.',
      'القوالب موجودة بالإنجليزية فقط، والمحادثات لا تُحوّل لوكيل يتكلم لغة العميل.',
    ),
    standard: b('replying in the customer’s language', 'الرد بلغة العميل'),
  },
  promise_not_kept: {
    headline: b('We promise customers a callback and do not call', 'نعِد العملاء باتصال ولا نتصل'),
    experience: b(
      'An agent promised to call back (with a price, a viewing time, a document) and the call never came, so the customer had to chase us.',
      'وعد الوكيل بالاتصال مجدداً (بسعر أو موعد معاينة أو مستند) ولم يتم الاتصال، فاضطر العميل لملاحقتنا.',
    ),
    quotes: [
      b('He said he would call me back in an hour. That was two days ago.', 'قال إنه سيتصل بعد ساعة، وكان ذلك قبل يومين.'),
      b('I was promised the payment plan by email and never got it.', 'وُعدت بخطة الدفع على الإيميل ولم تصلني.'),
      b('Nobody confirmed my viewing, so I did not go.', 'لم يؤكد أحد موعد المعاينة فلم أذهب.'),
    ],
    cause: b(
      'Promises are made on the phone but not logged as a task in the CRM, so nothing reminds the agent.',
      'تُعطى الوعود على الهاتف لكن لا تُسجل كمهمة في الـCRM، فلا شيء يذكّر الوكيل.',
    ),
    standard: b('logging every promised callback as a task and keeping it', 'تسجيل كل اتصال موعود كمهمة والالتزام به'),
  },
  unapproved_discount: {
    headline: b('Agents offer discounts that were never approved', 'الوكلاء يعرضون خصومات لم تُعتمد'),
    experience: b(
      'A customer was offered a discount or a waiver, then told later it is not valid. The customer feels misled and the deal is at risk.',
      'عُرض على العميل خصم أو إعفاء، ثم قيل له لاحقاً إنه غير صالح. يشعر العميل بالتضليل والصفقة في خطر.',
    ),
    quotes: [
      b('Your agent gave me 5% off and now you say no.', 'وكيلكم أعطاني خصم 5% والآن تقولون لا.'),
      b('I signed because of the free service charge you promised.', 'وقّعت بسبب رسوم الخدمة المجانية التي وعدتم بها.'),
      b('Why does my contract show a different price?', 'لماذا يظهر في عقدي سعر مختلف؟'),
    ],
    cause: b(
      'The discount limits are not clear to the agents, and there is no quick approval step before an offer is made.',
      'حدود الخصم غير واضحة للوكلاء، ولا توجد خطوة موافقة سريعة قبل تقديم العرض.',
    ),
    standard: b('the discount approval rule', 'قاعدة الموافقة على الخصومات'),
  },
}

export function problemFor(category: string): ProblemCopy {
  const label = category.replace(/_/g, ' ')
  return (
    PROBLEM[category] ?? {
      headline: b(`Repeated problem: ${label}`, `مشكلة متكررة: ${label}`),
      experience: b('Several customers reported the same problem in a short time.', 'أبلغ عدة عملاء عن المشكلة نفسها خلال وقت قصير.'),
      quotes: [],
      cause: b('To be confirmed by the owner.', 'يؤكده المالك.'),
      standard: b('the agreed standard', 'المعيار المتفق عليه'),
    }
  )
}

/** The plain title of a fix: the problem, then where. */
export function fixTitle(category: string, team: string): Bi {
  const p = problemFor(category)
  return { en: `${p.headline.en} (${team})`, ar: `${p.headline.ar} (${team})` }
}

/** What the owner will actually do, by the kind of fix. */
export function fixPlan(kind: CorrectiveActionKind, category: string, team: string): Bi {
  const s = problemFor(category).standard
  switch (kind) {
    case 'training_gap':
      return b(
        `A short refresher session for ${team} on ${s.en}, with a one-page guide; every agent does a quick check afterwards.`,
        `جلسة تذكير قصيرة لفريق ${team} حول ${s.ar}، مع دليل من صفحة واحدة، ثم اختبار سريع لكل وكيل.`,
      )
    case 'employee':
      return b(
        `The direct manager talks with the agent concerned about ${s.en} and follows up over the next 60 days. A management note only, not a disciplinary case.`,
        `يتحدث المدير المباشر مع الوكيل المعني حول ${s.ar} ويتابع خلال 60 يوماً. ملاحظة إدارية فقط، وليست حالة تأديبية.`,
      )
    case 'service_behaviour':
      return b(
        `The team leader reminds ${team} of ${s.en}, and reviews 10 of their conversations every week for a month.`,
        `يذكّر قائد الفريق ${team} بـ${s.ar}، ويراجع 10 من محادثاتهم أسبوعياً لمدة شهر.`,
      )
    case 'process':
      return b(
        `Change the way of working so ${s.en} happens by default: a step and a reminder in the CRM, and a named person who watches it.`,
        `تغيير طريقة العمل بحيث يصبح ${s.ar} تلقائياً: خطوة وتذكير في الـCRM، وشخص محدد يراقبها.`,
      )
    case 'product_app':
      return b(
        `Product and IT change the app or the system so customers are not left in this situation (for example an automatic acknowledgement and status update).`,
        `يعدّل فريق المنتج والتقنية التطبيق أو النظام حتى لا يبقى العميل في هذا الموقف (مثلاً إشعار استلام تلقائي وتحديث للحالة).`,
      )
    case 'environment':
      return b(
        `The ${team} manager fixes the local cause (staffing at peak hours, the queue owner, the hand-over) and confirms ${s.en} is back.`,
        `يعالج مدير ${team} السبب المحلي (التغطية في أوقات الذروة، مسؤول الطابور، التسليم) ويؤكد عودة ${s.ar}.`,
      )
    case 'legal_privacy':
      return b(
        'Legal reviews what was said or offered and confirms the right wording and limits for the team.',
        'تراجع الإدارة القانونية ما قيل أو عُرض وتؤكد الصياغة والحدود الصحيحة للفريق.',
      )
    case 'marketing':
      return b(
        'Marketing corrects the campaign message that set the wrong expectation, and the Internal Audit and Marketing Lead checks it.',
        'يصحح التسويق رسالة الحملة التي خلقت توقعاً خاطئاً، ويتحقق منها مسؤول التدقيق الداخلي والتسويق.',
      )
  }
}
