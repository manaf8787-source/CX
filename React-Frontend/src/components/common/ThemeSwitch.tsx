import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { useI18n } from '@/i18n'
import { useTheme, type ThemeMode } from '@/theme/ThemeContext'

const ICONS = { light: Sun, dark: Moon, system: Monitor }
const ORDER: ThemeMode[] = ['light', 'dark', 'system']

/**
 * The theme, as a three-key switch: light, dark, or the device's own setting (owner's request, 19 Nov; it was a button that opened a
 * menu). The dark key is the mode in use and one click picks another. A radio group: arrow keys move between the three.
 *
 * Where the top bar is narrow (under 900px of bar, a tablet or a phone) the three keys become one round button that steps through the
 * same three modes and names the next one. Outside the top bar (the sign-in screen) there is no such container, so the keys always show.
 */
export function ThemeSwitch() {
  const { mode, setMode } = useTheme()
  const { t } = useI18n()
  const name: Record<ThemeMode, string> = {
    light: t('Light', 'فاتح'),
    dark: t('Dark', 'داكن'),
    system: t('Match device', 'حسب الجهاز'),
  }
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  const Icon = ICONS[mode]
  return (
    <>
      <Segmented<ThemeMode>
        compact
        label={t('Theme', 'المظهر')}
        className="@max-[899px]/bar:hidden"
        value={mode}
        onValueChange={setMode}
        options={ORDER.map((value) => {
          const OptIcon = ICONS[value]
          return { value, label: <OptIcon aria-hidden />, ariaLabel: name[value], title: name[value] }
        })}
      />
      <Button
        variant="outline"
        size="icon"
        className="hidden @max-[899px]/bar:inline-flex"
        onClick={() => setMode(next)}
        aria-label={t(`Theme: ${name[mode]}. Switch to ${name[next]}`, `المظهر: ${name[mode]}. التبديل إلى ${name[next]}`)}
        title={name[mode]}
      >
        <Icon aria-hidden />
      </Button>
    </>
  )
}
