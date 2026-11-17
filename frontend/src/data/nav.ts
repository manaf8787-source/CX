import type { Bi, ProductId, RoleId } from '../types'

export interface NavItem {
  path: string
  label: Bi
  roles: RoleId[] | 'all'
  requireProduct?: ProductId
  /** Shown on the nav item as a small badge, e.g. a build phase not yet started. */
  phase?: number
}

export interface NavGroup {
  label: Bi
  items: NavItem[]
}

// Mirrors the latest structure from the knowledge base: Overview & insights,
// Products, Complaints, Surveys & shoppers, Admin, My team (Modules KB
// section 4; group names refined in Programme KB section 26).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: { en: 'Overview & insights', ar: 'نظرة عامة ورؤى' },
    items: [
      { path: '/overview', label: { en: 'Overview', ar: 'نظرة عامة' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'clevel', 'tourscx', 'exec'] },
      { path: '/voc', label: { en: 'Voice of Customer', ar: 'صوت العميل' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'tourscx', 'exec'] },
      { path: '/insights', label: { en: 'AI Insights', ar: 'رؤى الذكاء الاصطناعي' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'tourscx', 'exec'], phase: 3 },
      { path: '/report', label: { en: 'Monthly CX pack', ar: 'الحزمة الشهرية' }, roles: ['cxmgr', 'cxteam', 'exec'], phase: 4 },
    ],
  },
  {
    label: { en: 'Products', ar: 'المنتجات' },
    items: [
      { path: '/real-estate', label: { en: 'PSI Real Estate', ar: 'بي إس آي العقارية' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'exec'], requireProduct: 're' },
      { path: '/after-sales', label: { en: 'After-Sales', ar: 'ما بعد البيع' }, roles: ['cxmgr', 'cxteam', 'aslead', 'exec'], requireProduct: 'af' },
      { path: '/after-sales/desk', label: { en: 'After-Sales Desk', ar: 'مكتب ما بعد البيع' }, roles: ['cxmgr', 'cxteam', 'aslead', 'asagent'], requireProduct: 'af' },
      { path: '/club', label: { en: 'PSI Club', ar: 'نادي بي إس آي' }, roles: ['cxmgr', 'cxteam'], requireProduct: 'cl', phase: 2 },
      { path: '/tour-estate', label: { en: 'Tour Estate', ar: 'تور إستيت' }, roles: ['cxmgr', 'cxteam', 'tourscx'], requireProduct: 'to', phase: 2 },
      { path: '/events', label: { en: 'PSI Events', ar: 'فعاليات بي إس آي' }, roles: ['cxmgr', 'cxteam'], requireProduct: 'ev', phase: 2 },
    ],
  },
  {
    label: { en: 'Complaints', ar: 'الشكاوى' },
    items: [
      { path: '/incidents', label: { en: 'Incidents and SLAs', ar: 'الحوادث واتفاقيات مستوى الخدمة' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'hrspec', 'tourscx'] },
    ],
  },
  {
    label: { en: 'Surveys & shoppers', ar: 'الاستبيانات والمتسوقون' },
    items: [
      { path: '/survey-engine', label: { en: 'Survey Engine', ar: 'محرك الاستبيانات' }, roles: ['cxmgr', 'cxteam', 'exec'], phase: 2 },
      { path: '/mystery-shopper', label: { en: 'Mystery Shopper', ar: 'التسوق السري' }, roles: ['cxmgr', 'cxteam', 'exec'], phase: 2 },
      { path: '/call-center', label: { en: 'Call Center & IVR', ar: 'مركز الاتصال والرد الصوتي' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'aslead', 'exec'], phase: 3 },
    ],
  },
  {
    label: { en: 'Admin', ar: 'الإدارة' },
    items: [
      { path: '/settings', label: { en: 'Settings', ar: 'الإعدادات' }, roles: ['cxmgr'], phase: 4 },
      { path: '/standards', label: { en: 'Standards Library', ar: 'مكتبة المعايير' }, roles: ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'tourscx', 'exec'] },
      { path: '/suggestions', label: { en: 'Suggestions log', ar: 'سجل الاقتراحات' }, roles: ['cxmgr', 'cxteam', 'exec'], phase: 4 },
      { path: '/structure', label: { en: 'Build specification', ar: 'مواصفات البناء' }, roles: ['cxmgr', 'cxteam'] },
      { path: '/glossary', label: { en: 'Glossary', ar: 'المسرد' }, roles: 'all' },
    ],
  },
  {
    label: { en: 'My team', ar: 'فريقي' },
    items: [
      { path: '/hr-team', label: { en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' }, roles: ['hrmgr'] },
      { path: '/shopper/tasks', label: { en: 'My tasks', ar: 'مهامي' }, roles: ['shopper'] },
    ],
  },
]
