import { describe, expect, it } from 'vitest'
import { FOLDED_ROLE_IDS, MAIN_ROLE_IDS, ROLE_DEFS, mainRoleDefs, roleDef } from '@/data/roles'
import { CUSTOMERS_TABS, LEGACY_REDIRECTS, PRIMARY_NAV, SETTINGS_NAV, legacyRedirect } from '@/data/nav'
import type { RoleId } from '@/types'
import { ROLE_PATHS, canAccessPath, canOpenPage, canUseAssistant, firstAllowedUnder } from './access'
import {
  canActOnCorrectiveAction,
  canActOnShopperCase,
  canApprovePersona,
  canViewAgentNames,
  canViewConversationText,
  canViewPersonaAudit,
  canEditCrmMapping,
  canEditEscalationMatrix,
  canJudgeSample,
  canMarkMentionReplied,
  canRecordCallAttempt,
  canViewNamesInSample,
  canViewCustomerNames,
  canViewMobiles,
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

// --- v40 pages (docs/V40_DELTA.md F35) ------------------------------------------------------------

const REGISTERS = ['/settings/feeds', '/settings/crm-mapping', '/settings/escalation-matrix', '/settings/survey-questions', '/settings/weekly-sample', '/settings/public-mentions']
const open = (path: string) => ALL.filter((r) => canOpenPage(r, path)).sort()
const sorted = (...roles: RoleId[]) => [...roles].sort()

describe('v40 page access per role (F35)', () => {
  it('My inbox: every role that has Customers or Who is leaving, not L&D, HR or the shopper', () => {
    expect(open('/inbox')).toEqual(sorted('cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'marketing', 'auditmkt', 'exec'))
  })

  it('CX indicators (/overview): CX, Executive, Internal Audit and Marketing Lead; not Marketing', () => {
    expect(open('/overview')).toEqual(sorted('cxmgr', 'cxteam', 'exec', 'auditmkt'))
  })

  it('the data and configuration pages: CX, Internal Audit and Marketing Lead, Executive', () => {
    for (const path of REGISTERS.filter((p) => p !== '/settings/public-mentions')) expect(open(path), path).toEqual(sorted('cxmgr', 'cxteam', 'auditmkt', 'exec'))
  })

  it('Public mentions: the same, and Marketing', () => {
    expect(open('/settings/public-mentions')).toEqual(sorted('cxmgr', 'cxteam', 'auditmkt', 'exec', 'marketing'))
  })

  it('Surveys and triggers moved to /settings/surveys: CX, Executive, Internal Audit and Marketing Lead, After-Sales lead, environment management', () => {
    expect(open('/settings/surveys')).toEqual(sorted('cxmgr', 'cxteam', 'exec', 'auditmkt', 'aslead', 'envmgmt'))
  })

  it('the Internal Audit and Marketing Lead gains Customers (aggregates only is flagged to the owner)', () => {
    expect(canOpenPage('auditmkt', '/customers')).toBe(true)
    expect(canOpenPage('auditmkt', '/runaway')).toBe(true)
    expect(canOpenPage('auditmkt', '/actions')).toBe(false) // no cases
    expect(canOpenPage('auditmkt', '/close-the-loop')).toBe(false)
    expect(canOpenPage('auditmkt', '/home')).toBe(false)
  })

  it('the old Overview is not a page of its own any more: only a redirect target', () => {
    expect(canOpenPage('auditmkt', '/settings/overview')).toBe(false)
    expect(canOpenPage('exec', '/settings/overview')).toBe(false)
    expect(Object.values(ROLE_PATHS).flat().includes('/settings/overview')).toBe(false)
  })

  it('every v40 route is gated: a role never sees a page it was not given', () => {
    for (const role of ['hrmgr', 'shopper', 'ld', 'hrspec'] as RoleId[]) {
      for (const path of ['/inbox', '/overview', ...REGISTERS, '/settings/surveys']) expect(canOpenPage(role, path), `${role} ${path}`).toBe(false)
    }
    for (const path of ['/inbox', '/overview', ...REGISTERS, '/settings/surveys']) {
      expect(canOpenPage('cxmgr', path)).toBe(true)
      expect(canOpenPage('cxteam', path)).toBe(true)
    }
  })

  it('every role can open its own home (v40: Marketing lands on Home, the Internal Audit and Marketing Lead on the Overview)', () => {
    expect(roleDef('marketing')?.home).toBe('/home')
    expect(roleDef('auditmkt')?.home).toBe('/overview')
    for (const r of ROLE_DEFS) expect(canOpenPage(r.id, r.home), r.id).toBe(true)
  })
})

describe('v40 edit rights (F35, F31, F30, F27)', () => {
  it('mapping and matrix: CX manager and Internal Audit and Marketing Lead; feeds are read-only for everyone', () => {
    expect(allowed(canEditCrmMapping)).toEqual(sorted('cxmgr', 'auditmkt'))
    expect(allowed(canEditEscalationMatrix)).toEqual(sorted('cxmgr', 'auditmkt'))
  })
  it('weekly sample: judged by CX manager, CX team and the Internal Audit and Marketing Lead; no customer names to Internal Audit (decided 18 Nov)', () => {
    expect(allowed(canJudgeSample)).toEqual(sorted('cxmgr', 'cxteam', 'auditmkt'))
    expect(allowed(canViewNamesInSample)).toEqual(allowed(canViewCustomerNames))
    expect(canViewNamesInSample('auditmkt')).toBe(false)
  })
  it('customer names and, with them, exported mobiles: every role that works with people except the Internal Audit and Marketing Lead (decided 18 Nov)', () => {
    expect(allowed(canViewCustomerNames)).toEqual(sorted('cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'marketing', 'exec'))
    expect(allowed(canViewMobiles)).toEqual(allowed(canViewCustomerNames))
    for (const r of ['auditmkt', 'ld', 'hrspec', 'hrmgr', 'shopper'] as RoleId[]) expect(canViewMobiles(r), r).toBe(false)
  })
  it('mark a mention replied: CX roles and Marketing; record a call attempt: CX roles', () => {
    expect(allowed(canMarkMentionReplied)).toEqual(sorted('cxmgr', 'cxteam', 'marketing'))
    expect(allowed(canRecordCallAttempt)).toEqual(sorted('cxmgr', 'cxteam'))
  })
})

describe('v40 menu and sign-in roles (F08, F28)', () => {
  it('six main roles on sign-in, six folded, together the twelve', () => {
    expect([...MAIN_ROLE_IDS]).toEqual(['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'ld', 'auditmkt'])
    expect(sorted(...FOLDED_ROLE_IDS)).toEqual(sorted('teamlead', 'aslead', 'hrspec', 'hrmgr', 'exec', 'shopper'))
    expect(mainRoleDefs().map((r) => r.id)).toEqual([...MAIN_ROLE_IDS])
    expect(new Set([...MAIN_ROLE_IDS, ...FOLDED_ROLE_IDS]).size).toBe(12)
  })

  it('the main menu is six items in step order, then the folded Settings entry; Runaway, Personas and Surveys left it', () => {
    const [workspace, reference] = PRIMARY_NAV
    expect(workspace.items.map((i) => i.path)).toEqual(['/home', '/customers', '/inbox', '/actions', '/close-the-loop', '/overview'])
    expect(workspace.items.map((i) => i.label.en)).toEqual(['Home', '1 · Customers', 'My inbox', '2–4 · Signals and fixes', '5 · Close the loop', '6 · CX indicators'])
    expect(workspace.items.map((i) => i.label.ar)).toEqual(['الرئيسية', '1 · العملاء', 'صندوقي', '2–4 · الإشارات والحلول', '5 · إغلاق الحلقة', '6 · مؤشرات تجربة العملاء'])
    expect(reference.items.map((i) => i.path)).toEqual(['/settings'])
    const all = PRIMARY_NAV.flatMap((g) => g.items.map((i) => i.path))
    for (const gone of ['/runaway', '/personas', '/surveys', '/intelligent-cx-team']) expect(all).not.toContain(gone)
  })

  it('Customers holds three tabs, each its own URL', () => {
    expect(CUSTOMERS_TABS.map((t) => t.path)).toEqual(['/customers', '/runaway', '/personas'])
    expect(CUSTOMERS_TABS.map((t) => t.label.en)).toEqual(['Find a person', 'Who is leaving', 'Personas and campaigns'])
  })

  it('the Settings and reference list is flat, in the v40 order, with no duplicates, and every page is open to the CX manager', () => {
    const paths = SETTINGS_NAV.map((i) => i.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.slice(0, 3)).toEqual(['/intelligent-cx-team', '/settings/weekly-sample', '/settings/public-mentions'])
    expect(paths).toContain('/settings/surveys')
    expect(paths).toContain('/settings/feeds')
    expect(paths).not.toContain('/settings/overview')
    for (const p of paths) expect(canOpenPage('cxmgr', p), p).toBe(true)
    expect(SETTINGS_NAV.find((i) => i.path === '/intelligent-cx-team')?.label.en).toBe('How the portal works (the AI team)')
    expect(SETTINGS_NAV.find((i) => i.path === '/settings/surveys-reference')?.label.en).toBe('Surveys (legacy reference)')
  })

  it('the first allowed page under Settings is found for a role with only a v40 page', () => {
    expect(firstAllowedUnder('marketing', '/settings', SETTINGS_NAV.map((i) => i.path))).toBe('/settings/public-mentions')
    expect(firstAllowedUnder('auditmkt', '/settings', SETTINGS_NAV.map((i) => i.path))).toBe('/settings/weekly-sample')
    expect(firstAllowedUnder('teamlead', '/settings', SETTINGS_NAV.map((i) => i.path))).toBe('/settings/glossary') // only the glossary, which is open to all
  })

  it('old URLs redirect: /surveys and /settings/overview (children and the rest of the path are kept)', () => {
    expect(LEGACY_REDIRECTS).toEqual({ '/surveys': '/settings/surveys', '/settings/overview': '/overview' })
    expect(legacyRedirect('/surveys')).toBe('/settings/surveys')
    expect(legacyRedirect('/settings/overview')).toBe('/overview')
    expect(legacyRedirect('/settings/overview/')).toBe('/overview/')
    expect(legacyRedirect('/surveys/x')).toBe('/settings/surveys/x')
    expect(legacyRedirect('/settings/surveys')).toBeUndefined()
    expect(legacyRedirect('/settings/surveys-reference')).toBeUndefined()
    expect(legacyRedirect('/overview')).toBeUndefined()
  })
})
