import type { Bi } from '@/types'

const SIGNAL_CATEGORY_LABEL: Record<string, Bi> = {
  slow_response: { en: 'Slow response', ar: 'بطء الاستجابة' },
  repeat_contact: { en: 'Repeat contact', ar: 'تواصل متكرر' },
  wrong_language: { en: 'Wrong language', ar: 'لغة خاطئة' },
  promise_not_kept: { en: 'Promise not kept', ar: 'وعد لم يُنفَّذ' },
  unapproved_discount: { en: 'Unapproved discount', ar: 'خصم غير معتمد' },
}

/** Signal category codes → bilingual label; unknown codes fall back to a readable form of the code. */
export function signalCategoryLabel(code: string): Bi {
  const readable = code.replace(/_/g, ' ')
  return SIGNAL_CATEGORY_LABEL[code] ?? { en: readable.charAt(0).toUpperCase() + readable.slice(1), ar: readable }
}
