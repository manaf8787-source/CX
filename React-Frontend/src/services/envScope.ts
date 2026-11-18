import { createContext, useContext } from 'react'
import type { EnvId, EnvScope } from '../types'
import { ENV_IDS } from '../data/environments'

/**
 * The "Environment" switch of the "Data as of" bar (v40 F14). It narrows the people register and the
 * signals and shopper cases (so patterns and the brief); it does not narrow fixes, Close the loop,
 * survey rows or indicators (V40_DELTA F14, [Proposed]; the owner confirms whether it should).
 * A role fixed to one environment (environment management) always reads that environment.
 *
 * The scope is part of the query key of every env-aware hook, so switching refetches and caches per scope.
 * Without a provider (unit tests, isolated renders) the scope is "all".
 */
export interface EnvScopeValue {
  /** The effective scope: the role's own environment when fixed, else the user's choice. */
  env: EnvScope
  setEnv: (env: EnvScope) => void
  /** The environments this role may pick from. */
  allowed: EnvId[]
  /** The role's own environment when it is fixed to one (the switch is then a chip, not a select). */
  fixed: EnvId | null
}

export const EnvScopeContext = createContext<EnvScopeValue>({ env: 'all', setEnv: () => {}, allowed: ENV_IDS, fixed: null })

export function useEnvScope(): EnvScopeValue {
  return useContext(EnvScopeContext)
}
