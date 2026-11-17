import type { Bi, ProductId } from '../types'

export interface SuggestedAction {
  id: string
  category: Bi
  product: ProductId
  environment?: string
  evidence: Bi
  similarCases: number
  successRate: number
  suggestedAction: Bi
}

// Human-curated sample suggestions presented as "AI Insights" — the docs are
// explicit that nothing becomes a case until the CX manager approves
// (Modules KB section 10).
export const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    id: 'sug1', category: { en: 'Agent attitude', ar: 'سلوك الموظف' }, product: 're', environment: 'Dubai',
    evidence: { en: 'Detractor share for "agent attitude" crossed 90% in Dubai evenings over the last 2 weeks.', ar: 'تجاوزت نسبة المنتقدين لـ"سلوك الموظف" 90٪ في دبي مساءً خلال الأسبوعين الماضيين.' },
    similarCases: 14, successRate: 78,
    suggestedAction: { en: 'One-to-one coaching session with the evening-shift agents', ar: 'جلسة تدريب فردية مع موظفي الوردية المسائية' },
  },
  {
    id: 'sug2', category: { en: 'Handover delays', ar: 'تأخر التسليم' }, product: 'af', environment: 'Dubai',
    evidence: { en: 'Handover-missed cases are up 40% month over month for one developer.', ar: 'ارتفعت حالات تأخر التسليم بنسبة 40٪ شهرياً لدى أحد المطورين.' },
    similarCases: 9, successRate: 62,
    suggestedAction: { en: 'Escalate a structured review with the developer liaison', ar: 'تصعيد مراجعة منظمة مع منسق المطوّر' },
  },
  {
    id: 'sug3', category: { en: 'Unapproved discounts', ar: 'خصومات غير معتمدة' }, product: 're', environment: 'Abu Dhabi',
    evidence: { en: '3 mystery-shopper critical fails on discount policy in Abu Dhabi this quarter.', ar: '3 إخفاقات حرجة في التسوق السري بخصوص سياسة الخصومات في أبوظبي هذا الربع.' },
    similarCases: 6, successRate: 83,
    suggestedAction: { en: 'Refresher training on discount approval limits', ar: 'تدريب تذكيري على حدود اعتماد الخصومات' },
  },
]
