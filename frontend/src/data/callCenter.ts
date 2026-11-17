// Sample figures for the CX-only Call Center & IVR view (Modules KB section
// 13 / Programme KB section 18). QA metrics (evaluator accuracy, persona,
// cost per call) are explicitly out of scope for this portal.
export const CALL_CENTER_OVERVIEW = {
  callsAnswered: 1248,
  firstCallToNewLeadMinutes: 6,
  callbacksKeptOnTime: 0.82,
  handedToPersonWhenAsked: 0.91,
  customerRating: 4.1, // out of 5
  incompleteJourneyShare: 0.26,
  followUpDoneShare: 0.648,
}

export const WHY_CUSTOMERS_CALL: { reason: { en: string; ar: string }; share: number }[] = [
  { reason: { en: 'Property enquiry (buy)', ar: 'استفسار عن عقار (شراء)' }, share: 0.38 },
  { reason: { en: 'Property enquiry (rent)', ar: 'استفسار عن عقار (إيجار)' }, share: 0.21 },
  { reason: { en: 'After-sales / maintenance', ar: 'ما بعد البيع / الصيانة' }, share: 0.19 },
  { reason: { en: 'Careers', ar: 'فرص عمل' }, share: 0.09 },
  { reason: { en: 'Feedback', ar: 'ملاحظات' }, share: 0.08 },
  { reason: { en: 'Other', ar: 'أخرى' }, share: 0.05 },
]

export const IVR_CHANNELS = [
  { kind: 'suggestions' as const, count: 34, routesTo: { en: 'Suggestions log, reviewed monthly', ar: 'سجل الاقتراحات، يُراجع شهرياً' } },
  { kind: 'comments' as const, count: 112, routesTo: { en: 'Voice of Customer', ar: 'صوت العميل' } },
  { kind: 'complaints' as const, count: 27, routesTo: { en: 'Incident with a clock and an owner', ar: 'حادثة بساعة ومالك' } },
]
