import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { PRODUCTS } from '../data/products'
import type { ProductId } from '../types'

interface SettingsValue {
  isLaunched: (id: ProductId) => boolean
  toggleLaunch: (id: ProductId) => void
  launchedIds: ProductId[]
}

const SettingsContext = createContext<SettingsValue | null>(null)

// Product launch status is CX-manager-controlled state (Settings page), not
// a fixed fact about the product — so it lives in a context, not in the
// static products.ts data, even though it starts from the same defaults.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [launched, setLaunched] = useState<Set<ProductId>>(() => new Set(PRODUCTS.filter((p) => p.live).map((p) => p.id)))

  const value = useMemo<SettingsValue>(() => ({
    isLaunched: (id) => launched.has(id),
    toggleLaunch: (id) => setLaunched((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    }),
    launchedIds: [...launched],
  }), [launched])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
