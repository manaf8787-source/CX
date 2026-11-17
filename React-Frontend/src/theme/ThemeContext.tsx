import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeValue {
  mode: ThemeMode
  cycle: () => void
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)
const STORAGE_KEY = 'psicx.theme'
const ORDER: ThemeMode[] = ['system', 'light', 'dark']

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (saved && ORDER.includes(saved)) return saved
    } catch {
      /* ignore */
    }
    return 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.classList.toggle('dark', mode === 'dark' || (mode === 'system' && media.matches))
    apply()
    media.addEventListener('change', apply)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
    return () => media.removeEventListener('change', apply)
  }, [mode])

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      setMode,
      cycle: () => setMode((m) => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]),
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
