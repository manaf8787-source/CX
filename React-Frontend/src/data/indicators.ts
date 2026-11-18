import type { Bi } from '../types'

const b = (en: string, ar: string): Bi => ({ en, ar })

export type IndicatorKind = 'nps' | 'csat' | 'ces'

/**
 * Colour thresholds of the per-product indicator tiles (v40 F03). Not in the KB: [Proposed].
 * A value at or above `good` is good, at or above `warn` is warning, below is critical.
 */
export const INDICATOR_THRESHOLDS: Record<IndicatorKind, { good: number; warn: number }> = {
  nps: { good: 30, warn: 0 },
  csat: { good: 80, warn: 65 },
  ces: { good: 75, warn: 60 },
}

/** The plain sentence under each indicator (v40 S1). */
export const INDICATOR_SENTENCE: Record<IndicatorKind, Bi> = {
  nps: b('would recommend us', 'يوصون بنا'),
  csat: b('happy with the last step', 'راضون عن آخر خطوة'),
  ces: b('found it easy', 'وجدوها سهلة'),
}

/** Home indicators block copy (v40 S1). `{n}` and `{product}` are filled by the caller. */
export const INDICATOR_COPY = {
  heading: b('How customers feel, per product', 'كيف يشعر الزبائن، لكل منتج'),
  termsButton: b('What the terms mean', 'ماذا تعني المصطلحات'),
  meta: (n: number): Bi => b(`${n} answers, 90 days`, `${n} إجابة، 90 يوماً`),
  open: (product: Bi): Bi => b(`Open ${product.en}`, `افتح ${product.ar}`),
  allNumbers: b('All numbers', 'كل الأرقام'),
  /** The indicators are per product and not narrowed by the environment switch (no per-environment sample size). */
  envHint: b('Indicators are per product; the environment switch does not narrow them.', 'المؤشرات لكل منتج؛ مفتاح البيئة لا يضيّقها.'),
}
