import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './theme/ThemeContext'
import { RoleProvider } from './auth/RoleContext'
import { SettingsProvider } from './settings/SettingsContext'
import { Shell } from './components/layout/Shell'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import VoiceOfCustomer from './pages/VoiceOfCustomer'
import RealEstate from './pages/RealEstate'
import AfterSales from './pages/AfterSales'
import AfterSalesDesk from './pages/AfterSalesDesk'
import Incidents from './pages/Incidents'
import SurveyEngine from './pages/SurveyEngine'
import MysteryShopper from './pages/MysteryShopper'
import CallCenter from './pages/CallCenter'
import Insights from './pages/Insights'
import Standards from './pages/Standards'
import Settings from './pages/Settings'
import Report from './pages/Report'
import Suggestions from './pages/Suggestions'
import Glossary from './pages/Glossary'
import Structure from './pages/Structure'
import HrTeam from './pages/HrTeam'
import ShopperTasks from './pages/ShopperTasks'
import ProductPage from './pages/ProductPage'

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <SettingsProvider>
          <RoleProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route element={<Shell />}>
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/voc" element={<VoiceOfCustomer />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/report" element={<Report />} />
                  <Route path="/real-estate" element={<RealEstate />} />
                  <Route path="/after-sales" element={<AfterSales />} />
                  <Route path="/after-sales/desk" element={<AfterSalesDesk />} />
                  <Route path="/club" element={<ProductPage productId="cl" />} />
                  <Route path="/tour-estate" element={<ProductPage productId="to" />} />
                  <Route path="/events" element={<ProductPage productId="ev" />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/survey-engine" element={<SurveyEngine />} />
                  <Route path="/mystery-shopper" element={<MysteryShopper />} />
                  <Route path="/call-center" element={<CallCenter />} />
                  <Route path="/standards" element={<Standards />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/suggestions" element={<Suggestions />} />
                  <Route path="/structure" element={<Structure />} />
                  <Route path="/glossary" element={<Glossary />} />
                  <Route path="/hr-team" element={<HrTeam />} />
                  <Route path="/shopper/tasks" element={<ShopperTasks />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </RoleProvider>
        </SettingsProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
