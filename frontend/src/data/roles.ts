import type { Access, Bi, RoleDef, RoleId } from '../types'

// Role metadata — mirrors "Entry and navigation" (Modules KB section 4) and
// "Structure: who is involved" (section 2).
export const ROLE_DEFS: RoleDef[] = [
  { id: 'cxmgr', name: { en: 'CX manager (level 2)', ar: 'مدير تجربة العملاء (المستوى 2)' }, description: { en: 'Portal owner. Approves AI suggested actions and rejected/modified corrective actions. Manages SLAs, routing, HR pool and launch status.', ar: 'مالك البوابة. يعتمد الإجراءات المقترحة من الذكاء الاصطناعي والإجراءات التصحيحية المرفوضة أو المعدّلة. يدير اتفاقيات مستوى الخدمة والتوجيه ومجموعة الموارد البشرية وحالة الإطلاق.' }, home: '/overview' },
  { id: 'cxteam', name: { en: 'CX team (level 1)', ar: 'فريق تجربة العملاء (المستوى 1)' }, description: { en: 'Works the cases: triage, assign by hand, write proposed corrective actions, verify and close.', ar: 'يعمل على الحالات: الفرز، الإسناد اليدوي، كتابة الإجراءات التصحيحية المقترحة، التحقق والإغلاق.' }, home: '/overview' },
  { id: 'envmgmt', name: { en: 'Environment management', ar: 'إدارة البيئة' }, description: { en: 'Sales manager of an environment (e.g. Dubai). Works cases of their environment and reviews corrective actions for the pools under them.', ar: 'مدير المبيعات لبيئة معيّنة (مثل دبي). يعمل على حالات بيئته ويراجع الإجراءات التصحيحية لمجموعاته.' }, home: '/incidents', product: 're' },
  { id: 'teamlead', name: { en: 'Team lead', ar: 'قائد الفريق' }, description: { en: 'Sees cases and insights of the agents in their pool, including names.', ar: 'يرى حالات ورؤى الوكلاء في مجموعته، بما في ذلك الأسماء.' }, home: '/incidents', product: 're' },
  { id: 'aslead', name: { en: 'After-Sales lead', ar: 'قائد ما بعد البيع' }, description: { en: 'Owns the After-Sales desk: team queue, reassigning calls, After-Sales cases and corrective actions.', ar: 'يملك مكتب ما بعد البيع: طابور الفريق، إعادة إسناد المكالمات، حالات وإجراءات ما بعد البيع.' }, home: '/after-sales/desk', product: 'af' },
  { id: 'asagent', name: { en: 'After-Sales agent', ar: 'موظف ما بعد البيع' }, description: { en: 'Works their own call list: call queue and call screen, reports an issue.', ar: 'يعمل على قائمة مكالماته الخاصة: طابور الاتصال وشاشة الاتصال، ويبلّغ عن أي مشكلة.' }, home: '/after-sales/desk', product: 'af' },
  { id: 'hrspec', name: { en: 'HR specialist', ar: 'أخصائي الموارد البشرية' }, description: { en: 'Works attitude and conduct cases assigned by CX; writes the corrective actions.', ar: 'يعمل على حالات السلوك المسندة من فريق تجربة العملاء ويكتب الإجراءات التصحيحية.' }, home: '/incidents' },
  { id: 'hrmgr', name: { en: 'HR manager', ar: 'مدير الموارد البشرية' }, description: { en: 'Informed only: team performance page, late alerts. No case access.', ar: 'للعلم فقط: صفحة أداء الفريق وتنبيهات التأخير. لا صلاحية وصول للحالات.' }, home: '/hr-team' },
  { id: 'clevel', name: { en: 'C-level and heads', ar: 'الإدارة العليا ورؤساء الأقسام' }, description: { en: 'Informed only. Receive a notice, never assigned a case.', ar: 'للعلم فقط. يتلقون إشعاراً ولا يُسند إليهم أي حالة.' }, home: '/overview' },
  { id: 'tourscx', name: { en: 'Product CX (PS Tours)', ar: 'فريق تجربة العملاء للمنتج (الجولات)' }, description: { en: "PS Tours' own CX team that follows up with operations. Not launched yet.", ar: 'فريق تجربة العملاء الخاص بالجولات والذي يتابع مع التشغيل. لم يُطلق بعد.' }, home: '/overview', product: 'to' },
  { id: 'exec', name: { en: 'Executive', ar: 'تنفيذي' }, description: { en: 'Dashboards and results, read only.', ar: 'لوحات المعلومات والنتائج، للقراءة فقط.' }, home: '/overview' },
  { id: 'shopper', name: { en: 'Mystery shopper', ar: 'المتسوق السري' }, description: { en: 'Sees only their own tasks, through a separate sign-in.', ar: 'يرى مهامه الخاصة فقط، من خلال تسجيل دخول منفصل.' }, home: '/shopper/tasks' },
]

export function roleDef(id: RoleId | null): RoleDef | undefined {
  return ROLE_DEFS.find((r) => r.id === id)
}

// --- The authority matrix, transcribed verbatim from the Knowledge Base ---
// (Modules KB, section 3). Used to render the Structure/build-spec page and
// as the single source of truth other permission checks should grow from.
export interface AuthorityRow {
  group: Bi
  label: Bi
  values: Record<RoleId, Access>
}

const ROLE_ORDER: RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'asagent', 'hrspec', 'hrmgr', 'clevel', 'tourscx', 'exec', 'shopper']

function row(group: Bi, label: Bi, symbols: string): AuthorityRow {
  const chars = symbols.trim().split(/\s+/)
  const map: Record<string, Access> = { '●': 'full', '◐': 'own', '○': 'view', '✉': 'informed', '✔': 'approve', '–': 'none' }
  const values = {} as Record<RoleId, Access>
  ROLE_ORDER.forEach((id, i) => { values[id] = map[chars[i]] ?? 'none' })
  return { group, label, values }
}

const DASH: Bi = { en: 'Dashboards and insights', ar: 'لوحات المعلومات والرؤى' }
const CMP: Bi = { en: 'Complaints handling', ar: 'إدارة الشكاوى' }
const CFG: Bi = { en: 'Configuration', ar: 'الإعدادات' }
const SRV: Bi = { en: 'Surveys and mystery shopper', ar: 'الاستبيانات والتسوق السري' }

export const AUTHORITY_MATRIX: AuthorityRow[] = [
  row(DASH, { en: 'Overview and product dashboards', ar: 'النظرة العامة ولوحات المنتجات' }, '● ● ◐ ◐ ◐ – – – ✉ ◐ ○ –'),
  row(DASH, { en: 'Voice of Customer', ar: 'صوت العميل' }, '● ● ○ ○ ○ – – – – ◐ ○ –'),
  row(DASH, { en: 'AI Insights: triggers and suggested actions', ar: 'رؤى الذكاء الاصطناعي: المحفزات والإجراءات المقترحة' }, '● ● ◐ ◐ ○ – – – – ◐ ○ –'),
  row(DASH, { en: 'See agent names in the drill-down', ar: 'رؤية أسماء الوكلاء عند التفصيل' }, '● ● ◐ ◐ ◐ – ◐ – – – – –'),
  row(DASH, { en: 'Monthly CX pack', ar: 'حزمة تجربة العملاء الشهرية' }, '● ● – – – – – – – – ○ –'),
  row(DASH, { en: 'Glossary', ar: 'المسرد' }, '○ ○ ○ ○ ○ – – – – ○ ○ –'),
  row(DASH, { en: 'Approve AI suggested corrective actions', ar: 'اعتماد الإجراءات التصحيحية المقترحة من الذكاء الاصطناعي' }, '✔ – – – – – – – – – – –'),

  row(CMP, { en: 'See cases', ar: 'رؤية الحالات' }, '● ● ◐ ◐ ◐ – ◐ – ✉ ◐ ○ –'),
  row(CMP, { en: 'Triage and assign by hand', ar: 'الفرز والإسناد اليدوي' }, '● ● – – – – – – – – – –'),
  row(CMP, { en: 'Write proposed corrective actions', ar: 'كتابة الإجراءات التصحيحية المقترحة' }, '● ● – – – – – – – – – –'),
  row(CMP, { en: 'Respond, record root cause', ar: 'الرد وتسجيل السبب الجذري' }, '– – ◐ ◐ ◐ – ◐ – – ◐ – –'),
  row(CMP, { en: 'Confirm, modify or reject proposed actions', ar: 'تأكيد أو تعديل أو رفض الإجراءات المقترحة' }, '– – ◐ ◐ ◐ – ◐ – – ◐ – –'),
  row(CMP, { en: 'Review HR corrective actions (direct manager)', ar: 'مراجعة الإجراءات التصحيحية للموارد البشرية (المدير المباشر)' }, '○ – ◐ ◐ – – – – – – – –'),
  row(CMP, { en: 'Approve rejected or modified actions', ar: 'اعتماد الإجراءات المرفوضة أو المعدّلة' }, '✔ – – – – – – – – – – –'),
  row(CMP, { en: 'Verify and close, reopen', ar: 'التحقق والإغلاق، إعادة الفتح' }, '● ● – – – – – – – – – –'),
  row(CMP, { en: 'Told about late and high-priority cases', ar: 'إشعار بالحالات المتأخرة وعالية الأولوية' }, '● ● ● ● ● – ● ✉ ✉ ● – –'),
  row(CMP, { en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' }, '○ – – – – – – ◐ – – – –'),

  row(CFG, { en: 'SLAs, complaint types, routing', ar: 'اتفاقيات مستوى الخدمة وأنواع الشكاوى والتوجيه' }, '● ○ – – – – – – – – – –'),
  row(CFG, { en: 'Settings: product launch, HR pool, notices', ar: 'الإعدادات: إطلاق المنتج، مجموعة الموارد البشرية، الإشعارات' }, '● ○ – – – – – – – – – –'),

  row(SRV, { en: 'Survey builder and campaigns', ar: 'منشئ الاستبيانات والحملات' }, '● ● – – – – – – – – ○ –'),
  row(SRV, { en: 'WhatsApp templates: check and submit to Meta', ar: 'قوالب واتساب: الفحص والإرسال إلى ميتا' }, '● ● – – – – – – – – – –'),
  row(SRV, { en: 'Mystery shopper programme and review', ar: 'برنامج التسوق السري والمراجعة' }, '● ● – – – – – – – – ○ –'),
  row(SRV, { en: 'Import a filled shopper form', ar: 'استيراد نموذج تم تعبئته' }, '● ● – – – – – – – – – –'),
  row(SRV, { en: 'Fill own shopping tasks', ar: 'تعبئة المهام الخاصة' }, '– – – – – – – – – – – ◐'),
  row(SRV, { en: 'After-Sales call queue and call screen', ar: 'طابور الاتصال وشاشة الاتصال لما بعد البيع' }, '○ ○ – – ◐ ◐ – – – – – –'),
  row(SRV, { en: 'Call center dashboard', ar: 'لوحة مركز الاتصال' }, '● ● ○ – ○ – – – – – ○ –'),
  row(SRV, { en: 'Suggestions log', ar: 'سجل الاقتراحات' }, '● ● – – – – – – – – ○ –'),
  row(SRV, { en: 'Standards library', ar: 'مكتبة المعايير' }, '● ● ○ ○ ○ – – – – ○ ○ –'),
]

export const ACCESS_LABEL: Record<Access, Bi> = {
  full: { en: 'Full', ar: 'كامل' },
  own: { en: 'Own scope', ar: 'ضمن نطاقه' },
  view: { en: 'View only', ar: 'للعرض فقط' },
  informed: { en: 'Informed only', ar: 'للعلم فقط' },
  approve: { en: 'Approves', ar: 'يعتمد' },
  none: { en: 'No access', ar: 'لا صلاحية' },
}

export const ACCESS_SYMBOL: Record<Access, string> = {
  full: '●', own: '◐', view: '○', informed: '✉', approve: '✔', none: '–',
}
