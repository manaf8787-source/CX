import type { Bi, CorrectiveActionKind } from '../types'

/**
 * Modules KB §6 "AI Insights": each suggested corrective action shows its
 * recovery figure in full ("tried in 14 similar closed cases, the customer
 * recovered in 10, 10 of 14 is 71%"), and "suggestions become proposed
 * corrective actions". The actions and figures are transcribed from the v38
 * prototype export (`SIM`); recovered = round(pct × tried / 100), exactly as
 * the prototype derives it. Sample figures, not real results.
 */
export type InsightCategory = 'communication' | 'attitude' | 'knowledge' | 'speed' | 'process' | 'app'

export interface InsightSuggestion {
  id: string
  text: Bi
  tried: number
  recovered: number
  /** Default kind for the proposed action; the person creating it can change it (KB §6 classification). */
  kind: CorrectiveActionKind
}

export interface InsightCategoryInfo {
  label: Bi
  guidance: Bi
  suggestions: InsightSuggestion[]
}

function s(id: string, en: string, ar: string, pct: number, tried: number, kind: CorrectiveActionKind): InsightSuggestion {
  return { id, text: { en, ar }, tried, recovered: Math.round((pct * tried) / 100), kind }
}

export const INSIGHT_CATEGORIES: Record<InsightCategory, InsightCategoryInfo> = {
  communication: {
    label: { en: 'Communication', ar: 'التواصل' },
    guidance: { en: 'First time: 1 to 1 session. Same agent three or more times in 30 days: involve HR.', ar: 'أول مرة: جلسة 1 إلى 1. نفس الموظف ثلاث مرات أو أكثر خلال 30 يوماً: إشراك الموارد البشرية.' },
    suggestions: [
      s('com-1', '1 to 1 session between the agent and the direct manager, with two recorded calls reviewed', 'جلسة 1 إلى 1 بين الموظف والمدير المباشر مع مراجعة مكالمتين مسجلتين', 78, 31, 'employee'),
      s('com-2', 'Reply-time and tone reminder on the pool, then a mystery shop after 30 days', 'تذكير بوقت الرد والنبرة للمجموعة ثم زيارة متسوق بعد 30 يوماً', 61, 22, 'service_behaviour'),
      s('com-3', 'Refresh the approved script for the first reply', 'تحديث النص المعتمد للرد الأول', 52, 19, 'training_gap'),
    ],
  },
  attitude: {
    label: { en: 'Attitude', ar: 'السلوك' },
    guidance: { en: "Attitude issues go to the HR pool. The agent's direct manager reviews the actions before they count.", ar: 'قضايا السلوك تذهب لمجموعة الموارد البشرية. ويراجع المدير المباشر للموظف الإجراءات قبل اعتمادها.' },
    suggestions: [
      s('att-1', '1 to 1 session with the direct manager, with the customer comment shared', 'جلسة 1 إلى 1 مع المدير المباشر مع مشاركة تعليق العميل', 66, 27, 'employee'),
      s('att-2', 'Involve HR for a formal conversation and a written plan', 'إشراك الموارد البشرية لحوار رسمي وخطة مكتوبة', 58, 14, 'service_behaviour'),
      s('att-3', 'Direct management shadows two customer meetings', 'يرافق المدير المباشر اجتماعين مع العملاء', 63, 11, 'service_behaviour'),
    ],
  },
  knowledge: {
    label: { en: 'Product knowledge', ar: 'المعرفة بالمنتج' },
    guidance: { en: 'Knowledge gaps are fixed with the product owner, not with HR.', ar: 'فجوات المعرفة تُعالج مع مالك المنتج وليس مع الموارد البشرية.' },
    suggestions: [
      s('kno-1', 'Product briefing for the pool by the product owner', 'إحاطة عن المنتج للمجموعة من مالك المنتج', 72, 17, 'training_gap'),
      s('kno-2', 'Add the missing answer to the approved FAQ and share it', 'إضافة الإجابة الناقصة إلى الأسئلة المعتمدة ومشاركتها', 64, 24, 'training_gap'),
    ],
  },
  speed: {
    label: { en: 'Speed of response', ar: 'سرعة الاستجابة' },
    guidance: { en: 'If the same band keeps failing, it is a staffing question for the environment management.', ar: 'إذا تكررت المشكلة في نفس الفترة فهي مسألة توظيف لإدارة البيئة.' },
    suggestions: [
      s('spd-1', 'Rota change so the busy band is always covered', 'تعديل المناوبات لتغطية الفترة المزدحمة دائماً', 69, 13, 'service_behaviour'),
      s('spd-2', 'Auto-reply with an honest wait time', 'رد تلقائي بوقت انتظار صادق', 55, 20, 'process'),
    ],
  },
  process: {
    label: { en: 'Process or procedure', ar: 'الإجراء' },
    guidance: { en: 'Process issues go to the process owner.', ar: 'مشاكل الإجراء تذهب لمالك الإجراء.' },
    suggestions: [
      s('pro-1', 'Fix the step in the procedure and brief the team', 'تصحيح الخطوة في الإجراء وإحاطة الفريق', 74, 29, 'process'),
      s('pro-2', 'Add a check before the step that failed', 'إضافة فحص قبل الخطوة التي فشلت', 60, 16, 'process'),
    ],
  },
  app: {
    label: { en: 'Mobile app', ar: 'تطبيق الجوال' },
    guidance: { en: 'Mobile app issues go to the app product team, not to the sales agents.', ar: 'مشاكل التطبيق تذهب لفريق منتج التطبيق وليس لموظفي المبيعات.' },
    suggestions: [
      s('app-1', 'Raise a defect with the app product team with the screens and the times', 'رفع عيب لفريق منتج التطبيق مع الشاشات والأوقات', 71, 14, 'product_app'),
      s('app-2', 'Add an in-app message that explains the known issue', 'إضافة رسالة داخل التطبيق تشرح المشكلة المعروفة', 57, 7, 'product_app'),
    ],
  },
}

/** Default receiver title per kind (KB §6 classification paths). Titles only,
 * never top management; the exact title per product comes from the
 * escalation matrix, still awaiting the product owners. [Proposed] */
export const DEFAULT_OWNER_BY_KIND: Record<CorrectiveActionKind, Bi> = {
  employee: { en: "Agent's direct manager", ar: 'المدير المباشر للموظف' },
  service_behaviour: { en: 'Environment manager', ar: 'مدير البيئة' },
  training_gap: { en: 'L&D', ar: 'التعلم والتطوير' },
  product_app: { en: 'App product owner', ar: 'مالك منتج التطبيق' },
  process: { en: 'Process owner', ar: 'مالك الإجراء' },
  environment: { en: 'Branch or office manager', ar: 'مدير الفرع أو المكتب' },
  legal_privacy: { en: 'Legal', ar: 'القانونية' },
  marketing: { en: 'Internal Audit and Marketing Lead', ar: 'مسؤول التدقيق الداخلي والتسويق' },
}

export const SMALL_SAMPLE = 10

export function suggestionPercent(x: Pick<InsightSuggestion, 'tried' | 'recovered'>): number {
  return x.tried ? Math.round((x.recovered / x.tried) * 100) : 0
}

export function suggestionSentence(x: Pick<InsightSuggestion, 'tried' | 'recovered'>): Bi {
  const pct = suggestionPercent(x)
  return {
    en: `Tried in ${x.tried} similar closed cases, the customer recovered in ${x.recovered}, ${x.recovered} of ${x.tried} is ${pct}%.`,
    ar: `جُرّب في ${x.tried} حالة مشابهة مغلقة، وتعافى العميل في ${x.recovered}، أي ${x.recovered} من ${x.tried} وهو ${pct}%.`,
  }
}
