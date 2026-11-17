import { useI18n } from '../../i18n'

/** NFR-3 — every page must be able to show a persistent "prototype/sample
 * data, nothing is sent" state. Non-dismissible by design. */
export function SampleBanner() {
  const { t } = useI18n()
  return <span className="sample-chip">{t('Sample data — nothing is sent', 'بيانات تجريبية — لا يتم إرسال شيء')}</span>
}
