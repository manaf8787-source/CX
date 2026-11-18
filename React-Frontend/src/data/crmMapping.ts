import type { Bi, CrmMapping, MappingKind, MappingOption, MappingRow } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })
const o = (id: string, en: string, ar: string): MappingOption => ({ id, label: b(en, ar) })

/** CRM mapping page copy (v40 S6). */
export const CRM_MAPPING_COPY = {
  title: b('CRM mapping', 'ربط قيم CRM'),
  /** The prototype's intro quotes "13 lead stages", "9 sources", "11 events" but its own tables show 14, 9 and 11; build counts from the data (`mappingCounts`) instead of copying them. */
  intro: b(
    'The CRM has over 100 media values, 13 lead stages and 761 activity types. The portal has 9 sources, 6 stages and 11 events. This page is the translation, kept as configuration and filled once with the CRM owner; the same table applies to all three environments unless a row says otherwise.',
    'في CRM أكثر من 100 قيمة وسيط و13 مرحلة و761 نوع نشاط. في البورتال 9 مصادر و6 مراحل و11 حدثاً. هذه الصفحة هي الترجمة، تُحفظ كإعدادات وتُعبّأ مرة واحدة مع مالك CRM؛ الجدول نفسه ينطبق على البيئات الثلاث ما لم يقل سطر غير ذلك.',
  ),
  tabs: {
    src: b('Sources (CRM Media)', 'المصادر (CRM Media)'),
    stg: b('Stages (CRM lead stage)', 'المراحل (مرحلة الليد في CRM)'),
    act: b('Activities (CRM activity category)', 'الأنشطة (فئة النشاط في CRM)'),
  } satisfies Record<MappingKind, Bi>,
  columns: {
    src: { crm: b('CRM · Media / Media detail', 'CRM · الوسيط / تفاصيل الوسيط'), portal: b('Portal source', 'مصدر البورتال') },
    stg: { crm: b('CRM · Lead stage', 'CRM · مرحلة الليد'), portal: b('Portal funnel stage', 'مرحلة القمع في البورتال') },
    act: { crm: b('CRM · Activity category / type', 'CRM · فئة / نوع النشاط'), portal: b('Portal event', 'حدث البورتال') },
  } satisfies Record<MappingKind, { crm: Bi; portal: Bi }>,
  rule: b('Rule', 'القاعدة'),
  ruleHint: {
    src: b('Stamped on every record from this media value', 'يُختم على كل سجل من قيمة الوسيط هذه'),
    stg: b('Moves the person to this funnel stage', 'ينقل الشخص إلى مرحلة القمع هذه'),
    act: b('Becomes this event; the triggers read the event, never the CRM name', 'يصبح هذا الحدث؛ المحفزات تقرأ الحدث لا اسم CRM'),
  } satisfies Record<MappingKind, Bi>,
  footnote: b(
    'Shown: the values seen on 17 November in the Abu Dhabi environment. The full lists are imported from the CRM lookups at go-live; unmapped values default to "Ignore" and appear in the weekly sample for the Internal Audit and Marketing Lead.',
    'المعروض: القيم التي شوهدت في 17 نوفمبر في بيئة أبوظبي. القوائم الكاملة تُستورد من جداول CRM عند الإطلاق؛ القيم غير المربوطة تُعتبر "تجاهل" وتظهر في العينة الأسبوعية لمدير التدقيق الداخلي والتسويق.',
  ),
  toast: b('Mapping saved (prototype).', 'حُفظ الربط (نموذج).'),
}

/** The portal-side values to choose from, per tab. 'ignore' is always last. Names other than "Ignore" are English-only in the prototype: the Arabic here is [Proposed]. */
export const CRM_MAPPING_OPTIONS: Record<MappingKind, MappingOption[]> = {
  src: [
    o('app', 'PSI Real Estate app', 'تطبيق PSI العقارية'),
    o('web', 'PSI Website', 'موقع PSI'),
    o('wa', 'WhatsApp', 'واتساب'),
    o('fb', 'Facebook (public)', 'فيسبوك (عام)'),
    o('ig', 'Instagram (public)', 'إنستغرام (عام)'),
    o('portal', 'Property portals', 'بوابات العقارات'),
    o('branch', 'Branch / walk-in', 'فرع / زيارة مباشرة'),
    o('event', 'Event', 'فعالية'),
    o('crm', 'CRM (internal)', 'CRM (داخلي)'),
    o('ignore', 'Ignore', 'تجاهل'),
  ],
  stg: [
    o('enq', 'Enquiry', 'استفسار'),
    o('con', 'Contacted', 'تم التواصل'),
    o('view', 'Viewing', 'معاينة'),
    o('offer', 'Offer', 'عرض'),
    o('deal', 'Deal signed', 'صفقة موقّعة'),
    o('lost', 'Closed lost', 'أُغلق خاسراً'),
    o('ignore', 'Ignore', 'تجاهل'),
  ],
  act: [
    o('call', 'Call (trigger: over 2 min)', 'مكالمة (المحفز: فوق دقيقتين)'),
    o('wa', 'Message', 'رسالة'),
    o('view', 'Viewing done', 'معاينة تمت'),
    o('offer', 'Offer made', 'عرض قُدّم'),
    o('deal', 'Deal signed', 'صفقة وُقّعت'),
    o('handover', 'Handover done', 'تسليم تم'),
    o('complaint', 'Complaint', 'شكوى'),
    o('renewal', 'Renewal / non-renewal', 'تجديد / عدم تجديد'),
    o('ticket', 'Ticket closed', 'تذكرة أُغلقت'),
    o('survey', 'Survey answered', 'استبيان أُجيب'),
    o('ignore', 'Ignore', 'تجاهل'),
  ],
}

const row = (kind: MappingKind, crmValue: string, portalValue: string): MappingRow => ({ kind, crmValue, portalValue })

/**
 * Default rows: the values seen on 17 Nov in the Abu Dhabi environment, aligned to `Documents/CRM-Field-Mapping.docx`
 * (the read-only review of the CRM): the Media values it lists (PSI Mobile App, Website, www.psinv.net, What's App, Facebook,
 * Property Finder, Bayut, Walk In, event names, Auto Generated – Post Transaction; "Website" and "www.psinv.net" are two separate
 * values), the stage names it uses, and the activity categories it names (Calls, the Communication log, Handover Workflow, Client
 * Complaint Category, Lease Renewal and the renewal notices, Survey Completed). The 761 activity types are mapped by category here;
 * the full list is imported from the CRM lookups at go-live. All rows are [Proposed] until the CRM owner confirms them.
 */
export const CRM_MAPPING_ROWS: MappingRow[] = [
  row('src', 'PSI Mobile App', 'app'),
  row('src', 'Website', 'web'),
  row('src', 'www.psinv.net', 'web'),
  row('src', "What's App", 'wa'),
  row('src', 'Facebook', 'fb'),
  row('src', 'Property Finder', 'portal'),
  row('src', 'Bayut', 'portal'),
  row('src', 'Walk In', 'branch'),
  row('src', 'Fay Al Reeman Al Ain Event', 'event'),
  row('src', 'Mall of Emirates Stand', 'event'),
  row('src', 'Auto Generated – Post Transaction', 'crm'),
  row('src', 'Youngsters', 'event'),
  row('src', 'Moscow MPIRES', 'event'),

  row('stg', 'New', 'enq'),
  row('stg', 'Not Contacted', 'enq'),
  row('stg', 'Contacted', 'con'),
  row('stg', 'Qualified lead', 'con'),
  row('stg', 'Pending Inquiry Matching', 'con'),
  row('stg', 'Active', 'con'),
  row('stg', 'Meeting', 'view'),
  row('stg', 'Viewing', 'view'),
  row('stg', 'Opportunity', 'offer'),
  row('stg', 'Negotiation', 'offer'),
  row('stg', 'Reservation (with developer)', 'deal'),
  row('stg', 'Contract signed', 'deal'),
  row('stg', 'Closed won', 'deal'),
  row('stg', 'Closed lost', 'lost'),

  row('act', 'Calls', 'call'),
  row('act', 'Incoming Call – Communication', 'call'),
  row('act', 'WhatsApp Communication', 'wa'),
  row('act', 'Chatbot Communication', 'wa'),
  row('act', 'Email Inquiry Copy', 'wa'),
  row('act', 'Meetings and viewings', 'view'),
  row('act', 'Offers and negotiation', 'offer'),
  row('act', 'Closing', 'deal'),
  row('act', 'After Sales · Handover Workflow', 'handover'),
  row('act', 'Client Complaint Category', 'complaint'),
  row('act', 'Lease Renewal', 'renewal'),
  row('act', 'Renewal Notice', 'renewal'),
  row('act', 'Non-Renewal Notice', 'renewal'),
  row('act', 'Maintenance', 'ticket'),
  row('act', 'Survey Completed', 'survey'),
  row('act', 'Automatic', 'ignore'),
  row('act', 'Property management', 'ignore'),
]

/** A fresh, editable copy of the default mapping (the mock store keeps one). */
export function buildCrmMapping(): CrmMapping {
  return { rows: CRM_MAPPING_ROWS.map((r) => ({ ...r })), options: CRM_MAPPING_OPTIONS }
}

/** Counts shown on the page, from the data (the prototype's own sentence disagrees with its tables). `portal*` excludes "Ignore". */
export function mappingCounts(mapping: CrmMapping = { rows: CRM_MAPPING_ROWS, options: CRM_MAPPING_OPTIONS }) {
  const real = (k: MappingKind) => mapping.options[k].filter((x) => x.id !== 'ignore').length
  const rows = (k: MappingKind) => mapping.rows.filter((r) => r.kind === k).length
  return {
    sources: { crm: rows('src'), portal: real('src') },
    stages: { crm: rows('stg'), portal: real('stg') },
    events: { crm: rows('act'), portal: real('act') },
  }
}
