import { FlaskConical } from 'lucide-react'
import { useI18n } from '@/i18n'
import { StatusBadge } from './StatusBadge'

/** NFR-3 — every page shows a persistent "sample data, nothing is sent" state. Non-dismissible by design. */
export function SampleBanner() {
  const { t } = useI18n()
  return (
    <StatusBadge tone="warning" icon={<FlaskConical aria-hidden />}>
      {t('Sample data — nothing is sent', 'بيانات تجريبية — لا يتم إرسال شيء')}
    </StatusBadge>
  )
}
