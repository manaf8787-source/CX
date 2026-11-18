import type { Bi, EnvId, EnvScope, Environment } from '../types'

/**
 * The three CRM environments (v40, F13/F14): separate databases, same business.
 * Names are placeholders to confirm with the owner (Programme KB 43.8).
 * `short` is the English label stored in the legacy `environment: string` fields
 * of Person, Interaction, Signal and the rest; `id` is the canonical key.
 */
export const ENVIRONMENTS: Environment[] = [
  { id: 'dub', name: { en: 'Dubai', ar: 'دبي' }, short: 'Dubai' },
  { id: 'auh', name: { en: 'Abu Dhabi', ar: 'أبوظبي' }, short: 'Abu Dhabi' },
  { id: 'ast', name: { en: 'PSI Assets (rental)', ar: 'PSI للأصول (التأجير)' }, short: 'PSI Assets' },
]

export const ENV_IDS: EnvId[] = ENVIRONMENTS.map((e) => e.id)

/** "All environments" in the "Data as of" bar's select. */
export const ALL_ENVIRONMENTS: Bi = { en: 'All environments', ar: 'كل البيئات' }

export function environmentById(id: EnvId): Environment {
  return ENVIRONMENTS.find((e) => e.id === id)!
}

/** Bilingual display name of an environment id or of the "all" scope. */
export function envName(scope: EnvScope): Bi {
  return scope === 'all' ? ALL_ENVIRONMENTS : environmentById(scope).name
}

/** Canonical id from the legacy short English label; undefined for an unknown label. */
export function envIdFromShort(short: string): EnvId | undefined {
  return ENVIRONMENTS.find((e) => e.short === short)?.id
}

/** Bilingual name from the legacy short label ('Dubai' -> {en:'Dubai', ar:'دبي'}); unknown labels pass through unchanged. */
export function envNameFromShort(short: string): Bi {
  const env = ENVIRONMENTS.find((e) => e.short === short)
  return env ? env.name : { en: short, ar: short }
}

/** True when a record in environment `envId` is inside the selected scope. */
export function inEnvScope(scope: EnvScope, envId: EnvId): boolean {
  return scope === 'all' || scope === envId
}
