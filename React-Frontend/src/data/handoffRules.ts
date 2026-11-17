import type { Bi } from '../types'

/** Modules KB §6 "Hand-offs": the hand-off rules by signal type. Transcribed
 * from the v38 prototype export (`HO_RULE`), titles only, no names. */
export interface HandoffRule {
  signalType: Bi
  goesTo: Bi
}

export const HANDOFF_RULES: HandoffRule[] = [
  {
    signalType: { en: 'Lead asked not to be called', ar: 'عميل طلب عدم الاتصال به' },
    goesTo: { en: 'CRM do-not-call flag, same day', ar: 'علامة عدم الاتصال في CRM، نفس اليوم' },
  },
  {
    signalType: { en: 'Detractor follow-up', ar: 'متابعة منتقد' },
    goesTo: { en: 'Recovery call by the product team lead within 2 working days', ar: 'مكالمة استرداد من مسؤول فريق المنتج خلال يومي عمل' },
  },
  {
    signalType: { en: 'Agent conduct', ar: 'سلوك الموظف' },
    goesTo: { en: 'Severe only: direct manager informed the same day; otherwise a signal', ar: 'الشديدة فقط: يُبلَّغ المدير المباشر في نفس اليوم؛ غير ذلك إشارة' },
  },
  {
    signalType: { en: 'Customer given wrong information', ar: 'العميل حصل على معلومة خاطئة' },
    goesTo: { en: 'Direct manager corrects the customer the same day; the pattern goes to L&D', ar: 'يصحح المدير المباشر للعميل في نفس اليوم؛ والنمط يذهب إلى التعلم والتطوير' },
  },
]
