import type { Bi, InboxItem, RoleId, ShopperCase } from '../types'
import { caseDue, OWNER_ROLE_LABEL, type ShopperWorkflowConfig } from './shopperWorkflow'

const b = (en: string, ar: string): Bi => ({ en, ar })
const DAY = 86_400_000

export const SHOPPER_CATEGORY_LABEL: Record<string, Bi> = {
  greeting: b('Greeting', 'الاستقبال والترحيب'),
  needs_discovery: b('Needs discovery', 'اكتشاف الاحتياجات'),
  pricing_disclosure: b('Pricing disclosure', 'الإفصاح عن الأسعار'),
  handover_process: b('Handover process', 'عملية التسليم'),
  follow_up_commitment: b('Follow-up commitment', 'الالتزام بالمتابعة'),
}

export const shopperCategory = (c: string): Bi => SHOPPER_CATEGORY_LABEL[c] ?? b(c.replace(/_/g, ' '), c.replace(/_/g, ' '))

/** The owner role of a case, from the configuration (per environment). */
export const ownerRoleOf = (cfg: ShopperWorkflowConfig, c: ShopperCase) => cfg.ownerByEnv[c.envId] ?? 'envmgmt'

/** The owner's title for display: "PSI Assets environment manager", "Team leader". */
export function ownerLabel(cfg: ShopperWorkflowConfig, c: ShopperCase): Bi {
  const r = ownerRoleOf(cfg, c)
  const l = OWNER_ROLE_LABEL[r]
  return r === 'envmgmt' ? b(`${c.environment} environment manager`, `مدير بيئة ${c.environment}`) : l
}

/** Who decides on a case: the configured role, and for the environment manager only the one of that environment. */
export function isShopperOwner(role: RoleId, roleEnvironment: string | undefined, c: ShopperCase, cfg: ShopperWorkflowConfig): boolean {
  const owner = ownerRoleOf(cfg, c)
  if (role !== owner) return false
  return owner !== 'envmgmt' || !roleEnvironment || roleEnvironment === c.environment
}

/** The CX side: the CX manager and the CX team read every case; only the CX manager checks the evidence and closes. */
export const isCxSide = (role: RoleId) => role === 'cxmgr' || role === 'cxteam'

/** The case waits for the CX manager's check (only when the configuration asks for it). */
export const awaitingCxReview = (c: ShopperCase, cfg: ShopperWorkflowConfig) => cfg.cxReviewRequired && c.status === 'open'

/** The owner can work on it: checked by the CX manager, or the check is switched off. */
export const withOwner = (c: ShopperCase, cfg: ShopperWorkflowConfig) => c.status === 'owner_decision' || (!cfg.cxReviewRequired && c.status === 'open')

/** Every approved or modified action is done: the CX manager can close the case. */
export const readyToClose = (c: ShopperCase, cfg: ShopperWorkflowConfig) =>
  withOwner(c, cfg) && c.proposedActions.every((p) => p.decision !== 'pending' && (p.decision === 'rejected' || !!p.doneAt))

const daysTo = (iso: string | undefined, now: number) => (iso ? Math.ceil((new Date(iso).getTime() - now) / DAY) : null)

/**
 * 24 Nov (owner): "how do I decide on findings that are not in my inbox?" Inbox rows, all driven by the workflow configuration:
 * - CX manager: check the evidence; an approved action not marked done N days after its date (escalation); close the case.
 * - Owner: decide the proposed actions; mark done (with a reminder N days before the planned date).
 */
export function shopperInboxItems(
  role: RoleId,
  roleEnvironment: string | undefined,
  cases: ShopperCase[],
  cfg: ShopperWorkflowConfig,
  now: number = Date.now(),
): InboxItem[] {
  const out: InboxItem[] = []
  for (const c of cases) {
    if (c.status === 'closed') continue
    const cat = shopperCategory(c.category)
    const where = c.environment
    const due = caseDue(cfg, c.openedAt, c.severity)
    const prio = (c.severity === 'critical' ? 2 : 1) as 0 | 1 | 2
    const toDo = c.proposedActions.filter((p) => (p.decision === 'confirmed' || p.decision === 'modified') && !p.doneAt)
    if (role === 'cxmgr') {
      if (awaitingCxReview(c, cfg) && !c.cxReview?.returned) {
        out.push({
          id: `shopper:review:${c.id}`,
          kind: 'approve',
          text: b(
            `Mystery shopper: check the evidence · ${cat.en} · ${where} (${c.visitScorePct}%)`,
            `التسوق السري: تحقق من الأدلة · ${cat.ar} · ${where} (${c.visitScorePct}%)`,
          ),
          daysLeft: daysTo(due.respondDueAt, now),
          unit: 'd',
          who: b('CX manager, then the owner', 'مدير CX ثم المالك'),
          priority: prio,
          target: `/settings/mystery-shopper?tab=cases&case=${c.id}`,
          critical: c.severity === 'critical',
        })
      } else if (readyToClose(c, cfg)) {
        out.push({
          id: `shopper:close:${c.id}`,
          kind: 'verify',
          text: b(
            `Mystery shopper: every action is done, close the case · ${cat.en} · ${where}`,
            `التسوق السري: كل الإجراءات نُفذت، أغلق الحالة · ${cat.ar} · ${where}`,
          ),
          daysLeft: daysTo(due.resolveDueAt, now),
          unit: 'd',
          who: ownerLabel(cfg, c),
          priority: 1,
          target: `/settings/mystery-shopper?tab=cases&case=${c.id}`,
        })
      } else {
        const late = toDo.filter((p) => p.plannedFor && now - new Date(p.plannedFor).getTime() > cfg.escalateAfterDays * DAY)
        if (late.length) {
          out.push({
            id: `shopper:late:${c.id}`,
            kind: 'verify',
            text: b(
              `Mystery shopper: ${late.length} approved action${late.length === 1 ? '' : 's'} not marked done ${cfg.escalateAfterDays}+ days after the date · ${cat.en} · ${where}`,
              `التسوق السري: ${late.length} من الإجراءات المعتمدة لم تُعلَّم كمنجزة بعد ${cfg.escalateAfterDays} أيام من موعدها · ${cat.ar} · ${where}`,
            ),
            daysLeft: daysTo(late[0].plannedFor, now),
            unit: 'd',
            who: ownerLabel(cfg, c),
            priority: 2,
            target: `/settings/mystery-shopper?tab=cases&case=${c.id}`,
          })
        }
      }
      continue
    }
    if (!isShopperOwner(role, roleEnvironment, c, cfg) || !withOwner(c, cfg)) continue
    const pending = c.proposedActions.filter((p) => p.decision === 'pending').length
    if (pending) {
      out.push({
        id: `shopper:decide:${c.id}`,
        kind: 'approve',
        text: b(
          `Mystery shopper: decide ${pending} proposed action${pending === 1 ? '' : 's'} · ${cat.en} (${c.visitScorePct}%)`,
          `التسوق السري: قرّر ${pending} من الإجراءات المقترحة · ${cat.ar} (${c.visitScorePct}%)`,
        ),
        daysLeft: daysTo(due.resolveDueAt, now),
        unit: 'd',
        who: cfg.cxReviewRequired ? b('Checked by the CX manager', 'تحقق منها مدير CX') : null,
        priority: prio,
        target: `/actions/shopper-cases?case=${c.id}`,
        critical: c.severity === 'critical',
      })
    } else if (toDo.length) {
      const next = toDo
        .map((p) => p.plannedFor)
        .filter((d): d is string => !!d)
        .sort()[0]
      const left = daysTo(next, now)
      out.push({
        id: `shopper:done:${c.id}`,
        kind: 'do',
        text: b(`Mystery shopper: mark done when it happens (${toDo.length}) · ${cat.en}`, `التسوق السري: علّم كمنجز عند التنفيذ (${toDo.length}) · ${cat.ar}`),
        daysLeft: left,
        unit: 'd',
        who: b('You', 'أنت'),
        // the reminder: inside N days of the planned date it is flagged
        priority: left !== null && left <= cfg.remindBeforeDays ? 2 : 1,
        target: `/actions/shopper-cases?case=${c.id}`,
      })
    }
  }
  return out
}
