import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { LangSwitch } from '../common/LangSwitch'
import { ThemeSwitch } from '../common/ThemeSwitch'
import { RoleSwitch } from '../common/RoleSwitch'
import { AssistantPanel } from '../ai/AssistantPanel'
import { useI18n } from '../../i18n'

export function Shell() {
  const { t } = useI18n()
  const [assistantOpen, setAssistantOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <div className="topbar-tools" style={{ justifyContent: 'flex-end' }}>
          <RoleSwitch />
          <LangSwitch />
          <ThemeSwitch />
          <button type="button" className="btn gold" onClick={() => setAssistantOpen(true)}>
            <span className="row" style={{ gap: 6 }}>
              <Sparkles size={14} />
              {t('Ask the assistant', 'اسأل المساعد')}
            </span>
          </button>
        </div>
        <Outlet />
      </div>
      {assistantOpen && <AssistantPanel onClose={() => setAssistantOpen(false)} />}
    </div>
  )
}
