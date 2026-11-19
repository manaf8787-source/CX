import type { Bi } from '../types'

export interface NavLeaf {
  path: string
  label: Bi
  dotVar?: string // CSS custom property for the nav-dot color
  /** Never the page `/settings` sends a role to (`SETTINGS_LANDING`): a demo page listed in the menu, not an entry point [Proposed]. */
  skipLanding?: boolean
}

export interface NavGroup {
  label: Bi
  items: NavLeaf[]
}

/** The v40 merged menu (docs/V40_DELTA.md F08): six main items in step order, then the folded
 * "Settings and reference" entry. Customers holds Find a person, Who is leaving and Personas and
 * campaigns as tabs (CUSTOMERS_TABS); Surveys and triggers and the AI team page live under Settings.
 * The sidebar puts the live products group between the two groups. */
export const PRIMARY_NAV: NavGroup[] = [
  {
    label: { en: 'Workspace', ar: 'مساحة العمل' },
    items: [
      { path: '/home', label: { en: 'Home', ar: 'الرئيسية' } },
      { path: '/customers', label: { en: '1 · Customers', ar: '1 · العملاء' } },
      { path: '/inbox', label: { en: 'My inbox', ar: 'صندوقي' } },
      { path: '/actions', label: { en: '2–4 · Signals and fixes', ar: '2–4 · الإشارات والحلول' } },
      { path: '/close-the-loop', label: { en: '5 · Close the loop', ar: '5 · إغلاق الحلقة' } },
      { path: '/overview', label: { en: '6 · CX indicators', ar: '6 · مؤشرات تجربة العملاء' } },
    ],
  },
  {
    label: { en: 'Reference', ar: 'المرجع' },
    items: [
      { path: '/settings', label: { en: 'Settings and reference', ar: 'الإعدادات والمرجع' } },
    ],
  },
]

/** The three tabs at the top of Customers (F17). Each is its own URL; a tab shows only when the role can open the page. */
export const CUSTOMERS_TABS: NavLeaf[] = [
  { path: '/customers', label: { en: 'Find a person', ar: 'ابحث عن شخص' } },
  { path: '/runaway', label: { en: 'Who is leaving', ar: 'من يبتعد' } },
  { path: '/personas', label: { en: 'Personas and campaigns', ar: 'الشخصيات والحملات' } },
]

/** Old URLs that still work: the page moved, the old path redirects (F08, F18). Search and hash are kept. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/surveys': '/settings/surveys',
  '/settings/overview': '/overview',
}

/** The new path for a legacy one (exact match or a child path), or undefined. */
export function legacyRedirect(pathname: string): string | undefined {
  for (const [from, to] of Object.entries(LEGACY_REDIRECTS)) {
    if (pathname === from || pathname.startsWith(`${from}/`)) return to + pathname.slice(from.length)
  }
  return undefined
}

export const ACTIONS_TABS: NavLeaf[] = [
  { path: '/actions/corrective', label: { en: 'Corrective actions', ar: 'الإجراءات التصحيحية' } },
  { path: '/actions/signals', label: { en: 'Signals & patterns', ar: 'الإشارات والأنماط' } },
  { path: '/actions/ai-insights', label: { en: 'AI Insights', ar: 'رؤى الذكاء الاصطناعي' } },
  { path: '/actions/shopper-cases', label: { en: 'Shopper cases', ar: 'حالات التسوق السري' } },
  { path: '/actions/investigations', label: { en: 'Investigations', ar: 'التحقيقات' } },
]

/** "Settings and reference" sub-navigation, in the v40 order (F08): the AI team page, the registers
 * (weekly sample, public mentions), then the older pages and the new data and configuration pages.
 * The Overview is no longer here: it is "6 · CX indicators" at /overview. */
export const SETTINGS_NAV: NavLeaf[] = [
  { path: '/intelligent-cx-team', label: { en: 'How the portal works (the AI team)', ar: 'كيف تعمل البوابة (فريق الذكاء الاصطناعي)' } },
  { path: '/settings/watch-ai-team', label: { en: 'Watch the AI team work', ar: 'شاهد فريق الذكاء يعمل' }, skipLanding: true },
  { path: '/settings/weekly-sample', label: { en: 'Weekly sample', ar: 'العينة الأسبوعية' } },
  // v42.1 (F33): right after the weekly sample. skipLanding: listed there, it would become Marketing's landing page (its first allowed page under /settings).
  { path: '/settings/campaign-audit', label: { en: 'Campaign audit', ar: 'تدقيق الحملات' }, skipLanding: true },
  { path: '/settings/public-mentions', label: { en: 'Public mentions', ar: 'الإشارات العامة' } },
  { path: '/settings/monthly-pack', label: { en: 'Monthly CX pack', ar: 'الحزمة الشهرية' } },
  { path: '/settings/mystery-shopper', label: { en: 'Mystery shopper', ar: 'التسوق السري' } },
  { path: '/settings/standards', label: { en: 'Standards register', ar: 'سجل المعايير' } },
  { path: '/settings/surveys', label: { en: 'Surveys and triggers', ar: 'الاستبيانات والمحفزات' } },
  { path: '/settings/voc', label: { en: 'Voice of Customer', ar: 'صوت العميل' } },
  { path: '/settings/surveys-reference', label: { en: 'Surveys (legacy reference)', ar: 'الاستبيانات (مرجع قديم)' } },
  { path: '/settings/ld', label: { en: 'L&D: training & materials', ar: 'التعلم والتطوير' } },
  { path: '/settings/teams-structure', label: { en: 'Teams and structure', ar: 'الفرق والهيكل' } },
  { path: '/settings/hr-team', label: { en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' } },
  { path: '/settings/feeds', label: { en: 'Data feeds', ar: 'تغذيات البيانات' } },
  { path: '/settings/crm-mapping', label: { en: 'CRM mapping', ar: 'ربط قيم CRM' } },
  { path: '/settings/escalation-matrix', label: { en: 'Escalation matrix', ar: 'مصفوفة التصعيد' } },
  { path: '/settings/survey-questions', label: { en: 'Survey questions', ar: 'أسئلة الاستبيانات' } },
  { path: '/settings/admin', label: { en: 'Settings: launch, HR pool, notices', ar: 'الإعدادات: الإطلاق، الموارد البشرية، الإشعارات' } },
  { path: '/settings/rules', label: { en: 'Rules as configuration', ar: 'القواعد كإعدادات' } },
  { path: '/settings/ai-insights-access', label: { en: 'AI Insights access matrix', ar: 'مصفوفة صلاحيات رؤى الذكاء الاصطناعي' } },
  { path: '/settings/glossary', label: { en: 'What the terms mean', ar: 'ماذا تعني المصطلحات' } },
]

/** The pages `/settings` can send a role to, in menu order: `SETTINGS_NAV` without the demo pages (`skipLanding`). */
export const SETTINGS_LANDING: string[] = SETTINGS_NAV.filter((i) => !i.skipLanding).map((i) => i.path)
