import type { Bi } from '../types'
import { DEFAULT_OWNER_BY_KIND } from './insightSuggestions'
import { MATRIX_DEFAULTS } from './escalationDefaults'
import { envNameFromShort } from './environments'
import { ROLE_DEFS } from './roles'

/**
 * A fix keeps its owner as one English string, a title and never a name (`CorrectiveAction.owner`; the callers and the data
 * shape are unchanged). This is the lookup that gives that title its Arabic form, so the owner reads in the session language
 * on the fix card, in My inbox and in the next-step box. Known titles come from the roles, the matrix defaults, the default
 * receiver per fix kind and the sample's own receivers; a title typed in a form that is not in the table passes through
 * unchanged (nothing is translated by guessing). Arabic titles written for this build need native review.
 */

/** Titles the sample and the mutations write that no other table holds. */
const EXTRA: Bi[] = [
  { en: 'L&D manager with the environment champion', ar: 'مدير التعلم والتطوير مع ممثل البيئة' },
  { en: 'L&D manager and the environment champion', ar: 'مدير التعلم والتطوير وممثل البيئة' },
  { en: 'Product owner and IT', ar: 'مالك المنتج وتقنية المعلومات' },
  { en: 'Environment manager', ar: 'مدير البيئة' },
  { en: 'Direct manager', ar: 'المدير المباشر' },
  { en: 'Sales manager of the environment', ar: 'مدير مبيعات البيئة' },
  { en: 'Owner of the channel process', ar: 'مالك عملية القناة' },
  { en: 'Owner of the hand-off process', ar: 'مالك عملية التسليم بين الفرق' },
  { en: 'Owner of the process', ar: 'مالك العملية' },
  { en: 'Internal Audit and Marketing Lead, then Marketing', ar: 'مسؤول التدقيق الداخلي والتسويق، ثم التسويق' },
]

const norm = (s: string) => s.trim().toLowerCase()

function buildTable(): Map<string, Bi> {
  const map = new Map<string, Bi>()
  const add = (b: Bi | null | undefined) => {
    if (b && !map.has(norm(b.en))) map.set(norm(b.en), b)
  }
  for (const r of ROLE_DEFS) add(r.name)
  for (const cells of Object.values(MATRIX_DEFAULTS)) {
    add(cells.receiver)
    add(cells.informed)
    add(cells.backup)
  }
  for (const b of Object.values(DEFAULT_OWNER_BY_KIND)) add(b)
  for (const b of EXTRA) add(b)
  return map
}

let TABLE: Map<string, Bi> | undefined

/** "Direct manager (Dubai environment manager)": the owner of an employee fix, from the environment of its pattern. */
const DIRECT_MANAGER = /^Direct manager \((.+) environment manager\)$/i
const ENV_MANAGER = /^(.+) environment manager$/i

/**
 * The owner title of a fix in both languages. An unknown title (typed in a form) comes back as the same text in both, so the
 * caller never gets a hole. Names never come through here: an owner is a title.
 *
 * @example L(ownerTitle(fix.owner))
 */
export function ownerTitle(owner: string): Bi {
  TABLE ??= buildTable()
  const known = TABLE.get(norm(owner))
  if (known) return known
  const direct = DIRECT_MANAGER.exec(owner.trim())
  if (direct) {
    const env = envNameFromShort(direct[1])
    return { en: owner.trim(), ar: `المدير المباشر (مدير بيئة ${env.ar})` }
  }
  const envMgr = ENV_MANAGER.exec(owner.trim())
  if (envMgr) {
    const env = envNameFromShort(envMgr[1])
    return { en: owner.trim(), ar: `مدير بيئة ${env.ar}` }
  }
  return { en: owner, ar: owner }
}
