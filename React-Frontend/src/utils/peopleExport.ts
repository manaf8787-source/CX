import type { Person, RoleId } from '../types'
import { canViewCustomerNames, canViewMobiles } from '../auth/permissions'
import { CUSTOMERS_LIST_COPY, SEGMENT_LABEL, SOURCE_LABEL } from '../data/customersList'
import { personRef } from './trace'

/**
 * The name to show for a person to this role: the name when the role may see customer names, otherwise the
 * reference (`P-005`). The Internal Audit and Marketing Lead never sees a customer name (decided 18 Nov).
 */
export function personLabel(person: Pick<Person, 'id' | 'name'>, role: RoleId): string {
  return canViewCustomerNames(role) ? person.name : personRef(person.id)
}

/**
 * Rows of the "Export list (CSV)" for `downloadCsv(filename, rows)`: person, mobile, type, environment, source, last
 * contact (decided 18 Nov: mobiles only for roles that may see names; names likewise, the reference otherwise).
 * The mobile column is left out of the file altogether for a role that may not see it.
 */
export function peopleCsvRows(
  persons: readonly Person[],
  role: RoleId,
  lang: 'en' | 'ar',
  lastContact: (personId: string) => string | undefined = () => undefined,
  extra: (personId: string) => Record<string, string | number> = () => ({}),
): Record<string, string | number>[] {
  const c = CUSTOMERS_LIST_COPY.columns
  const withMobile = canViewMobiles(role)
  return persons.map((p) => {
    const row: Record<string, string | number> = { [c.person[lang]]: personLabel(p, role) }
    if (withMobile) row[c.mobile[lang]] = p.identity.mobile ?? ''
    row[c.type[lang]] = SEGMENT_LABEL[p.segment][lang]
    row[c.environment[lang]] = p.environment
    row[c.source[lang]] = SOURCE_LABEL[p.sourceOfLead][lang]
    row[c.lastContact[lang]] = lastContact(p.id)?.slice(0, 10) ?? ''
    return { ...row, ...extra(p.id) }
  })
}
