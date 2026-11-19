import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/** v42 F31: "Watch the AI team work", the replay page under Settings and reference (docs/V42_WATCH.md). */

const PATH = '/settings/watch-ai-team'

async function open(page: Page, role: RoleId, path: string = PATH, lang: 'en' | 'ar' = 'en', theme?: 'light' | 'dark') {
  if (theme) await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
  await signInAs(page, role, lang)
  await page.goto(path)
  await expectPageReady(page)
}

const steps = (page: Page) => page.getByRole('list', { name: 'The nine steps of one message' }).getByRole('listitem')
const stepsAr = (page: Page) => page.getByRole('list', { name: 'الخطوات التسع لرسالة واحدة' }).getByRole('listitem')
const next = (page: Page) => page.getByRole('button', { name: 'Next step' })
const stepOf = (page: Page) => page.locator('[data-slot="watch-step-of"]')

/** Clicks Next step until step 9 (8 clicks from step 1). */
async function walkToEnd(page: Page, clicks = 8) {
  for (let i = 0; i < clicks; i++) await next(page).click()
  await expect(steps(page).nth(8)).toHaveAttribute('aria-current', 'step')
}

/** The first sample person's name, as the CX manager reads it in step 2. */
async function sampleName(browser: Browser) {
  const page = await browser.newPage()
  await open(page, 'cxmgr')
  await next(page).click()
  const text = await page.locator('[data-watch-step="match"]').getByText(/EV-9001 · /).textContent()
  await page.close()
  return (text ?? '').replace(/^.*EV-9001 · /, '').trim()
}

async function blocking(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

test.describe('Watch the AI team work: the page (F31)', () => {
  test('the Home button opens it for the CX manager', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, 'cxmgr', '/home')
    const button = page.getByRole('link', { name: 'Watch the AI team work' })
    await expect(button).toBeVisible()
    // right under the six steps, before the Daily brief
    const stepsBox = await page.getByRole('navigation', { name: 'The six steps, with live counts' }).boundingBox()
    const buttonBox = await button.boundingBox()
    expect(buttonBox!.y).toBeGreaterThan(stepsBox!.y + stepsBox!.height - 1)
    await button.click()
    await expect(page).toHaveURL(/\/settings\/watch-ai-team$/)
    await expectPageReady(page)
    await expect(page.getByRole('heading', { level: 2, name: 'Watch the AI team work' })).toBeVisible()
    await expect(steps(page)).toHaveCount(9)
    await expect(steps(page).first()).toHaveAttribute('aria-current', 'step')
    expect(errors, errors.join(' | ')).toEqual([])
  })

  test('step 1 is open, the other eight show their title only', async ({ page }) => {
    await open(page, 'cxmgr')
    await expect(page.getByText(/Still waiting for the callback you promised on Tuesday/)).toBeVisible()
    await expect(page.getByText(/Mobile matches the CRM contact/)).toHaveCount(0)
    await expect(steps(page).nth(1)).toContainText('Agent 1 matches it to one person')
    await expect(stepOf(page)).toHaveText('Step 1 / 9')
    await expect(page.getByText('CX Supervisor: 6 checks passed')).toBeVisible()
    await expect(page.getByText('Source', { exact: true })).toHaveCount(2)
  })

  test('Next step walks to step 9: every step opens, five supervisor ticks, the live region follows', async ({ page }) => {
    await open(page, 'cxmgr')
    const live = page.locator('[aria-live="polite"]').filter({ hasText: /^Step \d of 9/ })
    await next(page).click()
    await expect(steps(page).nth(1)).toHaveAttribute('aria-current', 'step')
    await expect(live).toHaveText('Step 2 of 9: Agent 1 matches it to one person')
    await expect(stepOf(page)).toHaveText('Step 2 / 9')
    await walkToEnd(page, 7)
    await expect(stepOf(page)).toHaveText('Step 9 / 9')
    await expect(live).toHaveText('Step 9 of 9: What people see')
    await expect(page.getByText(/Six checks, in code, on every output above/)).toBeVisible()
    await expect(page.getByText('6 of 6 passed')).toBeVisible()
    await expect(page.getByText(/6 seconds from message to inbox/)).toBeVisible()
    await expect(page.getByRole('list', { name: 'The nine steps of one message' }).getByText('supervisor', { exact: true })).toHaveCount(5)
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true')
  })

  test('Play runs the nine steps and stops at step 9; Reset goes back', async ({ page }) => {
    await open(page, 'cxmgr')
    await page.getByRole('button', { name: 'Play (6 seconds)' }).click()
    await expect(steps(page).first()).toHaveAttribute('aria-current', 'step')
    await expect(steps(page).nth(1)).toHaveAttribute('aria-current', 'step', { timeout: 3000 })
    await expect(steps(page).nth(8)).toHaveAttribute('aria-current', 'step', { timeout: 12_000 })
    await expect(stepOf(page)).toHaveText('Step 9 / 9')
    await page.waitForTimeout(1600) // it stays at the end
    await expect(steps(page).nth(8)).toHaveAttribute('aria-current', 'step')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(steps(page).first()).toHaveAttribute('aria-current', 'step')
    await expect(stepOf(page)).toHaveText('Step 1 / 9')
    await expect(page.getByText(/Mobile matches the CRM contact/)).toHaveCount(0)
  })

  test('Reset in the middle of a Play stops it', async ({ page }) => {
    await open(page, 'cxmgr')
    await page.getByRole('button', { name: 'Play (6 seconds)' }).click()
    await expect(steps(page).nth(2)).toHaveAttribute('aria-current', 'step', { timeout: 4000 })
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.waitForTimeout(1700)
    await expect(steps(page).first()).toHaveAttribute('aria-current', 'step')
  })

  test('Play stops when the user leaves the page', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, 'cxmgr')
    await page.getByRole('button', { name: 'Play (6 seconds)' }).click()
    await expect(steps(page).nth(1)).toHaveAttribute('aria-current', 'step', { timeout: 3000 })
    await page.getByRole('navigation', { name: 'Settings and reference' }).getByRole('link', { name: 'Weekly sample' }).click()
    await expect(page).toHaveURL(/\/settings\/weekly-sample$/)
    await page.waitForTimeout(1600)
    expect(errors, errors.join(' | ')).toEqual([])
  })

  test('the keyboard runs it end to end', async ({ page }) => {
    await open(page, 'cxmgr')
    await page.getByRole('button', { name: 'Play (6 seconds)' }).focus()
    await page.keyboard.press('Tab')
    await expect(next(page)).toBeFocused()
    for (let i = 0; i < 8; i++) await page.keyboard.press('Enter')
    await expect(steps(page).nth(8)).toHaveAttribute('aria-current', 'step')
    await expect(next(page)).toBeFocused() // still focused at the end: aria-disabled, not disabled
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(steps(page).first()).toHaveAttribute('aria-current', 'step')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Play (6 seconds)' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(steps(page).nth(1)).toHaveAttribute('aria-current', 'step', { timeout: 3000 })
  })

  test('"This week, by the same team": eight counters from the data under a sample tag, and the "will not see" card', async ({ page }) => {
    await open(page, 'cxmgr')
    await expect(page.getByRole('heading', { name: /This week, by the same team/ })).toContainText('sample')
    for (const label of ['Events read', 'Signals counted', 'Patterns over the line', 'Fixes proposed', 'Waiting for a yes', 'Sent back by the supervisor', 'Handed to a person', 'Briefs written']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    // events = the 120 sample interactions + 16 (the prototype's figure); sent back and handed over are the prototype's constants
    const value = (label: string) => page.getByText(label, { exact: true }).locator('xpath=ancestor::div[contains(@class,"well")][1]')
    await expect(value('Events read')).toContainText('136')
    await expect(value('Sent back by the supervisor')).toContainText('3')
    await expect(value('Handed to a person')).toContainText('2')
    await expect(page.getByText('What you will not see here', { exact: true })).toBeVisible()
    await expect(page.getByText(/Agreement of 9 in 10 is the gate to Limited; a critical miss in the weekly sample blocks Live/)).toBeVisible()
  })
})

test.describe('Watch the AI team work: the menu and who may open it (F31)', () => {
  test('it is listed under Settings and reference, right after "How the portal works (the AI team)"', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/weekly-sample')
    const menu = page.getByRole('navigation', { name: 'Settings and reference' })
    await expect(menu.getByRole('link').nth(0)).toHaveText('How the portal works (the AI team)')
    await expect(menu.getByRole('link').nth(1)).toHaveText('Watch the AI team work')
    await expect(menu.getByRole('link').nth(2)).toHaveText('Weekly sample')
    await menu.getByRole('link', { name: 'Watch the AI team work' }).click()
    await expect(page).toHaveURL(/\/settings\/watch-ai-team$/)
    await expect(menu.getByRole('link', { name: 'Watch the AI team work' })).toHaveAttribute('aria-current', 'page')
  })

  test('the Settings entry still lands where it did: the new page is never the landing page', async ({ browser }) => {
    for (const [role, landing] of [
      ['cxmgr', /\/settings\/weekly-sample$/],
      ['marketing', /\/settings\/public-mentions$/],
      ['auditmkt', /\/settings\/weekly-sample$/],
      ['envmgmt', /\/settings\/surveys$/],
    ] as const) {
      const page = await browser.newPage()
      await open(page, role, '/home')
      await page.goto('/settings')
      await expect(page, role).toHaveURL(landing)
      await page.close()
    }
  })

  for (const role of ['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'auditmkt', 'exec'] as const) {
    test(`${role} can open it from the menu and by URL`, async ({ page }) => {
      await open(page, role)
      await expect(page).toHaveURL(/\/settings\/watch-ai-team$/)
      await expect(page.getByRole('button', { name: 'Play (6 seconds)' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Settings and reference' }).getByRole('link', { name: 'Watch the AI team work' })).toBeVisible()
    })
  }

  for (const [role, home] of [
    ['hrmgr', /\/settings\/hr-team$/],
    ['shopper', /\/settings\/mystery-shopper$/],
    ['ld', /\/settings\/ld$/],
    ['teamlead', /\/home$/],
    ['aslead', /\/home$/],
  ] as const) {
    test(`${role} cannot open it: the same redirect every gated page gets`, async ({ page }) => {
      await signInAs(page, role)
      await page.goto(PATH)
      await expect(page).toHaveURL(home)
      await expectPageReady(page)
      await expect(page.getByRole('button', { name: 'Play (6 seconds)' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Watch the AI team work' })).toHaveCount(0)
    })
  }

  test('a team lead sees Home without the button', async ({ page }) => {
    await open(page, 'teamlead', '/home')
    await expect(page.getByRole('navigation', { name: 'The six steps, with live counts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Watch the AI team work' })).toHaveCount(0)
  })

  test('the Internal Audit and Marketing Lead reads the reference and no mobile digits, never the name', async ({ browser }) => {
    const name = await sampleName(browser)
    expect(name.length, 'the CX manager reads a name').toBeGreaterThan(3)
    const page = await browser.newPage()
    await open(page, 'auditmkt')
    await expect(page.getByText(/From \+971•••••••/)).toBeVisible()
    await walkToEnd(page)
    await expect(page.getByText('EV-9001 · P-001')).toBeVisible()
    await expect(page.getByText(/Call P-001 · 2 working days/)).toBeVisible()
    await expect(page.locator('main')).not.toContainText(name)
    await page.close()
  })

  test('the CX manager reads the name and a masked mobile', async ({ page }) => {
    await open(page, 'cxmgr')
    await expect(page.getByText(/From \+9715•••\d\d on the official number/)).toBeVisible()
    await walkToEnd(page)
    await expect(page.getByText(/EV-9001 · [A-Z][a-z]+ [A-Z][a-z]+/)).toBeVisible()
    await expect(page.getByText(/Call [A-Z][a-z]+ [A-Z][a-z]+ · 2 working days/)).toBeVisible()
    await expect(page.locator('main')).not.toContainText('P-001')
  })
})

test.describe('Watch the AI team work: Arabic, RTL and the phone (F31)', () => {
  test('Arabic is right to left, the prototype strings, and the clock keeps its left-to-right reading', async ({ page }) => {
    await open(page, 'cxmgr', PATH, 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 2, name: 'شاهد فريق الذكاء يعمل' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'شغّل (6 ثوانٍ)' })).toBeVisible()
    await expect(page.getByText(/لسه بستنى الاتصال اللي وعدتوني فيه يوم الثلاثاء/)).toBeVisible()
    await expect(page.locator('[data-slot="watch-step-of"]')).toContainText('خطوة')
    const first = stepsAr(page).first()
    const clock = first.getByText('09:14:02')
    await expect(clock).toBeVisible()
    expect(await clock.evaluate((el) => el.closest('bdi')?.getAttribute('dir'))).toBe('ltr')
    // the clock column mirrors: it sits at the reading start, the right-hand side
    const clockBox = (await clock.boundingBox())!
    const titleBox = (await first.getByText('تصل رسالة واتساب').boundingBox())!
    expect(clockBox.x).toBeGreaterThan(titleBox.x)
    await page.getByRole('button', { name: 'الخطوة التالية' }).click()
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: /^الخطوة/ })).toHaveText('الخطوة 2 من 9: الوكيل 1 يطابقها على شخص واحد')
    await expect(stepsAr(page).nth(1)).toHaveAttribute('aria-current', 'step')
    // Arabic never carries tracking
    expect(await page.locator('main').evaluate((el) => getComputedStyle(el).letterSpacing)).toMatch(/^(normal|0px)$/)
  })

  for (const lang of ['en', 'ar'] as const) {
    for (const width of [320, 375, 390]) {
      test(`${width}px (${lang}): no sideways scroll at step 1 and at step 9, the grid stacks`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 })
        await open(page, 'cxmgr', PATH, lang)
        const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(await overflow(), 'step 1').toBeLessThanOrEqual(1)
        const list = lang === 'ar' ? stepsAr(page) : steps(page)
        // stacked: the text sits under the clock and the chip, so the title starts below the clock
        const clock = (await list.first().getByText('09:14:02').boundingBox())!
        const title = (await list.first().getByText(lang === 'ar' ? 'تصل رسالة واتساب' : 'A WhatsApp message arrives').boundingBox())!
        expect(title.y).toBeGreaterThan(clock.y + clock.height - 1)
        for (let i = 0; i < 8; i++) await page.getByRole('button', { name: lang === 'ar' ? 'الخطوة التالية' : 'Next step' }).click()
        await expect(list.nth(8)).toHaveAttribute('aria-current', 'step')
        expect(await overflow(), 'step 9').toBeLessThanOrEqual(1)
        // nothing of the replay runs past the right edge of the screen
        const past = await page.locator('main li[data-watch-step] *').evaluateAll((els, w) => els.filter((e) => e.getBoundingClientRect().right > (w as number) + 1).length, width)
        expect(past, 'elements past the viewport edge').toBe(0)
      })
    }
  }
})

test.describe('Watch the AI team work: accessibility (axe WCAG 2.1 AA)', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const [lang, theme] of [
    ['en', 'light'],
    ['ar', 'dark'],
  ] as const) {
    test(`${lang} ${theme}: step 1 and step 9 have no serious or critical violations`, async ({ page }) => {
      await open(page, 'cxmgr', PATH, lang, theme)
      await waitForAnimations(page)
      const atOne = await blocking(page)
      expect(atOne, `step 1: ${JSON.stringify(atOne, null, 2)}`).toEqual([])
      const label = lang === 'ar' ? 'الخطوة التالية' : 'Next step'
      for (let i = 0; i < 8; i++) await page.getByRole('button', { name: label }).click()
      await waitForAnimations(page)
      const atNine = await blocking(page)
      expect(atNine, `step 9: ${JSON.stringify(atNine, null, 2)}`).toEqual([])
    })
  }

  test('the Internal Audit and Marketing Lead (references): EN dark at step 4', async ({ page }) => {
    await open(page, 'auditmkt', PATH, 'en', 'dark')
    for (let i = 0; i < 3; i++) await next(page).click()
    await waitForAnimations(page)
    const violations = await blocking(page)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
