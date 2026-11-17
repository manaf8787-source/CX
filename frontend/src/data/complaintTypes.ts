import type { Bi, ComplaintType } from '../types'

// The 8 After-Sales rows are transcribed verbatim from the Programme KB
// (section 11.4). The rest are named in the docs (section 11.4 "other
// types cover..." and section 23's merged call-timing type) but without a
// full 27-row table, so they're filled in at the same shape/spirit — mark
// as sample data, same as the rest of the prototype.
export const COMPLAINT_TYPES: ComplaintType[] = [
  // --- After-Sales (documented table, Programme KB section 11.4) ---
  { id: 'af_handover_missed', product: 'af', name: { en: 'Handover date missed', ar: 'تأخر موعد التسليم' }, priority: 'high', respondHours: 4, resolveHours: 24, owner: 'as_lead', backup: 'dev_liaison', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_snagging', product: 'af', name: { en: 'Snagging not handled', ar: 'ملاحظات التشطيب لم تُعالج' }, priority: 'high', respondHours: 4, resolveHours: 56, owner: 'as_lead', backup: 'dev_liaison', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_finishing_quality', product: 'af', name: { en: 'Finishing quality', ar: 'جودة التشطيب' }, priority: 'medium', respondHours: 9, resolveHours: 112, owner: 'dev_liaison', backup: 'as_lead', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_payment_dispute', product: 'af', name: { en: 'Payment or statement dispute', ar: 'نزاع على الدفع أو كشف الحساب' }, priority: 'high', respondHours: 4, resolveHours: 24, owner: 'finance_contact', backup: 'as_lead', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_offplan_updates', product: 'af', name: { en: 'Construction updates unclear (off-plan)', ar: 'تحديثات البناء غير واضحة (على الخارطة)' }, priority: 'medium', respondHours: 9, resolveHours: 56, owner: 'account_mgr', backup: 'as_lead', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_rental_maintenance', product: 'af', name: { en: 'Maintenance not handled (rental)', ar: 'الصيانة لم تُعالج (إيجار)' }, priority: 'high', respondHours: 4, resolveHours: 16, owner: 'maintenance_lead', backup: 'leasing_mgr', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_agent_conduct', product: 'af', name: { en: 'Agent conduct', ar: 'سلوك الموظف' }, priority: 'high', respondHours: 9, resolveHours: 40, owner: 'as_lead', backup: 'hr_specialist', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'af_detractor_followup', product: 'af', name: { en: 'Detractor follow-up', ar: 'متابعة العميل غير الراضي' }, priority: 'medium', respondHours: 18, resolveHours: 56, owner: 'as_lead', backup: 'account_mgr', manager: 'head_as', head: 'head_as', byEnvironment: true },

  // --- Call timing: merged type, Programme KB section 23 ---
  { id: 'call_timing', product: '*', name: { en: 'Call timing: outside allowed hours or later than promised', ar: 'توقيت الاتصال: خارج الساعات المسموحة أو أبطأ من الموعد الموعود' }, priority: 'high', respondHours: 4, resolveHours: 27, owner: 'call_center_lead', backup: 'as_lead', manager: 'head_as', head: 'head_as', byEnvironment: true },

  // --- Real Estate (named in section 11.4) ---
  { id: 're_unapproved_discount', product: 're', name: { en: 'Unapproved discount', ar: 'خصم غير معتمد' }, priority: 'high', respondHours: 4, resolveHours: 24, owner: 'sales_mgr_dubai', backup: 'team_lead_dubai', manager: 'head_sales', head: 'head_sales', byEnvironment: true },
  { id: 're_wrong_language', product: 're', name: { en: 'Wrong language used', ar: 'استخدام لغة غير مناسبة' }, priority: 'medium', respondHours: 9, resolveHours: 40, owner: 'team_lead_dubai', backup: 'sales_mgr_dubai', manager: 'head_sales', head: 'head_sales', byEnvironment: true },
  { id: 're_gallery_unstaffed', product: 're', name: { en: 'Gallery not staffed', ar: 'المعرض بدون موظفين' }, priority: 'medium', respondHours: 9, resolveHours: 40, owner: 'sales_mgr_dubai', backup: 'team_lead_dubai', manager: 'head_sales', head: 'head_sales', byEnvironment: true },

  // --- AI call center (remaining items after the call-timing merge) ---
  { id: 'ai_no_disclosure', product: '*', name: { en: 'Customer not told they spoke to an AI', ar: 'لم يُخبر العميل أنه تحدث إلى ذكاء اصطناعي' }, priority: 'high', respondHours: 4, resolveHours: 24, owner: 'call_center_lead', backup: 'as_lead', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'ai_wrong_fact', product: '*', name: { en: 'Wrong information given', ar: 'معلومات خاطئة قُدّمت' }, priority: 'high', respondHours: 4, resolveHours: 24, owner: 'call_center_lead', backup: 'account_mgr', manager: 'head_as', head: 'head_as', byEnvironment: true },
  { id: 'ai_no_handover', product: '*', name: { en: 'No handover to a person when asked', ar: 'لم يتم التحويل لشخص عند الطلب' }, priority: 'medium', respondHours: 9, resolveHours: 40, owner: 'call_center_lead', backup: 'as_lead', manager: 'head_as', head: 'head_as', byEnvironment: true },

  // --- PSI Club ---
  { id: 'cl_no_update', product: 'cl', name: { en: 'No update on a nominated lead', ar: 'لا تحديث عن عميل محتمل مرشّح' }, priority: 'medium', respondHours: 9, resolveHours: 56, owner: 'club_pool', backup: 'club_team_lead', manager: 'clevel', head: 'clevel', byEnvironment: false },
  { id: 'cl_do_not_call', product: 'cl', name: { en: 'Do-not-call request ignored', ar: 'تجاهل طلب عدم الاتصال' }, priority: 'high', respondHours: 4, resolveHours: 24, owner: 'club_pool', backup: 'club_team_lead', manager: 'clevel', head: 'clevel', byEnvironment: false },

  // --- Tour Estate ---
  { id: 'to_vehicle', product: 'to', name: { en: 'Vehicle condition or cleanliness', ar: 'حالة أو نظافة المركبة' }, priority: 'medium', respondHours: 9, resolveHours: 40, owner: 'tour_ops', backup: 'head_tours', manager: 'head_tours', head: 'head_tours', byEnvironment: false },
  { id: 'to_guide', product: 'to', name: { en: 'Guide conduct or knowledge', ar: 'سلوك أو معرفة المرشد' }, priority: 'medium', respondHours: 9, resolveHours: 40, owner: 'tour_ops', backup: 'head_tours', manager: 'head_tours', head: 'head_tours', byEnvironment: false },
  { id: 'to_stop', product: 'to', name: { en: 'Stop or activity issue', ar: 'مشكلة في محطة أو نشاط' }, priority: 'low', respondHours: 18, resolveHours: 56, owner: 'tour_ops', backup: 'head_tours', manager: 'head_tours', head: 'head_tours', byEnvironment: false },

  // --- Events ---
  { id: 'ev_checkin_queue', product: 'ev', name: { en: 'Check-in queue too long', ar: 'طابور التسجيل طويل جداً' }, priority: 'medium', respondHours: 9, resolveHours: 24, owner: 'events_lead', backup: 'head_events', manager: 'head_events', head: 'head_events', byEnvironment: false },
  { id: 'ev_late_followup', product: 'ev', name: { en: 'Late post-event follow-up', ar: 'متابعة متأخرة بعد الفعالية' }, priority: 'low', respondHours: 18, resolveHours: 56, owner: 'events_lead', backup: 'head_events', manager: 'head_events', head: 'head_events', byEnvironment: false },

  // --- Attitude/conduct (any product, HR route) ---
  { id: 'hr_attitude', product: '*', name: { en: 'Attitude or conduct (HR route)', ar: 'السلوك أو التصرف (مسار الموارد البشرية)' }, priority: 'high', respondHours: 9, resolveHours: 40, owner: 'hr_specialist', backup: 'direct_manager', manager: 'hr_manager', head: 'hr_manager', byEnvironment: false },

  // --- Other ---
  { id: 'other', product: '*', name: { en: 'Other', ar: 'أخرى' }, priority: 'low', respondHours: 18, resolveHours: 56, owner: 'cx_team', backup: 'cx_manager', manager: 'cx_manager', head: 'clevel', byEnvironment: false },
]

export function complaintType(id: string): ComplaintType | undefined {
  return COMPLAINT_TYPES.find((t) => t.id === id)
}

// Escalation ladder — same for every type (Programme KB section 11.5).
export interface LadderStep {
  pct: number | null // null = "after breach", uses afterHours instead
  afterHours?: number
  label: Bi
  notifies: ('owner' | 'backup' | 'manager' | 'head')[]
}

export const LADDER: LadderStep[] = [
  { pct: 0, label: { en: 'Start', ar: 'البداية' }, notifies: ['owner'] },
  { pct: 50, label: { en: 'Reminder', ar: 'تذكير' }, notifies: ['owner'] },
  { pct: 80, label: { en: 'Warning', ar: 'تحذير' }, notifies: ['owner', 'backup'] },
  { pct: 100, label: { en: 'Breach', ar: 'خرق' }, notifies: ['owner', 'backup', 'manager'] },
  { pct: null, afterHours: 9, label: { en: 'Still open', ar: 'لا يزال مفتوحاً' }, notifies: ['owner', 'backup', 'manager', 'head'] },
]

// Working hours for SLA clocks (Programme KB section 11.3): Mon–Fri, 09:00–18:00.
export const WORKING_HOURS = { startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] } // 0=Sun
export const AT_RISK_THRESHOLD = 0.25 // "at risk" when under 25% of target remains
