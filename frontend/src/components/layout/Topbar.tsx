import { useI18n } from '../../i18n'
import { useTheme } from '../../theme/ThemeContext'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../ui/Chip'

export function Topbar() {
  const { lang, toggleLang, t } = useI18n()
  const { mode, cycle } = useTheme()
  const { role } = useRole()

  const themeIcon = mode === 'system' ? '🖥' : mode === 'light' ? '☀' : '🌙'

  return (
    <div className="topbar">
      <div className="crumb">{role ? t(`Signed in as ${role.name.en}`, `تم الدخول باسم ${role.name.ar}`) : ''}</div>
      <div className="row">
        <SampleBanner />
        <button className="btn s" onClick={cycle} title={t('Toggle colour theme', 'تبديل نمط الألوان')}>{themeIcon}</button>
        <button className="btn s" onClick={toggleLang}>{lang === 'en' ? 'العربية' : 'English'}</button>
      </div>
    </div>
  )
}
