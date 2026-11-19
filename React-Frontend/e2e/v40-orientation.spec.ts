import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * Workstream A (v40): Home, the Daily brief, indicators per product, "Your work today", My inbox, the "Data as of" bar and
 * environment switch, sign-in, Arabic agent chips. Axe scans of the states A built (other roles, the open "?" definition,
 * the closed "New here" card, the narrowed environment) live here because the shared route scan only visits the CX manager's pages.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function blocking(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')), count: v.nodes.length }))
}

async function open(page: Page, role: RoleId, route: string, lang: 'en' | 'ar' = 'en') {
  await signInAs(page, role, lang)
  await page.goto(route)
  await expectPageReady(page)
  await waitForAnimations(page)
}

const bar = (page: Page) => page.getByRole('region', { name: 'Data freshness and environment' })
const stepCount = async (page: Page, step: string) => (await page.locator(`[data-step="${step}"]`).innerText()).split('\n').at(-1)!.trim()
// NaN while a count is still loading, so a poll keeps waiting.
const numberIn = (text: string) => Number(text.match(/\d+/)?.[0] ?? Number.NaN)

test.describe('Home (v40 F01 to F06, F09)', () => {
  test('shows the header, the six steps with live counts, and the sections in the v40 order', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, 'cxmgr', '/home')
    await expect(page.getByRole('heading', { level: 1, name: 'What customers tell us, and what we fix' })).toBeVisible()
    await expect(page.getByText('Prototype, sample data')).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'The six steps, with live counts' })
    await expect(nav.getByRole('link')).toHaveCount(6)
    await expect(nav.locator('[data-step="ev"]')).toContainText(/\d+ people on record/)
    await expect(nav.locator('[data-step="sg"]')).toContainText(/\d+ signals? in 30 days/)
    await expect(nav.locator('[data-step="pt"]')).toContainText(/\d+ patterns? over the line/)
    await expect(nav.locator('[data-step="vr"]')).toContainText(/\d+ unhappy customers? to call/)
    await expect(nav.locator('[data-step="rp"]')).toContainText('2 products, one line each')

    const positions = await page.evaluate(() => {
      const text = document.querySelector('main')!.innerText
      return ['Daily brief', 'New here? Three things to know', 'How customers feel, per product', 'Your work today', 'Find a person, or ask'].map((s) => text.indexOf(s))
    })
    expect(positions.every((p) => p >= 0), JSON.stringify(positions)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(errors).toEqual([])
  })

  test('a step opens its page', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    await page.locator('[data-step="sg"]').click()
    await expect(page).toHaveURL(/\/actions\/signals$/)
  })

  test('the Daily brief is by Agent 9, per role, and each line opens its page', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const brief = page.locator('[data-slot="card"]').filter({ has: page.getByRole('list', { name: 'Daily brief lines' }) })
    await expect(brief.getByText('Agent 9 · Reporting')).toBeVisible()
    await expect(brief.getByText(/Written at 07:00 by Agent 9/)).toBeVisible()
    const lines = brief.getByRole('list', { name: 'Daily brief lines' })
    await expect(lines.getByRole('link', { name: /PSI Real Estate NPS is [+-]?\d+/ })).toBeVisible()
    await expect(lines.getByRole('link', { name: /After-Sales NPS is/ })).toBeVisible()
    await lines.getByRole('link', { name: /still to call/ }).click()
    await expect(page).toHaveURL(/\/close-the-loop/)
  })

  test('the brief opens from the keyboard', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const link = page.getByRole('list', { name: 'Daily brief lines' }).getByRole('link', { name: /signals in the last 30 days/ })
    await link.focus()
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/actions\/signals$/)
  })

  test('the brief and the tiles read one NPS: the number in the sentence is the number on the card', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const line = await page.getByRole('list', { name: 'Daily brief lines' }).getByRole('link', { name: /PSI Real Estate NPS is/ }).innerText()
    const inBrief = line.match(/NPS is ([+-]?\d+)/)![1]
    const tile = await page.locator('[data-product="re"] [data-indicator="nps"]').innerText()
    expect(tile.replace(/\s/g, '')).toContain(inBrief)
  })

  test('shows one indicator card per live product with NPS, CSAT and CES, and a "?" with the v40 CES definition', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    await expect(page.locator('[data-product]')).toHaveCount(2)
    const re = page.locator('[data-product="re"]')
    await expect(re.getByRole('heading', { level: 3, name: 'PSI Real Estate' })).toBeVisible()
    await expect(re.getByText(/\d+ answers, 90 days/)).toBeVisible()
    for (const kind of ['nps', 'csat', 'ces']) await expect(re.locator(`[data-indicator="${kind}"]`)).toBeVisible()
    await expect(re.getByText('would recommend us')).toBeVisible()
    await expect(re.getByText('happy with the last step')).toBeVisible()
    await expect(re.getByText('found it easy')).toBeVisible()
    await expect(re.getByRole('link', { name: 'All numbers' })).toHaveAttribute('href', '/overview')
    await re.getByRole('button', { name: /What CES/ }).click()
    const pop = page.getByRole('dialog').or(page.locator('[data-slot="popover-content"]'))
    await expect(pop.getByText(/1 to 5 scale/)).toBeVisible()
    await expect(pop.getByText(/4 or 5/)).toBeVisible()
    await expect(page.getByText(/1 to 7/)).toHaveCount(0)
    await page.keyboard.press('Escape')
  })

  test('"New here? Three things to know" is open, closes, and stays closed after a reload', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const trigger = page.getByRole('button', { name: 'New here? Three things to know' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(/The portal does one thing/)).toBeVisible()
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await page.reload()
    await expectPageReady(page)
    await expect(page.getByRole('button', { name: 'New here? Three things to know' })).toHaveAttribute('aria-expanded', 'false')
  })

  test('"Your work today" matches My inbox: same count, at most four rows, and a button to the inbox', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const hint = page.getByText(/\d+ items on you, \d+ urgent\. Each has a day count\./)
    await expect(hint).toBeVisible()
    const onHome = numberIn(await hint.innerText())
    const rows = page.getByRole('list', { name: 'First rows of my inbox' }).getByRole('listitem')
    expect(await rows.count()).toBeLessThanOrEqual(4)
    await page.getByRole('link', { name: /Open my inbox/ }).click()
    await expect(page).toHaveURL(/\/inbox$/)
    await expectPageReady(page)
    await expect(page.getByText(/\d+ items on you, \d+ urgent/)).toBeVisible()
    expect(numberIn(await page.getByText(/\d+ items on you, \d+ urgent/).innerText())).toBe(onHome)
    await expect.poll(() => page.locator('main tbody tr').count(), { timeout: 15_000 }).toBe(onHome)
  })

  test('the one search sends a text it cannot match to the customers list', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    await page.getByRole('searchbox', { name: 'Search for a person' }).fill('zzzz')
    await page.getByRole('button', { name: 'Go' }).click()
    await expect(page).toHaveURL(/\/customers\?q=zzzz$/)
  })

  test('has no new axe violations in the CX manager’s states: "New here" closed, the "?" open', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    await page.getByRole('button', { name: 'New here? Three things to know' }).click()
    await page.locator('[data-product="re"]').getByRole('button', { name: /What CES/ }).click()
    await expect(page.locator('[data-slot="popover-content"]')).toBeVisible()
    await waitForAnimations(page)
    expect(await blocking(page)).toEqual([])
  })
})

test.describe('Home per role (links only to pages the role can open)', () => {
  test('a Sales team lead: its own product only, no Overview link, no Close the loop count, no loop line', async ({ page }) => {
    await open(page, 'teamlead', '/home')
    await expect(page.locator('[data-product]')).toHaveCount(1)
    await expect(page.locator('[data-product="re"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'All numbers' })).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'The six steps, with live counts' })
    await expect(nav.getByRole('link')).toHaveCount(4)
    await expect(nav.locator('[data-step="vr"]')).not.toContainText(/to call/)
    const lines = page.getByRole('list', { name: 'Daily brief lines' })
    await expect(lines.getByText(/PSI Real Estate NPS is/)).toBeVisible()
    await expect(lines.getByText(/still to call/)).toHaveCount(0)
    for (const href of await lines.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) expect(href).not.toBe('/overview')
    await expect(page.getByRole('heading', { level: 2, name: 'Find a person' })).toBeVisible()
    expect(await blocking(page)).toEqual([])
  })

  test('Marketing: the people and public lines open Who is leaving and Public mentions, nothing else is a link', async ({ page }) => {
    await open(page, 'marketing', '/home')
    const lines = page.getByRole('list', { name: 'Daily brief lines' })
    await expect(lines.getByRole('link', { name: /people on record are drifting away/ })).toHaveAttribute('href', '/runaway')
    await expect(lines.getByRole('link', { name: /public mentions/ })).toHaveAttribute('href', '/settings/public-mentions')
    await expect(lines.getByText(/signals in the last/)).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'The six steps, with live counts' })
    await expect(nav.getByRole('link')).toHaveCount(1)
    expect(await blocking(page)).toEqual([])
  })

  test('Environment management: a fixed Dubai chip, no select, and the brief and counts follow it', async ({ page }) => {
    await open(page, 'envmgmt', '/home')
    await expect(bar(page).getByText('Dubai')).toBeVisible()
    await expect(bar(page).getByRole('combobox')).toHaveCount(0)
    await expect(page.locator('[data-product]')).toHaveCount(1)
    expect(await blocking(page)).toEqual([])
  })

  test('the executive sees the brief without the loop line', async ({ page }) => {
    await open(page, 'exec', '/home')
    const lines = page.getByRole('list', { name: 'Daily brief lines' })
    await expect(lines.getByText(/signals in the last/)).toBeVisible()
    await expect(lines.getByText(/still to call/)).toHaveCount(0)
  })
})

test.describe('Environment switch (v40 F14, decided 18 Nov: it narrows everything that carries an environment)', () => {
  test('choosing PSI Assets narrows the people, signals and the counts of Home, and says indicators are not narrowed', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    const people = numberIn(await stepCount(page, 'ev'))
    const signals = numberIn(await stepCount(page, 'sg'))
    await bar(page).getByRole('combobox').click()
    await page.getByRole('option', { name: 'PSI Assets (rental)' }).click()
    await expect(page.getByText('Indicators are per product; the environment switch does not narrow them.')).toBeVisible()
    await expect.poll(async () => numberIn(await stepCount(page, 'ev')), { timeout: 15_000 }).toBeLessThan(people)
    await expect.poll(async () => numberIn(await stepCount(page, 'sg')), { timeout: 15_000 }).toBeLessThanOrEqual(signals)
    // The brief's people line reads the same narrowed register as the first step.
    const narrowed = numberIn(await stepCount(page, 'ev'))
    await expect(page.getByRole('list', { name: 'Daily brief lines' }).getByText(new RegExp(`of ${narrowed} people on record`))).toBeVisible({ timeout: 15_000 })
    // Back to all environments.
    await bar(page).getByRole('combobox').click()
    await page.getByRole('option', { name: 'All environments' }).click()
    await expect.poll(async () => numberIn(await stepCount(page, 'ev')), { timeout: 15_000 }).toBe(people)
  })

  test('the choice survives a reload and applies to My inbox too', async ({ page }) => {
    await open(page, 'cxmgr', '/inbox')
    await expect.poll(() => page.locator('main tbody tr').count(), { timeout: 15_000 }).toBeGreaterThan(0)
    const all = await page.locator('main tbody tr').count()
    await bar(page).getByRole('combobox').click()
    await page.getByRole('option', { name: 'PSI Assets (rental)' }).click()
    await expect.poll(() => page.locator('main tbody tr').count(), { timeout: 15_000 }).toBeLessThan(all)
    await page.reload()
    await expectPageReady(page)
    await expect(bar(page).getByRole('combobox')).toContainText('PSI Assets (rental)')
  })

  test('the bar is on every signed-in page and describes what the switch narrows', async ({ page }) => {
    await open(page, 'cxmgr', '/actions/signals')
    await expect(bar(page)).toBeVisible()
    await expect(bar(page).getByText(/Data as of/)).toBeVisible()
    await expect(bar(page).getByRole('combobox')).toHaveAccessibleDescription(/fixes, the call list/)
  })
})

test.describe('My inbox (v40 F20)', () => {
  test('lists rows by urgency with day chips, due dates and priorities, and opens the record', async ({ page }) => {
    await open(page, 'cxmgr', '/inbox')
    await expect(page.getByRole('heading', { level: 1, name: 'My inbox' })).toBeVisible()
    const table = page.getByRole('table')
    await expect(table).toBeVisible({ timeout: 15_000 })
    for (const name of ['Due', 'What', 'With']) await expect(table.getByRole('columnheader', { name })).toBeVisible()
    const priorities = await page.locator('main tbody tr').evaluateAll((rows) => rows.map((r) => Number(r.getAttribute('data-priority'))))
    expect(priorities.length).toBeGreaterThan(3)
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a))
    await expect(page.locator('main tbody tr').filter({ hasText: /working days? (left|late)|days? (left|late)|today|overdue/ }).first()).toBeVisible()
    await expect(page.getByText(/Approval window: 5 working days\. Verification at 60 days\./)).toBeVisible()
    await expect(page.getByText(/Working days count Monday to Friday\./)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Next step' })).toBeVisible()
    const first = page.locator('main tbody tr').first().getByRole('link', { name: /Open/ })
    const href = await first.getAttribute('href')
    await first.click()
    await expect(page).toHaveURL(new RegExp(href!.split('?')[0].replace(/[/.]/g, (c) => `\\${c}`)))
  })

  test('the Internal Audit and Marketing Lead has the weekly sample on it, and no customer call', async ({ page }) => {
    await open(page, 'auditmkt', '/inbox')
    // v42.1 (F33): the two campaign audit rows come with it ("Clear or send back" first, "Audit after the run" last)
    await expect(page.locator('main tbody tr')).toHaveCount(3, { timeout: 15_000 })
    await expect(page.locator('main tbody tr').filter({ hasText: /Weekly sample: 35 outputs to read, 0 read/ })).toBeVisible()
    await expect(page.locator('main tbody tr').first()).toContainText('Clear or send back: 2 campaigns waiting before they run')
    await expect(page.locator('main tbody tr').last()).toContainText('Audit after the run: 2 finished campaigns')
    await expect(page.locator('[data-kind="call"]')).toHaveCount(0)
    expect(await blocking(page)).toEqual([])
  })

  test('Marketing has nothing on it', async ({ page }) => {
    await open(page, 'marketing', '/inbox')
    await expect(page.getByText('Nothing on you today.')).toBeVisible({ timeout: 15_000 })
    expect(await blocking(page)).toEqual([])
  })

  test('a role without an inbox is sent to its home', async ({ page }) => {
    await signInAs(page, 'ld')
    await page.goto('/inbox')
    await expect(page).toHaveURL(/\/settings\/ld$/)
  })

  test('counts in Arabic and flips the direction, with no sideways scroll at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, 'cxmgr', '/inbox', 'ar')
    await expect(page.getByRole('heading', { level: 1, name: 'صندوقي' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    // a phone shows the inbox as stacked rows (Meo restyle, docs/MEO_DESIGN_SYSTEM.md section 14), not as a table that scrolls sideways
    await expect(page.locator('[data-slot=stacked-rows]')).toBeVisible({ timeout: 15_000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('Arabic and right to left', () => {
  test('Home in Arabic: the prototype strings, Arabic agent chip, no sideways scroll at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, 'cxmgr', '/home', 'ar')
    await expect(page.getByRole('heading', { level: 1, name: 'ما يقوله الزبائن، وما نصلحه' })).toBeVisible()
    await expect(page.getByText('الوكيل 9 · التقارير')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'كيف يشعر الزبائن، لكل منتج' })).toBeVisible()
    await expect(page.getByText('شغلك اليوم')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('the Intelligent CX team page names agents with the Arabic chip', async ({ page }) => {
    await open(page, 'cxmgr', '/intelligent-cx-team', 'ar')
    await expect(page.getByText(/^الوكيل \d+ · /).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 2, name: 'الوكلاء العشرة' })).toBeVisible()
  })

  test('Agent 9 runs daily at 07:00 for the brief (F36), and the page still says ten agents', async ({ page }) => {
    await open(page, 'cxmgr', '/intelligent-cx-team')
    await expect(page.getByText(/Ten single-task agents and one supervisor/)).toBeVisible()
    const card = page.locator('[data-slot="collapsible"]').filter({ hasText: 'Reporting' }).first()
    await card.getByRole('button', { name: 'Job description' }).click()
    await expect(card.getByText('Daily 07:00 for the brief; first working day of the month for the pack; on demand.')).toBeVisible()
  })
})

test.describe('Sign-in states (v40 F28)', () => {
  test('has no new axe violations with the other roles unfolded and a role chosen, in both languages', async ({ page }) => {
    for (const lang of ['en', 'ar'] as const) {
      await page.addInitScript((l) => localStorage.setItem('psicx.lang', l), lang)
      await page.goto('/login')
      await expect(page.locator('h1').first()).toBeVisible()
      await page.locator('details > summary').click()
      await page.getByRole('radio', { name: lang === 'en' ? /^Executive/ : /^تنفيذي/ }).check({ force: true })
      await waitForAnimations(page)
      expect(await blocking(page), lang).toEqual([])
    }
  })
})

test.describe('Demo role switch (v40 F28)', () => {
  test('lists the six main roles first and the others under "Other roles used in the demo"', async ({ page }) => {
    await open(page, 'cxmgr', '/home')
    await page.getByRole('combobox', { name: /Viewing as/ }).click()
    await expect(page.getByRole('option')).toHaveCount(12)
    await expect(page.getByText('Main roles', { exact: true })).toBeVisible()
    await expect(page.getByText('Other roles used in the demo', { exact: true })).toBeVisible()
    const names = await page.getByRole('option').allInnerTexts()
    expect(names.slice(0, 6)).toEqual(['CX manager', 'CX team', 'Environment management', 'Marketing manager', 'L&D manager', 'Internal Audit and Marketing Lead'])
    await page.keyboard.press('Escape')
  })

  test('the account menu names the environment of a role fixed to one', async ({ page }) => {
    await open(page, 'envmgmt', '/home')
    await page.getByRole('button', { name: /^Account:/ }).click()
    await expect(page.getByText('Environment: Dubai')).toBeVisible()
  })
})
