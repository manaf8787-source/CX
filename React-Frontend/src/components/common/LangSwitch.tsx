import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/**
 * Shows the language you will switch TO, written in that language: a light pill (the skill's secondary button). Below `lg` the visible
 * label collapses and the pill becomes a 36px round icon button; the accessible name stays the full text either way.
 */
export function LangSwitch() {
  const { lang, toggleLang } = useI18n()
  const target = lang === 'en' ? { code: 'ar', label: 'العربية', hint: 'Switch to Arabic' } : { code: 'en', label: 'English', hint: 'التبديل إلى الإنجليزية' }
  // No aria-label: the accessible name is the visible language name plus a hidden hint (WCAG 2.5.3).
  return (
    <Button variant="outline" size="sm" className="max-lg:size-9 max-lg:p-0 lg:gap-1.5" onClick={toggleLang}>
      <Languages aria-hidden />
      <span lang={target.code} className="sr-only lg:not-sr-only">
        {target.label}
      </span>
      <span className="sr-only">{` — ${target.hint}`}</span>
    </Button>
  )
}
