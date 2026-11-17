import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/** Shows the language you will switch TO, written in that language. */
export function LangSwitch() {
  const { lang, toggleLang } = useI18n()
  const target = lang === 'en' ? { code: 'ar', label: 'العربية', aria: 'Switch to Arabic' } : { code: 'en', label: 'English', aria: 'التبديل إلى الإنجليزية' }
  return (
    <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5" onClick={toggleLang} aria-label={target.aria}>
      <Languages aria-hidden />
      <span lang={target.code} className="hidden sm:inline">
        {target.label}
      </span>
    </Button>
  )
}
