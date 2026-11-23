import { useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PerformanceReport } from '@/components/performance/PerformanceReport'
import TeamAvailability from '@/pages/settings/TeamAvailability'

/**
 * The CX manager's team performance report (22 Nov): his CX team only, for appraisal; exportable for the period chosen.
 * 23 Nov (owner): the team's leave (Team availability) is a second tab here, next to how the team performs, instead of a Settings page.
 */
export default function Performance() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'availability' ? 'availability' : 'performance'
  return (
    <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
      <TabsList aria-label={t('Team performance', 'أداء الفريق')}>
        <TabsTrigger value="performance">{t('Performance', 'الأداء')}</TabsTrigger>
        <TabsTrigger value="availability">{t('Availability (leave)', 'التوفّر (الإجازات)')}</TabsTrigger>
      </TabsList>
      <TabsContent value="performance">
        <PerformanceReport scope="team" canExport />
      </TabsContent>
      <TabsContent value="availability">
        <TeamAvailability />
      </TabsContent>
    </Tabs>
  )
}
