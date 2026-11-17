import type { CSSProperties, ReactNode } from 'react'
import type { ProductId } from '@/types'
import { PRODUCTS } from '@/data/products'
import { LEVEL_TONE } from '@/lib/status'
import { StatusBadge } from './StatusBadge'

/** Legacy-compatible API; renders the shared StatusBadge. */
export function Chip({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'crit' | 'accent' | 'neutral'; children: ReactNode }) {
  return <StatusBadge tone={LEVEL_TONE[tone]}>{children}</StatusBadge>
}

/** Product hues fall below 4.5:1 as text, so the hue lives in the dot and the label stays foreground. */
export function ProductTag({ productId, lang }: { productId: ProductId; lang: 'en' | 'ar' }) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) return null
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-medium whitespace-nowrap text-foreground"
      style={{ '--c': `var(${product.colorVar})` } as CSSProperties}
    >
      <span aria-hidden className="size-2 rounded-full bg-(--c)" />
      {product.name[lang]}
    </span>
  )
}
