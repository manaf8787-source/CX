import type { CorrectiveAction, EnvId, EnvScope, Investigation, Pattern, Signal } from '../types'

/**
 * Which environments a record belongs to, for the environment switch (decided 18 Nov: it narrows everything,
 * fixes and the call list included).
 *
 * People, signals, shopper cases, call items and public mentions carry their own environment. A fix or an
 * investigation takes the environments of its pattern's signals (or its own `envId` when it has no pattern).
 * `null` means "no environment known": the record shows under every scope (for example a fix the assistant planned
 * for the whole portal).
 */
export function envsOfPattern(pattern: Pick<Pattern, 'signalIds'> | undefined, signalById: ReadonlyMap<string, Pick<Signal, 'envId'>>): EnvId[] {
  if (!pattern) return []
  return [...new Set(pattern.signalIds.map((id) => signalById.get(id)?.envId).filter((e): e is EnvId => !!e))]
}

export function envsOfFix(
  fix: Pick<CorrectiveAction, 'envId' | 'patternId'> | Pick<Investigation, 'envId' | 'patternId'>,
  patternById: ReadonlyMap<string, Pick<Pattern, 'signalIds'>>,
  signalById: ReadonlyMap<string, Pick<Signal, 'envId'>>,
): EnvId[] | null {
  if (fix.envId) return [fix.envId]
  const envs = envsOfPattern(fix.patternId ? patternById.get(fix.patternId) : undefined, signalById)
  return envs.length ? envs : null
}

/** True when a record with these environments shows under the selected scope; `null` (unknown) shows everywhere. */
export function inScopeAny(scope: EnvScope, envs: readonly EnvId[] | null): boolean {
  return scope === 'all' || envs === null || envs.includes(scope)
}
