import type { Bi, ProductId } from './common'

/** The 12-role v38 target list — docs/analysis/USER_ROLES_AND_PERMISSIONS.md.
 * `marketing` and `auditmkt` have no counterpart in the pre-omnichannel
 * `frontend/` scaffold; everything else maps onto a renamed existing role. */
export type RoleId =
  | 'cxmgr'
  | 'cxteam'
  | 'envmgmt'
  | 'teamlead'
  | 'aslead'
  | 'ld'
  | 'hrspec'
  | 'hrmgr'
  | 'marketing'
  | 'auditmkt'
  | 'exec'
  | 'shopper'

export type Access = 'full' | 'own' | 'view' | 'informed' | 'approve' | 'none'

export interface RoleDef {
  id: RoleId
  name: Bi
  description: Bi
  /** Route this role lands on after choosing it. */
  home: string
  /** Set for roles scoped to a single product (e.g. After-Sales lead). */
  product?: ProductId
  /** Set for roles scoped to a single environment (FR-3.4) — environment
   * management sees only their own environment's records. */
  environment?: string
}
