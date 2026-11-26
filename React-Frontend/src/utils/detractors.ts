import type { ProductId } from '@/types'
import type { ResponseInstrument, SurveyResponse } from '@/services/surveyResponses'
import { INCLUDES } from '@/utils/indicators'

/** The detractors of one product (PSI Real Estate includes After-Sales), or of every product when unset. */
export function productScope(productId?: ProductId): ProductId[] | undefined {
  return productId ? [productId, ...(INCLUDES[productId] ?? [])] : undefined
}

/** Detractors in scope: instrument, products, environment. Used by the page and by the daily brief. */
export function detractorsInScope(all: readonly SurveyResponse[], instrument: ResponseInstrument, products: readonly ProductId[] | undefined, env: string) {
  return all.filter(
    (r) =>
      r.group === 'detractor' && r.instrument === instrument && (!products || products.includes(r.product)) && (env === 'all' || !r.envId || r.envId === env),
  )
}
