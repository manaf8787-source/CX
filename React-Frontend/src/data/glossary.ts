import type { GlossaryTerm } from '../types'

/** "What the terms mean" (NFR-6) — the source for every "?" affordance
 * sitewide. Ported from `frontend/src/pages/Glossary.tsx`'s term list and
 * extended with v38-specific terms the old scaffold had no page for
 * (runaway types, pattern thresholds, close the loop, evidence envelope). */
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { term: { en: 'NPS', ar: 'مؤشر NPS' }, definition: { en: 'Net Promoter Score: promoters minus detractors, as a percentage of respondents.', ar: 'مؤشر الترويج الصافي: المروّجون ناقص المنتقدين، كنسبة مئوية من المستجيبين.' } },
  { term: { en: 'CSAT', ar: 'CSAT' }, definition: { en: 'Customer Satisfaction: the share of respondents who rated their experience positively.', ar: 'رضا العميل: نسبة المستجيبين الذين قيّموا تجربتهم بشكل إيجابي.' } },
  { term: { en: 'CES', ar: 'CES' }, definition: { en: 'Customer Effort Score: how easy a specific interaction was, scored on effort, not satisfaction.', ar: 'مؤشر جهد العميل: مدى سهولة تفاعل معيّن، يُقاس بالجهد لا بالرضا.' } },
  { term: { en: 'Mystery Shopper Score', ar: 'نتيجة التسوق السري' }, definition: { en: 'The weighted checklist score from a mystery shopping visit or call; a failed critical item fails the visit regardless of this score.', ar: 'النتيجة المرجّحة لقائمة التحقق من زيارة أو مكالمة تسوق سري؛ فشل أي عنصر حرج يُفشل الزيارة بغض النظر عن هذه النتيجة.' } },
  { term: { en: 'Signal', ar: 'إشارة' }, definition: { en: 'Every complaint, low score, breach, rating or public mention becomes a signal — counted, not worked one by one.', ar: 'كل شكوى أو تقييم منخفض أو خرق أو تقييم أو إشارة عامة تصبح إشارة — تُحصى ولا تُعالج فردياً.' } },
  { term: { en: 'Pattern', ar: 'نمط' }, definition: { en: 'A group of signals past threshold: same agent 3+ times, same issue 5+ times, or 50%+ concentration in one environment, in a 30-day window with a sample of 10+.', ar: 'مجموعة إشارات تجاوزت الحد: نفس الوكيل 3 مرات أو أكثر، نفس المشكلة 5 مرات أو أكثر، أو تركّز 50٪ أو أكثر في بيئة واحدة، خلال نافذة 30 يوماً وبعيّنة 10 أو أكثر.' } },
  { term: { en: 'Runaway customer', ar: 'عميل هارب' }, definition: { en: 'One of six types: went to a competitor, silent lead, frozen deal, did not renew, dormant owner, or complained then left.', ar: 'أحد ستة أنواع: ذهب إلى منافس، عميل محتمل صامت، صفقة مجمّدة، لم يجدّد، مالك خامل، أو اشتكى ثم غادر.' } },
  { term: { en: 'Close the loop', ar: 'إغلاق الحلقة' }, definition: { en: 'Calling every detractor back, confirming what went wrong, and re-surveying 7–14 days later to check recovery.', ar: 'الاتصال بكل عميل منتقد، تأكيد ما حدث من خطأ، وإعادة الاستبيان بعد 7–14 يوماً للتحقق من التعافي.' } },
  { term: { en: 'Evidence / rules applied', ar: 'الدليل / القواعد المطبّقة' }, definition: { en: 'Every AI-generated statement in the portal cites the dated records and configuration rule that produced it — the "How the AI found this" panel.', ar: 'كل عبارة يولّدها الذكاء الاصطناعي في البوابة تستشهد بالسجلات المؤرخة وقاعدة الإعداد التي أنتجتها — لوحة "كيف توصّل الذكاء الاصطناعي لهذا".' } },
  { term: { en: 'Respond clock', ar: 'ساعة الرد' }, definition: { en: 'Working hours from when a case opens until the first response is recorded.', ar: 'ساعات العمل من فتح الحالة حتى تسجيل الرد الأول.' } },
  { term: { en: 'Resolve clock', ar: 'ساعة الحل' }, definition: { en: 'Working hours from when a case opens until the fix is submitted; pauses while waiting on the customer.', ar: 'ساعات العمل من فتح الحالة حتى تقديم الإصلاح؛ تتوقف أثناء انتظار العميل.' } },
  { term: { en: 'Informed only', ar: 'للعلم فقط' }, definition: { en: 'Receives a notice with no task and no access to the case — heads and C-level, for example.', ar: 'يتلقى إشعاراً دون أي مهمة أو صلاحية وصول للحالة — مثل الرؤساء والإدارة العليا.' } },
  { term: { en: 'Corrective action', ar: 'إجراء تصحيحي' }, definition: { en: 'A proposed fix for a pattern, in one of eight kinds; never auto-applied, always needs an owner’s decision.', ar: 'إصلاح مقترح لنمط، من ضمن ثمانية أنواع؛ لا يُطبَّق تلقائياً أبداً، ويحتاج دائماً قرار المالك.' } },
  { term: { en: 'Working hours', ar: 'ساعات العمل' }, definition: { en: 'Monday to Friday, 09:00–18:00. Clocks only count time inside this window.', ar: 'من الإثنين إلى الجمعة، 09:00–18:00. تحتسب الساعات فقط ضمن هذا النطاق.' } },
  { term: { en: 'Environment', ar: 'البيئة' }, definition: { en: 'A team under the PSI umbrella with its own staff, e.g. Dubai, Abu Dhabi.', ar: 'فريق ضمن مظلة بي إس آي له طاقمه الخاص، مثل دبي وأبوظبي.' } },
]
