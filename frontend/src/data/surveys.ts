import type { Campaign, Survey } from '../types'

// The survey list is the exact table from Programme KB section 7.
export const SURVEYS: Survey[] = [
  {
    id: 'sv_re_nps',
    name: { en: 'NPS for customers who purchased', ar: 'مؤشر NPS للعملاء الذين أتموا الشراء' },
    product: 're',
    questions: [
      { id: 'q1', type: 'nps', entityTag: 'agent', text: { en: 'How likely are you to recommend PSI Real Estate to a friend or colleague?', ar: 'ما مدى احتمال أن توصي بـ بي إس آي العقارية لصديق أو زميل؟' } },
      { id: 'q2', type: 'open', text: { en: "What's the main reason for your score?", ar: 'ما السبب الرئيسي لتقييمك؟' } },
      { id: 'q3', type: 'rating', entityTag: 'agent', text: { en: 'How professional and clear was your sales agent?', ar: 'ما مدى احترافية ووضوح وكيل المبيعات؟' } },
      { id: 'q4', type: 'yesno', text: { en: 'Would you buy from PSI again or refer someone?', ar: 'هل ستشتري من بي إس آي مجدداً أو ترشّحها لأحد؟' } },
    ],
  },
  {
    id: 'sv_re_exit',
    name: { en: 'Exit survey for customers who did not continue', ar: 'استبيان خروج للعملاء الذين لم يكملوا' },
    product: 're',
    questions: [
      { id: 'q1', type: 'choice', text: { en: 'What is the main reason you did not continue?', ar: 'ما السبب الرئيسي لعدم الاستمرار؟' }, options: [{ en: 'Price', ar: 'السعر' }, { en: 'Location', ar: 'الموقع' }, { en: 'Timing', ar: 'التوقيت' }, { en: 'Chose another developer', ar: 'اختار مطوراً آخر' }, { en: 'Other', ar: 'أخرى' }] },
      { id: 'q2', type: 'rating', entityTag: 'agent', text: { en: 'How would you rate the agent who handled your enquiry?', ar: 'كيف تقيّم الوكيل الذي تعامل مع استفسارك؟' } },
      { id: 'q3', type: 'open', text: { en: 'Anything we could have done differently?', ar: 'هل كان بإمكاننا فعل شيء مختلف؟' } },
    ],
  },
  {
    id: 'sv_af_ready',
    name: { en: 'After-Sales: ready (handed over)', ar: 'ما بعد البيع: جاهزة (تم التسليم)' },
    product: 'af',
    questions: [
      { id: 'q1', type: 'yesno', text: { en: 'Was your unit handed over on time?', ar: 'هل تم تسليم وحدتك في الوقت المحدد؟' } },
      { id: 'q2', type: 'rating', text: { en: 'How do you rate the build quality and finishing?', ar: 'كيف تقيّم جودة البناء والتشطيب؟' } },
      { id: 'q3', type: 'rating', entityTag: 'agent', text: { en: 'How well was snagging handled?', ar: 'كيف تمت معالجة ملاحظات التشطيب؟' } },
      { id: 'q4', type: 'nps', text: { en: 'How likely are you to invest again or refer PSI?', ar: 'ما مدى احتمال استثمارك مجدداً أو ترشيح بي إس آي؟' } },
      { id: 'q5', type: 'open', text: { en: "What's the main reason for your score?", ar: 'ما السبب الرئيسي لتقييمك؟' } },
    ],
  },
  {
    id: 'sv_af_offplan',
    name: { en: 'After-Sales: under development (off-plan)', ar: 'ما بعد البيع: قيد الإنشاء (على الخارطة)' },
    product: 'af',
    questions: [
      { id: 'q1', type: 'rating', text: { en: 'How clear were the construction updates?', ar: 'ما مدى وضوح تحديثات البناء؟' } },
      { id: 'q2', type: 'rating', text: { en: 'How clear was the payment plan?', ar: 'ما مدى وضوح خطة الدفع؟' } },
      { id: 'q3', type: 'yesno', text: { en: 'Do you know who to contact with questions?', ar: 'هل تعرف جهة الاتصال في حال وجود أسئلة؟' } },
      { id: 'q4', type: 'rating', text: { en: 'How confident are you in on-time delivery?', ar: 'ما مدى ثقتك بالتسليم في الموعد؟' } },
      { id: 'q5', type: 'nps', text: { en: 'How likely are you to invest again or refer PSI?', ar: 'ما مدى احتمال استثمارك مجدداً أو ترشيح بي إس آي؟' } },
    ],
  },
  {
    id: 'sv_af_rental',
    name: { en: 'After-Sales: rental', ar: 'ما بعد البيع: إيجار' },
    product: 'af',
    questions: [
      { id: 'q1', type: 'rating', text: { en: 'How was the leasing process?', ar: 'كيف كانت عملية التأجير؟' } },
      { id: 'q2', type: 'rating', text: { en: 'How was the move-in condition of the unit?', ar: 'كيف كانت حالة الوحدة عند الانتقال؟' } },
      { id: 'q3', type: 'rating', text: { en: 'How well is maintenance handled?', ar: 'كيف تُعالج طلبات الصيانة؟' } },
      { id: 'q4', type: 'yesno', text: { en: 'Do you intend to renew your lease?', ar: 'هل تنوي تجديد عقد الإيجار؟' } },
      { id: 'q5', type: 'nps', text: { en: 'How likely are you to invest again or refer PSI?', ar: 'ما مدى احتمال استثمارك مجدداً أو ترشيح بي إس آي؟' } },
    ],
  },
  {
    id: 'sv_cl_lead',
    name: { en: 'PSI Club: lead experience', ar: 'نادي بي إس آي: تجربة العميل المرشّح' },
    product: 'cl',
    questions: [
      { id: 'q1', type: 'rating', entityTag: 'agent', text: { en: 'How was your experience with the agent?', ar: 'كيف كانت تجربتك مع الوكيل؟' } },
      { id: 'q2', type: 'nps', text: { en: 'How likely are you to recommend PSI Real Estate?', ar: 'ما مدى احتمال ترشيحك لبي إس آي العقارية؟' } },
    ],
  },
  {
    id: 'sv_cl_member',
    name: { en: 'PSI Club: member (VIP) experience', ar: 'نادي بي إس آي: تجربة العضو المميز' },
    product: 'cl',
    questions: [
      { id: 'q1', type: 'rating', entityTag: 'agent', text: { en: 'How did the agent treat the lead you nominated?', ar: 'كيف تعامل الوكيل مع العميل الذي رشّحته؟' } },
      { id: 'q2', type: 'open', text: { en: 'Any feedback on the nomination process?', ar: 'هل لديك ملاحظات حول عملية الترشيح؟' } },
    ],
  },
  {
    id: 'sv_to_trip',
    name: { en: 'Tour Estate: overall trip review', ar: 'تور إستيت: تقييم الرحلة بشكل عام' },
    product: 'to',
    questions: [
      { id: 'q1', type: 'rating', entityTag: 'guide', text: { en: 'How was your guide?', ar: 'كيف كان مرشدك؟' } },
      { id: 'q2', type: 'rating', entityTag: 'driver', text: { en: 'How was your driver?', ar: 'كيف كان سائقك؟' } },
      { id: 'q3', type: 'nps', text: { en: 'How likely are you to recommend this trip?', ar: 'ما مدى احتمال ترشيحك لهذه الرحلة؟' } },
    ],
  },
  {
    id: 'sv_to_stop',
    name: { en: 'Tour Estate: stop or activity review', ar: 'تور إستيت: تقييم محطة أو نشاط' },
    product: 'to',
    questions: [
      { id: 'q1', type: 'rating', text: { en: 'How was this stop or activity?', ar: 'كيف كانت هذه المحطة أو النشاط؟' } },
      { id: 'q2', type: 'open', text: { en: 'Anything that could be improved?', ar: 'هل هناك ما يمكن تحسينه؟' } },
    ],
  },
  {
    id: 'sv_ev_post',
    name: { en: 'PSI Events: post-event review', ar: 'فعاليات بي إس آي: تقييم ما بعد الفعالية' },
    product: 'ev',
    questions: [
      { id: 'q1', type: 'rating', entityTag: 'venue', text: { en: 'How was the venue?', ar: 'كيف كان مكان الفعالية؟' } },
      { id: 'q2', type: 'rating', text: { en: 'How was check-in and registration?', ar: 'كيف كان التسجيل والدخول؟' } },
      { id: 'q3', type: 'nps', text: { en: 'How likely are you to attend another PSI event?', ar: 'ما مدى احتمال حضورك فعالية أخرى لبي إس آي؟' } },
    ],
  },
]

export function survey(id: string): Survey | undefined {
  return SURVEYS.find((s) => s.id === id)
}

// Example campaigns from Programme KB section 7: "Batch A (customers who
// purchased) gets an NPS survey; Batch B (customers who did not continue)
// gets an exit survey."
export const CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_re_quarterly',
    name: { en: 'Real Estate quarterly voice of customer', ar: 'صوت العميل الفصلي للعقارات' },
    product: 're',
    batches: [
      { id: 'batch_a', name: { en: 'Batch A: purchased', ar: 'الدفعة أ: أتموا الشراء' }, audienceSize: 420, surveyId: 'sv_re_nps', deliveryChannel: 'wa_link', status: 'running', responseRate: 61 },
      { id: 'batch_b', name: { en: 'Batch B: did not continue', ar: 'الدفعة ب: لم يكملوا' }, audienceSize: 140, surveyId: 'sv_re_exit', deliveryChannel: 'sms', status: 'running', responseRate: 38 },
    ],
  },
  {
    id: 'camp_af_monthly',
    name: { en: 'After-Sales monthly calls', ar: 'مكالمات ما بعد البيع الشهرية' },
    product: 'af',
    batches: [
      { id: 'batch_c', name: { en: 'Ready units', ar: 'الوحدات الجاهزة' }, audienceSize: 260, surveyId: 'sv_af_ready', deliveryChannel: null, status: 'running', responseRate: 72 },
      { id: 'batch_d', name: { en: 'Off-plan units', ar: 'الوحدات على الخارطة' }, audienceSize: 190, surveyId: 'sv_af_offplan', deliveryChannel: null, status: 'running', responseRate: 65 },
      { id: 'batch_e', name: { en: 'Rental units', ar: 'الوحدات المؤجرة' }, audienceSize: 90, surveyId: 'sv_af_rental', deliveryChannel: null, status: 'scheduled', responseRate: 0 },
    ],
  },
]
