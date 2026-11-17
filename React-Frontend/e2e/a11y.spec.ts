import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ROUTES, expectPageReady, signInAs, waitForAnimations } from './helpers.ts'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function seedTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
}

async function scan(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    count: v.nodes.length,
  }))
}

function blocking(violations: Awaited<ReturnType<typeof scan>>) {
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

const COMBOS = [
  { lang: 'en', theme: 'light' },
  { lang: 'en', theme: 'dark' },
  { lang: 'ar', theme: 'light' },
  { lang: 'ar', theme: 'dark' },
] as const

test.use({ reducedMotion: 'reduce' })

for (const { lang, theme } of COMBOS) {
  test.describe(`axe WCAG 2.1 AA — ${lang} ${theme}`, () => {
    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await seedTheme(page, theme)
        await signInAs(page, 'cxmgr', lang)
        await page.goto(route)
        await expectPageReady(page); await waitForAnimations(page)
        await expect(page.locator('html')).toHaveAttribute('lang', lang)
        const violations = blocking(await scan(page))
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
      })
    }
  })
}

test.describe('axe — login and overlays', () => {
  for (const { lang, theme } of COMBOS) {
    test(`login ${lang} ${theme}`, async ({ page }) => {
      await seedTheme(page, theme)
      await page.addInitScript((l) => localStorage.setItem('psicx.lang', l), lang)
      await page.goto('/login')
      await expect(page.locator('h1').first()).toBeVisible()
      const violations = blocking(await scan(page))
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })
  }

  test('assistant sheet', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/home')
    await expectPageReady(page); await waitForAnimations(page)
    await page.getByRole('button', { name: /assistant/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const violations = blocking(await scan(page))
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('form dialog (log an interview)', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/close-the-loop')
    await expectPageReady(page); await waitForAnimations(page)
    await page.getByRole('button', { name: /^call$/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const violations = blocking(await scan(page))
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
