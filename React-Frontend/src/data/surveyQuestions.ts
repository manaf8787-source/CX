import type { Bi, ProductId, SurveyQuestionSet } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Survey questions page copy (v40 S10). */
export const SURVEY_QUESTIONS_COPY = {
  title: b('Survey questions', 'أسئلة الاستبيانات'),
  intro: b(
    'The exact questions per product and moment, in both languages, with a preview of what the customer receives. Each product has its own set; nothing is shared across companies.',
    'الأسئلة الدقيقة لكل منتج ولحظة، باللغتين، مع معاينة لما يصل الزبون. لكل منتج مجموعته؛ لا شيء مشترك بين الشركات.',
  ),
  previewCaption: b('As the customer sees it · WhatsApp or app', 'كما يراه الزبون · واتساب أو التطبيق'),
  greeting: b('Hello, this is PSI. One minute of your time:', 'مرحباً، معك PSI. دقيقة من وقتك:'),
  footer: b(
    "Sent by Agent 10 in the customer's language, on the channel they used, only if consent allows and the cap is not reached.",
    'يرسله الوكيل 10 بلغة الزبون، على القناة التي استخدمها، فقط إذا سمحت الموافقة ولم يُبلغ السقف.',
  ),
  /** The prototype shows an empty list for a product with no set; this is the empty state. */
  empty: b('No question set for this product yet.', 'لا توجد مجموعة أسئلة لهذا المنتج بعد.'),
  /** "{when} · {n} questions" */
  count: (n: number): Bi => b(`${n} questions`, `${n} أسئلة`),
  /** Wording of PSI Club, Tour Estate and PSI Events sets is not confirmed (these products are not launched). */
  proposedNote: b('Wording not confirmed by the product owners.', 'الصياغة لم يؤكدها مالكو المنتجات.'),
  /** The re-survey rule applies to every product but the prototype lists it under Real Estate only. */
  resurveyNote: b('The re-survey rule applies to every product with a close-the-loop call.', 'قاعدة إعادة الاستبيان تنطبق على كل منتج فيه مكالمة إغلاق حلقة.'),
}

const set = (product: ProductId, id: string, name: Bi, when: Bi, questions: Bi[], proposed = false): SurveyQuestionSet => ({ product, id, name, when, questions, ...(proposed ? { proposed } : {}) })

/**
 * The nine v40 sets, verbatim EN/AR (V40_DELTA Appendix S10), and the four PSI Wallet sets of v42.3 (V42_DELTA F35, docs/V42_WALLET.md).
 * Wording of PSI Club, Tour Estate and PSI Events (not launched, not confirmed) is [Proposed].
 */
export const SURVEY_QUESTION_SETS: SurveyQuestionSet[] = [
  set('re', 'nps', b('NPS after the signed deal', 'NPS بعد توقيع الصفقة'), b('Deal signed; once per 90 days', 'توقيع الصفقة؛ مرة كل 90 يوماً'), [
    b('How likely are you to recommend PSI to a friend or colleague? (0 to 10)', 'ما مدى احتمال أن توصي بـ PSI لصديق أو زميل؟ (0 إلى 10)'),
    b('What is the main reason for your score?', 'ما السبب الرئيسي لتقييمك؟'),
  ]),
  set('re', 'tx', b('CSAT + CES after a call, a viewing or an offer', 'CSAT + CES بعد مكالمة أو معاينة أو عرض'), b('Once per 30 days; viewing over offer over call', 'مرة كل 30 يوماً؛ المعاينة قبل العرض قبل المكالمة'), [
    b('How satisfied were you with your [viewing / call / offer] today? (1 to 5)', 'ما مدى رضاك عن [المعاينة / المكالمة / العرض] اليوم؟ (1 إلى 5)'),
    b('How easy was it to get what you needed? (1 to 5)', 'كم كان من السهل الحصول على ما تحتاجه؟ (1 إلى 5)'),
  ]),
  set('re', 'why', b('What stopped you?', 'ما الذي أوقفك؟'), b('14 days silent; once per enquiry', '14 يوماً صمت؛ مرة لكل استفسار'), [
    b(
      'We noticed you did not continue. What stopped you? (price or payment plan · nothing suitable · slow or no reply · bought or rented elsewhere · postponed · other)',
      'لاحظنا أنك لم تكمل. ما الذي أوقفك؟ (السعر أو خطة الدفع · لا شيء مناسب · رد بطيء أو لا رد · اشتريت أو استأجرت من غيرنا · أجّلت · أخرى)',
    ),
  ]),
  set('re', 're2', b('Re-survey after a resolved complaint', 'إعادة الاستبيان بعد حل شكوى'), b('7 to 14 days after resolution; exempt from caps', '7 إلى 14 يوماً بعد الحل؛ معفى من السقوف'), [
    b('The same question as the first survey, word for word', 'السؤال نفسه كما في الاستبيان الأول، حرفياً'),
  ]),
  set('af', 'nps', b('NPS after handover and after renewal', 'NPS بعد التسليم وبعد التجديد'), b('Handover done; renewal signed; once per 90 days', 'تم التسليم؛ وُقّع التجديد؛ مرة كل 90 يوماً'), [
    b('How likely are you to recommend PSI? (0 to 10)', 'ما مدى احتمال أن توصي بـ PSI؟ (0 إلى 10)'),
    b('What is the main reason?', 'ما السبب الرئيسي؟'),
  ]),
  set('af', 'ces', b('CES after a closed ticket', 'CES بعد إغلاق تذكرة'), b('Maintenance or complaint ticket closed', 'أُغلقت تذكرة صيانة أو شكوى'), [
    b('How easy was it to get your request handled? (1 to 5)', 'كم كان من السهل معالجة طلبك؟ (1 إلى 5)'),
    b('Is the issue fully resolved? (yes / no)', 'هل حُلّت المشكلة بالكامل؟ (نعم / لا)'),
  ]),
  set(
    'cl',
    'nps',
    b('Member NPS at the end of a nomination cycle', 'NPS للعضو في نهاية دورة الترشيح'),
    b('Nomination cycle closed', 'أُغلقت دورة الترشيح'),
    [
      b('How likely are you to recommend PSI Club to another investor? (0 to 10)', 'ما مدى احتمال أن توصي بنادي PSI لمستثمر آخر؟ (0 إلى 10)'),
      b('How was the follow-up on your nominated lead? (1 to 5)', 'كيف كانت متابعة العميل الذي رشّحته؟ (1 إلى 5)'),
    ],
    true,
  ),
  set(
    'to',
    'tour',
    b('End-of-tour survey', 'استبيان نهاية الجولة'),
    b('Completed tour only', 'جولة مكتملة فقط'),
    [
      b('The driver (1 to 5)', 'السائق (1 إلى 5)'),
      b('The guide (1 to 5)', 'المرشد (1 إلى 5)'),
      b('The ride (1 to 5)', 'الرحلة (1 إلى 5)'),
      b('The car (1 to 5)', 'السيارة (1 إلى 5)'),
      b('Cleanliness (1 to 5)', 'النظافة (1 إلى 5)'),
      b('How likely are you to recommend Tour Estate? (0 to 10)', 'ما مدى احتمال أن توصي بـ Tour Estate؟ (0 إلى 10)'),
    ],
    true,
  ),
  set(
    'ev',
    'qr',
    b('Booth rating (QR) and staff evaluation', 'تقييم الجناح (QR) وتقييم الموظفين'),
    b('At the event; no NPS', 'في الفعالية؛ لا NPS'),
    [
      b('Rate your visit to our stand (1 to 5)', 'قيّم زيارتك لجناحنا (1 إلى 5)'),
      b('Internal: staff evaluation form, filled by the event lead', 'داخلي: نموذج تقييم الموظفين يعبّئه مسؤول الفعالية'),
    ],
    true,
  ),
  // v42.3 and v42.4 (F35) · PSI Wallet: one question per touchpoint, verbatim from the prototype. One rating and one optional comment; the
  // third line is the follow-up a low score opens (CES 4 or less, CSAT 3 or less). Decided after the Wallet review of 19 Nov (Programme KB
  // section 48), so the wording is not [Proposed] although the product is not launched. CES is on 1 to 7 here, 1 to 5 in the other products.
  set('wl', 'setup', b('CES after the wallet is created', 'CES بعد إنشاء المحفظة'), b('Screen 12 to 13, once. Onboarding is a seven-step task: effort matters, satisfaction tells less', 'الشاشة 12 إلى 13، مرة واحدة. الإعداد مهمة من سبع خطوات: الجهد هو المهم، والرضا يقول أقل'), [
    b('The wallet was easy to set up. (1 strongly disagree to 7 strongly agree)', 'كان إعداد المحفظة سهلاً. (1 لا أوافق بشدة إلى 7 أوافق بشدة)'),
    b('Optional: anything you would like to add?', 'اختياري: هل تود إضافة شيء؟'),
    b('If 4 or less: What went wrong? (short text)', 'إذا كانت 4 أو أقل: ما الذي حدث؟ (نص قصير)'),
  ]),
  set('wl', 'call', b('CSAT after the call with the advisor', 'CSAT بعد المكالمة مع المستشار'), b("Fires when the advisor marks the call done in the CRM (not on the app's Request a call button), within 2 hours. A human interaction with a clear start and end", 'يُرسل عندما يعلّم المستشار المكالمة منجزة في CRM (لا عند زر طلب المكالمة في التطبيق)، خلال ساعتين. تفاعل بشري له بداية ونهاية واضحتان'), [
    b('How satisfied were you with your call with your advisor? (1 to 5)', 'ما مدى رضاك عن مكالمتك مع مستشارك؟ (1 إلى 5)'),
    b('Optional: anything you would like to add?', 'اختياري: هل تود إضافة شيء؟'),
    b('If 3 or less: What went wrong? (short text), and the advisor team is notified', 'إذا كانت 3 أو أقل: ما الذي حدث؟ (نص قصير)، ويُبلَّغ فريق المستشارين'),
  ]),
  set('wl', 'addp', b('CES after a property is added', 'CES بعد إضافة عقار'), b("Screen 51 (what's next), once per add; the answer is tagged single or bulk and carries the number of properties", 'الشاشة 51 (ما التالي)، مرة لكل إضافة؛ تُوسم الإجابة فردي أو جماعي وتحمل عدد العقارات'), [
    b('Adding my property was easy. (1 strongly disagree to 7 strongly agree)', 'كانت إضافة عقاري سهلة. (1 لا أوافق بشدة إلى 7 أوافق بشدة)'),
    b('Optional: anything you would like to add?', 'اختياري: هل تود إضافة شيء؟'),
    b('If 4 or less: What went wrong? (short text)', 'إذا كانت 4 أو أقل: ما الذي حدث؟ (نص قصير)'),
  ]),
  set('wl', 'nps', b('NPS on the Dashboard, 30 days after', 'NPS على لوحة المعلومات بعد 30 يوماً'), b('Screen 13 as a periodic prompt about 30 days after the wallet was created and only if it holds at least one property, then yearly. Never at a touchpoint; shares the 90-day cap with the Real Estate NPS', 'الشاشة 13 كتنبيه دوري بعد نحو 30 يوماً من إنشاء المحفظة وفقط إذا كانت تحوي عقاراً واحداً على الأقل، ثم سنوياً. لا عند نقطة تماس أبداً؛ تشترك في سقف الـ90 يوماً مع NPS العقارات'), [
    b('How likely are you to recommend the PSI Wallet to another investor? (0 to 10)', 'ما مدى احتمال أن توصي بمحفظة PSI لمستثمر آخر؟ (0 إلى 10)'),
    b('What is the main reason for your score?', 'ما السبب الرئيسي لدرجتك؟'),
  ]),
]

/** Sets of one product, in display order. A product with none returns an empty list: show the empty state (since v42.3 every product has a set). */
export function questionSetsFor(product: ProductId, sets: SurveyQuestionSet[] = SURVEY_QUESTION_SETS): SurveyQuestionSet[] {
  return sets.filter((s) => s.product === product)
}
