import { environmentById } from './environments'
import type { MainRoleId, RoleDef, RoleId } from '../types'
import { activeCustomRole, activeEnvId, customHome } from './customRoles'

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
    description: {
      en: 'Portal owner. Approves corrective actions, sets thresholds and who-sees-what, releases the monthly report.',
      ar: 'مالك البوابة. يعتمد الإجراءات التصحيحية، ويضبط الحدود وصلاحيات العرض، ويصدر التقرير الشهري.',
    },
    home: '/home',
  },
  {
    id: 'cxteam',
    name: { en: 'CX team', ar: 'فريق تجربة العملاء' },
    description: {
      en: 'Works the cases: triage, propose corrective actions, run the assistant, create AI interview campaigns.',
      ar: 'يعمل على الحالات: الفرز، اقتراح الإجراءات التصحيحية، تشغيل المساعد، إنشاء حملات المقابلات بالذكاء الاصطناعي.',
    },
    // 23 Nov (owner): the CX team's work is all in the inbox
    home: '/inbox',
  },
  {
    id: 'envmgmt',
    // 22 Nov (owner): named by environment, "Dubai – CEO" (see the override in `roleDef`); this is the generic form used in lists
    name: { en: 'Environment CEO', ar: 'الرئيس التنفيذي للبيئة' },
    description: {
      en: 'CEO of one environment. Own actions and agents for that environment only, with agent names, no conversation text.',
      ar: 'الرئيس التنفيذي لبيئة واحدة. يملك إجراءات ووكلاء بيئته فقط، مع أسماء الوكلاء، دون نص المحادثات.',
    },
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
    description: {
      en: 'Owns After-Sales actions: process, speed and communication signals.',
      ar: 'يملك إجراءات ما بعد البيع: إشارات العملية والسرعة والتواصل.',
    },
    home: '/home',
    product: 'af',
  },
  {
    id: 'ld',
    name: { en: 'L&D manager', ar: 'مدير التعلم والتطوير' },
    description: {
      en: 'Delivers training and materials; writes the standards it owns (CX manager approves for scoring).',
      ar: 'يقدّم التدريب والمواد، ويكتب المعايير التي يملكها (يعتمدها مدير تجربة العملاء للتقييم).',
    },
    home: '/settings/ld',
  },
  {
    id: 'hrspec',
    name: { en: 'HR specialist', ar: 'أخصائي الموارد البشرية' },
    description: {
      en: "Writes corrective actions on conduct; the agent's direct manager reviews them.",
      ar: 'يكتب الإجراءات التصحيحية المتعلقة بالسلوك، ويراجعها المدير المباشر للوكيل.',
    },
    home: '/actions',
  },
  {
    id: 'hrmgr',
    name: { en: 'HR manager or director', ar: 'مدير أو مدير عام الموارد البشرية' },
    description: {
      en: 'HR performance: call-center (IVR) callbacks, recruitment in Odoo, HR operations; conduct cases as numbers only.',
      ar: 'أداء الموارد البشرية: إعادة الاتصال بطلبات مركز الاتصال (IVR)، التوظيف في Odoo، عمليات الموارد البشرية؛ وحالات السلوك كأرقام فقط.',
    },
    home: '/settings/hr-team',
  },
  {
    id: 'marketing',
    name: { en: 'Marketing manager', ar: 'مدير التسويق' },
    description: {
      en: 'Receives personas and campaign recommendations — no conversation text, no agent names.',
      ar: 'يستلم الشخصيات وتوصيات الحملات — دون نص المحادثات أو أسماء الوكلاء.',
    },
    // v40 (F35): Marketing lands on Home (it was Personas); Personas is a tab of Customers.
    home: '/home',
  },
  {
    id: 'auditmkt',
    name: { en: 'Internal Audit and Marketing Lead', ar: 'مسؤول التدقيق الداخلي والتسويق' },
    // v42.1 (F33, Decision 2): the prototype's `ROLES.ia.d`, word for word: audits, never approves fixes; audits every campaign before and after it runs.
    description: {
      en: 'Audits, never approves fixes: marks data feeds and standards as trusted; reads the audit part of the weekly sample (routing, classification, access, targeting); audits every campaign before it runs (right people, right projects and developers, right channel and message, the money) and after it ran. Sees aggregates and audit views; no cases, no conversation text, no agent names.',
      ar: 'يدقّق ولا يعتمد الحلول: يوسم تغذيات البيانات والمعايير موثوقة؛ يقرأ الجزء التدقيقي من العينة الأسبوعية (التوجيه، التصنيف، الصلاحيات، الاستهداف)؛ يدقّق كل حملة قبل تشغيلها (الأشخاص الصحيحون، المشاريع والمطورون الصحيحون، القناة والرسالة الصحيحتان، المال) وبعد تشغيلها. يرى المجاميع وصفحات التدقيق؛ لا حالات ولا نص محادثات ولا أسماء موظفين.',
    },
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
  {
    // v43 (19 Nov): the owner's request — nobody picks a role at sign-in; a super admin invites people by email and gives each a role.
    id: 'admin',
    name: { en: 'Super admin', ar: 'المدير العام للنظام' },
    description: {
      en: 'Invites users by email and gives each one a role. Sees the Users page only: no customers, no cases, no numbers.',
      ar: 'يدعو المستخدمين بالبريد ويمنح كل واحد دوراً. يرى صفحة المستخدمين فقط: لا عملاء ولا حالات ولا أرقام.',
    },
    home: '/admin/users',
  },
  {
    id: 'useradmin',
    name: { en: 'Admin', ar: 'مدير المستخدمين' },
    description: {
      en: 'Invites users, changes roles and deactivates people who left. Cannot create another Admin and cannot open the audit log.',
      ar: 'يدعو المستخدمين ويغيّر الأدوار ويوقف من غادر. لا يستطيع إنشاء مدير آخر ولا فتح سجل التدقيق.',
    },
    home: '/admin/users',
  },
  {
    id: 'custom',
    name: { en: 'Custom role', ar: 'دور مخصص' },
    description: {
      en: 'A role the super admin builds screen by screen: for each screen, no access, view only or can edit.',
      ar: 'دور يبنيه المدير العام شاشة بشاشة: لكل شاشة، لا وصول أو عرض فقط أو تعديل.',
    },
    home: '/home',
  },
]

export function roleDef(id: RoleId | null): RoleDef | undefined {
  const def = ROLE_DEFS.find((r) => r.id === id)
  // a custom role takes the name the super admin gave it, and lands on the first screen it may open
  // each of the three Environment managers sees their own environment (the user's `envId`); the role's own is Dubai
  if (def && def.id === 'envmgmt') {
    const e = activeEnvId()
    return e
      ? {
          ...def,
          name: { en: `${environmentById(e).name.en} – CEO`, ar: `${environmentById(e).name.ar} – الرئيس التنفيذي` },
          envId: e,
          environment: environmentById(e).short,
        }
      : def
  }
  if (def && def.id === 'custom') {
    const c = activeCustomRole()
    return c ? { ...def, name: { en: c.name, ar: c.name }, home: customHome() } : def
  }
  return def
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
