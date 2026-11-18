import { useMemo, useState, type ReactNode } from 'react'
import { useRole } from '@/auth/RoleContext'
import { ENV_IDS } from '@/data/environments'
import { EnvScopeContext, type EnvScopeValue } from '@/services/envScope'
import type { EnvScope } from '@/types'

const STORAGE_KEY = 'psicx.env'

function readStored(): EnvScope {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'all' || ENV_IDS.includes(saved as never)) return saved as EnvScope
  } catch {
    /* ignore */
  }
  return 'all'
}

/** Holds the environment switch; mounted once inside `RoleProvider` (App.tsx and the test render helper). */
export function EnvScopeProvider({ children }: { children: ReactNode }) {
  const { role } = useRole()
  const fixed = role.envId ?? null
  const [chosen, setChosen] = useState<EnvScope>(readStored)

  const value = useMemo<EnvScopeValue>(
    () => ({
      env: fixed ?? chosen,
      fixed,
      allowed: fixed ? [fixed] : ENV_IDS,
      setEnv: (env) => {
        if (fixed) return
        setChosen(env)
        try {
          localStorage.setItem(STORAGE_KEY, env)
        } catch {
          /* ignore */
        }
      },
    }),
    [fixed, chosen],
  )

  return <EnvScopeContext.Provider value={value}>{children}</EnvScopeContext.Provider>
}
