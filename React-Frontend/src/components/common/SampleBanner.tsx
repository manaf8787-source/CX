import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'

/**
 * NFR-3: every page shows a persistent "sample data, nothing is sent" state. Non-dismissible by design. It is the skill's inline
 * notification: a well (not a coloured banner) with a 6px status dot and the sentence, sized to sit beside 36px pills.
 */
export function SampleBanner({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <span data-slot="sample-banner" className="inline-flex h-9 items-center gap-2 rounded-xl bg-well px-3 pt-px text-sm font-medium whitespace-nowrap text-foreground">
      <span aria-hidden className="dot dot-warning" />
      {children ?? t('Sample data — nothing is sent', 'بيانات تجريبية — لا يتم إرسال شيء')}
    </span>
  )
}
