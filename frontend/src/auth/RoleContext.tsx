import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { ROLE_DEFS, roleDef } from '../data/roles'
import type { RoleDef, RoleId } from '../types'

interface RoleValue {
  role: RoleDef | null
  setRole: (id: RoleId) => void
  signOut: () => void
}

const RoleContext = createContext<RoleValue | null>(null)

const STORAGE_KEY = 'psicx.role'

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleId] = useState<RoleId | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as RoleId | null
      if (saved && ROLE_DEFS.some((r) => r.id === saved)) return saved
    } catch {
      /* ignore */
    }
    return null
  })

  const value = useMemo<RoleValue>(
    () => ({
      role: roleDef(roleId) ?? null,
      setRole: (id: RoleId) => {
        setRoleId(id)
        try { localStorage.setItem(STORAGE_KEY, id) } catch { /* ignore */ }
      },
      signOut: () => {
        setRoleId(null)
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      },
    }),
    [roleId],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside RoleProvider')
  return ctx
}
