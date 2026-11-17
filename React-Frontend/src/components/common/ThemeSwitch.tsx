import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from '../../theme/ThemeContext'

const ICONS = { system: SunMoon, light: Sun, dark: Moon }

export function ThemeSwitch() {
  const { mode, cycle } = useTheme()
  const Icon = ICONS[mode]
  return (
    <button type="button" className="icon-btn" onClick={cycle} title={`Theme: ${mode}`} aria-label="Cycle theme">
      <Icon size={16} />
    </button>
  )
}
