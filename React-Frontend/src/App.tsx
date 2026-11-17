import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './theme/ThemeContext'
import { RoleProvider } from './auth/RoleContext'
import { Shell } from './components/layout/Shell'
import { UiProviders } from './components/layout/UiProviders'

import Home from './pages/Home'
import Customers from './pages/Customers'
import Runaway from './pages/Runaway'
import CloseTheLoop from './pages/CloseTheLoop'
import Personas from './pages/Personas'
import Surveys from './pages/Surveys'
import IntelligentCxTeam from './pages/IntelligentCxTeam'

import ActionsLayout from './pages/actions/ActionsLayout'
import Corrective from './pages/actions/Corrective'
import Signals from './pages/actions/Signals'
import AiInsights from './pages/actions/AiInsights'
import ShopperCases from './pages/actions/ShopperCases'
import Investigations from './pages/actions/Investigations'

import SettingsLayout from './pages/settings/SettingsLayout'
import SettingsOverview from './pages/settings/Overview'
import MonthlyPack from './pages/settings/MonthlyPack'
import MysteryShopper from './pages/settings/MysteryShopper'
import Standards from './pages/settings/Standards'
import Voc from './pages/settings/Voc'
import SurveysReference from './pages/settings/SurveysReference'
import Ld from './pages/settings/Ld'
import TeamsStructure from './pages/settings/TeamsStructure'
import HrTeamPerf from './pages/settings/HrTeamPerf'
import Rules from './pages/settings/Rules'
import AiInsightsAccess from './pages/settings/AiInsightsAccess'
import SettingsGlossary from './pages/settings/Glossary'

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <UiProviders>
          <RoleProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Shell />}>
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
            </BrowserRouter>
          </RoleProvider>
        </UiProviders>
      </ThemeProvider>
    </I18nProvider>
  )
}
