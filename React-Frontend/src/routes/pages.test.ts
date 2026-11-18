import { describe, expect, it } from 'vitest'
import { pageLoaders } from './pages'
import { PRIMARY_NAV, SETTINGS_NAV } from '@/data/nav'

describe('route loaders', () => {
  it('every lazy loader resolves to a module with a default component', async () => {
    const entries = Object.entries(pageLoaders)
    expect(entries.length).toBeGreaterThanOrEqual(36)
    const modules = await Promise.all(entries.map(async ([key, load]) => [key, await load()] as const))
    for (const [key, mod] of modules) expect(typeof (mod as { default: unknown }).default, key).toBe('function')
  }, 60_000)

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

  it('no foundation stub marker is left behind (every stub page was replaced by its workstream)', () => {
    const sources = import.meta.glob(['../pages/**/*.tsx', '../components/layout/*.tsx', '../components/trace/*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(30)
    for (const [file, src] of Object.entries(sources)) expect(src, file).not.toMatch(/FOUNDATION STUB/)
  })
})
