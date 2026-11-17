import type { Bi } from '../types'

/** "Teams and structure" (Settings and reference §C) is explicitly kept as a
 * Knowledge Base document, removed from the live v38 portal menu (Programme
 * KB §26) — this is historical reference, not a page to keep building on.
 * Ported verbatim from the pre-omnichannel `frontend/src/data/roles.ts`
 * (its own `ROLE_DEFS` + `AUTHORITY_MATRIX`), which used a different
 * 12-role set than the current `data/roles.ts`. The *live* role×capability
 * grid is `/settings/ai-insights-access`, not this page. */

type LegacyAccess = 'full' | 'own' | 'view' | 'informed' | 'approve' | 'none'
type LegacyRoleId = 'cxmgr' | 'cxteam' | 'envmgmt' | 'teamlead' | 'aslead' | 'asagent' | 'hrspec' | 'hrmgr' | 'clevel' | 'tourscx' | 'exec' | 'shopper'

export interface LegacyRoleDef {
  id: LegacyRoleId
  name: Bi
  description: Bi
  home: string
}

export const LEGACY_ROLE_DEFS: LegacyRoleDef[] = [
  { id: 'cxmgr', name: { en: 'CX manager (level 2)', ar: 'مدير تجربة العملاء (المستوى 2)' }, description: { en: 'Portal owner. Approves AI suggested actions and rejected/modified corrective actions. Manages SLAs, routing, HR pool and launch status.', ar: 'مالك البوابة. يعتمد الإجراءات المقترحة من الذكاء الاصطناعي والإجراءات التصحيحية المرفوضة أو المعدّلة.' }, home: '/overview' },
  { id: 'cxteam', name: { en: 'CX team (level 1)', ar: 'فريق تجربة العملاء (المستوى 1)' }, description: { en: 'Works the cases: triage, assign by hand, write proposed corrective actions, verify and close.', ar: 'يعمل على الحالات: الفرز، الإسناد اليدوي، كتابة الإجراءات التصحيحية المقترحة.' }, home: '/overview' },
  { id: 'envmgmt', name: { en: 'Environment management', ar: 'إدارة البيئة' }, description: { en: 'Sales manager of an environment. Works cases of their environment and reviews corrective actions for the pools under them.', ar: 'مدير المبيعات لبيئة معيّنة. يعمل على حالات بيئته ويراجع الإجراءات التصحيحية لمجموعاته.' }, home: '/incidents' },
  { id: 'teamlead', name: { en: 'Team lead', ar: 'قائد الفريق' }, description: { en: 'Sees cases and insights of the agents in their pool, including names.', ar: 'يرى حالات ورؤى الوكلاء في مجموعته، بما في ذلك الأسماء.' }, home: '/incidents' },
  { id: 'aslead', name: { en: 'After-Sales lead', ar: 'قائد ما بعد البيع' }, description: { en: 'Owns the After-Sales desk: team queue, reassigning calls, After-Sales cases and corrective actions.', ar: 'يملك مكتب ما بعد البيع.' }, home: '/after-sales/desk' },
  { id: 'asagent', name: { en: 'After-Sales agent', ar: 'موظف ما بعد البيع' }, description: { en: 'Works their own call list: call queue and call screen, reports an issue.', ar: 'يعمل على قائمة مكالماته الخاصة.' }, home: '/after-sales/desk' },
  { id: 'hrspec', name: { en: 'HR specialist', ar: 'أخصائي الموارد البشرية' }, description: { en: 'Works attitude and conduct cases assigned by CX; writes the corrective actions.', ar: 'يعمل على حالات السلوك المسندة من فريق تجربة العملاء.' }, home: '/incidents' },
  { id: 'hrmgr', name: { en: 'HR manager', ar: 'مدير الموارد البشرية' }, description: { en: 'Informed only: team performance page, late alerts. No case access.', ar: 'للعلم فقط: صفحة أداء الفريق وتنبيهات التأخير.' }, home: '/hr-team' },
  { id: 'clevel', name: { en: 'C-level and heads', ar: 'الإدارة العليا ورؤساء الأقسام' }, description: { en: 'Informed only. Receive a notice, never assigned a case.', ar: 'للعلم فقط. يتلقون إشعاراً ولا يُسند إليهم أي حالة.' }, home: '/overview' },
  { id: 'tourscx', name: { en: 'Product CX (PS Tours)', ar: 'فريق تجربة العملاء للمنتج (الجولات)' }, description: { en: "PS Tours' own CX team that follows up with operations. Not launched yet.", ar: 'فريق تجربة العملاء الخاص بالجولات. لم يُطلق بعد.' }, home: '/overview' },
  { id: 'exec', name: { en: 'Executive', ar: 'تنفيذي' }, description: { en: 'Dashboards and results, read only.', ar: 'لوحات المعلومات والنتائج، للقراءة فقط.' }, home: '/overview' },
  { id: 'shopper', name: { en: 'Mystery shopper', ar: 'المتسوق السري' }, description: { en: 'Sees only their own tasks, through a separate sign-in.', ar: 'يرى مهامه الخاصة فقط.' }, home: '/shopper/tasks' },
]

export interface LegacyAuthorityRow {
  group: Bi
  label: Bi
  values: Record<LegacyRoleId, LegacyAccess>
}

const ROLE_ORDER: LegacyRoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'asagent', 'hrspec', 'hrmgr', 'clevel', 'tourscx', 'exec', 'shopper']

function row(group: Bi, label: Bi, symbols: string): LegacyAuthorityRow {
  const chars = symbols.trim().split(/\s+/)
  const map: Record<string, LegacyAccess> = { '●': 'full', '◐': 'own', '○': 'view', '✉': 'informed', '✔': 'approve', '–': 'none' }
  const values = {} as Record<LegacyRoleId, LegacyAccess>
  ROLE_ORDER.forEach((id, i) => { values[id] = map[chars[i]] ?? 'none' })
  return { group, label, values }
}

const DASH: Bi = { en: 'Dashboards and insights', ar: 'لوحات المعلومات والرؤى' }
const CMP: Bi = { en: 'Complaints handling', ar: 'إدارة الشكاوى' }
const CFG: Bi = { en: 'Configuration', ar: 'الإعدادات' }
const SRV: Bi = { en: 'Surveys and mystery shopper', ar: 'الاستبيانات والتسوق السري' }

export const LEGACY_AUTHORITY_MATRIX: LegacyAuthorityRow[] = [
  row(DASH, { en: 'Overview and product dashboards', ar: 'النظرة العامة ولوحات المنتجات' }, '● ● ◐ ◐ ◐ – – – ✉ ◐ ○ –'),
  row(DASH, { en: 'Voice of Customer', ar: 'صوت العميل' }, '● ● ○ ○ ○ – – – – ◐ ○ –'),
  row(DASH, { en: 'AI Insights: triggers and suggested actions', ar: 'رؤى الذكاء الاصطناعي' }, '● ● ◐ ◐ ○ – – – – ◐ ○ –'),
  row(DASH, { en: 'See agent names in the drill-down', ar: 'رؤية أسماء الوكلاء عند التفصيل' }, '● ● ◐ ◐ ◐ – ◐ – – – – –'),
  row(DASH, { en: 'Monthly CX pack', ar: 'حزمة تجربة العملاء الشهرية' }, '● ● – – – – – – – – ○ –'),
  row(DASH, { en: 'Glossary', ar: 'المسرد' }, '○ ○ ○ ○ ○ – – – – ○ ○ –'),
  row(CMP, { en: 'See cases', ar: 'رؤية الحالات' }, '● ● ◐ ◐ ◐ – ◐ – ✉ ◐ ○ –'),
  row(CMP, { en: 'Triage and assign by hand', ar: 'الفرز والإسناد اليدوي' }, '● ● – – – – – – – – – –'),
  row(CMP, { en: 'Confirm, modify or reject proposed actions', ar: 'تأكيد أو تعديل أو رفض الإجراءات المقترحة' }, '– – ◐ ◐ ◐ – ◐ – – ◐ – –'),
  row(CMP, { en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' }, '○ – – – – – – ◐ – – – –'),
  row(CFG, { en: 'SLAs, complaint types, routing', ar: 'اتفاقيات مستوى الخدمة وأنواع الشكاوى والتوجيه' }, '● ○ – – – – – – – – – –'),
  row(CFG, { en: 'Settings: product launch, HR pool, notices', ar: 'الإعدادات: إطلاق المنتج' }, '● ○ – – – – – – – – – –'),
  row(SRV, { en: 'Survey builder and campaigns', ar: 'منشئ الاستبيانات والحملات' }, '● ● – – – – – – – – ○ –'),
  row(SRV, { en: 'Mystery shopper programme and review', ar: 'برنامج التسوق السري والمراجعة' }, '● ● – – – – – – – – ○ –'),
  row(SRV, { en: 'Fill own shopping tasks', ar: 'تعبئة المهام الخاصة' }, '– – – – – – – – – – – ◐'),
  row(SRV, { en: 'Standards library', ar: 'مكتبة المعايير' }, '● ● ○ ○ ○ – – – – ○ ○ –'),
]

export const LEGACY_ACCESS_LABEL: Record<LegacyAccess, Bi> = {
  full: { en: 'Full', ar: 'كامل' },
  own: { en: 'Own scope', ar: 'ضمن نطاقه' },
  view: { en: 'View only', ar: 'للعرض فقط' },
  informed: { en: 'Informed only', ar: 'للعلم فقط' },
  approve: { en: 'Approves', ar: 'يعتمد' },
  none: { en: 'No access', ar: 'لا صلاحية' },
}

export const LEGACY_ACCESS_SYMBOL: Record<LegacyAccess, string> = {
  full: '●', own: '◐', view: '○', informed: '✉', approve: '✔', none: '–',
}
