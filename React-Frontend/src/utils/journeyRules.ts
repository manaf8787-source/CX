import type { Bi, ProblemFlag } from '../types'

export interface JourneyRuleDef {
  id: ProblemFlag
  label: Bi
  definition: Bi
  threshold: Bi
}

/**
 * FR-2.7 — the nine journey rules, each a named, independently defined
 * check with its own threshold (several of them Settings-configurable,
 * NFR-4), transcribed from Modules KB §4's table rather than folded into one
 * opaque "problems" blob. `detractor` is a tenth flag the domain model
 * carries (a survey-derived outcome, not a journey rule from this table) so
 * it is handled separately wherever this registry is displayed.
 */
export const JOURNEY_RULES: JourneyRuleDef[] = [
  {
    id: 'repeat_contact',
    label: { en: 'Repeat contact', ar: 'تواصل متكرر' },
    definition: { en: 'The same person comes back about the same matter.', ar: 'يعود الشخص نفسه بخصوص المسألة نفسها.' },
    threshold: { en: '48h: first answer failed · 7d: fix incomplete · 30d: problem came back', ar: '48 ساعة: فشل الرد الأول · 7 أيام: الحل غير مكتمل · 30 يوماً: عادت المشكلة' },
  },
  {
    id: 'forced_channel_switch',
    label: { en: 'Forced channel switch', ar: 'تبديل قناة قسري' },
    definition: { en: 'The customer moved to another channel after getting no reply on the first.', ar: 'انتقل العميل إلى قناة أخرى بعد عدم الرد على الأولى.' },
    threshold: { en: 'No reply on the original channel', ar: 'دون رد على القناة الأصلية' },
  },
  {
    id: 'promise_not_kept',
    label: { en: 'Promise not kept', ar: 'وعد لم يُنفَّذ' },
    definition: { en: 'A callback, document or date was promised and nothing went out before its due time.', ar: 'وُعد بمعاودة اتصال أو مستند أو موعد ولم يصل شيء قبل الاستحقاق.' },
    threshold: { en: 'Due time passed, nothing sent', ar: 'انقضى الموعد دون إرسال' },
  },
  {
    id: 'slow_reply',
    label: { en: 'Slow reply', ar: 'رد بطيء' },
    definition: { en: 'A WhatsApp or app chat reply took more than 24 hours.', ar: 'استغرق الرد على واتساب أو دردشة التطبيق أكثر من 24 ساعة.' },
    threshold: { en: '> 24h for a chat reply; minutes/hours for a click or expression of interest', ar: 'أكثر من 24 ساعة لرد الدردشة؛ دقائق/ساعات لنقرة أو اهتمام معبَّر عنه' },
  },
  {
    id: 'wrong_language',
    label: { en: 'Wrong language', ar: 'لغة خاطئة' },
    definition: { en: 'A reply in English to an Arabic message, or the reverse.', ar: 'رد بالإنجليزية على رسالة بالعربية، أو العكس.' },
    threshold: { en: 'Any mismatch', ar: 'أي عدم تطابق' },
  },
  {
    id: 'hand_off',
    label: { en: 'Hand-off', ar: 'تسليم بين فرق' },
    definition: { en: 'Passed between teams twice or more with no named owner.', ar: 'انتقل بين فريقين أو أكثر دون مالك محدد.' },
    threshold: { en: '2+ hand-offs, no named owner', ar: 'تسليمان أو أكثر دون مالك محدد' },
  },
  {
    id: 'ivr_complaint_not_logged',
    label: { en: 'IVR complaint not logged', ar: 'شكوى في الرد الآلي غير مسجّلة' },
    definition: { en: 'Pressed Complaints in the IVR and no CRM activity followed.', ar: 'ضغط خيار الشكاوى في الرد الآلي ولم يتبعه نشاط في نظام العملاء.' },
    threshold: { en: 'IVR complaint key pressed, no CRM record', ar: 'ضغط مفتاح الشكوى دون سجل في نظام العملاء' },
  },
  {
    id: 'unapproved_discount',
    label: { en: 'Unapproved discount', ar: 'خصم غير معتمد' },
    definition: { en: 'A discount promised in chat without approval, then withdrawn.', ar: 'وُعد بخصم عبر الدردشة دون اعتماد، ثم سُحب.' },
    threshold: { en: 'Promised then withdrawn', ar: 'وُعد به ثم سُحب' },
  },
  {
    id: 'silence',
    label: { en: 'Silence', ar: 'صمت' },
    definition: { en: 'No contact either way for 14 days (lead), 30 days (silent lead) or 12 months (owner/investor).', ar: 'لا تواصل من أي جهة لمدة 14 يوماً (عميل محتمل) أو 30 يوماً (عميل محتمل صامت) أو 12 شهراً (مالك/مستثمر).' },
    threshold: { en: '14d / 30d / 12mo, by record type', ar: '14 يوماً / 30 يوماً / 12 شهراً حسب نوع السجل' },
  },
]
