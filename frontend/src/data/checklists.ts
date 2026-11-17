import type { Checklist, ChecklistItem, Scenario } from '../types'

let seq = 0
function ci(text: { en: string; ar: string }, section: string, weight: number, opts: Partial<Pick<ChecklistItem, 'type' | 'critical' | 'evidence' | 'evidenceKinds'>> = {}): ChecklistItem {
  seq++
  return {
    id: `item${seq}`,
    text,
    section,
    weight,
    type: opts.type ?? 'passfail',
    critical: !!opts.critical,
    evidence: opts.evidence ?? 'none',
    evidenceKinds: opts.evidenceKinds ?? [],
  }
}

const GREETING = { en: 'Greeting and opening', ar: 'الترحيب والافتتاح' }
const NEEDS = { en: 'Understanding needs', ar: 'فهم الاحتياجات' }
const INFO = { en: 'Information accuracy', ar: 'دقة المعلومات' }
const CLOSE = { en: 'Closing and follow-up', ar: 'الختام والمتابعة' }

export const CHECKLISTS: Checklist[] = [
  {
    id: 'cl_re_digital',
    name: { en: 'Real Estate: digital lead (WhatsApp/web/social)', ar: 'العقارات: عميل محتمل رقمي (واتساب/ويب/سوشيال)' },
    channel: 'digital', product: 're', status: 'published', version: 3,
    items: [
      ci({ en: 'Responded within 5 minutes', ar: 'تم الرد خلال 5 دقائق' }, GREETING.en, 20, { critical: true, evidence: 'required', evidenceKinds: ['screenshot'] }),
      ci({ en: 'Greeted professionally and gave their name', ar: 'رحّب باحترافية وذكر اسمه' }, GREETING.en, 10),
      ci({ en: 'Asked qualifying questions about budget and needs', ar: 'طرح أسئلة لتحديد الميزانية والاحتياجات' }, NEEDS.en, 20, { type: 'scale' }),
      ci({ en: 'Gave accurate project and pricing information', ar: 'قدّم معلومات دقيقة عن المشروع والأسعار' }, INFO.en, 25, { critical: true }),
      ci({ en: 'Proposed a clear next step (viewing, call, visit)', ar: 'اقترح خطوة تالية واضحة (معاينة، اتصال، زيارة)' }, CLOSE.en, 15),
      ci({ en: "Shopper's notes", ar: 'ملاحظات المتسوق' }, CLOSE.en, 10, { type: 'text' }),
    ],
  },
  {
    id: 'cl_re_call',
    name: { en: 'Real Estate: AI call center lead', ar: 'العقارات: عميل محتمل عبر مركز الاتصال الذكي' },
    channel: 'call', product: 're', status: 'published', version: 2,
    items: [
      ci({ en: 'Called within the allowed hours', ar: 'تم الاتصال ضمن الساعات المسموحة' }, GREETING.en, 20, { critical: true }),
      ci({ en: 'Disclosed it is an AI assistant', ar: 'أفصح أنه مساعد ذكاء اصطناعي' }, GREETING.en, 15, { critical: true }),
      ci({ en: 'Understood the stated need correctly', ar: 'فهم الاحتياج المذكور بشكل صحيح' }, NEEDS.en, 20, { type: 'scale' }),
      ci({ en: 'Handed over to a human when asked', ar: 'حوّل إلى موظف بشري عند الطلب' }, CLOSE.en, 25, { critical: true }),
      ci({ en: 'Call recording attached', ar: 'تم إرفاق تسجيل المكالمة' }, CLOSE.en, 20, { evidence: 'required', evidenceKinds: ['audio'] }),
    ],
  },
  {
    id: 'cl_re_branch',
    name: { en: 'Real Estate: branch / gallery visit', ar: 'العقارات: زيارة فرع / معرض' },
    channel: 'branch', product: 're', status: 'published', version: 4,
    items: [
      ci({ en: 'Greeted within 2 minutes of arrival', ar: 'تم الترحيب خلال دقيقتين من الوصول' }, GREETING.en, 15, { evidence: 'required', evidenceKinds: ['photo'] }),
      ci({ en: 'Gallery was staffed and tidy', ar: 'المعرض كان مجهزاً بالموظفين ومرتباً' }, GREETING.en, 15, { critical: true, evidence: 'required', evidenceKinds: ['photo'] }),
      ci({ en: 'Agent understood budget and preferences', ar: 'فهم الوكيل الميزانية والتفضيلات' }, NEEDS.en, 20, { type: 'scale' }),
      ci({ en: 'No unapproved discount offered', ar: 'لم يُعرض خصم غير معتمد' }, INFO.en, 25, { critical: true }),
      ci({ en: 'Agent followed up within 24 hours', ar: 'تابع الوكيل خلال 24 ساعة' }, CLOSE.en, 25),
    ],
  },
  {
    id: 'cl_re_app',
    name: { en: 'Real Estate: app user journey', ar: 'العقارات: رحلة مستخدم التطبيق' },
    channel: 'app', product: 're', status: 'published', version: 1,
    items: [
      ci({ en: 'In-app enquiry acknowledged same day', ar: 'تم الرد على الاستفسار داخل التطبيق في نفس اليوم' }, GREETING.en, 25, { critical: true, evidence: 'required', evidenceKinds: ['screenshot'] }),
      ci({ en: 'Information in-app matched what the agent said', ar: 'تطابقت معلومات التطبيق مع ما ذكره الوكيل' }, INFO.en, 30, { critical: true }),
      ci({ en: 'Overall app experience', ar: 'تجربة التطبيق بشكل عام' }, CLOSE.en, 20, { type: 'scale' }),
      ci({ en: "Shopper's notes", ar: 'ملاحظات المتسوق' }, CLOSE.en, 25, { type: 'text' }),
    ],
  },
  {
    id: 'cl_ev_checkin',
    name: { en: 'PSI Events: check-in and on-site experience', ar: 'فعاليات بي إس آي: التسجيل والتجربة في الموقع' },
    channel: 'event', product: 'ev', status: 'draft', version: 1,
    items: [
      ci({ en: 'Check-in queue under 10 minutes', ar: 'طابور التسجيل أقل من 10 دقائق' }, GREETING.en, 30),
      ci({ en: 'Staff were briefed on the event content', ar: 'كان الموظفون على دراية بمحتوى الفعالية' }, NEEDS.en, 30, { type: 'scale' }),
      ci({ en: "Shopper's notes", ar: 'ملاحظات المتسوق' }, CLOSE.en, 40, { type: 'text' }),
    ],
  },
  {
    id: 'cl_af_call',
    name: { en: 'After-Sales: outbound call quality', ar: 'ما بعد البيع: جودة المكالمة الصادرة' },
    channel: 'call', product: 'af', status: 'draft', version: 1,
    items: [
      ci({ en: 'Called within allowed hours (09:00–20:00)', ar: 'تم الاتصال ضمن الساعات المسموحة (09:00–20:00)' }, GREETING.en, 25, { critical: true }),
      ci({ en: 'Used the correct survey version for unit status', ar: 'استخدم نسخة الاستبيان الصحيحة حسب حالة الوحدة' }, INFO.en, 35, { critical: true }),
      ci({ en: 'Tone and professionalism', ar: 'النبرة والاحترافية' }, CLOSE.en, 40, { type: 'scale' }),
    ],
  },
]

export function checklist(id: string): Checklist | undefined {
  return CHECKLISTS.find((c) => c.id === id)
}

export const SCENARIOS: Scenario[] = [
  { id: 'sc_digital_buy', channel: 'digital', title: { en: 'Looking to buy a 2-bedroom unit', ar: 'يبحث عن شراء وحدة غرفتي نوم' }, tests: { en: 'Response time, qualification, pricing accuracy', ar: 'وقت الاستجابة، التأهيل، دقة الأسعار' } },
  { id: 'sc_digital_rent', channel: 'digital', title: { en: 'Enquiring about rental availability', ar: 'يستفسر عن توفر وحدات للإيجار' }, tests: { en: 'Channel handoff, response time', ar: 'تحويل القناة، وقت الاستجابة' } },
  { id: 'sc_call_general', channel: 'call', title: { en: 'General project enquiry by phone', ar: 'استفسار عام عن المشروع عبر الهاتف' }, tests: { en: 'AI disclosure, allowed hours, handover', ar: 'الإفصاح عن الذكاء الاصطناعي، الساعات المسموحة، التحويل' } },
  { id: 'sc_branch_walkin', channel: 'branch', title: { en: 'Walk-in couple comparing two projects', ar: 'زوجان يزوران المعرض لمقارنة مشروعين' }, tests: { en: 'Staffing, greeting time, discount discipline', ar: 'التوظيف، وقت الترحيب، الانضباط في الخصومات' } },
  { id: 'sc_app_support', channel: 'app', title: { en: 'In-app question about payment plan', ar: 'سؤال داخل التطبيق عن خطة الدفع' }, tests: { en: 'Response time, information consistency', ar: 'وقت الاستجابة، اتساق المعلومات' } },
  { id: 'sc_event_launch', channel: 'event', title: { en: 'Attending a project launch event', ar: 'حضور فعالية إطلاق مشروع' }, tests: { en: 'Check-in speed, staff knowledge', ar: 'سرعة التسجيل، معرفة الموظفين' } },
]
