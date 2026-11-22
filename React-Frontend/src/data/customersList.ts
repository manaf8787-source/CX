import type { Bi, LeadSource, PersonSegment } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** "Everyone on record" copy (v40 S13). */
export const CUSTOMERS_LIST_COPY = {
  pageTitle: b('Customers', 'العملاء'),
  pageDescription: b('One record per person, every contact on it; who is drifting away; who our customers are.', 'سجل واحد لكل شخص وكل تواصل عليه؛ من يبتعد؛ من هم زبائننا.'),
  title: b('Customers and what they told us', 'العملاء وما قالوه لنا'),
  hint: b('Everyone we have a record of, with the last thing they told us. Click a row to open the full history. The export contains exactly what you see.', 'كل من لدينا سجل عنه، مع آخر ما قاله لنا. اضغط على الصف لفتح السجل الكامل. التصدير يحتوي بالضبط ما تراه.'),
  filters: { feedback: b('All feedback', 'كل الآراء'), feedbackPositive: b('Positive', 'إيجابي'), feedbackNegative: b('Negative', 'سلبي'), feedbackNone: b('None yet', 'لا شيء بعد'), from: b('From', 'من'), to: b('To', 'إلى'), dateOn: b('Date of', 'تاريخ'), dateContact: b('Last contact', 'آخر تواصل'), dateFeedback: b('Last feedback', 'آخر رأي'), clear: b('Clear filters', 'مسح الفلاتر'), environment: b('All environments', 'كل البيئات'), type: b('All types', 'كل الأنواع'), source: b('All sources', 'كل المصادر') },
  count: (n: number): Bi => b(`${n} people`, `${n} شخصاً`),
  exportNote: (n: number, filtered: boolean): Bi => b(`Exports what you see: ${n} people${filtered ? ', filters applied' : ''}.`, `يصدّر ما تراه: ${n} شخصاً${filtered ? '، مع الفلاتر' : ''}.`),
  open: b('Open', 'فتح'),
  export: b('Export list (CSV)', 'تصدير القائمة (CSV)'),
  columns: {
    person: b('Person', 'الشخص'),
    type: b('Type', 'النوع'),
    environment: b('Environment', 'البيئة'),
    source: b('Source', 'المصدر'),
    product: b('Product', 'المنتج'),
    lastContact: b('Last contact', 'آخر تواصل'),
    problems: b('Problems', 'مشاكل'),
    drifting: b('Drifting', 'يبتعد'),
    feedback: b('Last feedback', 'آخر رأي'),
    openItems: b('Open', 'مفتوح'),
    risk: b('Risk', 'الخطر'),
    mobile: b('Mobile', 'الجوال'),
  },
  /** Names and mobiles go only to roles that may see names (decided 18 Nov). */
  exportToast: b(
    'CSV prepared: name, mobile, type, environment, source, last contact. Names and mobiles only for roles allowed to see them.',
    'جُهّز CSV: الاسم، الجوال، النوع، البيئة، المصدر، آخر تواصل. الأسماء والجوالات فقط للأدوار المسموح لها.',
  ),
  tabs: { find: b('Find a person', 'ابحث عن شخص'), leaving: b('Who is leaving', 'من يبتعد'), personas: b('Personas and campaigns', 'الشخصيات والحملات') },
}

/** The six customer types (v40 S13). [Proposed]: the KB does not define Buyer, Tenant, Owner, Investor, Member. */
export const SEGMENT_LABEL: Record<PersonSegment, Bi> = {
  lead: b('Lead', 'عميل محتمل'),
  buyer: b('Buyer', 'مشترٍ'),
  tenant: b('Tenant', 'مستأجر'),
  owner: b('Owner', 'مالك'),
  investor: b('Investor', 'مستثمر'),
  member: b('Member', 'عضو'),
}

/** The lead sources of the filter. The prototype labels the Club source "PSI Club breach log"; here it is "PSI Club". */
export const SOURCE_LABEL: Record<LeadSource, Bi> = {
  app: b('PSI Real Estate app', 'تطبيق PSI العقارية'),
  website: b('PSI Website', 'موقع PSI'),
  whatsapp: b('WhatsApp', 'واتساب'),
  club: b('PSI Club', 'نادي PSI'),
  crm: b('CRM', 'CRM'),
}
