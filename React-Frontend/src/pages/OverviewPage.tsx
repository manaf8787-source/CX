import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { MONTHLY_PACK_BUTTON, OVERVIEW_NEXT } from '@/data/steps'
import { Button } from '@/components/ui/button'
import { LandingBrief } from '@/components/home/LandingBrief'
import { NextBox } from '@/components/common/NextBox'
import { PageHeader } from '@/components/common/PageHeader'
import SettingsOverview from './settings/Overview'

/**
 * "6 · CX indicators" (v40 F08): the Overview, moved out of Settings. `/settings/overview` redirects here.
 * Step 6 of the line (Report): the next-step box says that Agent 9 writes the Monthly CX pack from these same numbers
 * on the first working day and the CX manager releases it; its button opens the Monthly pack for a role that may open it.
 */
export default function OverviewPage() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canOpenPack = canAccessPath(role.id, '/settings/monthly-pack')
  return (
    <div data-density="comfortable" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t('6 · Report', '6 · تقرير')}
        title={t('CX indicators', 'مؤشرات تجربة العملاء')}
        description={t('Headline experience scores, per product: never one blended number.', 'مؤشرات التجربة الرئيسية لكل منتج: دون رقم إجمالي واحد أبداً.')}
      />
      {/* v40 F09: the Internal Audit and Marketing Lead lands here, not on Home, so the Daily brief sits at the top of this page. */}
      <LandingBrief roles={['auditmkt']} />
      <NextBox
        next={OVERVIEW_NEXT}
        action={
          canOpenPack ? (
            <Button size="sm" variant="outline" asChild>
              <Link to="/settings/monthly-pack">{L(MONTHLY_PACK_BUTTON)}</Link>
            </Button>
          ) : undefined
        }
      />
      <SettingsOverview hideHeader />
    </div>
  )
}
