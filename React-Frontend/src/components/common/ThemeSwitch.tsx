import { Moon, Sun, SunMoon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n'
import { useTheme, type ThemeMode } from '@/theme/ThemeContext'

const ICONS = { system: SunMoon, light: Sun, dark: Moon }

/** A 36px light round icon button that opens a menu of the three modes (36px rows, the current one marked). */
export function ThemeSwitch() {
  const { mode, setMode } = useTheme()
  const { t } = useI18n()
  const Icon = ICONS[mode]
  const options: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: t('Match system', 'حسب النظام') },
    { value: 'light', label: t('Light', 'فاتح') },
    { value: 'dark', label: t('Dark', 'داكن') },
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t('Theme', 'المظهر')}>
          <Icon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('Theme', 'المظهر')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          {options.map((o) => {
            const OptIcon = ICONS[o.value]
            return (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                <OptIcon aria-hidden />
                {o.label}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
