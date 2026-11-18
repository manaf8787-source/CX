import type { Bi, SignalKind } from '@/types'

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

const SIGNAL_KIND_LABEL: Record<SignalKind, Bi> = {
  complaint: { en: 'Complaint', ar: 'شكوى' },
  low_score: { en: 'Low score', ar: 'تقييم منخفض' },
  breach: { en: 'Standard breach', ar: 'إخلال بمعيار' },
  public_mention: { en: 'Public mention', ar: 'إشارة عامة' },
  legal_privacy_safety: { en: 'Legal, privacy or safety', ar: 'قانوني أو خصوصية أو سلامة' },
}

/** What kind of signal it is, in words (the signal detail dialog and the signals table). */
export function signalKindLabel(kind: SignalKind): Bi {
  return SIGNAL_KIND_LABEL[kind]
}
