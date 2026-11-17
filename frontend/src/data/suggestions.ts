import type { Bi } from '../types'

export type SuggestionStatus = 'new' | 'under_review' | 'adopted' | 'not_now'
export interface Suggestion {
  id: string
  source: 'ivr' | 'survey' | 'staff'
  text: Bi
  status: SuggestionStatus
}

export const SUGGESTIONS: Suggestion[] = [
  { id: 'sg1', source: 'ivr', text: { en: 'Add a Friday half-day note to the IVR greeting', ar: 'إضافة ملاحظة دوام الجمعة النصفي لرسالة الرد الصوتي' }, status: 'new' },
  { id: 'sg2', source: 'survey', text: { en: 'Send the handover checklist to the customer in advance', ar: 'إرسال قائمة التسليم للعميل مسبقاً' }, status: 'under_review' },
  { id: 'sg3', source: 'staff', text: { en: 'Let shoppers attach a short voice note alongside photos', ar: 'السماح للمتسوقين بإرفاق ملاحظة صوتية قصيرة مع الصور' }, status: 'adopted' },
  { id: 'sg4', source: 'ivr', text: { en: 'Offer a callback option instead of holding', ar: 'توفير خيار المعاودة بدلاً من الانتظار' }, status: 'new' },
  { id: 'sg5', source: 'survey', text: { en: 'Ask Club members how they prefer to be contacted', ar: 'سؤال أعضاء النادي عن طريقة التواصل المفضلة' }, status: 'not_now' },
]
