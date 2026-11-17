import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './theme/ThemeContext'
import { RoleProvider } from './auth/RoleContext'
import { Shell } from './components/layout/Shell'

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
import SettingsSubPage from './pages/settings/SettingsSubPage'

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
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
                  <Route path="overview" element={<SettingsSubPage title={{ en: 'Overview', ar: 'نظرة عامة' }} lede={{ en: 'Per-product dashboards and the public reputation index.', ar: 'لوحات لكل منتج ومؤشر السمعة العامة.' }} scaffoldNote={{ en: 'frontend/src/pages/Overview.tsx — reuse and upgrade.', ar: 'frontend/src/pages/Overview.tsx — إعادة استخدام وترقية.' }} />} />
                  <Route path="monthly-pack" element={<SettingsSubPage title={{ en: 'Monthly CX pack', ar: 'الحزمة الشهرية' }} lede={{ en: 'The CX manager releases this report monthly.', ar: 'يصدر مدير تجربة العملاء هذا التقرير شهرياً.' }} scaffoldNote={{ en: 'frontend/src/pages/Report.tsx — reuse and upgrade.', ar: 'frontend/src/pages/Report.tsx — إعادة استخدام وترقية.' }} />} />
                  <Route path="mystery-shopper" element={<SettingsSubPage title={{ en: 'Mystery shopper', ar: 'التسوق السري' }} lede={{ en: 'Checklists, assignments, severity scoring.', ar: 'القوائم، المهام، تقييم الخطورة.' }} scaffoldNote={{ en: 'frontend/src/pages/MysteryShopper.tsx + lib/metrics.ts scoreChecklist() — reuse heavily.', ar: 'frontend/src/pages/MysteryShopper.tsx — إعادة استخدام مكثفة.' }} />} />
                  <Route path="standards" element={<SettingsSubPage title={{ en: 'Standards register', ar: 'سجل المعايير' }} lede={{ en: 'The 26-standard register (M-01…M-26), observe/draft/approved-and-scored.', ar: 'سجل المعايير (M-01 إلى M-26).' }} scaffoldNote={{ en: 'frontend/src/pages/Standards.tsx + data/standards.ts — reuse, grow from a flat list.', ar: 'frontend/src/pages/Standards.tsx — إعادة استخدام مع التوسعة.' }} />} />
                  <Route path="voc" element={<SettingsSubPage title={{ en: 'Voice of Customer', ar: 'صوت العميل' }} lede={{ en: 'Reference copy of VoC results.', ar: 'نسخة مرجعية لنتائج صوت العميل.' }} scaffoldNote={{ en: 'frontend/src/pages/VoiceOfCustomer.tsx — reuse results view.', ar: 'frontend/src/pages/VoiceOfCustomer.tsx — إعادة استخدام.' }} />} />
                  <Route path="surveys-reference" element={<SettingsSubPage title={{ en: 'Surveys (reference)', ar: 'الاستبيانات (مرجع)' }} lede={{ en: 'The old builder/campaign model, kept as question-type vocabulary.', ar: 'نموذج منشئ الاستبيانات القديم، محفوظ كمرجع لأنواع الأسئلة.' }} scaffoldNote={{ en: 'frontend/src/pages/SurveyEngine.tsx — question-type vocabulary only.', ar: 'frontend/src/pages/SurveyEngine.tsx — مفردات أنواع الأسئلة فقط.' }} />} />
                  <Route path="ld" element={<SettingsSubPage title={{ en: 'L&D: training & materials', ar: 'التعلم والتطوير' }} lede={{ en: 'Training-gap actions, L&D requests, owned standards.', ar: 'إجراءات فجوة التدريب، طلبات التعلم والتطوير، المعايير المملوكة.' }} scaffoldNote={{ en: 'Net-new page — no dedicated L&D role/page in the scaffold.', ar: 'صفحة جديدة بالكامل — لا توجد صفحة مخصصة للتعلم والتطوير في الهيكل الحالي.' }} />} />
                  <Route path="teams-structure" element={<SettingsSubPage title={{ en: 'Teams and structure', ar: 'الفرق والهيكل' }} lede={{ en: 'Kept as a Knowledge Base document, removed from the real portal menu (Programme KB §26).', ar: 'محفوظة كوثيقة مرجعية، أُزيلت من قائمة البوابة الفعلية.' }} />} />
                  <Route path="hr-team" element={<SettingsSubPage title={{ en: 'HR team performance', ar: 'أداء فريق الموارد البشرية' }} lede={{ en: 'Team numbers and late alerts — informed only.', ar: 'أرقام الفريق وتنبيهات التأخير — للعلم فقط.' }} scaffoldNote={{ en: 'frontend/src/pages/HrTeam.tsx — reuse.', ar: 'frontend/src/pages/HrTeam.tsx — إعادة استخدام.' }} />} />
                  <Route path="rules" element={<SettingsSubPage title={{ en: 'Rules as configuration', ar: 'القواعد كإعدادات' }} lede={{ en: 'Every threshold (30-day windows, 5/3/50% signal thresholds, 60-day verification…) editable here, not a magic number in components — NFR-4.', ar: 'كل حد (نوافذ 30 يوماً، حدود الإشارات، التحقق خلال 60 يوماً...) قابل للتعديل هنا — NFR-4.' }} />} />
                  <Route path="ai-insights-access" element={<SettingsSubPage title={{ en: 'AI Insights access matrix', ar: 'مصفوفة صلاحيات رؤى الذكاء الاصطناعي' }} lede={{ en: 'Role x capability grid the CX manager edits; changes apply at once.', ar: 'مصفوفة الأدوار والصلاحيات التي يعدّلها مدير تجربة العملاء.' }} scaffoldNote={{ en: 'frontend/src/data/roles.ts AUTHORITY_MATRIX pattern — reusable building block.', ar: 'نمط AUTHORITY_MATRIX — لبنة قابلة لإعادة الاستخدام.' }} />} />
                  <Route path="glossary" element={<SettingsSubPage title={{ en: 'What the terms mean', ar: 'ماذا تعني المصطلحات' }} lede={{ en: 'Sitewide searchable glossary — the source for every "?" affordance — NFR-6.', ar: 'مسرد قابل للبحث على مستوى الموقع — المصدر لكل علامة "؟" — NFR-6.' }} scaffoldNote={{ en: 'frontend/src/pages/Glossary.tsx — reuse.', ar: 'frontend/src/pages/Glossary.tsx — إعادة استخدام.' }} />} />
                </Route>

                <Route path="*" element={<Navigate to="/home" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
