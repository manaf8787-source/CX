import type { Bi } from '../types'

export interface NavLeaf {
  path: string
  label: Bi
  dotVar?: string // CSS custom property for the nav-dot color
}

export interface NavGroup {
  label: Bi
  items: NavLeaf[]
}

/** The v38 primary navigation — docs/analysis/IMPLEMENTATION_PLAN.md §2.
 * "Settings and reference" is one folded entry holding the whole
 * pre-omnichannel scaffold's page set (see settingsNav.ts), not expanded here. */
export const PRIMARY_NAV: NavGroup[] = [
  {
    label: { en: 'Workspace', ar: 'مساحة العمل' },
    items: [
      { path: '/home', label: { en: 'Home', ar: 'الرئيسية' } },
      { path: '/customers', label: { en: 'Customers', ar: 'العملاء' } },
      { path: '/runaway', label: { en: 'Runaway customers', ar: 'العملاء الهاربون' } },
      { path: '/actions', label: { en: 'Actions', ar: 'الإجراءات' } },
      { path: '/close-the-loop', label: { en: 'Close the loop', ar: 'إغلاق الحلقة' } },
      { path: '/personas', label: { en: 'Personas and campaigns', ar: 'الشخصيات والحملات' } },
      { path: '/surveys', label: { en: 'Surveys and triggers', ar: 'الاستبيانات والمحفزات' } },
    ],
  },
  {
    label: { en: 'Team', ar: 'الفريق' },
    items: [
      { path: '/intelligent-cx-team', label: { en: 'Intelligent CX team', ar: 'فريق تجربة العملاء الذكي' } },
    ],
  },
  {
    label: { en: 'Reference', ar: 'المرجع' },
    items: [
      { path: '/settings', label: { en: 'Settings and reference', ar: 'الإعدادات والمرجع' } },
    ],
  },
]

export const ACTIONS_TABS: NavLeaf[] = [
  { path: '/actions/corrective', label: { en: 'Corrective actions', ar: 'الإجراءات التصحيحية' } },
  { path: '/actions/signals', label: { en: 'Signals & patterns', ar: 'الإشارات والأنماط' } },
  { path: '/actions/ai-insights', label: { en: 'AI Insights', ar: 'رؤى الذكاء الاصطناعي' } },
  { path: '/actions/shopper-cases', label: { en: 'Shopper cases', ar: 'حالات التسوق السري' } },
  { path: '/actions/investigations', label: { en: 'Investigations', ar: 'التحقيقات' } },
]

/** "Settings and reference" sub-navigation — where the whole pre-omnichannel
 * scaffold's page set lands, almost one-to-one (APPLICATION_MODULES.md §C). */
export const SETTINGS_NAV: NavLeaf[] = [
  { path: '/settings/overview', label: { en: 'Overview', ar: 'نظرة عامة' } },
  { path: '/settings/monthly-pack', label: { en: 'Monthly CX pack', ar: 'الحزمة الشهرية' } },
  { path: '/settings/mystery-shopper', label: { en: 'Mystery shopper', ar: 'التسوق السري' } },
  { path: '/settings/standards', label: { en: 'Standards register', ar: 'سجل المعايير' } },
  { path: '/settings/voc', label: { en: 'Voice of Customer', ar: 'صوت العميل' } },
  { path: '/settings/surveys-reference', label: { en: 'Surveys (reference)', ar: 'الاستبيانات (مرجع)' } },
  { path: '/settings/ld', label: { en: 'L&D: training & materials', ar: 'التعلم والتطوير' } },
  { path: '/settings/teams-structure', label: { en: 'Teams and structure', ar: 'الفرق والهيكل' } },
  { path: '/settings/hr-team', label: { en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' } },
  { path: '/settings/rules', label: { en: 'Rules as configuration', ar: 'القواعد كإعدادات' } },
  { path: '/settings/ai-insights-access', label: { en: 'AI Insights access matrix', ar: 'مصفوفة صلاحيات رؤى الذكاء الاصطناعي' } },
  { path: '/settings/glossary', label: { en: 'What the terms mean', ar: 'ماذا تعني المصطلحات' } },
]
