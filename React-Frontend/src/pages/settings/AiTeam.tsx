import { StepLine } from '@/components/home/StepLine'
import { WatchTeamButton } from '@/components/home/WatchTeamButton'
import { Card, CardContent } from '@/components/ui/card'
import { HOME_COPY } from '@/data/steps'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import IntelligentCxTeam from '@/pages/IntelligentCxTeam'
import WatchTeam from './WatchTeam'
import AiAssessment from './AiAssessment'
import AgentSettings from './AgentSettings'
import { EmbeddedPage, SubPageHeader } from './SubPageHeader'

/**
 * The AI team (owner's request, 23 Nov): "How the portal works (the AI team)" and "Watch the AI team work" in one page with two tabs.
 * The old addresses (/intelligent-cx-team and /settings/watch-ai-team) redirect here, to the matching tab.
 */
export default function AiTeam() {
  const { t, L } = useI18n()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab = raw === 'watch' || raw === 'results' || raw === 'settings' ? raw : 'how'
  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('The AI team', 'فريق الذكاء الاصطناعي')}
        description={t(
          'Who the AI agents are and what each one does, a replay of them working on a real-looking case, and how well the campaign AI agent and the QA layers perform.',
          'من هم وكلاء الذكاء الاصطناعي وماذا يفعل كل منهم، وإعادة تشغيل لعملهم على حالة تشبه الحقيقية، ومدى جودة أداء وكيل حملات الذكاء الاصطناعي وطبقات QA.',
        )}
      />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
        <TabsList aria-label={t('The AI team', 'فريق الذكاء الاصطناعي')}>
          <TabsTrigger value="how">{t('How it works', 'كيف يعمل')}</TabsTrigger>
          <TabsTrigger value="watch">{t('Watch it work', 'شاهده يعمل')}</TabsTrigger>
          {/* 23 Nov (owner): how well the campaign AI agent and the QA layers perform */}
          <TabsTrigger value="results">{t('Results and assessment', 'النتائج والتقييم')}</TabsTrigger>
          {/* 24 Nov (owner): per-agent on/paused, mode, confidence line and reviewer */}
          <TabsTrigger value="settings">{t('Settings', 'الإعدادات')}</TabsTrigger>
        </TabsList>
        <TabsContent value="how" className="flex flex-col gap-4">
          {/* 25 Nov (owner): the six steps the AI works through (Listen, Signal, Pattern, Fix, Check, Report) moved here from Home */}
          <Card>
            <CardContent className="flex flex-col gap-7">
              <div className="flex min-w-0 flex-col gap-1.5">
                <h2 className="t-card-title">{L(HOME_COPY.h1)}</h2>
                <p className="t-body-m max-w-[72ch]">{L(HOME_COPY.lede)}</p>
              </div>
              <StepLine />
              <WatchTeamButton />
            </CardContent>
          </Card>
          <EmbeddedPage>
            <IntelligentCxTeam />
          </EmbeddedPage>
        </TabsContent>
        <TabsContent value="watch">
          <EmbeddedPage>
            <WatchTeam />
          </EmbeddedPage>
        </TabsContent>
        <TabsContent value="results">
          <AiAssessment />
        </TabsContent>
        <TabsContent value="settings">
          <AgentSettings />
        </TabsContent>
      </Tabs>
    </section>
  )
}
