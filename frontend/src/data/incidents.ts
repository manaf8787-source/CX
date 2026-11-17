import type { Incident } from '../types'

// Sample incidents are generated relative to "now" (not a frozen demo date)
// so the SLA clocks always show a realistic mix of on-track/at-risk/breached
// whenever the app is opened — see lib/sla.ts for the clock engine itself.
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-1001', typeId: 'af_handover_missed', product: 'af', channel: 'call', source: 'survey', environment: 'Dubai',
    title: { en: 'Handover delayed 3 weeks, no notice given', ar: 'تأخر التسليم 3 أسابيع دون إشعار' },
    openedAt: hoursAgo(26), status: 'open', pausedMinutes: 0, manualEscalationLevel: 0,
    preventiveActionRequired: true,
    proposedActions: [
      { n: 1, text: 'Call the customer today with a firm new handover date', decision: 'pending' },
      { n: 2, text: 'Escalate to the developer liaison for a written explanation', decision: 'pending' },
    ],
    managerReviewState: 'n/a',
    timeline: [{ at: hoursAgo(26), role: 'cxteam', text: { en: 'Case opened from survey rule (handover delayed)', ar: 'تم فتح الحالة من قاعدة الاستبيان (تأخر التسليم)' } }],
  },
  {
    id: 'INC-1002', typeId: 'af_snagging', product: 'af', channel: 'call', source: 'survey', environment: 'Dubai',
    title: { en: 'Snagging list from handover still not fixed', ar: 'لم تُعالج قائمة ملاحظات التشطيب بعد التسليم' },
    openedAt: hoursAgo(70), firstResponseAt: hoursAgo(60), status: 'progress', pausedMinutes: 0, manualEscalationLevel: 0,
    rootCauseCategory: 'process', rootCauseExplanation: 'Maintenance contractor backlog after handover wave.',
    preventiveActionRequired: true,
    proposedActions: [
      { n: 1, text: 'Schedule maintenance visit within 3 working days', decision: 'confirmed' },
      { n: 2, text: 'Weekly backlog review with the contractor', decision: 'modified', note: 'Changed to bi-weekly given contractor capacity' },
    ],
    managerReviewState: 'pending',
    timeline: [
      { at: hoursAgo(70), role: 'cxteam', text: { en: 'Case opened from survey rule (snagging rated 2 or lower)', ar: 'تم فتح الحالة من قاعدة الاستبيان (تقييم التشطيب 2 أو أقل)' } },
      { at: hoursAgo(60), role: 'aslead', text: { en: 'First response: contacted customer, scheduling a visit', ar: 'الرد الأول: تم التواصل مع العميل لتحديد موعد الزيارة' } },
    ],
  },
  {
    id: 'INC-1003', typeId: 'af_payment_dispute', product: 'af', channel: 'digital', source: 'ticket', environment: 'Abu Dhabi',
    title: { en: 'Customer disputes a service charge on the statement', ar: 'يعترض العميل على رسوم خدمة في كشف الحساب' },
    openedAt: hoursAgo(3), status: 'open', pausedMinutes: 0, manualEscalationLevel: 0,
    preventiveActionRequired: false,
    proposedActions: [{ n: 1, text: 'Finance to re-issue a corrected statement', decision: 'pending' }],
    managerReviewState: 'n/a',
    timeline: [{ at: hoursAgo(3), role: 'cxteam', text: { en: 'Case opened — linked to a product-app ticket', ar: 'تم فتح الحالة — مرتبطة بتذكرة من تطبيق المنتج' } }],
  },
  {
    id: 'INC-1004', typeId: 're_unapproved_discount', product: 're', channel: 'branch', source: 'shopper', environment: 'Dubai',
    title: { en: 'Mystery shopper offered an unapproved 5% discount', ar: 'عُرض على المتسوق السري خصم غير معتمد بنسبة 5٪' },
    openedAt: hoursAgo(130), firstResponseAt: hoursAgo(100), status: 'waiting', pausedMinutes: 2400, pauseStartedAt: hoursAgo(20), manualEscalationLevel: 1,
    rootCauseCategory: 'people',
    preventiveActionRequired: true,
    proposedActions: [{ n: 1, text: 'One-to-one with the agent on discount policy', decision: 'confirmed' }],
    managerReviewState: 'n/a',
    timeline: [
      { at: hoursAgo(130), role: 'cxteam', text: { en: 'Case opened — mystery shopper critical fail', ar: 'تم فتح الحالة — إخفاق حرج في التسوق السري' } },
      { at: hoursAgo(100), role: 'envmgmt', text: { en: 'First response: spoke with the agent', ar: 'الرد الأول: تم التحدث مع الوكيل' } },
      { at: hoursAgo(20), role: 'envmgmt', text: { en: 'Paused — waiting on sales manager written confirmation', ar: 'متوقف — بانتظار تأكيد مدير المبيعات الخطي' } },
    ],
  },
  {
    id: 'INC-1005', typeId: 'ai_no_disclosure', product: 're', channel: 'call', source: 'ai', environment: 'Dubai',
    title: { en: 'AI agent did not disclose it was an AI on an outbound call', ar: 'لم يُفصح الوكيل الذكي أنه ذكاء اصطناعي في مكالمة صادرة' },
    openedAt: hoursAgo(9), status: 'open', pausedMinutes: 0, manualEscalationLevel: 0,
    preventiveActionRequired: false,
    proposedActions: [{ n: 1, text: 'Flag the call for the vendor; confirm script compliance', decision: 'pending' }],
    managerReviewState: 'n/a',
    timeline: [{ at: hoursAgo(9), role: 'cxteam', text: { en: 'Case opened — AI call monitoring flagged a breach', ar: 'تم فتح الحالة — رصد مراقبة المكالمات الذكية خرقاً' } }],
  },
  {
    id: 'INC-1006', typeId: 'call_timing', product: 'af', channel: 'call', source: 'ai', environment: 'Dubai',
    title: { en: 'Customer called at 21:40, outside allowed hours', ar: 'تم الاتصال بالعميل الساعة 21:40، خارج الساعات المسموحة' },
    openedAt: hoursAgo(50), status: 'resolved', resolvedAt: hoursAgo(10), pausedMinutes: 0, manualEscalationLevel: 0,
    rootCauseCategory: 'system', rootCauseExplanation: 'Dialer time-zone misconfiguration for one campaign.',
    correctiveAction: 'Fixed the campaign time-zone setting and re-ran a sample of 20 calls to confirm.',
    preventiveActionRequired: true, preventiveAction: 'Add a pre-launch time-zone check to the campaign checklist.', preventiveActionOwner: 'Call center lead', preventiveActionDue: '2026-11-15',
    proposedActions: [{ n: 1, text: 'Fix dialer time-zone configuration', decision: 'confirmed' }],
    managerReviewState: 'n/a',
    timeline: [
      { at: hoursAgo(50), role: 'cxteam', text: { en: 'Case opened — call timing breach', ar: 'تم فتح الحالة — خرق توقيت الاتصال' } },
      { at: hoursAgo(40), role: 'aslead', text: { en: 'First response: escalated to the call center vendor', ar: 'الرد الأول: تم التصعيد لمزود مركز الاتصال' } },
      { at: hoursAgo(10), role: 'cxteam', text: { en: 'Verified fix and closed with customer apology sent', ar: 'تم التحقق من الإصلاح والإغلاق مع إرسال اعتذار للعميل' } },
    ],
  },
  {
    id: 'INC-1007', typeId: 'af_rental_maintenance', product: 'af', channel: 'digital', source: 'survey', environment: 'PSI Assets',
    title: { en: 'AC not repaired after 2 maintenance requests', ar: 'لم يُصلح التكييف بعد طلبي صيانة' },
    openedAt: hoursAgo(14), status: 'open', pausedMinutes: 0, manualEscalationLevel: 0,
    preventiveActionRequired: true,
    proposedActions: [{ n: 1, text: 'Dispatch a senior technician within 24 hours', decision: 'pending' }],
    managerReviewState: 'n/a',
    timeline: [{ at: hoursAgo(14), role: 'cxteam', text: { en: 'Case opened from survey rule (maintenance rated low)', ar: 'تم فتح الحالة من قاعدة الاستبيان (تقييم الصيانة منخفض)' } }],
  },
  {
    id: 'INC-1008', typeId: 'hr_attitude', product: 're', channel: 'branch', source: 'staff', environment: 'Dubai',
    title: { en: 'Customer reported rude behaviour from a sales agent', ar: 'أبلغ عميل عن سلوك غير لائق من أحد وكلاء المبيعات' },
    openedAt: hoursAgo(44), firstResponseAt: hoursAgo(30), status: 'progress', pausedMinutes: 0, manualEscalationLevel: 0,
    rootCauseCategory: 'people',
    preventiveActionRequired: true,
    proposedActions: [{ n: 1, text: 'HR to meet with the agent and document the conversation', decision: 'confirmed' }],
    managerReviewState: 'pending',
    timeline: [
      { at: hoursAgo(44), role: 'cxteam', text: { en: 'Case opened and routed to the HR pool', ar: 'تم فتح الحالة وتوجيهها لمجموعة الموارد البشرية' } },
      { at: hoursAgo(30), role: 'hrspec', text: { en: 'First response: contacted the customer to apologise', ar: 'الرد الأول: تم التواصل مع العميل للاعتذار' } },
    ],
  },
  {
    id: 'INC-1009', typeId: 'other', product: 're', channel: 'app', source: 'staff', environment: 'Abu Dhabi',
    title: { en: 'App showed an outdated floor plan', ar: 'عرض التطبيق مخططاً قديماً للوحدة' },
    openedAt: hoursAgo(5), status: 'open', pausedMinutes: 0, manualEscalationLevel: 0,
    preventiveActionRequired: false,
    proposedActions: [{ n: 1, text: 'Update the floor plan asset in the app CMS', decision: 'pending' }],
    managerReviewState: 'n/a',
    timeline: [{ at: hoursAgo(5), role: 'cxteam', text: { en: 'Case opened — reported by staff', ar: 'تم فتح الحالة — بلاغ من موظف' } }],
  },
  {
    id: 'INC-1010', typeId: 'af_finishing_quality', product: 'af', channel: 'call', source: 'survey', environment: 'Dubai',
    title: { en: 'Paint and tiling quality below expectation', ar: 'جودة الدهان والبلاط أقل من المتوقع' },
    openedAt: hoursAgo(200), firstResponseAt: hoursAgo(180), status: 'closed', resolvedAt: hoursAgo(20), pausedMinutes: 0, manualEscalationLevel: 0,
    rootCauseCategory: 'third_party', rootCauseExplanation: 'Subcontractor did not follow the finishing spec on 3 units.',
    correctiveAction: 'Re-did the affected surfaces; subcontractor QA sign-off added before handover.',
    preventiveActionRequired: true, preventiveAction: 'Add a finishing QA checkpoint before handover for this subcontractor.', preventiveActionOwner: 'Developer liaison', preventiveActionDue: '2026-11-10',
    proposedActions: [{ n: 1, text: 'Re-work affected surfaces and add a QA checkpoint', decision: 'confirmed' }],
    managerReviewState: 'n/a',
    timeline: [
      { at: hoursAgo(200), role: 'cxteam', text: { en: 'Case opened from survey rule', ar: 'تم فتح الحالة من قاعدة الاستبيان' } },
      { at: hoursAgo(180), role: 'dev_liaison', text: { en: 'First response: site visit scheduled', ar: 'الرد الأول: تحديد موعد زيارة الموقع' } },
      { at: hoursAgo(20), role: 'cxteam', text: { en: 'Verified and closed — customer confirmed satisfaction', ar: 'تم التحقق والإغلاق — أكد العميل رضاه' } },
    ],
  },
]

export function incident(id: string): Incident | undefined {
  return INCIDENTS.find((i) => i.id === id)
}
