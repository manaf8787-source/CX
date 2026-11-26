import { describe, expect, it } from 'vitest'
import { FOLDED_ROLE_IDS, MAIN_ROLE_IDS, ROLE_DEFS, mainRoleDefs, roleDef } from '@/data/roles'
import { CUSTOMERS_TABS, LEGACY_REDIRECTS, PRIMARY_NAV, SETTINGS_LANDING, SETTINGS_NAV, legacyRedirect } from '@/data/nav'
import type { RoleId } from '@/types'
import { ROLE_PATHS, canAccessPath, canOpenPage, canUseAssistant, firstAllowedUnder } from './access'
import {
  canActOnCorrectiveAction,
  canActOnShopperCase,
  canApprovePersona,
  canViewAgentNames,
  canViewConversationText,
  canViewPersonaAudit,
  canEditCampaignAudit,
  canEditCrmMapping,
  canEditEscalationMatrix,
  canJudgeSample,
  canMarkMentionReplied,
  canRecordCallAttempt,
  canRecordFixVerdict,
  canStartCampaign,
  canViewNamesInSample,
  canViewCustomerNames,
  canViewMobiles,
  isInformedOnly,
  resolveAgentDisplay,
} from './permissions'

const ALL: RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'marketing', 'auditmkt', 'exec', 'shopper']
const allowed = (fn: (r: RoleId) => boolean) => ALL.filter(fn).sort()

describe('role list', () => {
  it('defines the 12 v38 roles plus the Super admin, the Admin and the custom role, each with a bilingual title and a home page', () => {
    expect(ROLE_DEFS.map((r) => r.id).sort()).toEqual([...ALL, 'admin', 'useradmin', 'custom'].sort())
    for (const r of ROLE_DEFS) {
      expect(r.name.ar).toMatch(/[؀-ۿ]/)
      expect(r.home.startsWith('/')).toBe(true)
      // a custom role's pages come from the role the Super admin built, so its home is checked with that role (data/customRoles.ts)
      if (r.id !== 'custom') expect(canOpenPage(r.id, r.home), `${r.id} must be able to open its own home ${r.home}`).toBe(true)
    }
  })
})

describe('NFR-2 visibility rules', () => {
  it('conversation text: CX team and CX manager only', () => {
    expect(allowed(canViewConversationText)).toEqual(['cxmgr', 'cxteam'])
  })
  it('agent names (22 Nov): every signed-in role except the external mystery shopper and the admin roles', () => {
    expect(allowed(canViewAgentNames)).toEqual(['aslead', 'auditmkt', 'cxmgr', 'cxteam', 'envmgmt', 'exec', 'hrmgr', 'hrspec', 'ld', 'marketing', 'teamlead'])
    expect(canViewAgentNames('shopper')).toBe(false)
    expect(canViewAgentNames('admin')).toBe(false)
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
  it('only the Internal Audit and Marketing Lead names and approves personas, and reads the audit note (22 Nov)', () => {
    expect(allowed(canApprovePersona)).toEqual(['auditmkt'])
    expect(allowed(canViewPersonaAudit)).toEqual(['auditmkt'])
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
  it('CX manager sees everything that is not another role\'s; the CX team the same minus the manager\'s settings', () => {
    for (const p of ['/home', '/actions/signals', '/settings/rules', '/intelligent-cx-team', '/performance']) expect(canOpenPage('cxmgr', p), p).toBe(true)
    for (const p of ['/home', '/actions/signals', '/intelligent-cx-team']) expect(canOpenPage('cxteam', p), p).toBe(true)
    // 23 Nov: rules, CRM mapping, the matrix, the weekly sample and the manager's report are not the CX team's
    for (const p of ['/settings/rules', '/settings/crm-mapping', '/settings/escalation-matrix', '/settings/weekly-sample', '/performance', '/agents']) expect(canOpenPage('cxteam', p), p).toBe(false)
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
  it('My inbox: every role that has Customers or Who is leaving, and L&D (its open items); not HR or the shopper', () => {
    expect(open('/inbox')).toEqual(sorted('cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'marketing', 'auditmkt', 'exec'))
  })

  it('CX indicators (/overview): CX, Executive, Internal Audit and Marketing Lead; not Marketing', () => {
    expect(open('/overview')).toEqual(sorted('cxmgr', 'cxteam', 'exec', 'auditmkt'))
  })

  it('the data and configuration pages: who opens each (23 Nov: feeds are the Super admin\'s and the Admin\'s, the CX manager keeps mapping, matrix and the sample)', () => {
    expect(open('/settings/feeds')).toEqual(sorted('auditmkt', 'exec'))
    for (const path of ['/settings/crm-mapping', '/settings/escalation-matrix', '/settings/weekly-sample']) expect(open(path), path).toEqual(sorted('cxmgr', 'auditmkt', 'exec'))
    expect(open('/settings/survey-questions')).toEqual(sorted('cxmgr', 'cxteam'))
  })

  it('Public mentions: CX, the Internal Audit and Marketing Lead, Executive, Marketing, and the line roles', () => {
    expect(open('/settings/public-mentions')).toEqual(sorted('cxmgr', 'cxteam', 'auditmkt', 'exec', 'marketing', 'envmgmt', 'teamlead', 'aslead'))
  })

  it('The AI team page (now one page with a Watch tab): CX manager, CX team, environment management, Marketing, Internal Audit and Marketing Lead, Executive', () => {
    expect(open('/settings/ai-team')).toEqual(sorted('cxmgr', 'cxteam', 'envmgmt', 'marketing', 'auditmkt', 'exec'))
    for (const r of ['teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'shopper'] as RoleId[]) expect(canOpenPage(r, '/settings/ai-team'), r).toBe(false)
  })

  it('Campaign audit (v42.1 F33, 22 Nov): the Internal Audit and Marketing Lead, the Marketing manager and Executive; CX do not open it', () => {
    expect(open('/settings/campaign-audit')).toEqual(sorted('auditmkt', 'marketing', 'exec'))
    for (const r of ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'shopper'] as RoleId[]) expect(canOpenPage(r, '/settings/campaign-audit'), r).toBe(false)
  })

  it('Campaign audit: only the Internal Audit and Marketing Lead edits; the Marketing manager and Executive read', () => {
    expect(allowed(canEditCampaignAudit)).toEqual(sorted('auditmkt'))
    for (const r of open('/settings/campaign-audit').filter((x) => x !== 'auditmkt')) expect(canEditCampaignAudit(r as RoleId), r).toBe(false)
  })

  it('who starts a cleared campaign (Proposed): Marketing and the CX manager a persona campaign, the CX manager and the CX team an AI campaign, never the audit role', () => {
    expect(allowed((r) => canStartCampaign(r, 'persona'))).toEqual(sorted('cxmgr', 'marketing'))
    expect(allowed((r) => canStartCampaign(r, 'ai'))).toEqual(sorted('cxmgr', 'cxteam'))
    expect(canStartCampaign('auditmkt', 'persona')).toBe(false)
    expect(canStartCampaign('auditmkt', 'ai')).toBe(false)
  })

  it('the Internal Audit and Marketing Lead audits and never approves a fix (Decision 2): no decide control, no fixes in its inbox, no Actions page', () => {
    for (const kind of ['employee', 'service', 'training_gap', 'process', 'product', 'environment', 'legal', 'marketing']) {
      expect(canActOnCorrectiveAction('auditmkt', kind), kind).toBe(false)
    }
    expect(isInformedOnly('auditmkt')).toBe(true)
    expect(canActOnShopperCase('auditmkt')).toBe(false)
    expect(canRecordFixVerdict('auditmkt')).toBe(false)
    expect(canOpenPage('auditmkt', '/actions')).toBe(false)
    expect(canOpenPage('auditmkt', '/actions/corrective')).toBe(false)
    expect(canAccessPath('auditmkt', '/actions/corrective')).toBe(false)
    // only the CX roles and the owners of a fix have the decide control
    expect(allowed((r) => canActOnCorrectiveAction(r, 'process'))).toEqual(sorted('cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead'))
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
    for (const role of ['hrmgr', 'shopper', 'hrspec'] as RoleId[]) {
      for (const path of ['/inbox', '/overview', ...REGISTERS, '/settings/surveys']) expect(canOpenPage(role, path), `${role} ${path}`).toBe(false)
    }
    for (const path of ['/settings/feeds', '/settings/campaign-audit']) expect(canOpenPage('ld', path), `ld ${path}`).toBe(false)
    for (const path of ['/inbox', '/overview', '/settings/surveys', '/settings/survey-questions']) {
      expect(canOpenPage('cxmgr', path)).toBe(true)
      expect(canOpenPage('cxteam', path)).toBe(true)
    }
  })

  it('every role can open its own home (v40: Marketing lands on Home, the Internal Audit and Marketing Lead on the Overview)', () => {
    expect(roleDef('marketing')?.home).toBe('/home')
    expect(roleDef('auditmkt')?.home).toBe('/overview')
    for (const r of ROLE_DEFS.filter((x) => x.id !== 'custom')) expect(canOpenPage(r.id, r.home), r.id).toBe(true)
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
  it('mark a mention replied: the CX manager and the CX team (23 Nov, a human replies); record a call attempt: the CX team only (22 Nov)', () => {
    expect(allowed(canMarkMentionReplied)).toEqual(sorted('cxmgr', 'cxteam'))
    expect(allowed(canRecordCallAttempt)).toEqual(['cxteam'])
  })
})

describe('v40 menu and sign-in roles (F08, F28)', () => {
  it('six main roles on sign-in; the twelve v38 roles plus the three admin and custom roles are folded under "Other roles"', () => {
    expect([...MAIN_ROLE_IDS]).toEqual(['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'ld', 'auditmkt'])
    expect(sorted(...FOLDED_ROLE_IDS)).toEqual(sorted('teamlead', 'aslead', 'hrspec', 'hrmgr', 'exec', 'shopper', 'admin', 'useradmin', 'custom'))
    expect(mainRoleDefs().map((r) => r.id)).toEqual([...MAIN_ROLE_IDS])
    expect(new Set([...MAIN_ROLE_IDS, ...FOLDED_ROLE_IDS]).size).toBe(15)
  })

  it('the workspace menu starts with the six steps in order; Runaway, Personas and Surveys left it', () => {
    const [workspace, reference] = PRIMARY_NAV
    expect(workspace.items.slice(0, 6).map((i) => i.path)).toEqual(['/home', '/customers', '/inbox', '/actions', '/close-the-loop', '/overview'])
    expect(workspace.items.slice(0, 6).map((i) => i.label.en)).toEqual(['Home', '1 · Customers', 'My inbox', 'Problems and fixes', '5 · Close the loop', '6 · CX indicators'])
    expect(reference.items[0].path).toBe('/settings')
    const all = PRIMARY_NAV.flatMap((g) => g.items.map((i) => i.path))
    for (const gone of ['/runaway', '/personas', '/surveys', '/intelligent-cx-team']) expect(all).not.toContain(gone)
  })

  it('Customers holds three tabs, each its own URL', () => {
    expect(CUSTOMERS_TABS.map((t) => t.path)).toEqual(['/customers', '/runaway', '/personas'])
    expect(CUSTOMERS_TABS.map((t) => t.label.en)).toEqual(['Find a person', 'Who is leaving', 'Personas and campaigns'])
  })

  it('the Settings and reference list is flat, with no duplicates, starting with the AI team page, and the CX manager opens every page that is not another role\'s', () => {
    const paths = SETTINGS_NAV.map((i) => i.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.slice(0, 4)).toEqual(['/settings/ai-team', '/settings/weekly-sample', '/settings/campaign-audit', '/settings/public-mentions'])
    expect(paths).toContain('/settings/surveys')
    expect(paths).toContain('/settings/feeds')
    expect(paths).not.toContain('/settings/overview')
    // the pages that belong to other roles (the audit lead's campaigns, L&D, HR, the Super admin's feeds)
    const notCx = ['/settings/campaign-audit', '/settings/ld', '/settings/hr-team', '/settings/feeds']
    for (const p of paths.filter((x) => !notCx.includes(x))) expect(canOpenPage('cxmgr', p), p).toBe(true)
    for (const p of notCx) expect(canOpenPage('cxmgr', p), p).toBe(false)
  })

  it('the first allowed page under Settings follows the menu order, so a role lands on the first page it may open', () => {
    const landing: Partial<Record<RoleId, string | undefined>> = {
      cxmgr: '/settings/ai-team',
      cxteam: '/settings/ai-team',
      auditmkt: '/settings/ai-team',
      exec: '/settings/ai-team',
      marketing: '/settings/ai-team',
      envmgmt: '/settings/ai-team',
      aslead: '/settings/public-mentions',
      teamlead: '/settings/public-mentions',
    }
    for (const [role, to] of Object.entries(landing)) expect(firstAllowedUnder(role as RoleId, '/settings', SETTINGS_LANDING), role).toBe(to)
  })

  it('the Marketing campaigns page (v42.1 F33) is listed after the weekly sample and is not a landing page', () => {
    expect(SETTINGS_NAV.find((i) => i.path === '/settings/campaign-audit')).toEqual({
      path: '/settings/campaign-audit',
      label: { en: 'Marketing campaigns', ar: 'الحملات التسويقية' },
      skipLanding: true,
    })
    expect(SETTINGS_LANDING).not.toContain('/settings/campaign-audit')
    expect(SETTINGS_LANDING).toHaveLength(SETTINGS_NAV.length - 2) // the campaigns page and team availability
  })

  it('old URLs redirect, children and the rest of the path are kept; the AI team and survey pages became tabs', () => {
    expect(LEGACY_REDIRECTS).toEqual({
      '/surveys': '/settings/surveys',
      '/settings/overview': '/overview',
      '/intelligent-cx-team': '/settings/ai-team?tab=how',
      '/settings/watch-ai-team': '/settings/ai-team?tab=watch',
      '/settings/survey-questions': '/settings/surveys?tab=questions',
      '/settings/surveys-reference': '/settings/surveys?tab=campaigns',
      '/settings/teams-structure': '/settings/escalation-matrix?view=routing',
    })
    expect(legacyRedirect('/surveys')).toBe('/settings/surveys')
    expect(legacyRedirect('/settings/overview')).toBe('/overview')
    expect(legacyRedirect('/settings/overview/')).toBe('/overview/')
    expect(legacyRedirect('/surveys/x')).toBe('/settings/surveys/x')
    expect(legacyRedirect('/settings/surveys')).toBeUndefined()
    expect(legacyRedirect('/overview')).toBeUndefined()
  })
})
