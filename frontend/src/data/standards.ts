import type { Standard } from '../types'

// Thirteen standards (Modules KB section 15): every checklist item and rule
// should point to one of these. Statuses per the docs: awaiting document,
// confirm with Legal, or drafted by CX.
export const STANDARDS: Standard[] = [
  { id: 'std_hr_procedures', name: { en: 'HR mystery-shopper procedures', ar: 'إجراءات الموارد البشرية للتسوق السري' }, owner: 'HR', linkedItems: 0, status: 'awaiting' },
  { id: 'std_sla_targets', name: { en: 'Agreed SLA targets by complaint type', ar: 'أهداف اتفاقية مستوى الخدمة المعتمدة حسب نوع الشكوى' }, owner: 'CX manager', linkedItems: 27, status: 'drafted' },
  { id: 'std_as_script', name: { en: 'After-Sales real call script', ar: 'نص مكالمة ما بعد البيع الفعلي' }, owner: 'After-Sales lead', linkedItems: 0, status: 'awaiting' },
  { id: 'std_legal_calling', name: { en: 'Calling hours, consent and recording policy', ar: 'سياسة ساعات الاتصال والموافقة والتسجيل' }, owner: 'Legal', linkedItems: 0, status: 'legal' },
  { id: 'std_shopper_rubric', name: { en: 'Mystery shopper scoring rubric', ar: 'معايير تقييم التسوق السري' }, owner: 'CX team', linkedItems: 6, status: 'drafted' },
  { id: 'std_ai_rubric', name: { en: 'AI call evaluator rubric', ar: 'معايير تقييم مُقيّم المكالمات الذكي' }, owner: 'CX team', linkedItems: 8, status: 'drafted' },
  { id: 'std_whatsapp_policy', name: { en: 'WhatsApp messaging and Meta template policy', ar: 'سياسة رسائل واتساب وقوالب ميتا' }, owner: 'CX manager', linkedItems: 6, status: 'drafted' },
  { id: 'std_escalation_policy', name: { en: 'Complaint escalation and routing policy', ar: 'سياسة تصعيد وتوجيه الشكاوى' }, owner: 'CX manager', linkedItems: 27, status: 'drafted' },
  { id: 'std_branch_checklist', name: { en: 'Branch and gallery visit standard', ar: 'معيار زيارة الفرع والمعرض' }, owner: 'CX team', linkedItems: 4, status: 'drafted' },
  { id: 'std_re_sales_script', name: { en: 'Real Estate sales script', ar: 'نص مبيعات العقارات' }, owner: 'Head of Sales', linkedItems: 0, status: 'awaiting' },
  { id: 'std_club_policy', name: { en: 'PSI Club VIP nomination policy', ar: 'سياسة ترشيح أعضاء نادي بي إس آي المميزين' }, owner: 'Club lead', linkedItems: 0, status: 'awaiting' },
  { id: 'std_tour_safety', name: { en: 'Tour Estate safety and conduct standard', ar: 'معيار السلامة والسلوك في تور إستيت' }, owner: 'Tour operations', linkedItems: 0, status: 'awaiting' },
  { id: 'std_events_registration', name: { en: 'Events registration and follow-up standard', ar: 'معيار تسجيل ومتابعة الفعاليات' }, owner: 'Events lead', linkedItems: 0, status: 'awaiting' },
]
