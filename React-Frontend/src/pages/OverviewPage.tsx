// FOUNDATION STUB: owner = workstream C (wrapper that gives the moved Overview its page heading at /overview; C adds the next-step box and the Monthly pack button).
import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/common/PageHeader'
import SettingsOverview from './settings/Overview'

/** "6 · CX indicators" (v40 F08): the Overview, moved out of Settings. `/settings/overview` redirects here. */
export default function OverviewPage() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('6 · Report', '6 · تقرير')}
        title={t('CX indicators', 'مؤشرات تجربة العملاء')}
        description={t('Headline experience scores, per product: never one blended number.', 'مؤشرات التجربة الرئيسية لكل منتج: دون رقم إجمالي واحد أبداً.')}
      />
      <SettingsOverview hideHeader />
    </div>
  )
}
