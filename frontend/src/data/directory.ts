import type { Bi } from '../types'

// Sample people directory for the escalation ladder (titles, never real
// names — "Structure and authority", Modules KB section 2). Keyed by a
// routing id used in complaintTypes.ts.
export const DIR: Record<string, Bi> = {
  cx_team: { en: 'CX team', ar: 'فريق تجربة العملاء' },
  cx_manager: { en: 'CX manager', ar: 'مدير تجربة العملاء' },
  sales_mgr_dubai: { en: 'Sales manager, Dubai', ar: 'مدير المبيعات، دبي' },
  team_lead_dubai: { en: 'Sales team lead, Dubai', ar: 'قائد فريق المبيعات، دبي' },
  head_sales: { en: 'Head of Sales', ar: 'رئيس المبيعات' },
  as_lead: { en: 'After-Sales lead', ar: 'قائد ما بعد البيع' },
  dev_liaison: { en: 'Developer liaison', ar: 'منسق المطوّر' },
  finance_contact: { en: 'Finance contact', ar: 'جهة الاتصال المالية' },
  maintenance_lead: { en: 'Maintenance lead', ar: 'قائد الصيانة' },
  leasing_mgr: { en: 'Leasing manager', ar: 'مدير التأجير' },
  account_mgr: { en: 'Account manager', ar: 'مدير الحساب' },
  head_as: { en: 'Head of After-Sales', ar: 'رئيس ما بعد البيع' },
  club_pool: { en: 'Sales agents pool (Club)', ar: 'مجموعة وكلاء المبيعات (النادي)' },
  club_team_lead: { en: 'Sales team lead (Club)', ar: 'قائد فريق المبيعات (النادي)' },
  clevel: { en: 'C-level', ar: 'الإدارة العليا' },
  tour_ops: { en: 'Tour operations management', ar: 'إدارة تشغيل الجولات' },
  head_tours: { en: 'Head of Club and Tours', ar: 'رئيس النادي والجولات' },
  events_lead: { en: 'Events lead', ar: 'قائد الفعاليات' },
  head_events: { en: 'Head of Events', ar: 'رئيس الفعاليات' },
  hr_specialist: { en: 'HR specialist', ar: 'أخصائي الموارد البشرية' },
  hr_manager: { en: 'HR manager', ar: 'مدير الموارد البشرية' },
  direct_manager: { en: "Agent's direct manager", ar: 'المدير المباشر للوكيل' },
  call_center_lead: { en: 'Call center lead', ar: 'قائد مركز الاتصال' },
}

export function who(key: string): Bi {
  return DIR[key] ?? { en: key, ar: key }
}
