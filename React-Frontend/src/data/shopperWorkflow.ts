import { useSyncExternalStore } from 'react'
import type { Bi, EnvId, RoleId, Severity, ShopperActionKind } from '../types'

/**
 * Mystery shopper workflow as configuration (owner, 24 Nov: "build it so we control it later; it must be dynamic; everything ready for the
 * back end"). The CX manager edits it under Settings → Rules as configuration; the cases page, the inbox and the clocks read it.
 *
 * Back end: one document, `GET /api/config/mystery-shopper-workflow` and `PUT` (CX manager only), versioned, every change in the audit log.
 * The shape below is the contract (docs: PSI-CX-Mystery-Shopper-Workflow-Backend-Spec.md). Prototype: kept in this browser over the defaults.
 */
export type ShopperOwnerRole = Extract<RoleId, 'envmgmt' | 'teamlead' | 'aslead'>

export interface ActionKindConfig {
  key: ShopperActionKind
  label: Bi
  /** The date the owner gives when the action goes ahead, e.g. "Training date". */
  dateLabel: Bi
  /** The owner cannot approve without that date. */
  dateRequired: boolean
  /** Offered to the people proposing actions. */
  active: boolean
}

export interface SeverityClock {
  /** Days from the visit to the CX manager's check (the first response). */
  respondDays: number
  /** Days from the visit until every action is decided and done. */
  resolveDays: number
}

export interface ShopperWorkflowConfig {
  version: number
  /** The CX manager checks the evidence before the owner sees the case. Off: the case goes straight to the owner. */
  cxReviewRequired: boolean
  /** Who decides, per environment. The environment manager refers conduct cases to HR (decided 24 Nov). */
  ownerByEnv: Record<EnvId, ShopperOwnerRole>
  /** A comment is required on every decision, approvals included (decided 24 Nov). */
  commentOnApprove: boolean
  clocks: Record<Severity, SeverityClock>
  /** Reminder in the owner's inbox this many days before a planned date. */
  /** 24 Nov (owner): who delivers an approved training: the owner chooses (an internal 1-to-1 or L&D), or always L&D. */
  trainingRoute: 'choose' | 'ld'
  remindBeforeDays: number
  /** Not marked done this many days after its planned date: it reaches the CX manager's inbox. */
  escalateAfterDays: number
  actionKinds: ActionKindConfig[]
}

export interface WorkflowChange {
  at: string
  by: string
  what: Bi
}

const b = (en: string, ar: string): Bi => ({ en, ar })

export const OWNER_ROLE_LABEL: Record<ShopperOwnerRole, Bi> = {
  envmgmt: b('Environment manager', 'مدير البيئة'),
  teamlead: b('Team leader', 'قائد الفريق'),
  aslead: b('After-Sales lead', 'مسؤول ما بعد البيع'),
}

export const DEFAULT_WORKFLOW: ShopperWorkflowConfig = {
  version: 1,
  cxReviewRequired: true,
  ownerByEnv: { dub: 'envmgmt', auh: 'envmgmt', ast: 'envmgmt', ai: 'envmgmt' },
  commentOnApprove: true,
  clocks: {
    critical: { respondDays: 1, resolveDays: 5 },
    medium: { respondDays: 3, resolveDays: 10 },
    low: { respondDays: 5, resolveDays: 20 },
  },
  trainingRoute: 'choose',
  remindBeforeDays: 1,
  escalateAfterDays: 3,
  actionKinds: [
    { key: 'training', label: b('Training', 'تدريب'), dateLabel: b('Training date', 'موعد التدريب'), dateRequired: true, active: true },
    { key: 'coaching', label: b('Coaching', 'توجيه'), dateLabel: b('Session date', 'موعد الجلسة'), dateRequired: true, active: true },
    { key: 'process', label: b('Way of working', 'طريقة العمل'), dateLabel: b('In place by', 'مطبّق بحلول'), dateRequired: true, active: true },
    { key: 'hr', label: b('HR referral', 'إحالة للموارد البشرية'), dateLabel: b('Referred to HR on', 'تاريخ الإحالة'), dateRequired: true, active: true },
    { key: 'facility', label: b('System or facility fix', 'إصلاح نظام أو مرفق'), dateLabel: b('Fixed by', 'يُصلح بحلول'), dateRequired: true, active: true },
  ],
}

interface Store {
  config: ShopperWorkflowConfig
  log: WorkflowChange[]
}

const KEY = 'psicx.shopperWorkflow'

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>
      const c = s.config ?? DEFAULT_WORKFLOW
      return {
        config: {
          ...DEFAULT_WORKFLOW,
          ...c,
          ownerByEnv: { ...DEFAULT_WORKFLOW.ownerByEnv, ...(c.ownerByEnv ?? {}) },
          clocks: { ...DEFAULT_WORKFLOW.clocks, ...(c.clocks ?? {}) },
          actionKinds: DEFAULT_WORKFLOW.actionKinds.map((d) => ({ ...d, ...(c.actionKinds?.find((k) => k.key === d.key) ?? {}) })),
        },
        log: s.log ?? [],
      }
    }
  } catch {
    /* fall back to the defaults */
  }
  return { config: DEFAULT_WORKFLOW, log: [] }
}

let cache = read()
const listeners = new Set<() => void>()
function write(next: Store) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* in memory only */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useShopperWorkflow(): Store {
  return useSyncExternalStore(subscribe, () => cache)
}

/** Read outside React. */
export const shopperWorkflow = () => cache.config

export function updateWorkflow(patch: Partial<ShopperWorkflowConfig>, by: string, what: Bi) {
  write({ config: { ...cache.config, ...patch, version: cache.config.version + 1 }, log: [{ at: new Date().toISOString(), by, what }, ...cache.log] })
}

export function resetWorkflow(by: string) {
  write({
    config: { ...DEFAULT_WORKFLOW, version: cache.config.version + 1 },
    log: [{ at: new Date().toISOString(), by, what: b('Back to the defaults', 'إعادة للإعدادات الافتراضية') }, ...cache.log],
  })
}

export const kindConfig = (cfg: ShopperWorkflowConfig, key?: ShopperActionKind) => cfg.actionKinds.find((k) => k.key === key)

const DAY = 86_400_000
/** The case clocks from the visit date and the severity, read from the configuration (not stored on the case). */
export function caseDue(cfg: ShopperWorkflowConfig, openedAt: string, severity: Severity) {
  const t = new Date(openedAt).getTime()
  const c = cfg.clocks[severity]
  return { respondDueAt: new Date(t + c.respondDays * DAY).toISOString(), resolveDueAt: new Date(t + c.resolveDays * DAY).toISOString() }
}
