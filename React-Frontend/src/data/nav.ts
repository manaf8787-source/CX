import type { Bi } from '../types'

export interface NavLeaf {
  path: string
  label: Bi
  dotVar?: string // CSS custom property for the nav-dot color
  /** Never the page `/settings` sends a role to (`SETTINGS_LANDING`): a demo page listed in the menu, not an entry point [Proposed]. */
  skipLanding?: boolean
  /** Not listed for the CX manager and the CX team (the page lives elsewhere for them). */
  hideForCx?: boolean
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
      { path: '/actions', label: { en: 'Problems and fixes', ar: 'المشاكل والحلول' } },
      { path: '/close-the-loop', label: { en: '5 · Close the loop', ar: '5 · إغلاق الحلقة' } },
      { path: '/overview', label: { en: '6 · CX indicators', ar: '6 · مؤشرات تجربة العملاء' } },
      // 26 Nov (owner): every detractor across products and environments, why, and the contacted ones (re-survey results moved here)
      { path: '/detractors', label: { en: 'Detractor analysis', ar: 'تحليل المنتقدين' } },
      // 23 Nov (owner): gifts to customers, emailed to the Administration team, with the stock and the history (CX manager and CX team).
      { path: '/gifts', label: { en: 'Gifts', ar: 'الهدايا' } },
      // 22 Nov: the CX manager's team performance report (appraisal), exportable.
      { path: '/performance', label: { en: 'Team performance', ar: 'أداء الفريق' } },
      // 22 Nov: the counts-only summary for the Reporting viewer (custom roles only; no other role lists it, see `blocked`).
      { path: '/reports', label: { en: 'CX reports', ar: 'تقارير تجربة العملاء' } },
      // 22 Nov: the CRM agents' reports, by product (CX manager, each environment's CEO, and custom roles such as Sales support).
      { path: '/agents/sales', label: { en: 'Sales agents', ar: 'وكلاء المبيعات' } },
      { path: '/agents/support', label: { en: 'Excellence team', ar: 'فريق التميّز' } },
    ],
  },
  {
    label: { en: 'Reference', ar: 'المرجع' },
    items: [
      { path: '/settings', label: { en: 'Settings and reference', ar: 'الإعدادات والمرجع' } },
      // v43 (19 Nov): the user directory; shown to the super admin (edits) and the CX manager (reads).
      { path: '/admin/users', label: { en: 'Users and access', ar: 'المستخدمون والصلاحيات' } },
      { path: '/admin/audit', label: { en: 'Audit log', ar: 'سجل التدقيق' } },
      { path: '/admin/performance', label: { en: 'User performance', ar: 'أداء المستخدمين' } },
      // 23 Nov: connections with other platforms and products, and the data feeds; Super admin and Admin only.
      { path: '/admin/integrations', label: { en: 'Integrations', ar: 'الربط والتكاملات' } },
      // 23 Nov: which products are live; moved from the CX manager's Settings to the Super admin and Admin.
      { path: '/admin/products', label: { en: 'Product launch', ar: 'إطلاق المنتجات' } },
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
  '/intelligent-cx-team': '/settings/ai-team?tab=how',
  '/settings/watch-ai-team': '/settings/ai-team?tab=watch',
  '/surveys': '/settings/surveys',
  // 23 Nov: Teams and structure was split: routing went to Who handles what, the CRM fields to Integrations, the rest was removed
  '/settings/teams-structure': '/settings/escalation-matrix?view=routing',
  '/settings/overview': '/overview',
  // 22 Nov: three Surveys pages became one screen with tabs
  '/settings/survey-questions': '/settings/surveys?tab=questions',
  '/settings/surveys-reference': '/settings/surveys?tab=campaigns',
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
  // 23 Nov (owner): for the CX side, shopper cases are a tab of the Mystery shopper page
  { path: '/actions/shopper-cases', label: { en: 'Shopper cases', ar: 'حالات التسوق السري' }, hideForCx: true },
  { path: '/actions/investigations', label: { en: 'Investigations', ar: 'التحقيقات' } },
  // 22 Nov: everything waiting on another department (fixes, HR conduct cases, L&D requests, documents) in one list. CX only.
  { path: '/actions/with-teams', label: { en: 'With other teams', ar: 'عند الأقسام الأخرى' } },
]

/** "Settings and reference" sub-navigation, in the v40 order (F08): the AI team page, the registers
 * (weekly sample, public mentions), then the older pages and the new data and configuration pages.
 * The Overview is no longer here: it is "6 · CX indicators" at /overview. */
export const SETTINGS_NAV: NavLeaf[] = [
  // 23 Nov: How the portal works and Watch the AI team work are one page with two tabs
  { path: '/settings/ai-team', label: { en: 'The AI team', ar: 'فريق الذكاء الاصطناعي' } },
  { path: '/settings/weekly-sample', label: { en: 'Weekly sample', ar: 'العينة الأسبوعية' } },
  // v42.1 (F33): right after the weekly sample. skipLanding: listed there, it would become Marketing's landing page (its first allowed page under /settings).
  { path: '/settings/campaign-audit', label: { en: 'Marketing campaigns', ar: 'الحملات التسويقية' }, skipLanding: true },
  { path: '/settings/public-mentions', label: { en: 'Public mentions', ar: 'الإشارات العامة' } },
  { path: '/settings/monthly-pack', label: { en: 'Monthly CX pack', ar: 'الحزمة الشهرية' } },
  { path: '/settings/mystery-shopper', label: { en: 'Mystery shopper', ar: 'التسوق السري' } },
  // 22 Nov: for the CX side the register is a tab of Rules as configuration
  { path: '/settings/standards', label: { en: 'Standards register', ar: 'سجل المعايير' }, hideForCx: true },
  { path: '/settings/surveys', label: { en: 'Surveys', ar: 'الاستبيانات' } },
  // 23 Nov (owner): for the CX side these four live elsewhere: VoC on 6 · CX indicators, leave on Team performance, notices and the
  // AI Insights access matrix as tabs of Rules as configuration. Other roles keep their own entries.
  { path: '/settings/voc', label: { en: 'Voice of Customer', ar: 'صوت العميل' }, hideForCx: true },
  { path: '/settings/ld', label: { en: 'L&D: training & materials', ar: 'التعلم والتطوير' } },
  { path: '/settings/team-availability', label: { en: 'Team availability (leave)', ar: 'توفّر الفريق (الإجازات)' }, skipLanding: true, hideForCx: true },
  { path: '/settings/hr-team', label: { en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' } },
  // 25 Nov (owner): the maintenance follow-up team and the outsourced vendors, on the Property Management SLA
  { path: '/settings/maintenance', label: { en: 'Maintenance follow-up', ar: 'متابعة الصيانة' } },
  { path: '/settings/feeds', label: { en: 'Data feeds', ar: 'تغذيات البيانات' } },
  { path: '/settings/crm-mapping', label: { en: 'CRM mapping', ar: 'ربط قيم CRM' } },
  { path: '/settings/escalation-matrix', label: { en: 'Who handles what', ar: 'من يتولّى ماذا' } },
  { path: '/settings/admin', label: { en: 'Notices and digests', ar: 'الإشعارات والخلاصات' }, hideForCx: true },
  { path: '/settings/rules', label: { en: 'Rules as configuration', ar: 'القواعد كإعدادات' } },
  { path: '/settings/ai-insights-access', label: { en: 'AI Insights access matrix', ar: 'مصفوفة صلاحيات رؤى الذكاء الاصطناعي' }, hideForCx: true },
  // 24 Nov (owner): no menu entry for the glossary; the "What the terms mean" button on every page opens it.
]

/** The pages `/settings` can send a role to, in menu order: `SETTINGS_NAV` without the demo pages (`skipLanding`). */
export const SETTINGS_LANDING: string[] = SETTINGS_NAV.filter((i) => !i.skipLanding).map((i) => i.path)

/** The page behind a path, for the audit log: the longest matching menu entry (tabs before their parents), else the path itself. */
export function pageTitleFor(pathname: string): Bi {
  const all: NavLeaf[] = [...PRIMARY_NAV.flatMap((g) => g.items), ...CUSTOMERS_TABS, ...ACTIONS_TABS, ...SETTINGS_NAV]
  let best: NavLeaf | undefined
  for (const leaf of all) {
    if (pathname === leaf.path || pathname.startsWith(`${leaf.path}/`)) {
      if (!best || leaf.path.length > best.path.length) best = leaf
    }
  }
  if (best) return best.label
  const product = pathname.match(/^\/products\/([a-z]+)/)
  if (product) return { en: `Product page: ${product[1]}`, ar: `صفحة المنتج: ${product[1]}` }
  return { en: pathname, ar: pathname }
}
