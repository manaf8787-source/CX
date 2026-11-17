import { Languages } from 'lucide-react'
import { useI18n } from '../../i18n'

export function LangSwitch() {
  const { lang, toggleLang } = useI18n()
  return (
    <button type="button" className="icon-btn" onClick={toggleLang} title="EN / AR" aria-label="Toggle language">
      <Languages size={16} />
      <span className="text-sm" style={{ marginInlineStart: 4 }}>{lang === 'en' ? 'AR' : 'EN'}</span>
    </button>
  )
}
