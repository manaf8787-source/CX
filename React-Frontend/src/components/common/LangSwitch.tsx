import { Segmented } from '@/components/ui/segmented'
import { useI18n } from '@/i18n'

type Lang = 'en' | 'ar'

/**
 * The language, as a two-key switch (owner's request, 19 Nov; it was one button that named the language you would switch TO). Both
 * languages show, each written in its own script, and the dark key is the one in use: you read the state and pick the other in one click.
 * A radio group: arrow keys move between the two. The short labels (EN, ع) carry the full names for assistive technology.
 */
export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <Segmented<Lang>
      compact
      label={t('Language', 'اللغة')}
      className={className}
      value={lang}
      onValueChange={setLang}
      options={[
        { value: 'en', label: 'EN', ariaLabel: 'English', title: 'English', lang: 'en' },
        { value: 'ar', label: 'ع', ariaLabel: 'العربية', title: 'العربية', lang: 'ar' },
      ]}
    />
  )
}
