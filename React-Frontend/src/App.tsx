import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './theme/ThemeContext'
import { RoleProvider } from './auth/RoleContext'
import { AuthProvider, RequireAuth } from './auth/AuthContext'
import { Shell } from './components/layout/Shell'
import { UiProviders } from './components/layout/UiProviders'

const Login = lazy(() => import('./pages/Login'))
const Home = lazy(() => import('./pages/Home'))
const Customers = lazy(() => import('./pages/Customers'))
const Runaway = lazy(() => import('./pages/Runaway'))
const CloseTheLoop = lazy(() => import('./pages/CloseTheLoop'))
const Personas = lazy(() => import('./pages/Personas'))
const Surveys = lazy(() => import('./pages/Surveys'))
const IntelligentCxTeam = lazy(() => import('./pages/IntelligentCxTeam'))
const ProductPage = lazy(() => import('./pages/ProductPage'))

const ActionsLayout = lazy(() => import('./pages/actions/ActionsLayout'))
const Corrective = lazy(() => import('./pages/actions/Corrective'))
const Signals = lazy(() => import('./pages/actions/Signals'))
const AiInsights = lazy(() => import('./pages/actions/AiInsights'))
const ShopperCases = lazy(() => import('./pages/actions/ShopperCases'))
const Investigations = lazy(() => import('./pages/actions/Investigations'))

const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'))
const SettingsOverview = lazy(() => import('./pages/settings/Overview'))
const MonthlyPack = lazy(() => import('./pages/settings/MonthlyPack'))
const MysteryShopper = lazy(() => import('./pages/settings/MysteryShopper'))
const Standards = lazy(() => import('./pages/settings/StandardsRegister'))
const Voc = lazy(() => import('./pages/settings/Voc'))
const SurveysReference = lazy(() => import('./pages/settings/SurveysReference'))
const Ld = lazy(() => import('./pages/settings/Ld'))
const TeamsStructure = lazy(() => import('./pages/settings/TeamsStructure'))
const HrTeamPerf = lazy(() => import('./pages/settings/HrTeamPerf'))
const Rules = lazy(() => import('./pages/settings/Rules'))
const AiInsightsAccess = lazy(() => import('./pages/settings/AiInsightsAccess'))
const SettingsGlossary = lazy(() => import('./pages/settings/Glossary'))

function FullPageLoading() {
  return <div role="status" aria-busy="true" className="min-h-svh bg-background" />
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <UiProviders>
          <RoleProvider>
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
                  <Route path="/surveys" element={<Surveys />} />
                  <Route path="/intelligent-cx-team" element={<IntelligentCxTeam />} />
                  <Route path="/products/:productId" element={<ProductPage />} />

                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<SettingsOverview />} />
                    <Route path="monthly-pack" element={<MonthlyPack />} />
                    <Route path="mystery-shopper" element={<MysteryShopper />} />
                    <Route path="standards" element={<Standards />} />
                    <Route path="voc" element={<Voc />} />
                    <Route path="surveys-reference" element={<SurveysReference />} />
                    <Route path="ld" element={<Ld />} />
                    <Route path="teams-structure" element={<TeamsStructure />} />
                    <Route path="hr-team" element={<HrTeamPerf />} />
                    <Route path="rules" element={<Rules />} />
                    <Route path="ai-insights-access" element={<AiInsightsAccess />} />
                    <Route path="glossary" element={<SettingsGlossary />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Route>
              </Routes>
              </AuthProvider>
            </BrowserRouter>
          </RoleProvider>
        </UiProviders>
      </ThemeProvider>
    </I18nProvider>
  )
}
