import type { Bi, CorrectiveActionKind } from '@/types'

/** KB §6 "Classification: the kind of problem decides who gets it" — the
 * eight kinds, what each looks like, and its path and receiver. The receiver
 * handles it their own way; the portal takes back only a status, and Agent 6
 * checks the result. Exact titles per product come from the escalation matrix. */
export const ACTION_KIND: Record<CorrectiveActionKind, { label: Bi; looksLike: Bi; path: Bi; comesBack: Bi }> = {
  employee: {
    label: { en: 'Employee', ar: 'موظف' },
    looksLike: { en: 'One staff member keeps appearing (attitude or speed, three times in 30 days)', ar: 'موظف واحد يتكرر ظهوره (السلوك أو السرعة، ثلاث مرات في 30 يوماً)' },
    path: { en: 'A management note to that agent’s direct manager only; never a case, never HR, never a name outside that line', ar: 'ملاحظة إدارية للمدير المباشر لذلك الموظف فقط؛ دون حالة أو موارد بشرية أو اسم خارج هذا الخط' },
    comesBack: { en: 'Note read and acted on (status only)', ar: 'قُرئت الملاحظة واتُّخذ إجراء (الحالة فقط)' },
  },
  service_behaviour: {
    label: { en: 'Service and behaviour', ar: 'الخدمة والسلوك' },
    looksLike: { en: 'A team’s way of working (late callbacks across an office)', ar: 'طريقة عمل فريق (معاودة اتصال متأخرة في مكتب كامل)' },
    path: { en: 'A fix for the team’s manager to approve; the head is informed', ar: 'إصلاح يعتمده مدير الفريق؛ ويُبلَّغ الرئيس' },
    comesBack: { en: 'Approved, in progress, done (status only)', ar: 'معتمد، قيد التنفيذ، منجز (الحالة فقط)' },
  },
  training_gap: {
    label: { en: 'Training gap', ar: 'فجوة تدريبية' },
    looksLike: { en: 'Staff do not know something (the same wrong answer in three offices)', ar: 'الموظفون لا يعرفون أمراً (الإجابة الخاطئة نفسها في ثلاثة مكاتب)' },
    path: { en: 'L&D and the environment champion: a standard, a material or a session', ar: 'التعلم والتطوير وممثل البيئة: معيار أو مادة أو جلسة' },
    comesBack: { en: 'Standard, material or session delivered (status only)', ar: 'تسليم المعيار أو المادة أو الجلسة (الحالة فقط)' },
  },
  product_app: {
    label: { en: 'Product and app', ar: 'المنتج والتطبيق' },
    looksLike: { en: 'The app or the website (uploads failing, a form that loses the lead)', ar: 'التطبيق أو الموقع (فشل رفع الملفات، نموذج يضيّع العميل)' },
    path: { en: 'A request to the product owner and IT, with the evidence', ar: 'طلب لمالك المنتج وتقنية المعلومات مع الدليل' },
    comesBack: { en: 'Request accepted, fixed or declined (status only)', ar: 'قُبل الطلب أو أُصلح أو رُفض (الحالة فقط)' },
  },
  process: {
    label: { en: 'Process', ar: 'العملية' },
    looksLike: { en: 'A step or a hand-off between teams (handover dates never confirmed)', ar: 'خطوة أو تسليم بين فرق (مواعيد التسليم لا تُؤكَّد أبداً)' },
    path: { en: 'Whoever owns that process', ar: 'مالك تلك العملية' },
    comesBack: { en: 'Process changed (status only)', ar: 'تغيّرت العملية (الحالة فقط)' },
  },
  environment: {
    label: { en: 'Environment', ar: 'البيئة' },
    looksLike: { en: 'A place, not a person (no private room in one branch)', ar: 'مكان لا شخص (لا غرفة خاصة في أحد الفروع)' },
    path: { en: 'The branch or office manager', ar: 'مدير الفرع أو المكتب' },
    comesBack: { en: 'Place fixed (status only)', ar: 'أُصلح المكان (الحالة فقط)' },
  },
  legal_privacy: {
    label: { en: 'Legal and privacy', ar: 'قانوني وخصوصية' },
    looksLike: { en: 'A customer’s details shared on a group, a document sent to the wrong person: even once', ar: 'مشاركة بيانات عميل في مجموعة، أو إرسال مستند لشخص خاطئ: ولو مرة واحدة' },
    path: { en: 'Straight to Legal as a case, the CX manager informed', ar: 'مباشرة إلى القانونية كحالة، ويُبلَّغ مدير تجربة العملاء' },
    comesBack: { en: 'Case status from Legal', ar: 'حالة القضية من القانونية' },
  },
  marketing: {
    label: { en: 'Marketing', ar: 'التسويق' },
    looksLike: { en: 'A group of customers to win back (investors abroad who went quiet after one call)', ar: 'مجموعة عملاء لاستعادتهم (مستثمرون في الخارج صمتوا بعد مكالمة واحدة)' },
    path: { en: 'The Internal Audit and Marketing Lead first, then Marketing', ar: 'مسؤول التدقيق الداخلي والتسويق أولاً، ثم التسويق' },
    comesBack: { en: 'Campaign run and its result (status only)', ar: 'تنفيذ الحملة ونتيجتها (الحالة فقط)' },
  },
}
