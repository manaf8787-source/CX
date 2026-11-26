import { createContext, useContext } from 'react'
import type { EnvId, EnvScope } from '../types'
import { ENV_IDS } from '../data/environments'

/**
 * The "Environment" switch of the "Data as of" bar (v40 F14). Decided 18 Nov: it narrows everything that carries an
 * environment: people, signals, patterns, shopper cases, fixes, the close-the-loop list, investigations, hand-offs, public
 * mentions and the Home counts. 26 Nov: the survey answers and the NPS, CSAT and CES indicators carry an environment too and
 * follow the switch; PSI Assets' leases count as completed transactions (data/npsMilestones.ts). It does not narrow what has no
 * environment: the agents, the non-CRM feeds, and the products without a CRM (PSI Club, Tour Estate, PSI Events). A role fixed to one environment (environment management)
 * always reads that environment.
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
