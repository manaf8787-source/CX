import { useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Surveys from '@/pages/Surveys'
import { SurveyQuestionsTab } from './SurveyQuestionsTab'
import { SurveyCampaignsTab } from './SurveyCampaignsTab'
import { SurveyDashboardTab } from './SurveyDashboardTab'
import { SurveyCaps } from './SurveyCaps'
import { SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

/**
 * Surveys (22 Nov, owner): one screen with five tabs instead of three Settings pages. Results (what was sent and answered), Questions
 * (the wording, editable), When we ask (the rules and how often), Campaigns (surveys the team sends on purpose, saved by name), Dashboard (the wide view on those campaigns, one at a time or side by side).
 * The CX manager edits questions and the numbers; the CX manager and the CX team create campaigns; every other role that may open
 * Surveys reads. `?tab=` picks the tab, so the old Survey questions and Survey legacy reference addresses land on the right one.
 */
const TABS = ['results', 'questions', 'when', 'campaigns', 'dashboard'] as const
type Tab = (typeof TABS)[number]

export default function SurveysHub() {
  const { t } = useI18n()
  const { role } = useRole()
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(asked ?? '') ? (asked as Tab) : 'results'
  const canEdit = role.id === 'cxmgr'
  const canCreate = role.id === 'cxmgr' || role.id === 'cxteam'

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Surveys', 'الاستبيانات')}
        description={t(
          'What we ask customers, when we ask, and how it went. Ask only after something meaningful, never on a public channel, never more than the caps.',
          'ماذا نسأل العملاء، ومتى نسأل، وكيف سار الأمر. نسأل فقط بعد أمر ذي معنى، وأبداً على قناة عامة، وأبداً أكثر من الحدود المسموحة.',
        )}
      />
      {!canEdit && !canCreate && (
        <ViewOnlyNotice>
          {t('View only. The CX manager changes the questions and the rules.', 'للعرض فقط. يغيّر مدير تجربة العملاء الأسئلة والقواعد.')}
        </ViewOnlyNotice>
      )}
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
        <div className="-m-1 overflow-x-auto p-1">
          <TabsList className="min-w-max" aria-label={t('Surveys', 'الاستبيانات')}>
            <TabsTrigger value="results">{t('Results', 'النتائج')}</TabsTrigger>
            <TabsTrigger value="questions">{t('Questions', 'الأسئلة')}</TabsTrigger>
            <TabsTrigger value="when">{t('When we ask', 'متى نسأل')}</TabsTrigger>
            <TabsTrigger value="campaigns">{t('Campaigns', 'الحملات')}</TabsTrigger>
            <TabsTrigger value="dashboard">{t('Dashboard', 'اللوحة')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="results">
          <Surveys section="results" />
        </TabsContent>
        <TabsContent value="questions">
          <SurveyQuestionsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="when" className="flex flex-col gap-6">
          <SurveyCaps canEdit={canEdit} />
          <Surveys section="when" />
        </TabsContent>
        <TabsContent value="campaigns">
          <SurveyCampaignsTab canCreate={canCreate} />
        </TabsContent>
        <TabsContent value="dashboard">
          <SurveyDashboardTab />
        </TabsContent>
      </Tabs>
    </section>
  )
}

