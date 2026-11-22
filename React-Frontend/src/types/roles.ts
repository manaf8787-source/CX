import type { Bi, EnvId, ProductId } from './common'

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
  /** v43 (19 Nov): the super admin invites users and gives roles; sees the Users page only, nothing of CX. */
  | 'admin'
  /** v43.2 (22 Nov): "Admin": runs the user list (invite, change role, deactivate) but cannot create another Admin and cannot open the audit log. */
  | 'useradmin'
  /** v43.1 (22 Nov): a role the super admin builds screen by screen (data/customRoles.ts). */
  | 'custom'

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
  /** Same environment as `environment`, as the canonical id (v40). */
  envId?: EnvId
}

/** The six roles shown on the sign-in screen (v40 F28); the rest are folded under "Other roles". */
export type MainRoleId = 'cxmgr' | 'cxteam' | 'envmgmt' | 'marketing' | 'ld' | 'auditmkt'
