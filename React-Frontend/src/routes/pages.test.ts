import { describe, expect, it } from 'vitest'
import { pageLoaders } from './pages'
import { PRIMARY_NAV, SETTINGS_NAV } from '@/data/nav'

describe('route loaders', () => {
  it('every lazy loader resolves to a module with a default component (stub pages included)', async () => {
    const entries = Object.entries(pageLoaders)
    expect(entries.length).toBeGreaterThanOrEqual(36)
    const modules = await Promise.all(entries.map(async ([key, load]) => [key, await load()] as const))
    for (const [key, mod] of modules) expect(typeof (mod as { default: unknown }).default, key).toBe('function')
  })

  it('has a loader for each v40 page', () => {
    for (const key of ['inbox', 'overview', 'feeds', 'crmMapping', 'escalationMatrix', 'surveyQuestions', 'weeklySample', 'publicMentions', 'surveys']) {
      expect(pageLoaders, key).toHaveProperty(key)
    }
  })

  it('every page named in the menus has a source file under pages/ (so no menu item is a dead end)', async () => {
    const files = import.meta.glob('../pages/**/*.tsx', { eager: false })
    const have = new Set(Object.keys(files).map((f) => f.replace('../pages/', '').replace('.tsx', '')))
    for (const rel of ['inbox/Inbox', 'OverviewPage', 'settings/Feeds', 'settings/CrmMapping', 'settings/EscalationMatrix', 'settings/SurveyQuestions', 'settings/WeeklySample', 'settings/PublicMentions', 'Surveys', 'IntelligentCxTeam']) {
      expect(have.has(rel), rel).toBe(true)
    }
    const menu = [...PRIMARY_NAV.flatMap((g) => g.items), ...SETTINGS_NAV].map((i) => i.path)
    expect(menu).toContain('/inbox')
    expect(menu).toContain('/overview')
  })

  it('the stub pages are marked so their owners can find them', async () => {
    const sources = import.meta.glob(['../pages/inbox/Inbox.tsx', '../pages/OverviewPage.tsx', '../pages/settings/{Feeds,CrmMapping,EscalationMatrix,SurveyQuestions,WeeklySample,PublicMentions}.tsx', '../components/layout/AsOfBar.tsx', '../components/trace/TraceHost.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(sources)).toHaveLength(10)
    for (const [file, src] of Object.entries(sources)) expect(src, file).toMatch(/\/\/ FOUNDATION STUB: owner = workstream [ABC]/)
  })
})
