import type { CSSProperties, ReactNode } from 'react'
import type { ProductId } from '../../types'
import { PRODUCTS } from '../../data/products'

export function Chip({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'crit' | 'accent' | 'neutral'; children: ReactNode }) {
  const cls = tone === 'neutral' ? 'chip' : `chip ${tone}`
  return <span className={cls}>{children}</span>
}

export function ProductTag({ productId, lang }: { productId: ProductId; lang: 'en' | 'ar' }) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) return null
  return (
    <span className="product-tag" style={{ '--c': `var(${product.colorVar})` } as CSSProperties}>
      {product.name[lang]}
    </span>
  )
}
