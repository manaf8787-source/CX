import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/** Shows the language you will switch TO, written in that language. */
export function LangSwitch() {
  const { lang, toggleLang } = useI18n()
  const target = lang === 'en' ? { code: 'ar', label: 'العربية', hint: 'Switch to Arabic' } : { code: 'en', label: 'English', hint: 'التبديل إلى الإنجليزية' }
  // No aria-label: the accessible name is the visible language name plus a hidden hint (WCAG 2.5.3).
  return (
    <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5" onClick={toggleLang}>
      <Languages aria-hidden />
      <span lang={target.code} className="sr-only sm:not-sr-only">
        {target.label}
      </span>
      <span className="sr-only">{` — ${target.hint}`}</span>
    </Button>
  )
}
