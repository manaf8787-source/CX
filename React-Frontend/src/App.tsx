import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './theme/ThemeContext'
import { RoleProvider } from './auth/RoleContext'
import { AuthProvider, RequireAuth } from './auth/AuthContext'
import { Shell } from './components/layout/Shell'
import { EnvScopeProvider } from './components/layout/EnvScopeProvider'
import { UiProviders } from './components/layout/UiProviders'
import { BrandLogo } from './components/common/BrandLogo'
import { pageLoaders } from './routes/pages'

const Login = lazy(pageLoaders.login)
const Home = lazy(pageLoaders.home)
const Customers = lazy(pageLoaders.customers)
const Runaway = lazy(pageLoaders.runaway)
const CloseTheLoop = lazy(pageLoaders.closeTheLoop)
const Personas = lazy(pageLoaders.personas)
const Surveys = lazy(pageLoaders.surveys)
const IntelligentCxTeam = lazy(pageLoaders.intelligentCxTeam)
const ProductPage = lazy(pageLoaders.productPage)

const ActionsLayout = lazy(pageLoaders.actionsLayout)
const Corrective = lazy(pageLoaders.corrective)
const Signals = lazy(pageLoaders.signals)
const AiInsights = lazy(pageLoaders.aiInsights)
const ShopperCases = lazy(pageLoaders.shopperCases)
const Investigations = lazy(pageLoaders.investigations)

const SettingsLayout = lazy(pageLoaders.settingsLayout)
const Inbox = lazy(pageLoaders.inbox)
const OverviewPage = lazy(pageLoaders.overview)
const Feeds = lazy(pageLoaders.feeds)
const CrmMapping = lazy(pageLoaders.crmMapping)
const EscalationMatrix = lazy(pageLoaders.escalationMatrix)
const SurveyQuestions = lazy(pageLoaders.surveyQuestions)
const WeeklySample = lazy(pageLoaders.weeklySample)
const PublicMentions = lazy(pageLoaders.publicMentions)
const MonthlyPack = lazy(pageLoaders.monthlyPack)
const MysteryShopper = lazy(pageLoaders.mysteryShopper)
const Standards = lazy(pageLoaders.standards)
const Voc = lazy(pageLoaders.voc)
const SurveysReference = lazy(pageLoaders.surveysReference)
const Ld = lazy(pageLoaders.ld)
const TeamsStructure = lazy(pageLoaders.teamsStructure)
const Performance = lazy(() => import('./pages/Performance'))
const CxReports = lazy(() => import('./pages/CxReports'))
const SalesAgents = lazy(() => import('./pages/agents/SalesAgents'))
const SupportAgents = lazy(() => import('./pages/agents/SupportAgents'))
const UserPerformance = lazy(() => import('./pages/admin/UserPerformance'))
const TeamAvailability = lazy(() => import('./pages/settings/TeamAvailability'))
const HrTeamPerf = lazy(pageLoaders.hrTeamPerf)
const Rules = lazy(pageLoaders.rules)
const AiInsightsAccess = lazy(pageLoaders.aiInsightsAccess)
const SettingsGlossary = lazy(pageLoaders.settingsGlossary)
const AdminSettings = lazy(pageLoaders.adminSettings)
const WatchTeam = lazy(pageLoaders.watchTeam)
const CampaignAudit = lazy(pageLoaders.campaignAudit)
const Users = lazy(pageLoaders.users)
const AuditLog = lazy(pageLoaders.auditLog)

/** While the sign-in screen's code arrives: the logo alone in the middle of the page, its point going round. */
function FullPageLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="PSI CX Portal" className="grid min-h-svh place-items-center bg-background text-foreground">
      <BrandLogo decorative className="h-10" />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <UiProviders>
          <RoleProvider>
            <EnvScopeProvider>
            <BrowserRouter>
              <AuthProvider>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<FullPageLoading />}>
                      <Login />
                    </Suspense>
                  }
                />
                <Route
                  element={
                    <RequireAuth>
                      <Shell />
                    </RequireAuth>
                  }
                >
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:personId" element={<Customers />} />
                  <Route path="/runaway" element={<Runaway />} />

                  <Route path="/actions" element={<ActionsLayout />}>
                    <Route index element={<Navigate to="corrective" replace />} />
                    <Route path="corrective" element={<Corrective />} />
                    <Route path="signals" element={<Signals />} />
                    <Route path="ai-insights" element={<AiInsights />} />
                    <Route path="shopper-cases" element={<ShopperCases />} />
                    <Route path="investigations" element={<Investigations />} />
                  </Route>

                  <Route path="/close-the-loop" element={<CloseTheLoop />} />
                  <Route path="/personas" element={<Personas />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/overview" element={<OverviewPage />} />
                  {/* Old URLs keep working (AccessGuard redirects them before the role check; these keep the routes matched). */}
                  <Route path="/surveys" element={<Navigate to="/settings/surveys" replace />} />
                  <Route path="/intelligent-cx-team" element={<IntelligentCxTeam />} />
                  <Route path="/products/:productId" element={<ProductPage />} />
                  {/* v43: the super admin's user directory (the CX manager reads it). */}
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/audit" element={<AuditLog />} />
                  <Route path="/admin/performance" element={<UserPerformance />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/reports" element={<CxReports />} />
                  <Route path="/agents/sales" element={<SalesAgents />} />
                  <Route path="/agents/support" element={<SupportAgents />} />

                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="weekly-sample" replace />} />
                    <Route path="overview" element={<Navigate to="/overview" replace />} />
                    <Route path="surveys" element={<Surveys />} />
                    <Route path="feeds" element={<Feeds />} />
                    <Route path="crm-mapping" element={<CrmMapping />} />
                    <Route path="escalation-matrix" element={<EscalationMatrix />} />
                    <Route path="survey-questions" element={<SurveyQuestions />} />
                    <Route path="watch-ai-team" element={<WatchTeam />} />
                    <Route path="weekly-sample" element={<WeeklySample />} />
                    <Route path="campaign-audit" element={<CampaignAudit />} />
                    <Route path="public-mentions" element={<PublicMentions />} />
                    <Route path="monthly-pack" element={<MonthlyPack />} />
                    <Route path="mystery-shopper" element={<MysteryShopper />} />
                    <Route path="standards" element={<Standards />} />
                    <Route path="voc" element={<Voc />} />
                    <Route path="surveys-reference" element={<SurveysReference />} />
                    <Route path="ld" element={<Ld />} />
                    <Route path="teams-structure" element={<TeamsStructure />} />
                    <Route path="team-availability" element={<TeamAvailability />} />
                    <Route path="hr-team" element={<HrTeamPerf />} />
                    <Route path="admin" element={<AdminSettings />} />
                    <Route path="rules" element={<Rules />} />
                    <Route path="ai-insights-access" element={<AiInsightsAccess />} />
                    <Route path="glossary" element={<SettingsGlossary />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Route>
              </Routes>
              </AuthProvider>
            </BrowserRouter>
            </EnvScopeProvider>
          </RoleProvider>
        </UiProviders>
      </ThemeProvider>
    </I18nProvider>
  )
}

