import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Bi } from '../types'

export type Lang = 'en' | 'ar'

interface I18nValue {
  lang: Lang
  dir: 'ltr' | 'rtl'
  setLang: (l: Lang) => void
  toggleLang: () => void
  /** Pick the active-language string out of a bilingual object. */
  L: (b: Bi) => string
  /** Inline shorthand for a one-off bilingual literal. */
  t: (en: string, ar: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

const STORAGE_KEY = 'psicx.lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'en' || saved === 'ar') return saved
    } catch {
      /* ignore */
    }
    return 'en'
  })

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang, dir])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir,
      setLang,
      toggleLang: () => setLang((l) => (l === 'en' ? 'ar' : 'en')),
      L: (b: Bi) => b[lang],
      t: (en: string, ar: string) => (lang === 'en' ? en : ar),
    }),
    [lang, dir],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
