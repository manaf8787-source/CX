import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * v42.1 F33: the Campaign audit page, the gate on the places that run campaigns, the inbox and brief of the Internal Audit and Marketing
 * Lead (docs/V42_CAMPAIGN_AUDIT.md). The register lives in memory, so a full page load (`page.goto`) starts from the sample again:
 * journeys across pages go through the menu, the links and the Back button.
 */

test.use({ reducedMotion: 'reduce' })

const PATH = '/settings/campaign-audit'
const CHECKS = ['Right people', 'Right projects and developers', 'Right channel, language and timing', 'Right message', 'The money']

async function open(page: Page, role: RoleId, path: string = PATH, lang: 'en' | 'ar' = 'en', theme?: 'light' | 'dark') {
  if (theme) await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
  await signInAs(page, role, lang)
  await page.goto(path)
  await expectPageReady(page)
}

type Lang = 'en' | 'ar'
const group = (page: Page, lang: Lang = 'en') => page.getByRole('group', { name: lang === 'ar' ? 'الحملات' : 'Campaigns' })
const pick = (page: Page, id: string, lang: Lang = 'en') => group(page, lang).getByRole('button', { name: new RegExp(`^${id}`) })
const card = (page: Page) => page.getByTestId('campaign-card')
const checks = (page: Page, lang: Lang = 'en') => page.getByRole('list', { name: lang === 'ar' ? 'الفحوصات الخمسة' : 'The five checks' }).getByRole('listitem')
const mark = (page: Page, check: string, value: 'Pass' | 'Fail') => page.getByRole('button', { name: `${check}: ${value}` })
const clearButton = (page: Page) => page.getByRole('button', { name: 'Cleared to run' })
const backButton = (page: Page) => page.getByRole('button', { name: 'Send back to Marketing with the failed checks' })
const kpi = (page: Page, label: string) => page.locator('.surface-card').filter({ hasText: new RegExp(`^${label}`) })
const menu = (page: Page) => page.getByRole('link', { name: 'My inbox' }).first()

async function passAll(page: Page) {
  for (const c of CHECKS) await mark(page, c, 'Pass').click()
  await expect(clearButton(page)).not.toHaveAttribute('aria-disabled', 'true')
}

async function blocking(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('Campaign audit: the Internal Audit and Marketing Lead (F33)', () => {
  test('sees the list, one campaign per persona plus the AI campaign, and the five checks of the first one waiting', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, 'auditmkt')
    await expect(page.getByRole('heading', { level: 2, name: 'Campaign audit' })).toBeVisible()
    await expect(page.getByText(/Nothing is sent to a customer before the clearance\./)).toBeVisible()
    const names = await group(page).getByRole('button').allTextContents()
    expect(names.map((n) => n.split(' · ')[0])).toEqual(['MC-101', 'MC-102', 'MC-103', 'MC-104', 'MC-105', 'MC-106', 'camp-ai-1'])
    await expect(pick(page, 'MC-103')).toHaveAttribute('aria-pressed', 'true')
    await expect(card(page)).toHaveAttribute('data-stage', 'before')
    await expect(card(page)).toContainText('owner: Marketing manager · waiting for clearance')
    await expect(checks(page)).toHaveCount(5)
    for (const [i, title] of CHECKS.entries()) {
      await expect(checks(page).nth(i).getByRole('heading', { level: 3 })).toHaveText(title)
      await expect(mark(page, title, 'Pass')).toBeVisible()
      await expect(mark(page, title, 'Fail')).toBeVisible()
    }
    // each check has its rule and what the campaign says
    await expect(checks(page).nth(0)).toContainText("The segment is the persona's definition, the size is from the record, consent and DNCR applied")
    await expect(checks(page).nth(3)).toContainText('not: No renewal letter before the request is closed')
    await expect(checks(page).nth(4)).toContainText(/Budget AED [\d,]+ · AED \d+ per contact · \d+ expected responses · AED [\d,]+ per expected lead/)
    expect(errors, errors.join(' | ')).toEqual([])
  })

  test('marks the checks, clears one campaign and sends one back with the failed checks listed; the inbox count follows', async ({ page }) => {
    await open(page, 'auditmkt', '/inbox')
    const row = page.getByRole('row').filter({ hasText: 'Clear or send back' })
    await expect(row).toContainText('Clear or send back: 2 campaigns waiting before they run')
    await expect(row).toContainText('Most urgent')
    await expect(row).toContainText('2 working days left')
    await row.getByRole('link', { name: /Open/ }).click()
    await expect(page).toHaveURL(/\/settings\/campaign-audit$/)
    await expectPageReady(page)

    // "Cleared to run" waits for all five
    await expect(clearButton(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByText('Mark all five checks ✓ to clear it.')).toBeVisible()
    await passAll(page)
    await clearButton(page).click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'cleared')
    await expect(page.getByTestId('campaign-verdict')).toContainText('nothing was sent before this')
    await expect(kpi(page, 'Waiting for clearance')).toContainText('1')

    // the next one: two failed checks, sent back
    await pick(page, 'MC-104').click()
    await expect(card(page)).toHaveAttribute('data-campaign', 'MC-104')
    await expect(backButton(page)).toHaveAttribute('aria-disabled', 'true')
    await mark(page, 'Right people', 'Pass').click()
    await mark(page, 'Right message', 'Fail').click()
    await mark(page, 'The money', 'Fail').click()
    await expect(backButton(page)).not.toHaveAttribute('aria-disabled', 'true')
    await backButton(page).click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'sent_back')
    const failed = card(page).getByRole('list', { name: 'Failed checks' })
    await expect(failed.getByRole('listitem')).toHaveText(['Right message', 'The money'])
    await expect(page.getByTestId('campaign-verdict')).toContainText('It cannot start until it is cleared.')
    await expect(kpi(page, 'Waiting for clearance')).toContainText('0')
    await expect(kpi(page, 'Waiting for clearance')).toContainText('1 sent back, with Marketing')

    // the inbox: nothing is waiting on the audit lead any more (the sent-back one is with Marketing), the finished ones remain
    await menu(page).click()
    await expect(page).toHaveURL(/\/inbox$/)
    await expectPageReady(page)
    await expect(page.getByRole('row').filter({ hasText: 'Clear or send back' })).toHaveCount(0)
    await expect(page.getByRole('row').filter({ hasText: 'Audit after the run: 2 finished campaigns' })).toBeVisible()
  })

  test('the inbox count drops from two to one when one campaign is cleared', async ({ page }) => {
    await open(page, 'auditmkt')
    await passAll(page)
    await clearButton(page).click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'cleared')
    await menu(page).click()
    await expect(page.getByRole('row').filter({ hasText: 'Clear or send back' })).toContainText('Clear or send back: 1 campaign waiting before it runs')
  })

  test('changing a mark after the verdict withdraws it', async ({ page }) => {
    await open(page, 'auditmkt')
    await mark(page, 'Right channel, language and timing', 'Fail').click()
    await backButton(page).click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'sent_back')
    await mark(page, 'Right channel, language and timing', 'Pass').click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'waiting')
    await expect(page.getByTestId('campaign-verdict')).toContainText('Waiting for clearance.')
  })

  test('after the run the numbers show, and a targeting signal appears under 80%', async ({ page }) => {
    await open(page, 'auditmkt')
    await expect(page.getByText('After it ran', { exact: true })).toHaveCount(0)
    await pick(page, 'MC-101').click()
    await expect(card(page)).toHaveAttribute('data-stage', 'running')
    const results = page.getByTestId('campaign-results')
    await expect(results).toContainText('Reached the right people')
    await expect(results).toContainText('71%')
    await expect(results).toContainText('14%')
    await expect(results).toContainText('Leads or recoveries')
    await expect(results).toContainText('AED 778')
    await expect(page.getByText('so far')).toBeVisible()
    await expect(page.getByTestId('targeting-signal')).toContainText('Targeting signal raised to Marketing')
    await expect(page.getByTestId('targeting-signal')).toContainText('71% of the recipients match the persona on the record, below the 80% line.')
    // the checks are closed once it runs
    await expect(page.getByRole('button', { name: /: Pass$/ })).toHaveCount(0)
    await expect(clearButton(page)).toHaveCount(0)
    // a finished run above the line: numbers, no signal
    await pick(page, 'MC-105').click()
    await expect(card(page)).toHaveAttribute('data-stage', 'after')
    await expect(page.getByTestId('campaign-results')).toContainText('86%')
    await expect(page.getByTestId('targeting-signal')).toHaveCount(0)
    await expect(page.getByTestId('targeting-ok')).toContainText('no signal')
    // a finished run below it: the signal
    await pick(page, 'MC-106').click()
    await expect(page.getByTestId('campaign-results')).toContainText('78%')
    await expect(page.getByTestId('targeting-signal')).toContainText('78% of the recipients match the persona on the record, below the 80% line.')
    await expect(kpi(page, 'Targeting signals')).toContainText('4')
  })

  test('the daily brief on the overview carries the campaigns waiting and the reached-the-right-people share, and opens the page', async ({ page }) => {
    await open(page, 'auditmkt', '/overview')
    const line = page.locator('[data-brief-line="campaigns"]')
    await expect(line).toContainText('2 campaigns wait for your clearance; 3 running, 71%, 71% and 71% reached the right people so far')
    await line.click()
    await expect(page).toHaveURL(/\/settings\/campaign-audit$/)
  })

  test('the Settings menu lists the page right after the Weekly sample', async ({ page }) => {
    await open(page, 'auditmkt', PATH)
    const links = page.getByRole('navigation', { name: 'Settings and reference' }).getByRole('link')
    const names = await links.allTextContents()
    const i = names.indexOf('Weekly sample')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(names[i + 1]).toBe('Campaign audit')
    await expect(links.filter({ hasText: 'Campaign audit' })).toHaveAttribute('aria-current', 'page')
  })

  test('the Settings entry still lands where it did for every role', async ({ browser }) => {
    for (const [role, landing] of [
      ['cxmgr', /\/settings\/weekly-sample$/],
      ['cxteam', /\/settings\/weekly-sample$/],
      ['auditmkt', /\/settings\/weekly-sample$/],
      ['exec', /\/settings\/weekly-sample$/],
      ['marketing', /\/settings\/public-mentions$/],
      ['envmgmt', /\/settings\/surveys$/],
    ] as const) {
      const page = await browser.newPage()
      await open(page, role, '/home')
      await page.goto('/settings')
      await expect(page, role).toHaveURL(landing)
      await page.close()
    }
  })
})

test.describe('Campaign audit: nothing starts before clearance (F33)', () => {
  test('Close the loop: a new AI campaign says it is not cleared and cannot start; after the CX manager clears it on the audit page it starts', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    await page.getByRole('button', { name: 'Create campaign' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('E2E gate campaign')
    await dialog.getByLabel('Segment').fill('Medium detractors')
    await dialog.getByLabel('Script (English)').fill('Hello, a short call about your experience.')
    await dialog.getByLabel('Script (Arabic)').fill('مرحباً، مكالمة قصيرة عن تجربتك.')
    await dialog.getByRole('checkbox').first().check()
    await dialog.getByRole('button', { name: 'Create campaign' }).click()
    const li = page.locator('li').filter({ hasText: 'E2E gate campaign' })
    const gate = li.locator('[data-slot="campaign-gate"]')
    await expect(gate).toHaveAttribute('data-clearance', 'waiting')
    await expect(li).toContainText('Draft')
    await expect(gate.getByText('Waiting for clearance')).toBeVisible()
    await expect(gate).toContainText('Not cleared yet: it cannot start.')
    const start = gate.getByRole('button', { name: 'Start campaign' })
    await expect(start).toHaveAttribute('aria-disabled', 'true')
    await start.click({ force: true })
    await expect(li).toContainText('Draft')
    await expect(gate).toHaveAttribute('data-stage', 'before')

    // the audit page, from the gate's own link, on that campaign; the CX manager marks and clears it
    await gate.getByRole('link', { name: /Campaign audit/ }).click()
    await expect(page).toHaveURL(/\/settings\/campaign-audit\?campaign=camp-ai-/)
    await expectPageReady(page)
    await expect(card(page)).toContainText('E2E gate campaign')
    await passAll(page)
    await clearButton(page).click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'cleared')

    // back to Close the loop (client-side: the register is in memory): the campaign can start now
    await page.getByRole('link', { name: '5 · Close the loop' }).click()
    await expect(page).toHaveURL(/\/close-the-loop$/)
    await expectPageReady(page)
    const li2 = page.locator('li').filter({ hasText: 'E2E gate campaign' })
    const gate2 = li2.locator('[data-slot="campaign-gate"]')
    await expect(gate2).toHaveAttribute('data-clearance', 'cleared')
    const start2 = gate2.getByRole('button', { name: 'Start campaign' })
    await expect(start2).not.toHaveAttribute('aria-disabled', 'true')
    await start2.click()
    await expect(gate2).toHaveAttribute('data-stage', 'running')
    await expect(li2).toContainText('Running')
    await expect(li2).not.toContainText('Draft')
    await expect(gate2.getByRole('button', { name: 'Mark as finished' })).toBeVisible()
  })

  test('Close the loop: the campaign that already runs is cleared, and the audit page agrees', async ({ page }) => {
    await open(page, 'cxteam', '/close-the-loop')
    const gate = page.getByTestId('campaign-gate-camp-ai-1')
    await expect(gate).toHaveAttribute('data-clearance', 'cleared')
    await expect(gate).toHaveAttribute('data-stage', 'running')
    await expect(gate.getByText('Cleared by Internal Audit')).toBeVisible()
    await expect(gate.getByRole('button', { name: 'Start campaign' })).toHaveCount(0)
  })

  test('Personas: a persona campaign not cleared says so and the Marketing manager cannot start it', async ({ page }) => {
    await open(page, 'marketing', '/personas')
    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader', { name: 'Campaign audit' })).toBeVisible()
    const gates = table.locator('[data-slot="campaign-gate"]')
    await expect(gates).toHaveCount(6)
    const waiting = table.locator('[data-slot="campaign-gate"][data-clearance="waiting"]')
    await expect(waiting).toHaveCount(2)
    await expect(waiting.first()).toContainText('Not cleared yet: it cannot start.')
    const start = waiting.first().getByRole('button', { name: 'Start campaign' })
    await expect(start).toHaveAttribute('aria-disabled', 'true')
    await start.click({ force: true })
    await expect(waiting).toHaveCount(2)
    await expect(table.locator('[data-slot="campaign-gate"][data-stage="running"]')).toHaveCount(2)
  })

  test('Personas: the CX manager clears a persona campaign on the audit page and Marketing-side Start works from Personas', async ({ page }) => {
    await open(page, 'cxmgr', PATH)
    await pick(page, 'MC-103').click()
    await passAll(page)
    await clearButton(page).click()
    await expect(card(page)).toHaveAttribute('data-clearance', 'cleared')
    await page.getByRole('link', { name: '1 · Customers' }).click()
    await page.getByRole('link', { name: 'Personas and campaigns' }).click()
    await expect(page).toHaveURL(/\/personas$/)
    await expectPageReady(page)
    const table = page.getByRole('table')
    const cleared = table.locator('[data-slot="campaign-gate"][data-stage="before"][data-clearance="cleared"]')
    await expect(cleared).toHaveCount(1)
    await cleared.getByRole('button', { name: 'Start campaign' }).click()
    await expect(table.locator('[data-slot="campaign-gate"][data-stage="running"]')).toHaveCount(3)
  })

  test('the audit role has no Start button on Personas and no approve control anywhere: it audits and never runs or approves', async ({ page }) => {
    await open(page, 'auditmkt', '/personas')
    await expect(page.getByRole('table').locator('[data-slot="campaign-gate"]')).toHaveCount(6)
    await expect(page.getByRole('button', { name: 'Start campaign' })).toHaveCount(0)
    // the fixes: no Actions page for the role, the guard sends it home
    await page.goto('/actions/corrective')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByRole('button', { name: /Approve/ })).toHaveCount(0)
    await page.goto('/inbox')
    await expectPageReady(page)
    await expect(page.getByRole('row').filter({ hasText: /Approve, change, reject/ })).toHaveCount(0)
  })
})

test.describe('Campaign audit: who edits, who reads, who cannot open it (F33)', () => {
  test('the CX manager edits', async ({ page }) => {
    await open(page, 'cxmgr')
    await expect(page.getByText(/^View only:/)).toHaveCount(0)
    await mark(page, 'Right people', 'Pass').click()
    await expect(checks(page).nth(0)).toHaveAttribute('data-mark', 'pass')
    await expect(clearButton(page)).toBeVisible()
  })

  for (const role of ['marketing', 'exec', 'cxteam'] as const) {
    test(`${role} reads the marks and the verdict: no buttons to mark or decide`, async ({ page }) => {
      await open(page, role)
      await expect(page.getByText('View only: the Internal Audit and Marketing Lead and the CX manager clear or send back campaigns.')).toBeVisible()
      await expect(page.getByRole('button', { name: /: (Pass|Fail)$/ })).toHaveCount(0)
      await expect(clearButton(page)).toHaveCount(0)
      await expect(backButton(page)).toHaveCount(0)
      await expect(card(page)).toHaveAttribute('data-campaign', 'MC-101')
      await expect(card(page).getByText('Pass', { exact: true })).toHaveCount(5)
      await pick(page, 'MC-103').click()
      await expect(card(page).getByText('Not checked yet')).toHaveCount(5)
    })
  }

  for (const [role, home] of [
    ['hrmgr', /\/settings\/hr-team$/],
    ['hrspec', /\/actions/],
    ['shopper', /\/settings\/mystery-shopper$/],
    ['ld', /\/settings\/ld$/],
    ['teamlead', /\/home$/],
    ['aslead', /\/home$/],
    ['envmgmt', /\/home$/],
  ] as const) {
    test(`${role} cannot open it: the same redirect every gated page gets`, async ({ page }) => {
      await signInAs(page, role)
      await page.goto(PATH)
      await expect(page).toHaveURL(home)
      await expectPageReady(page)
      await expect(page.getByTestId('campaign-card')).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Campaign audit' })).toHaveCount(0)
    })
  }
})

test.describe('Campaign audit: Arabic, RTL, the phone (F33)', () => {
  test('Arabic is right to left: the title, the five checks, the verdict buttons, the failed list', async ({ page }) => {
    await open(page, 'auditmkt', PATH, 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 2, name: 'تدقيق الحملات' })).toBeVisible()
    await expect(page.getByText(/مسؤول التدقيق الداخلي والتسويق يجيزها أو يعيدها/)).toBeVisible()
    const titles = ['الأشخاص الصحيحون', 'المشاريع والمطورون الصحيحون', 'القناة واللغة والتوقيت الصحيحة', 'الرسالة الصحيحة', 'المال']
    for (const [i, title] of titles.entries()) await expect(checks(page, 'ar').nth(i).getByRole('heading', { level: 3 })).toHaveText(title)
    await expect(page.getByRole('button', { name: 'مُجازة للتشغيل' })).toBeVisible()
    await page.getByRole('button', { name: 'الأشخاص الصحيحون: غير مطابق' }).click()
    await page.getByRole('button', { name: 'إعادة للتسويق مع الفحوصات الفاشلة' }).click()
    await expect(page.getByRole('list', { name: 'الفحوصات الفاشلة' }).getByRole('listitem')).toHaveText(['الأشخاص الصحيحون'])
    // the check column sits at the reading start (the right) and the verdict controls at the end (the left)
    const first = checks(page, 'ar').nth(0)
    const heading = (await first.getByRole('heading', { level: 3 }).boundingBox())!
    const verdict = (await first.getByRole('group').boundingBox())!
    expect(heading.x).toBeGreaterThan(verdict.x)
    expect(await page.locator('main').evaluate((el) => getComputedStyle(el).letterSpacing)).toMatch(/^(normal|0px)$/)
    // after the run, in Arabic
    await pick(page, 'MC-101', 'ar').click()
    await expect(page.getByText('بعد التشغيل', { exact: true })).toBeVisible()
    await expect(page.getByTestId('targeting-signal')).toContainText('إشارة استهداف رُفعت للتسويق')
  })

  for (const lang of ['en', 'ar'] as const) {
    for (const width of [320, 375]) {
      test(`${width}px (${lang}): the checks stack, no sideways scroll, before the run, sent back and after the run`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 })
        await open(page, 'auditmkt', PATH, lang)
        expect(await overflow(page), 'before the run').toBeLessThanOrEqual(1)
        // stacked: what the campaign says sits under the title of the check, not beside it
        const row = checks(page, lang).nth(0)
        const title = (await row.getByRole('heading', { level: 3 }).boundingBox())!
        const says = (await row.locator('p.text-foreground').boundingBox())!
        expect(says.y).toBeGreaterThan(title.y + title.height - 1)
        await page.getByRole('button', { name: lang === 'ar' ? 'الأشخاص الصحيحون: غير مطابق' : 'Right people: Fail' }).click()
        await page.getByRole('button', { name: lang === 'ar' ? 'إعادة للتسويق مع الفحوصات الفاشلة' : 'Send back to Marketing with the failed checks' }).click()
        await expect(card(page)).toHaveAttribute('data-clearance', 'sent_back')
        expect(await overflow(page), 'sent back').toBeLessThanOrEqual(1)
        await pick(page, 'MC-101', lang).click()
        await expect(page.getByTestId('campaign-results')).toBeVisible()
        expect(await overflow(page), 'after the run').toBeLessThanOrEqual(1)
        const past = await page.locator('main *').evaluateAll((els, w) => els.filter((e) => e.getBoundingClientRect().right > (w as number) + 1 && !e.closest('[data-slot="segmented"], [role="navigation"], nav')).length, width)
        expect(past, 'elements past the viewport edge outside the scrolling control').toBe(0)
      })
    }
  }

  test('375px: the inbox shows the two campaign rows as stacked rows', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, 'auditmkt', '/inbox')
    const rows = page.locator('[data-slot="stacked-rows"] li')
    await expect(rows.filter({ hasText: 'Clear or send back: 2 campaigns waiting before they run' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Audit after the run: 2 finished campaigns' })).toBeVisible()
    await expect(rows.filter({ hasText: 'Clear or send back' }).getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/settings/campaign-audit')
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })

  test('375px: Personas shows the gate of each ranked campaign on the phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, 'marketing', '/personas')
    await expect(page.locator('[data-slot="campaign-gate"]').first()).toBeVisible()
    await expect(page.locator('[data-slot="campaign-gate"]')).toHaveCount(6)
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })
})

test.describe('Campaign audit: accessibility (axe WCAG 2.1 AA)', () => {
  for (const [lang, theme] of [
    ['en', 'light'],
    ['ar', 'dark'],
  ] as const) {
    test(`${lang} ${theme}: before the run, sent back and after the run have no serious or critical violations`, async ({ page }) => {
      await open(page, 'auditmkt', PATH, lang, theme)
      await waitForAnimations(page)
      const before = await blocking(page)
      expect(before, `before the run: ${JSON.stringify(before, null, 2)}`).toEqual([])
      await page.getByRole('button', { name: lang === 'ar' ? 'المال: غير مطابق' : 'The money: Fail' }).click()
      await page.getByRole('button', { name: lang === 'ar' ? 'إعادة للتسويق مع الفحوصات الفاشلة' : 'Send back to Marketing with the failed checks' }).click()
      await expect(card(page)).toHaveAttribute('data-clearance', 'sent_back')
      await waitForAnimations(page)
      const back = await blocking(page)
      expect(back, `sent back: ${JSON.stringify(back, null, 2)}`).toEqual([])
      await pick(page, 'MC-101', lang).click()
      await expect(page.getByTestId('targeting-signal')).toBeVisible()
      await waitForAnimations(page)
      const after = await blocking(page)
      expect(after, `after the run: ${JSON.stringify(after, null, 2)}`).toEqual([])
    })
  }

  test('a reader (Marketing), EN dark, has no serious or critical violations', async ({ page }) => {
    await open(page, 'marketing', PATH, 'en', 'dark')
    await waitForAnimations(page)
    const violations = await blocking(page)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  for (const [lang, theme] of [
    ['en', 'light'],
    ['ar', 'dark'],
  ] as const) {
    test(`the gate on Personas (Marketing) and on Close the loop (CX manager), ${lang} ${theme}: no serious or critical violations`, async ({ browser }) => {
      for (const [role, path] of [
        ['marketing', '/personas'],
        ['cxmgr', '/close-the-loop'],
      ] as const) {
        const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await open(page, role, path, lang, theme)
        await waitForAnimations(page)
        const violations = await blocking(page)
        expect(violations, `${path}: ${JSON.stringify(violations, null, 2)}`).toEqual([])
        await context.close()
      }
    })
  }
})
