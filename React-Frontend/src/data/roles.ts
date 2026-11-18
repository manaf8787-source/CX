import type { MainRoleId, RoleDef, RoleId } from '../types'

/** The v38 target role list — docs/analysis/USER_ROLES_AND_PERMISSIONS.md.
 * `marketing` and `auditmkt` are net-new versus the pre-omnichannel scaffold;
 * the rest are the same jobs under their v38 names. The full role x capability
 * authority matrix (who sees what, per the "AI Insights access matrix" the CX
 * manager edits) is page-content for the Settings-and-reference build pass,
 * not foundation — see IMPLEMENTATION_PLAN.md §3.5. */
export const ROLE_DEFS: RoleDef[] = [
  {
    id: 'cxmgr',
    name: { en: 'CX manager', ar: 'مدير تجربة العملاء' },
    description: { en: 'Portal owner. Approves corrective actions, sets thresholds and who-sees-what, releases the monthly report.', ar: 'مالك البوابة. يعتمد الإجراءات التصحيحية، ويضبط الحدود وصلاحيات العرض، ويصدر التقرير الشهري.' },
    home: '/home',
  },
  {
    id: 'cxteam',
    name: { en: 'CX team', ar: 'فريق تجربة العملاء' },
    description: { en: 'Works the cases: triage, propose corrective actions, run the assistant, create AI interview campaigns.', ar: 'يعمل على الحالات: الفرز، اقتراح الإجراءات التصحيحية، تشغيل المساعد، إنشاء حملات المقابلات بالذكاء الاصطناعي.' },
    home: '/home',
  },
  {
    id: 'envmgmt',
    name: { en: 'Environment management', ar: 'إدارة البيئة' },
    description: { en: 'Sales manager of one environment. Own actions for that environment only, with agent names, no conversation text.', ar: 'مدير مبيعات لبيئة واحدة. يملك إجراءات بيئته فقط، مع أسماء الوكلاء، دون نص المحادثات.' },
    home: '/home',
    product: 're',
    environment: 'Dubai',
    envId: 'dub',
  },
  {
    id: 'teamlead',
    name: { en: 'Sales team lead', ar: 'قائد فريق المبيعات' },
    description: { en: "Follows their pool's agents and cases.", ar: 'يتابع وكلاء وحالات مجموعته.' },
    home: '/home',
    product: 're',
  },
  {
    id: 'aslead',
    name: { en: 'After-Sales team lead', ar: 'قائد فريق ما بعد البيع' },
    description: { en: 'Owns After-Sales actions: process, speed and communication signals.', ar: 'يملك إجراءات ما بعد البيع: إشارات العملية والسرعة والتواصل.' },
    home: '/home',
    product: 'af',
  },
  {
    id: 'ld',
    name: { en: 'L&D manager', ar: 'مدير التعلم والتطوير' },
    description: { en: 'Delivers training and materials; writes the standards it owns (CX manager approves for scoring).', ar: 'يقدّم التدريب والمواد، ويكتب المعايير التي يملكها (يعتمدها مدير تجربة العملاء للتقييم).' },
    home: '/settings/ld',
  },
  {
    id: 'hrspec',
    name: { en: 'HR specialist', ar: 'أخصائي الموارد البشرية' },
    description: { en: "Writes corrective actions on conduct; the agent's direct manager reviews them.", ar: 'يكتب الإجراءات التصحيحية المتعلقة بالسلوك، ويراجعها المدير المباشر للوكيل.' },
    home: '/actions',
  },
  {
    id: 'hrmgr',
    name: { en: 'HR manager', ar: 'مدير الموارد البشرية' },
    description: { en: 'Informed only: team numbers and late alerts, nothing on cases.', ar: 'للعلم فقط: أرقام الفريق وتنبيهات التأخير، دون أي صلاحية على الحالات.' },
    home: '/settings/hr-team',
  },
  {
    id: 'marketing',
    name: { en: 'Marketing manager', ar: 'مدير التسويق' },
    description: { en: 'Receives personas and campaign recommendations — no conversation text, no agent names.', ar: 'يستلم الشخصيات وتوصيات الحملات — دون نص المحادثات أو أسماء الوكلاء.' },
    // v40 (F35): Marketing lands on Home (it was Personas); Personas is a tab of Customers.
    home: '/home',
  },
  {
    id: 'auditmkt',
    name: { en: 'Internal Audit and Marketing Lead', ar: 'مسؤول التدقيق الداخلي والتسويق' },
    description: { en: 'Aggregates and audit views only: feed trust, standards compliance, persona/campaign criteria. No cases, no conversation text, no agent names.', ar: 'عرض إجمالي ورقابي فقط: موثوقية البيانات، الامتثال للمعايير، معايير الشخصيات والحملات. دون حالات أو نص محادثات أو أسماء وكلاء.' },
    // v40 (F35): the Internal Audit and Marketing Lead lands on the Overview, now "6 · CX indicators" at /overview.
    home: '/overview',
  },
  {
    id: 'exec',
    name: { en: 'Executive', ar: 'تنفيذي' },
    description: { en: 'Read only, everything, no agent names — informed only.', ar: 'قراءة فقط لكل شيء، دون أسماء الوكلاء — للعلم فقط.' },
    home: '/home',
  },
  {
    id: 'shopper',
    name: { en: 'Mystery shopper', ar: 'المتسوق السري' },
    description: { en: 'Sees only their own tasks, through a separate sign-in.', ar: 'يرى مهامه الخاصة فقط، من خلال تسجيل دخول منفصل.' },
    home: '/settings/mystery-shopper',
  },
]

export function roleDef(id: RoleId | null): RoleDef | undefined {
  return ROLE_DEFS.find((r) => r.id === id)
}

/** The six roles on the sign-in screen (v40 F28): CX manager, CX team, Environment manager, Marketing, L&D, Internal Audit and Marketing Lead. */
export const MAIN_ROLE_IDS: readonly MainRoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'ld', 'auditmkt']

/** The rest, folded under "Other roles used in the demo" on the sign-in screen. */
export const FOLDED_ROLE_IDS: readonly RoleId[] = ROLE_DEFS.map((r) => r.id).filter((id) => !(MAIN_ROLE_IDS as readonly RoleId[]).includes(id))

export const mainRoleDefs = (): RoleDef[] => MAIN_ROLE_IDS.map((id) => roleDef(id)!)
export const foldedRoleDefs = (): RoleDef[] => FOLDED_ROLE_IDS.map((id) => roleDef(id)!)

/** Sign-in copy (v40 S12). */
export const SIGN_IN_COPY = {
  title: { en: 'Sign in', ar: 'تسجيل الدخول' },
  note: {
    en: 'In the real platform this is one company sign-in and the role comes from the directory. In the prototype, choose who you are.',
    ar: 'في المنصة الحقيقية هذا تسجيل دخول واحد للشركة والدور يأتي من الدليل. في النموذج، اختر من أنت.',
  },
  otherRoles: {
    en: 'Other roles used in the demo (team leads, HR, executives, product teams, mystery shoppers)',
    ar: 'أدوار أخرى تُستخدم في العرض (قادة الفرق، الموارد البشرية، التنفيذيون، فرق المنتجات، المتسوقون)',
  },
}
