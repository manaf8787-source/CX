import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { product as findProduct } from '../../data/products'

export function Chip({ kind, children }: { kind?: 'good' | 'warn' | 'crit' | 'acc'; children: ReactNode }) {
  return <span className={`chip ${kind ?? ''}`}>{children}</span>
}

export function ProductTag({ productId }: { productId: string }) {
  const { L } = useI18n()
  const p = findProduct(productId)
  if (!p) return null
  return (
    <span className="ptag" style={{ ['--c' as string]: `var(${p.colorVar})` }}>
      {L(p.name)}
    </span>
  )
}

export function SampleBanner() {
  const { t } = useI18n()
  return <span className="sample">{t('Sample data — nothing is sent', 'بيانات تجريبية — لا يتم إرسال أي شيء')}</span>
}

export function PhaseTag({ phase }: { phase: number }) {
  const { t } = useI18n()
  return <span className="phase-tag">{t(`Phase ${phase}`, `المرحلة ${phase}`)}</span>
}
