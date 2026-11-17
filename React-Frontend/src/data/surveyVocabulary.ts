import type { LegacyCampaign, LegacySurvey } from '../types'

/** "Surveys (reference)" (Settings and reference §C) — the pre-omnichannel
 * branching-question builder is replaced in v38 by the triggers/caps model
 * (`pages/Surveys.tsx`); FR-9 keeps the builder's *question-type vocabulary*
 * (NPS/rating/choice/yes-no/open) as still-valid data. Ported, trimmed to a
 * representative sample rather than the old scaffold's full list, since this
 * page is reference-only, not a page anyone builds new surveys on. */
export const LEGACY_SURVEYS: LegacySurvey[] = [
  {
    id: 'sv_re_nps',
    name: { en: 'NPS for customers who purchased', ar: 'مؤشر NPS للعملاء الذين أتموا الشراء' },
    product: 're',
    questions: [
      { id: 'q1', type: 'nps', text: { en: 'How likely are you to recommend PSI Real Estate to a friend or colleague?', ar: 'ما مدى احتمال أن توصي بـ بي إس آي العقارية لصديق أو زميل؟' } },
      { id: 'q2', type: 'open', text: { en: "What's the main reason for your score?", ar: 'ما السبب الرئيسي لتقييمك؟' } },
      { id: 'q3', type: 'rating', text: { en: 'How professional and clear was your sales agent?', ar: 'ما مدى احترافية ووضوح وكيل المبيعات؟' } },
      { id: 'q4', type: 'yesno', text: { en: 'Would you buy from PSI again or refer someone?', ar: 'هل ستشتري من بي إس آي مجدداً أو ترشّحها لأحد؟' } },
    ],
  },
  {
    id: 'sv_re_exit',
    name: { en: 'Exit survey for customers who did not continue', ar: 'استبيان خروج للعملاء الذين لم يكملوا' },
    product: 're',
    questions: [
      { id: 'q1', type: 'choice', text: { en: 'What is the main reason you did not continue?', ar: 'ما السبب الرئيسي لعدم الاستمرار؟' } },
      { id: 'q2', type: 'rating', text: { en: 'How would you rate the agent who handled your enquiry?', ar: 'كيف تقيّم الوكيل الذي تعامل مع استفسارك؟' } },
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
      { id: 'q3', type: 'nps', text: { en: 'How likely are you to invest again or refer PSI?', ar: 'ما مدى احتمال استثمارك مجدداً أو ترشيح بي إس آي؟' } },
    ],
  },
]

export const LEGACY_CAMPAIGNS: LegacyCampaign[] = [
  {
    id: 'camp_re_quarterly',
    name: { en: 'Real Estate quarterly voice of customer', ar: 'صوت العميل الفصلي للعقارات' },
    product: 're',
    batches: [
      { id: 'batch_a', name: { en: 'Batch A: purchased', ar: 'الدفعة أ: أتموا الشراء' }, audienceSize: 420, surveyId: 'sv_re_nps', status: 'running', responseRate: 61 },
      { id: 'batch_b', name: { en: 'Batch B: did not continue', ar: 'الدفعة ب: لم يكملوا' }, audienceSize: 140, surveyId: 'sv_re_exit', status: 'running', responseRate: 38 },
    ],
  },
  {
    id: 'camp_af_monthly',
    name: { en: 'After-Sales monthly calls', ar: 'مكالمات ما بعد البيع الشهرية' },
    product: 'af',
    batches: [
      { id: 'batch_c', name: { en: 'Ready units', ar: 'الوحدات الجاهزة' }, audienceSize: 260, surveyId: 'sv_af_ready', status: 'running', responseRate: 72 },
    ],
  },
]

export const LEGACY_QUESTION_TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  nps: { en: 'NPS (0–10)', ar: 'مؤشر NPS (0–10)' },
  rating: { en: 'Rating (1–5)', ar: 'تقييم (1–5)' },
  choice: { en: 'Choice', ar: 'اختيار' },
  yesno: { en: 'Yes/No', ar: 'نعم/لا' },
  open: { en: 'Open text', ar: 'نص حر' },
}
