import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * AI agent settings (owner, 24 Nov: "do we need a configuration page" → a Settings tab on the AI team page, not a new page).
 * Per agent: on or paused, how much it may do alone (suggest, a person approves / act on its own), the confidence line below which a
 * person decides, and who reviews its output. Every change is kept (when, who, what). The CX manager edits; everyone else who opens the
 * AI team page reads. Prompts, models and keys are not here: they belong to the integration and IT side.
 *
 * Prototype: kept in this browser's localStorage over the defaults. In the real platform a small table, audit-logged.
 */
export type AgentMode = 'suggest' | 'auto'
export type Reviewer = 'cxmgr' | 'cxteam' | 'auditmkt'

export interface AgentSetting {
  enabled: boolean
  mode: AgentMode
  /** Percent; null when the agent does not score its own confidence (it works from rules). */
  confidence: number | null
  reviewer: Reviewer
}

export interface AgentLock {
  /** The mode cannot change (a fix always needs a person's yes). */
  mode?: Bi
  /** The agent cannot be paused (the supervisor is the safety layer). */
  enabled?: Bi
}

export interface SettingChange {
  at: string
  by: string
  agentKey: string
  what: Bi
}

interface Store {
  settings: Record<string, AgentSetting>
  log: SettingChange[]
}

const b = (en: string, ar: string): Bi => ({ en, ar })

export const DEFAULT_SETTINGS: Record<string, AgentSetting> = {
  intake: { enabled: true, mode: 'auto', confidence: 85, reviewer: 'cxteam' },
  classify: { enabled: true, mode: 'auto', confidence: 70, reviewer: 'cxteam' },
  signals: { enabled: true, mode: 'auto', confidence: null, reviewer: 'cxmgr' },
  severity: { enabled: false, mode: 'suggest', confidence: null, reviewer: 'cxmgr' },
  actions: { enabled: true, mode: 'suggest', confidence: null, reviewer: 'cxmgr' },
  verify: { enabled: true, mode: 'suggest', confidence: null, reviewer: 'cxmgr' },
  journey: { enabled: true, mode: 'auto', confidence: 75, reviewer: 'cxmgr' },
  loop: { enabled: true, mode: 'suggest', confidence: null, reviewer: 'cxteam' },
  report: { enabled: true, mode: 'suggest', confidence: null, reviewer: 'cxmgr' },
  survey_triggers: { enabled: true, mode: 'auto', confidence: null, reviewer: 'cxmgr' },
  supervisor: { enabled: true, mode: 'auto', confidence: null, reviewer: 'auditmkt' },
}

export const LOCKS: Record<string, AgentLock> = {
  actions: { mode: b('A fix always needs a person’s approval.', 'الإجراء التصحيحي يحتاج دائماً موافقة شخص.') },
  verify: { mode: b('The CX manager or the CX team confirms the 60-day verdict.', 'مدير أو فريق تجربة العملاء يؤكد حكم الـ60 يوماً.') },
  report: { mode: b('A report is read by a person before it is sent.', 'يقرأ شخص التقرير قبل إرساله.') },
  supervisor: {
    enabled: b('The supervisor checks the other agents; it stays on.', 'المشرف يراجع باقي الوكلاء؛ يبقى مفعلاً.'),
    mode: b('It only checks and flags.', 'يراجع وينبّه فقط.'),
  },
}

export const REVIEWER_LABEL: Record<Reviewer, Bi> = {
  cxmgr: b('CX manager', 'مدير تجربة العملاء'),
  cxteam: b('CX team', 'فريق تجربة العملاء'),
  auditmkt: b('Internal Audit and Marketing Lead', 'مسؤول التدقيق الداخلي والتسويق'),
}

export const MODE_LABEL: Record<AgentMode, Bi> = {
  suggest: b('Suggests, a person approves', 'يقترح، والشخص يوافق'),
  auto: b('Acts on its own', 'ينفّذ بنفسه'),
}

const KEY = 'psicx.agentSettings'

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>
      return { settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) }, log: s.log ?? [] }
    }
  } catch {
    /* fall back to the defaults */
  }
  return { settings: DEFAULT_SETTINGS, log: [] }
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

export function useAgentSettings(): Store {
  return useSyncExternalStore(subscribe, () => cache)
}

/** Read outside React (the classification, at load). */
export function agentSetting(key: string): AgentSetting {
  return cache.settings[key] ?? DEFAULT_SETTINGS[key]
}

export function updateAgent(agentKey: string, patch: Partial<AgentSetting>, by: string, what: Bi) {
  const current = cache.settings[agentKey] ?? DEFAULT_SETTINGS[agentKey]
  write({
    settings: { ...cache.settings, [agentKey]: { ...current, ...patch } },
    log: [{ at: new Date().toISOString(), by, agentKey, what }, ...cache.log],
  })
}

export function resetAgent(agentKey: string, by: string) {
  write({
    settings: { ...cache.settings, [agentKey]: DEFAULT_SETTINGS[agentKey] },
    log: [{ at: new Date().toISOString(), by, agentKey, what: b('Back to the defaults', 'إعادة للإعدادات الافتراضية') }, ...cache.log],
  })
}
