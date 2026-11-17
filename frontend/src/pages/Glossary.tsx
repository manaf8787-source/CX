import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import type { Bi } from '../types'

const TERMS: { term: Bi; def: Bi }[] = [
  { term: { en: 'NPS', ar: 'مؤشر NPS' }, def: { en: 'Net Promoter Score: promoters minus detractors, as a percentage of respondents.', ar: 'مؤشر الترويج الصافي: المروّجون ناقص المنتقدين، كنسبة مئوية من المستجيبين.' } },
  { term: { en: 'CSAT', ar: 'CSAT' }, def: { en: 'Customer Satisfaction: the share of respondents who rated their experience positively.', ar: 'رضا العميل: نسبة المستجيبين الذين قيّموا تجربتهم بشكل إيجابي.' } },
  { term: { en: 'MPS', ar: 'MPS' }, def: { en: 'Mystery Shopper Score: the weighted checklist score from a mystery shopping visit or call.', ar: 'نتيجة التسوق السري: النتيجة المرجّحة لقائمة التحقق من زيارة أو مكالمة تسوق سري.' } },
  { term: { en: 'Detractor share', ar: 'نسبة المنتقدين' }, def: { en: 'The percentage of respondents who are detractors (scored 0–6 on an NPS question).', ar: 'نسبة المستجيبين المنتقدين (قيّموا من 0 إلى 6 في سؤال NPS).' } },
  { term: { en: 'Respond clock', ar: 'ساعة الرد' }, def: { en: 'Working hours from when a case opens until the first response is recorded.', ar: 'ساعات العمل من فتح الحالة حتى تسجيل الرد الأول.' } },
  { term: { en: 'Resolve clock', ar: 'ساعة الحل' }, def: { en: 'Working hours from when a case opens until the fix is submitted; pauses while waiting on the customer.', ar: 'ساعات العمل من فتح الحالة حتى تقديم الإصلاح؛ تتوقف أثناء انتظار العميل.' } },
  { term: { en: 'Working hours', ar: 'ساعات العمل' }, def: { en: 'Monday to Friday, 09:00–18:00. Clocks only count time inside this window.', ar: 'من الإثنين إلى الجمعة، 09:00–18:00. تحتسب الساعات فقط ضمن هذا النطاق.' } },
  { term: { en: 'Case owner', ar: 'مالك الحالة' }, def: { en: 'Always CX — follows the case from opening to close.', ar: 'دائماً فريق تجربة العملاء — يتابع الحالة من الفتح حتى الإغلاق.' } },
  { term: { en: 'Assigned to', ar: 'مُسندة إلى' }, def: { en: 'The person who deals with the case, chosen from the concerned people, never top management.', ar: 'الشخص الذي يتعامل مع الحالة، يُختار من المعنيين، وليس من الإدارة العليا.' } },
  { term: { en: 'Corrective action owner', ar: 'مالك الإجراء التصحيحي' }, def: { en: 'Confirms, modifies or rejects each proposed action. Differs by product.', ar: 'يؤكد أو يعدّل أو يرفض كل إجراء مقترح. يختلف حسب المنتج.' } },
  { term: { en: 'Informed only', ar: 'للعلم فقط' }, def: { en: 'Receives a notice with no task and no access to the case — heads and C-level, for example.', ar: 'يتلقى إشعاراً دون أي مهمة أو صلاحية وصول للحالة — مثل الرؤساء والإدارة العليا.' } },
  { term: { en: 'Proposed action', ar: 'إجراء مقترح' }, def: { en: 'A corrective action CX writes at triage; the owner must confirm, modify or reject it.', ar: 'إجراء تصحيحي يكتبه فريق تجربة العملاء عند الفرز؛ يجب على المالك تأكيده أو تعديله أو رفضه.' } },
  { term: { en: 'Preventive action', ar: 'إجراء وقائي' }, def: { en: 'An action meant to stop the same issue recurring, with an owner, due date and expected effect.', ar: 'إجراء يهدف لمنع تكرار نفس المشكلة، له مالك وتاريخ استحقاق وأثر متوقع.' } },
  { term: { en: 'Environment', ar: 'البيئة' }, def: { en: 'A team under the PSI umbrella with its own staff, e.g. Dubai, Abu Dhabi, PSI Assets.', ar: 'فريق ضمن مظلة بي إس آي له طاقمه الخاص، مثل دبي وأبوظبي وبي إس آي أسيتس.' } },
  { term: { en: 'Pool', ar: 'المجموعة' }, def: { en: 'A group of agents under a team lead, read from the CRM.', ar: 'مجموعة من الوكلاء تحت إشراف قائد فريق، تُقرأ من نظام إدارة علاقات العملاء.' } },
  { term: { en: 'Speed to lead', ar: 'سرعة الاستجابة للعميل المحتمل' }, def: { en: 'For a new digital lead, the system rings the agent pool first; only when an agent picks up does it ring the customer.', ar: 'عند وصول عميل محتمل رقمي جديد، يتصل النظام أولاً بمجموعة الوكلاء؛ ولا يتصل بالعميل إلا بعد رد أحد الوكلاء.' } },
  { term: { en: 'WhatsApp template categories', ar: 'فئات قوالب واتساب' }, def: { en: 'Utility (tied to a specific order/visit/case/task) or Marketing (everything else) — Meta decides and can recategorise.', ar: 'خدمية (مرتبطة بطلب/زيارة/حالة/مهمة محددة) أو تسويقية (كل ما عداها) — تقرر ميتا التصنيف وقد تغيّره.' } },
]

export default function Glossary() {
  const { L, t } = useI18n()
  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Glossary', 'المسرد')} lede={t('Plain definitions for the terms used across the portal.', 'تعريفات مبسّطة للمصطلحات المستخدمة في البوابة.')} />
      <div className="grid g2">
        {TERMS.map((item) => (
          <div className="item" key={L(item.term)}>
            <b>{L(item.term)}</b>
            <p className="sm muted" style={{ marginTop: 3 }}>{L(item.def)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
