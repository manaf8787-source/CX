import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * The owner's interface requests of 19 Nov 2026: the open sidebar (no system scrollbar, a gradual open and close, the CX logo with its
 * moving point, "CX Portal"), no page margin round the frame, glass boxes, and the language and theme as switches.
 */

async function open(page: Page, role: RoleId, path: string, lang: 'en' | 'ar' = 'en') {
  await signInAs(page, role, lang)
  await page.goto(path)
  await expectPageReady(page)
}

const nav = (page: Page) => page.locator('nav[data-slot="sidebar"]').first()

async function blockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

test.describe('The frame', () => {
  test.use({ viewport: { width: 1500, height: 900 } })
  test('sits flush with the window above 1440px: no page margin round it', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const sidebar = await nav(page).boundingBox()
    // only the frame card's own 10px stands between the window edge and the sidebar (it was 22 + 10)
    expect(sidebar!.x).toBeLessThanOrEqual(11)
    expect(sidebar!.y).toBeLessThanOrEqual(11)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
})

test.describe('The open sidebar', () => {
  test('carries the CX logo and "CX Portal": no "PSI", no version line', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const brand = nav(page).getByRole('link', { name: 'CX Portal', exact: true })
    await expect(brand).toBeVisible()
    const logo = brand.locator('[data-slot="brand-logo"]')
    await expect(logo).toBeVisible()
    expect((await logo.boundingBox())!.height).toBeGreaterThanOrEqual(24)
    await expect(nav(page)).not.toContainText('PSI CX Portal')
    await expect(nav(page)).not.toContainText(/prototype/i)
    // the orange point is the logo's own colour
    expect(await logo.locator('.brand-point').evaluate((el) => getComputedStyle(el).fill)).toBe('rgb(224, 89, 42)')
  })

  test('the logo\'s point goes round for ever, and stands still under reduced motion', async ({ page, browser }) => {
    await open(page, 'cxmgr', '/home')
    const running = () =>
      document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity && (a as CSSAnimation).animationName?.startsWith('brand-point')).length
    expect(await page.evaluate(running)).toBeGreaterThanOrEqual(2)
    const still = await browser.newContext({ reducedMotion: 'reduce' })
    const quiet = await still.newPage()
    await open(quiet, 'cxmgr', '/home')
    expect(await quiet.evaluate(running)).toBe(0)
    await still.close()
  })

  test.describe('on a short screen', () => {
    test.use({ viewport: { width: 1500, height: 520 } })
    for (const lang of ['en', 'ar'] as const) {
      test(`the menu scrolls with no system scrollbar, fades the edge with more, and keeps the page you are on in view (${lang})`, async ({ page }) => {
        await open(page, 'cxmgr', '/home', lang)
        const scroller = nav(page).locator('[data-slot="sidebar-content"]')
        const before = await scroller.evaluate((el: HTMLElement) => ({
          bar: getComputedStyle(el).scrollbarWidth,
          overflows: el.scrollHeight > el.clientHeight + 1,
          gutter: el.offsetWidth - el.clientWidth,
          fadeEnd: el.hasAttribute('data-fade-end'),
          fadeStart: el.hasAttribute('data-fade-start'),
        }))
        expect(before).toEqual({ bar: 'none', overflows: true, gutter: 0, fadeEnd: true, fadeStart: false })
        // the selected pill is whole: as wide as its item, inside the menu
        const pill = (await nav(page).locator('[data-slot="sidebar-indicator"]').boundingBox())!
        const item = (await nav(page).locator('[data-sidebar="menu-button"][data-active="true"]').boundingBox())!
        expect(Math.abs(pill.x - item.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(pill.width - item.width)).toBeLessThanOrEqual(1)
        // the last page: its item is scrolled into view, and the top edge now fades instead
        await page.goto('/settings/rules')
        await expectPageReady(page)
        const active = nav(page).locator('[data-sidebar="menu-button"][data-active="true"]')
        await expect(active).toBeInViewport()
        await expect(scroller).toHaveAttribute('data-fade-start', 'true')
      })
    }

    test('the bottom card keeps only the role select, so the menu has the room', async ({ page }) => {
      await open(page, 'cxmgr', '/home')
      await expect(nav(page).getByText('Viewing as (demo)')).toBeHidden()
      await expect(nav(page).getByText('Sample data only')).toBeHidden()
      await expect(nav(page).getByRole('combobox', { name: /Viewing as/ })).toBeVisible()
    })
  })

  test('opens and closes gradually: the words fade, then the rail takes over; in the rail every link keeps its name', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    // the state is immediate, the rail layout follows
    await expect(nav(page)).toHaveAttribute('data-state', 'collapsed')
    await expect(nav(page)).toHaveAttribute('data-phase', 'closing')
    await expect(nav(page)).toHaveAttribute('data-collapsible', 'icon')
    await expect(nav(page)).not.toHaveAttribute('data-phase', /.+/)
    expect(Math.round((await nav(page).boundingBox())!.width)).toBe(56)
    await expect(nav(page).getByRole('link', { name: '1 · Customers' })).toBeVisible()
    await expect(nav(page).getByRole('link', { name: 'CX Portal' })).toBeVisible()

    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect(nav(page)).toHaveAttribute('data-collapsible', '')
    await expect(nav(page)).toHaveAttribute('data-phase', 'opening')
    // while it opens the rows take their full width within a moment, whatever the column's width is then (no words cut to "Ho…")
    const row = nav(page).locator('[data-sidebar="menu-button"]').first()
    await expect.poll(async () => Math.round((await row.boundingBox())!.width), { timeout: 2000 }).toBe(200)
    await expect(nav(page)).not.toHaveAttribute('data-phase', /.+/, { timeout: 4000 })
    expect(Math.round((await nav(page).boundingBox())!.width)).toBe(220)
    await expect(nav(page).getByText('Viewing as (demo)')).toBeVisible()
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('it opens and closes at once, with no phase', async ({ page }) => {
      await open(page, 'cxmgr', '/home')
      await page.getByRole('button', { name: 'Collapse sidebar' }).click()
      await expect(nav(page)).toHaveAttribute('data-collapsible', 'icon')
      expect(await nav(page).getAttribute('data-phase')).toBeNull()
      await page.getByRole('button', { name: 'Expand sidebar' }).click()
      await expect(nav(page)).toHaveAttribute('data-collapsible', '')
      expect(await nav(page).getAttribute('data-phase')).toBeNull()
    })
  })
})

test.describe('Language and theme switches', () => {
  test('language: both show, the one in use is the dark key, one click picks the other', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const language = page.getByRole('radiogroup', { name: 'Language' })
    await expect(language.getByRole('radio')).toHaveText(['EN', 'ع'])
    await expect(language.getByRole('radio', { name: 'English' })).toBeChecked()
    await language.getByRole('radio', { name: 'العربية' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('radiogroup', { name: 'اللغة' }).getByRole('radio', { name: 'العربية' })).toBeChecked()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  })

  test('theme: light, dark or the device, in one click; arrow keys move between them', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const theme = page.getByRole('radiogroup', { name: 'Theme' })
    await expect(theme.getByRole('radio')).toHaveCount(3)
    await theme.getByRole('radio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(theme.getByRole('radio', { name: 'Dark' })).toBeChecked()
    await page.keyboard.press('ArrowLeft')
    await expect(theme.getByRole('radio', { name: 'Light' })).toBeChecked()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await theme.getByRole('radio', { name: 'Match device' }).click()
    expect(await page.evaluate(() => localStorage.getItem('psicx.theme'))).toBe('system')
  })

  test.describe('a narrow top bar', () => {
    test.use({ viewport: { width: 820, height: 900 } })
    test('the theme is one button that steps through the three modes and names the next; nothing is cut off', async ({ page }) => {
      await open(page, 'cxmgr', '/home')
      await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeHidden()
      await page.evaluate(() => localStorage.setItem('psicx.theme', 'light'))
      await page.reload()
      await expectPageReady(page)
      await page.getByRole('button', { name: 'Theme: Light. Switch to Dark' }).click()
      await expect(page.locator('html')).toHaveClass(/dark/)
      await expect(page.getByRole('button', { name: 'Theme: Dark. Switch to Match device' })).toBeVisible()
      await expect(page.getByRole('radiogroup', { name: 'Language' })).toBeVisible()
      const header = (await page.locator('header').first().boundingBox())!
      for (const control of [page.getByRole('radiogroup', { name: 'Language' }), page.getByRole('button', { name: /^Theme:/ }), page.getByRole('button', { name: 'Ask the assistant' })]) {
        const b = (await control.boundingBox())!
        expect(b.x + b.width).toBeLessThanOrEqual(header.x + header.width)
      }
    })
  })

  test('the sign-in screen has the same two switches and the logo', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('radiogroup', { name: 'Language' })).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible()
    await expect(page.locator('section[aria-label="PSI CX Portal"] [data-slot="brand-logo"]')).toBeVisible()
  })
})

test.describe('Glass boxes', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`a box is a pane of glass, not a flat patch (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
      await open(page, 'cxmgr', '/overview')
      const style = await page
        .locator('main .well')
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el)
          return { image: s.backgroundImage, shadow: s.boxShadow }
        })
      expect(style.image).toContain('linear-gradient')
      // a rim inside, a hairline and a soft drop outside
      expect(style.shadow).toContain('inset')
      expect(style.shadow.split('rgb').length).toBeGreaterThan(5)
      // the six step tiles on Home are the same material
      await page.goto('/home')
      await expectPageReady(page)
      expect(await page.locator('[data-tour="steps"] [data-step]').first().evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient')
    })
  }

  for (const [lang, theme] of [
    ['en', 'light'],
    ['ar', 'dark'],
  ] as const) {
    test(`text on the glass still passes contrast (${lang}, ${theme})`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1500, height: 560 } })
      const page = await ctx.newPage()
      await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
      for (const path of ['/overview', '/home']) {
        await open(page, 'cxmgr', path, lang)
        await waitForAnimations(page)
        const violations = await blockingViolations(page)
        expect(violations, `${path}: ${JSON.stringify(violations, null, 2)}`).toEqual([])
      }
      await ctx.close()
    })
  }
})

test.describe('The guided tour on a short screen', () => {
  test.use({ viewport: { width: 1265, height: 580 } })
  test('the card never covers what it points at: beside the element when it fits neither above nor below', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'en', { tour: true })
    await page.goto('/home')
    const card = page.getByTestId('tour-card')
    const ring = page.getByTestId('tour-ring')
    for (let step = 1; step <= 3; step++) {
      await expect(card).toContainText(`${step} / 13`)
      await expect(ring).toBeVisible()
      await page.waitForTimeout(900) // the frame glides and the card fades in
      const c = (await card.boundingBox())!
      const r = (await ring.boundingBox())!
      const overlapX = Math.min(c.x + c.width, r.x + r.width) - Math.max(c.x, r.x)
      const overlapY = Math.min(c.y + c.height, r.y + r.height) - Math.max(c.y, r.y)
      expect(overlapX <= 0 || overlapY <= 0, `step ${step}: the card overlaps the lit element by ${Math.round(overlapX)} x ${Math.round(overlapY)}`).toBe(true)
      // and stays on screen
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width).toBeLessThanOrEqual(1265)
      expect(c.y + c.height).toBeLessThanOrEqual(580)
      if (step < 3) await card.getByRole('button', { name: 'Next' }).click()
    }
  })
})
