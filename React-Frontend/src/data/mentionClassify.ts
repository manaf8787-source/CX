import type { ProductId } from '../types'

/**
 * Agent 2 on a public comment (owner, 23 Nov): which product it is about and which environment, with how sure it is.
 *
 * - When the comment sits on a product's own page (its app on Google Play or the App Store, its website), the product comes from the
 *   page: certain.
 * - Otherwise Agent 2 reads the text. Prototype: keyword rules stand in for the model; in the real platform Agent 2 (an LLM) reads the
 *   comment, the post it is under and the page, and returns the product, the environment and a confidence.
 * - Below the confidence line, or when two products fit equally, it says "not classified" and a person chooses. A person's choice
 *   always wins, and every correction goes to the auditor's weekly sample so Agent 2 is checked.
 */
export const CONFIDENCE_LINE = 0.7

const PRODUCT_WORDS: Record<ProductId, RegExp> = {
  to: /\b(tour estate|tour|guide|driver|desert|safari|city tour|sightseeing)\b/i,
  wl: /\b(wallet|portfolio)\b/i,
  cl: /\b(club|member|membership|referral)\b/i,
  ev: /\b(event|expo|launch event|exhibition)\b/i,
  af: /\b(handover|snagging|service charge|maintenance|deposit|refund|rental|tenant|lease|leasing|renewal)\b/i,
  re: /\b(viewing|listing|agent|payment plan|price|floor plan|commission|off-plan|unit|chatbot|ai assistant|buy)\b/i,
}

const ENV_WORDS: [string, RegExp][] = [
  ['Abu Dhabi', /\b(abu dhabi|reem island|saadiyat|yas island|al raha)\b/i],
  ['Dubai', /\b(dubai|marina|downtown|jvc|business bay|dubai hills|dubai frame)\b/i],
]

export interface Classified {
  productId: ProductId | null
  /** 0 to 1. */
  confidence: number
  /** Where the product came from. */
  productFrom: 'page' | 'ai'
  /** The environment short label, '' when not known. */
  environment: string
  envFrom: 'page' | 'ai' | 'none'
}

export function classifyMention(text: string, pageEnvironment: string, pageProduct?: ProductId): Classified {
  let productId: ProductId | null = null
  let confidence = 0
  let productFrom: Classified['productFrom'] = 'ai'
  if (pageProduct) {
    productId = pageProduct
    confidence = 0.99
    productFrom = 'page'
  } else {
    const hits = (Object.keys(PRODUCT_WORDS) as ProductId[])
      .map((p) => ({ p, n: (text.match(new RegExp(PRODUCT_WORDS[p], 'gi')) ?? []).length }))
      .filter((h) => h.n > 0)
    hits.sort((a, b) => b.n - a.n)
    if (hits.length && (hits.length === 1 || hits[0].n > hits[1].n)) {
      productId = hits[0].p
      confidence = Math.min(0.96, 0.72 + 0.1 * hits[0].n - 0.05 * (hits.length - 1))
    } else if (hits.length) {
      // two products fit equally: Agent 2 is not sure enough
      confidence = 0.45
    }
    if (confidence < CONFIDENCE_LINE) productId = null
  }
  let environment = pageEnvironment
  let envFrom: Classified['envFrom'] = pageEnvironment ? 'page' : 'none'
  if (!environment) {
    const hit = ENV_WORDS.find(([, re]) => re.test(text))
    if (hit) {
      environment = hit[0]
      envFrom = 'ai'
    }
  }
  return { productId, confidence, productFrom, environment, envFrom }
}
