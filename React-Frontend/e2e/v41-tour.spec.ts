import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * v41 F28: the guided tour inside the portal. Every other spec starts with all tours marked done (`signInAs` seeds them); this one opts in
 * with `signInAs(page, role, lang, { tour: true })`, so the first entry under a role starts the tour by itself.
 * The axe scans run with motion reduced, like the route scan, so a card mid-entrance is not read as low contrast.
 */

test.use({ reducedMotion: 'reduce' })

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function blocking(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')), count: v.nodes.length }))
}

const tourCard = (page: Page) => page.getByTestId('tour-card')
const ring = (page: Page) => page.getByTestId('tour-ring')
const primary = (page: Page) => tourCard(page).getByRole('button', { name: /^(Next|Do it and continue|Done|التالي|نفّذ وتابع|تم)$/ })
const next = (page: Page) => primary(page).click()
const counter = async (page: Page) => (await tourCard(page).locator('p').first().innerText()).replace(/\s+/g, ' ').trim()
const heading = (page: Page, name: string | RegExp) => expect(tourCard(page).getByRole('heading', { name })).toBeVisible()
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('psicx.tour') ?? 'null'))

/** Signs in as a role that has not done its tour and opens a page: the tour starts by itself and its first card is shown. */
async function enter(page: Page, role: RoleId, route = '/home', lang: 'en' | 'ar' = 'en') {
  await signInAs(page, role, lang, { tour: true })
  await page.goto(route)
  await expect(tourCard(page)).toBeVisible({ timeout: 15_000 })
}

/** Next until the card says "Tour n / total". */
async function goTo(page: Page, n: number) {
  for (let i = 0; i < 20; i++) {
    const m = (await counter(page)).match(/(\d+) \/ (\d+)/)
    if (m && Number(m[1]) === n) return
    await next(page)
    await page.waitForTimeout(120)
  }
  throw new Error(`could not reach step ${n}`)
}

const box = async (loc: ReturnType<Page['locator']>) => (await loc.boundingBox())!

test.describe('first entry', () => {
  test('starts by itself for the CX manager: step 1 of 13, the six steps lit, a named card', async ({ page }) => {
    await enter(page, 'cxmgr')
    await heading(page, 'One line, six steps')
    expect(await counter(page)).toBe('Tour 1 / 13')
    await expect(page.getByRole('dialog', { name: 'One line, six steps' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Tour 1 of 13' })).toHaveCount(1)
    // the frame sits 6px outside the element it lights
    const steps = await box(page.locator('[data-tour="steps"]'))
    await expect(ring(page)).toBeVisible()
    const r = await box(ring(page))
    expect(Math.abs(r.x - (steps.x - 6))).toBeLessThan(2)
    expect(Math.abs(r.y - (steps.y - 6))).toBeLessThan(2)
    expect(Math.abs(r.width - (steps.width + 12))).toBeLessThan(2)
    // the card sits below it, and focus is on its primary button
    const c = await box(tourCard(page))
    expect(c.y).toBeGreaterThan(steps.y + steps.height)
    await expect(primary(page)).toBeFocused()
    // the overlay never takes a click; the card does
    expect(await page.getByTestId('tour-host').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    expect(await ring(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    expect(await tourCard(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('auto')
    await expect(page.getByTestId('tour-host')).toHaveAttribute('data-motion', 'reduced')
  })

  test('"Do it and continue" opens My inbox, then the fix waiting for a yes, and the card follows to each page', async ({ page }) => {
    await enter(page, 'cxmgr')
    await goTo(page, 4)
    await heading(page, 'Start your day here')
    // the menu link is lit
    const link = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'My inbox' })
    const lb = await box(link)
    const rb = await box(ring(page))
    expect(Math.abs(rb.x - (lb.x - 6))).toBeLessThan(2)
    await expect(primary(page)).toHaveText('Do it and continue')
    await next(page)
    await expect(page).toHaveURL(/\/inbox$/)
    await heading(page, 'One row, one thing to do')
    expect(await counter(page)).toBe('Tour 5 / 13')
    // the first row is the lit one
    const row = await box(page.locator('[data-tour="inbox-row"]').first())
    await expect.poll(async () => Math.abs((await box(ring(page))).y - (row.y - 6)) < 2).toBe(true)
    await next(page)
    await expect(page).toHaveURL(/\/actions\/corrective$/)
    await heading(page, 'Where you are, what happens next')
    await next(page)
    // the register on the fixes waiting for a yes
    await expect(page).toHaveURL(/\/actions\/corrective\?status=proposed$/)
    await heading(page, 'Open a fix')
    await expect(page.getByRole('combobox', { name: 'Status' })).toHaveText('Proposed')
    await expect(page.locator('li[data-fix]')).toHaveCount(1)
    await next(page)
    await heading(page, 'Your decision')
    // the decision button of the open fix is lit
    const decide = page.getByRole('button', { name: 'Decide' })
    const db = await box(decide)
    await expect.poll(async () => Math.abs((await box(ring(page))).x - (db.x - 6)) < 2).toBe(true)
    await next(page)
    await heading(page, 'The trace')
    await expect(page.locator('[data-tour="trace"]')).toBeVisible()
  })

  test('the page under the dim is still usable: a click goes through to the lit button, and Escape closes that dialog before it skips the tour', async ({ page }) => {
    await enter(page, 'cxmgr', '/actions/corrective?status=proposed')
    await goTo(page, 8)
    await heading(page, 'Your decision')
    await page.getByRole('button', { name: 'Decide' }).click()
    const dialog = page.getByRole('dialog', { name: 'Decide this corrective action' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // the tour is still there: the first Escape went to the dialog
    await expect(tourCard(page)).toBeVisible()
    expect(await stored(page)).toBeNull()
    await page.keyboard.press('Escape')
    await expect(tourCard(page)).toBeHidden()
    expect((await stored(page)).done.cxmgr).toBe(true)
  })

  test('a lit element that is not there centres the card, with nothing lit, and the tour still goes on', async ({ page }) => {
    await enter(page, 'cxmgr')
    await expect(ring(page)).toBeVisible()
    await page.evaluate(() => document.querySelector('[data-tour="steps"]')?.remove())
    await expect(tourCard(page)).toHaveAttribute('data-placement', 'centre')
    await expect(ring(page)).toHaveCount(0)
    await expect(page.getByTestId('tour-dim')).toBeVisible()
    const c = await box(tourCard(page))
    const vp = page.viewportSize()!
    expect(Math.abs(c.x + c.width / 2 - vp.width / 2)).toBeLessThan(2)
    await next(page)
    await heading(page, 'Your daily brief')
  })
})

test.describe('skip, replay and roles', () => {
  test('Skip stores completion for the role, shows the toast, and the tour does not start again on reload; another role still gets its own', async ({ page }) => {
    await enter(page, 'cxmgr')
    await tourCard(page).getByRole('button', { name: 'Skip' }).click()
    await expect(tourCard(page)).toBeHidden()
    await expect(page.getByText('Tour finished. Replay it any time from the bottom of the menu.')).toBeVisible()
    expect((await stored(page)).done).toEqual({ cxmgr: true })
    await page.reload()
    await expectPageReady(page)
    await page.waitForTimeout(1200)
    await expect(tourCard(page)).toHaveCount(0)
    // another role has not done its tour: switching to it starts it
    await page.getByRole('combobox', { name: /Viewing as/ }).click()
    await page.getByRole('option', { name: 'Marketing manager' }).click()
    await expect(tourCard(page)).toBeVisible({ timeout: 10_000 })
    expect(await counter(page)).toBe('Tour 1 / 6')
    expect((await stored(page)).done).toEqual({ cxmgr: true })
  })

  test('replays from "How do I use this?" at the bottom of the menu, and Skip gives focus back to it', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/home')
    await expectPageReady(page)
    await page.waitForTimeout(800)
    await expect(tourCard(page)).toHaveCount(0)
    const replay = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'How do I use this?' })
    // it sits above the role card, at the bottom of the menu
    const rb = await box(replay)
    const roleCard = await box(page.getByText('Viewing as (demo)'))
    expect(rb.y).toBeLessThan(roleCard.y)
    await replay.click()
    await expect(tourCard(page)).toBeVisible()
    expect(await counter(page)).toBe('Tour 1 / 13')
    await tourCard(page).getByRole('button', { name: 'Skip' }).click()
    await expect(tourCard(page)).toBeHidden()
    await expect(replay).toBeFocused()
  })

  test('in the collapsed rail the replay is an icon with a tooltip', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/home')
    await expectPageReady(page)
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    const replay = page.getByRole('button', { name: 'How do I use this?' })
    await expect(replay).toBeVisible()
    expect((await box(replay)).width).toBeLessThanOrEqual(40)
    await expect(replay).toHaveText('')
    await replay.hover()
    await expect(page.getByRole('tooltip', { name: 'How do I use this?' })).toBeVisible()
    await replay.click()
    await expect(tourCard(page)).toBeVisible()
  })

  test('a role switch in the middle of a tour resets it and starts the new role’s tour', async ({ page }) => {
    await enter(page, 'cxmgr')
    await goTo(page, 3)
    await page.getByRole('combobox', { name: /Viewing as/ }).click()
    await page.getByRole('option', { name: 'Marketing manager' }).click()
    await expect.poll(() => counter(page)).toBe('Tour 1 / 6')
    await heading(page, 'One line, six steps')
    // Marketing's path: home, personas (clicked), find anyone, the end; the Overview step is dropped because it cannot open that page
    await goTo(page, 4)
    await heading(page, 'Personas and campaigns')
    await next(page)
    // the click opened Personas; the next card is on Find a person
    await heading(page, 'Find anyone')
    await expect(page).toHaveURL(/\/customers$/)
    await next(page)
    await heading(page, 'That is the whole portal')
    expect(await counter(page)).toBe('Tour 6 / 6')
    await expect(primary(page)).toHaveText('Done')
  })

  test('a role that cannot open Home gets the closing card alone, and the mystery shopper gets no tour and no replay', async ({ page, browser }) => {
    await enter(page, 'hrmgr', '/settings/hr-team')
    expect(await counter(page)).toBe('Tour 1 / 1')
    await heading(page, 'That is the whole portal')
    await expect(page.getByTestId('tour-dim')).toBeVisible()
    await primary(page).click()
    await expect(tourCard(page)).toBeHidden()

    const shopper = await browser.newPage()
    await signInAs(shopper, 'shopper', 'en', { tour: true })
    await shopper.goto('/settings/mystery-shopper')
    await expect(shopper.locator('main h1').first()).toBeVisible()
    await shopper.waitForTimeout(1200)
    await expect(tourCard(shopper)).toHaveCount(0)
    await expect(shopper.getByRole('button', { name: 'How do I use this?' })).toHaveCount(0)
    await shopper.close()
  })

  test('the L&D tour is its brief, the fix it can see, and the end', async ({ page }) => {
    await enter(page, 'ld', '/settings/ld')
    expect(await counter(page)).toBe('Tour 1 / 3')
    await heading(page, 'Your daily brief')
    await next(page)
    await expect(page).toHaveURL(/\/actions\/corrective$/)
    await heading(page, 'Fixes that need L&D')
    await expect(ring(page)).toBeVisible()
    await expect(page.locator('li[data-fix]')).toHaveCount(1)
  })

  test('the Internal Audit and Marketing Lead is taken to its feeds, the weekly sample and the campaign audit', async ({ page }) => {
    await enter(page, 'auditmkt', '/overview')
    expect(await counter(page)).toBe('Tour 1 / 5')
    await next(page)
    await expect(page).toHaveURL(/\/settings\/feeds$/)
    await heading(page, 'Data feeds')
    await expect(ring(page)).toBeVisible()
    await next(page)
    await expect(page).toHaveURL(/\/settings\/weekly-sample$/)
    await heading(page, 'The weekly sample')
    await expect(ring(page)).toBeVisible({ timeout: 10_000 })
    // v42.1 (F33): the prototype's campaign audit step comes right after it
    await next(page)
    await expect(page).toHaveURL(/\/settings\/campaign-audit$/)
    await heading(page, 'Campaign audit')
    expect(await counter(page)).toBe('Tour 4 / 5')
    await expect(ring(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-tour="campaign-audit"]')).toBeVisible()
  })
})

test.describe('Arabic, phone and accessibility', () => {
  test('in Arabic the card is right to left, lines up with the right edge, and Back comes before Next on the right', async ({ page }) => {
    await enter(page, 'cxmgr', '/home', 'ar')
    const dialog = page.getByRole('dialog', { name: 'خط واحد، ست خطوات' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('dir', 'rtl')
    await expect(dialog).toContainText('جولة')
    const steps = await box(page.locator('[data-tour="steps"]'))
    const c = await box(tourCard(page))
    expect(Math.abs(c.x + c.width - (steps.x + steps.width))).toBeLessThan(2)
    await next(page)
    await expect(page.getByRole('dialog', { name: 'موجزك اليومي' })).toBeVisible()
    const back = await box(tourCard(page).getByRole('button', { name: 'رجوع' }))
    const nextBox = await box(primary(page))
    expect(back.x).toBeGreaterThan(nextBox.x)
    // Skip is at the start edge (the right)
    const skip = await box(tourCard(page).getByRole('button', { name: 'تخطَّ' }))
    expect(skip.x).toBeGreaterThan(back.x)
    await tourCard(page).getByRole('button', { name: 'تخطَّ' }).click()
    await expect(page.getByText('انتهت الجولة. أعدها متى شئت من أسفل القائمة.')).toBeVisible()
  })

  test('on a phone (390x844) the card fits the screen, the menu step still opens My inbox, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await enter(page, 'cxmgr')
    const fits = async () => {
      const c = await box(tourCard(page))
      expect(c.x).toBeGreaterThanOrEqual(11)
      expect(c.x + c.width).toBeLessThanOrEqual(390 - 11)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.y + c.height).toBeLessThanOrEqual(844)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
    await fits()
    await goTo(page, 4)
    await heading(page, 'Start your day here')
    // the menu is closed on a phone, so there is nothing to light: the card is centred, and "Do it" still goes to My inbox
    await expect(tourCard(page)).toHaveAttribute('data-placement', 'centre')
    await fits()
    await next(page)
    await expect(page).toHaveURL(/\/inbox$/)
    await heading(page, 'One row, one thing to do')
    await expect(ring(page)).toBeVisible()
    await fits()
  })

  test('a 320px screen: the card is 296px wide and its buttons stay inside it', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await enter(page, 'cxmgr')
    await goTo(page, 4)
    const c = await box(tourCard(page))
    expect(c.width).toBeLessThanOrEqual(296.5)
    for (const name of ['Skip', 'Back', 'Do it and continue']) {
      const b = await box(tourCard(page).getByRole('button', { name }))
      expect(b.x).toBeGreaterThanOrEqual(c.x)
      expect(b.x + b.width).toBeLessThanOrEqual(c.x + c.width + 0.5)
    }
  })

  test('the phone menu has the replay, and it closes the menu and starts the tour with focus on the card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signInAs(page, 'cxmgr')
    await page.goto('/home')
    await expectPageReady(page)
    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'How do I use this?' }).click()
    await expect(tourCard(page)).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toHaveCount(0)
    await expect(primary(page)).toBeFocused()
  })

  for (const { lang, theme } of [
    { lang: 'en', theme: 'light' },
    { lang: 'ar', theme: 'dark' },
  ] as const) {
    test(`axe: no violations with the tour open (${lang} ${theme}), on the first card, a lit button and the closing card`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
      await enter(page, 'cxmgr', '/home', lang)
      await waitForAnimations(page)
      expect(await blocking(page), 'step 1').toEqual([])
      await goTo(page, 8)
      await waitForAnimations(page)
      await expect(ring(page)).toBeVisible()
      expect(await blocking(page), 'the decision step').toEqual([])
      await goTo(page, 13)
      await waitForAnimations(page)
      expect(await blocking(page), 'the closing card').toEqual([])
    })
  }

  test('axe: no violations with the tour open on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await enter(page, 'cxmgr')
    await waitForAnimations(page)
    expect(await blocking(page)).toEqual([])
    await goTo(page, 5)
    await waitForAnimations(page)
    expect(await blocking(page)).toEqual([])
  })
})
