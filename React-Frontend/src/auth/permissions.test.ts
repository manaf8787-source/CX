import { describe, expect, it } from 'vitest'
import { ROLE_DEFS } from '@/data/roles'
import type { RoleId } from '@/types'
import { canAccessPath, canOpenPage, canUseAssistant, firstAllowedUnder } from './access'
import {
  canActOnCorrectiveAction,
  canActOnShopperCase,
  canApprovePersona,
  canViewAgentNames,
  canViewConversationText,
  canViewPersonaAudit,
  isInformedOnly,
  resolveAgentDisplay,
} from './permissions'

const ALL: RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'marketing', 'auditmkt', 'exec', 'shopper']
const allowed = (fn: (r: RoleId) => boolean) => ALL.filter(fn).sort()

describe('role list', () => {
  it('defines the 12 v38 roles, each with a bilingual title and a home page', () => {
    expect(ROLE_DEFS.map((r) => r.id).sort()).toEqual([...ALL].sort())
    for (const r of ROLE_DEFS) {
      expect(r.name.ar).toMatch(/[؀-ۿ]/)
      expect(r.home.startsWith('/')).toBe(true)
      expect(canOpenPage(r.id, r.home), `${r.id} must be able to open its own home ${r.home}`).toBe(true)
    }
  })
})

describe('NFR-2 visibility rules', () => {
  it('conversation text: CX team and CX manager only', () => {
    expect(allowed(canViewConversationText)).toEqual(['cxmgr', 'cxteam'])
  })
  it('agent names: CX plus the agent’s own line management only', () => {
    expect(allowed(canViewAgentNames)).toEqual(['aslead', 'cxmgr', 'cxteam', 'envmgmt', 'teamlead'])
    for (const r of ['hrspec', 'hrmgr', 'ld', 'marketing', 'auditmkt', 'exec', 'shopper'] as RoleId[]) expect(canViewAgentNames(r)).toBe(false)
  })
  it('heads and C-level are informed only, and never act on a case or action', () => {
    expect(allowed(isInformedOnly)).toEqual(['auditmkt', 'exec', 'hrmgr'])
    for (const r of ['exec', 'hrmgr', 'auditmkt'] as RoleId[]) {
      expect(canActOnShopperCase(r)).toBe(false)
      for (const kind of ['employee', 'process', 'training_gap', 'marketing']) expect(canActOnCorrectiveAction(r, kind)).toBe(false)
    }
  })
  it('an employee-kind action can only be acted on by CX and the line manager', () => {
    expect(allowed((r) => canActOnCorrectiveAction(r, 'employee'))).toEqual(['aslead', 'cxmgr', 'cxteam', 'envmgmt', 'teamlead'])
  })
  it('HR specialists can work shopper cases (conduct issues), HR managers cannot', () => {
    expect(canActOnShopperCase('hrspec')).toBe(true)
    expect(canActOnShopperCase('hrmgr')).toBe(false)
    expect(canActOnShopperCase('shopper')).toBe(false)
  })
  it('only the CX manager approves personas; audit notes for audit lead and CX manager', () => {
    expect(allowed(canApprovePersona)).toEqual(['cxmgr'])
    expect(allowed(canViewPersonaAudit)).toEqual(['auditmkt', 'cxmgr'])
  })
})

describe('resolveAgentDisplay', () => {
  const directory = [{ agentRef: 'ag-1', displayName: 'Sample Agent', directManagerTitle: 'Sales team lead', visibleTo: ['cxmgr', 'teamlead'] as RoleId[] }]
  const fallback = { en: 'An agent', ar: 'وكيل' }
  it('shows the name only to an allowed role listed on the entry', () => {
    expect(resolveAgentDisplay('ag-1', 'cxmgr', directory, fallback, 'en')).toEqual({ visible: true, label: 'Sample Agent' })
    expect(resolveAgentDisplay('ag-1', 'envmgmt', directory, fallback, 'en')).toEqual({ visible: false, label: 'Sales team lead' })
    expect(resolveAgentDisplay('ag-1', 'exec', directory, fallback, 'en').label).toBe('Sales team lead')
  })
  it('never leaks a raw agent ref', () => {
    expect(resolveAgentDisplay('ag-404', 'cxmgr', directory, fallback, 'ar')).toEqual({ visible: false, label: 'وكيل' })
    expect(resolveAgentDisplay(undefined, 'cxmgr', directory, fallback, 'en').label).toBe('An agent')
  })
})

describe('page access per role (Modules KB §2)', () => {
  it('CX manager and CX team see everything', () => {
    for (const p of ['/home', '/actions/signals', '/settings/rules', '/intelligent-cx-team']) {
      expect(canOpenPage('cxmgr', p)).toBe(true)
      expect(canOpenPage('cxteam', p)).toBe(true)
    }
  })
  it('the mystery shopper sees only their own tasks (plus the glossary)', () => {
    expect(canOpenPage('shopper', '/settings/mystery-shopper')).toBe(true)
    expect(canOpenPage('shopper', '/settings/glossary')).toBe(true)
    for (const p of ['/home', '/customers', '/actions', '/settings/rules']) expect(canOpenPage('shopper', p)).toBe(false)
  })
  it('child paths inherit their section; /settings alone is a parent, not a page', () => {
    expect(canOpenPage('teamlead', '/actions/corrective')).toBe(true)
    expect(canAccessPath('ld', '/settings')).toBe(true)
    expect(canOpenPage('ld', '/settings')).toBe(false)
    expect(canOpenPage('teamlead', '/actionsx')).toBe(false)
  })
  it('HR manager is limited to HR team performance', () => {
    expect(canOpenPage('hrmgr', '/settings/hr-team')).toBe(true)
    expect(canOpenPage('hrmgr', '/actions')).toBe(false)
  })
  it('finds the first allowed sub-page in a section', () => {
    const subs = ['/settings/overview', '/settings/ld', '/settings/standards']
    expect(firstAllowedUnder('ld', '/settings', subs)).toBe('/settings/ld')
    expect(firstAllowedUnder('shopper', '/settings', subs)).toBeUndefined()
  })
  it('the assistant is for CX, Marketing, executives and environment managers (KB §13)', () => {
    expect(allowed(canUseAssistant)).toEqual(['cxmgr', 'cxteam', 'envmgmt', 'exec', 'marketing'])
  })
})
