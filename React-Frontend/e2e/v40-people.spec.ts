import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/** Workstream C (people, loop, surveys, data pages), docs/V40_WS_C.md. */

async function open(page: Page, role: RoleId, path: string, lang: 'en' | 'ar' = 'en') {
  await signInAs(page, role, lang)
  await page.goto(path)
  await expectPageReady(page)
}

async function blockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

/** Waits until the table has data rows (the sample loads after the page frame). */
const rowsOf = (page: Page) => page.locator('main tbody tr')

/** The first row with this text, looking on the next page of the call list when it is not on the first. */
async function rowWith(page: Page, text: string) {
  const row = page.locator('main tbody tr', { hasText: text }).first()
  if ((await row.count()) === 0) await page.getByRole('button', { name: 'Next page' }).click()
  return page.locator('main tbody tr', { hasText: text }).first()
}

test.describe('Customers: tabs, list, export (F17, F29)', () => {
  test('the three tabs are three URLs, and the old URLs still work', async ({ page }) => {
    await open(page, 'cxmgr', '/customers')
    const strip = page.getByRole('navigation', { name: 'Customers sections' })
    await expect(strip.getByRole('link')).toHaveText(['Find a person', 'Who is leaving', 'Personas and campaigns'])
    await expect(strip.getByRole('link', { name: 'Find a person' })).toHaveAttribute('aria-current', 'page')
    await strip.getByRole('link', { name: 'Who is leaving' }).click()
    await expect(page).toHaveURL(/\/runaway$/)
    await expectPageReady(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Who is leaving' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Customers sections' }).getByRole('link', { name: 'Who is leaving' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('navigation', { name: 'Customers sections' }).getByRole('link', { name: 'Personas and campaigns' }).click()
    await expect(page).toHaveURL(/\/personas$/)
    await expectPageReady(page)
    await expect(page.getByRole('navigation', { name: 'Customers sections' })).toBeVisible()
  })

  test('the tab strip stays when a person is open, and "Find a person" stays current', async ({ page }) => {
    await open(page, 'cxmgr', '/customers/p-001')
    await expect(page.getByRole('navigation', { name: 'Customers sections' }).getByRole('link', { name: 'Find a person' })).toHaveAttribute('aria-current', 'page')
  })

  test('the list filters by type and source, and the count follows', async ({ page }) => {
    await open(page, 'cxmgr', '/customers')
    await expect(page.getByText('30 people')).toBeVisible({ timeout: 15_000 })
    await expect(rowsOf(page).first()).toBeVisible()
    await page.getByRole('combobox', { name: 'Type' }).click()
    await page.getByRole('option', { name: 'Buyer' }).click()
    await expect(page.getByText('30 people')).toBeHidden()
    await expect(page.getByText(/^\d+ people$/)).toBeVisible()
    const n = Number((await page.getByText(/^\d+ people$/).innerText()).split(' ')[0])
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(30)
    await page.getByRole('combobox', { name: 'Source' }).click()
    await page.getByRole('option', { name: 'CRM', exact: true }).click()
    await expect.poll(async () => Number((await page.getByText(/^\d+ people$/).innerText()).split(' ')[0])).toBeLessThanOrEqual(n)
  })

  test('searching by name finds the person and opens the journey', async ({ page }) => {
    await open(page, 'cxmgr', '/customers')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('searchbox', { name: 'Search this list' }).fill('Khaled')
    await page.getByRole('link', { name: 'Khaled Hamad' }).click()
    await expect(page).toHaveURL(/\/customers\/p-005$/)
    await expectPageReady(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Khaled Hamad' })).toBeVisible()
  })

  test('the export is a real CSV with the mobile for the CX team', async ({ page }) => {
    await open(page, 'cxteam', '/customers')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export list (CSV)' }).click()])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    const csv = readFileSync(await download.path(), 'utf8').split('\n')
    expect(csv[0]).toBe('Person,Mobile,Type,Environment,Source,Last contact')
    expect(csv).toHaveLength(31)
    expect(csv[1]).toMatch(/,\+\d+,/)
    await expect(page.getByText(/Names and mobiles only for roles allowed to see them/)).toBeVisible()
  })

  test('the Internal Audit and Marketing Lead sees references, and its export has no names and no mobile column', async ({ page }) => {
    await open(page, 'auditmkt', '/customers')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    const people = page.locator('main tbody tr td:first-child a')
    for (const text of await people.allInnerTexts()) expect(text).toMatch(/^P-\d{3}$/)
    await page.getByRole('searchbox', { name: 'Search this list' }).fill('Khaled')
    await expect(page.getByText(/No match for/)).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search this list' }).fill('')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export list (CSV)' }).click()])
    const csv = readFileSync(await download.path(), 'utf8').split('\n')
    expect(csv[0]).toBe('Person,Type,Environment,Source,Last contact')
    for (const line of csv.slice(1)) expect(line).toMatch(/^P-\d{3},/)
    expect(csv.join('\n')).not.toMatch(/\+971/)
  })

  test('a role fixed to one environment sees a chip instead of the environment filter', async ({ page }) => {
    await open(page, 'envmgmt', '/customers')
    await expect(page.getByText(/Scoped to your environment:/)).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Environment' })).toHaveCount(0)
  })
})

test.describe('A person: consent, DNCR and the next step (F07, F24)', () => {
  test('DNCR shows as a critical chip with the skip reason; the next-step box is on step 1 or 2', async ({ page }) => {
    await open(page, 'cxmgr', '/customers/p-005')
    const consent = page.getByRole('region', { name: 'Consent' })
    await expect(consent.getByText('Consent (from the CRM):')).toBeVisible()
    await expect(consent.getByText('DNCR · no calls, no surveys by call')).toBeVisible()
    await expect(consent.getByText('Surveys skipped for this person, reason logged:')).toBeVisible()
    await expect(consent).toContainText('WhatsApp')
    const next = page.getByRole('region', { name: 'Next step' })
    await expect(next).toContainText('Next step:')
    await expect(next.locator('[aria-current="step"]')).toHaveCount(1)
  })

  test('a person without a DNCR flag shows "Consent given"', async ({ page }) => {
    await open(page, 'cxmgr', '/customers/p-001')
    await expect(page.getByRole('region', { name: 'Consent' }).getByText('Consent given')).toBeVisible()
  })

  test('the Internal Audit and Marketing Lead sees the reference and none of the mobile or the e-mail', async ({ page }) => {
    await open(page, 'auditmkt', '/customers/p-005')
    await expect(page.getByRole('heading', { level: 1, name: 'P-005' })).toBeVisible()
    await expect(page.locator('main')).not.toContainText('Khaled')
    await expect(page.locator('main')).not.toContainText('+971')
    await expect(page.locator('main')).not.toContainText('@example')
  })

  test('the consent row speaks Arabic', async ({ page }) => {
    await open(page, 'cxmgr', '/customers/p-005', 'ar')
    await expect(page.getByRole('region', { name: 'الموافقة' }).getByText('DNCR · لا مكالمات ولا استبيانات بالهاتف')).toBeVisible()
  })
})

test.describe('Close the loop: calling rules (F27, F07)', () => {
  test('says the hours, the attempts and the WhatsApp after the last, with the hours note and no [Proposed] badge', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    const rules = page.getByTestId('calling-rules')
    await expect(rules).toContainText('Calls only between 09:00 and 18:00 UAE time, up to 3 attempts, the next one the following working day.')
    await expect(rules).toContainText('After the last attempt a WhatsApp message goes out')
    await expect(rules).toContainText('Legal to confirm the hours')
    await expect(rules).not.toContainText('[Proposed]')
    await expect(page.getByRole('region', { name: 'Next step' })).toContainText('A person calls each unhappy customer')
    await expect(page.getByRole('region', { name: 'Next step' }).locator('[aria-current="step"]')).toContainText('5 Check')
  })

  test('"No answer" counts an attempt, shows the next attempt and tells the person', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    const row = await rowWith(page, 'Not called yet')
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'No answer' }).click()
    await expect(page.getByText(/No answer\. Next attempt .* within calling hours\./)).toBeVisible()
    await expect(page.locator('main tbody').getByText(/attempt 2 of [23] · next/).first()).toBeVisible()
  })

  test('after the last attempt the row is "Needs a human" and a WhatsApp goes out', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    const row = await rowWith(page, 'attempt 3 of 3')
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'No answer' }).click()
    await expect(page.getByText('No answer after 3 attempts: WhatsApp sent, flagged "needs a human".')).toBeVisible()
    await expect(page.locator('main tbody tr', { hasText: 'Needs a human' }).first()).toBeVisible()
  })

  test('an AI campaign row hands over to a person after 2 no-answers (decided 18 Nov), not 3', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    const row = await rowWith(page, 'attempt 2 of 2')
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'No answer' }).click()
    await expect(page.getByText('No answer 2 times: the campaign hands this call to a person, flagged "needs a human".')).toBeVisible()
    await expect(page.locator('main tbody tr', { hasText: 'Handed over by the AI campaign' }).first()).toBeVisible()
  })

  test('a row opened from the inbox (?item=) is shown first, with its actions', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop?item=dcl-3')
    const focus = page.getByRole('region', { name: 'From your inbox' })
    await expect(focus.getByRole('button', { name: 'Call' })).toBeVisible({ timeout: 15_000 })
    await focus.getByRole('button', { name: 'Close this row' }).click()
    await expect(focus).toBeHidden()
  })

  test('the interview dialog opens from "Call" and records the interview', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    await expect(rowsOf(page).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Call', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Detractor interview — four questions')).toBeVisible()
    await dialog.getByLabel('1. What happened?').fill('Nobody called back')
    await dialog.getByLabel('2. What did you expect?').fill('A call within a day')
    await dialog.getByLabel('3. What would have made it right?').fill('A named owner')
    await dialog.getByRole('button', { name: 'Save interview' }).click()
    await expect(page.getByText('Interview saved')).toBeVisible()
  })

  test('the calling rules speak Arabic', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop', 'ar')
    await expect(page.getByTestId('calling-rules')).toContainText('المكالمات فقط بين 09:00 و18:00 بتوقيت الإمارات')
    await expect(page.getByTestId('calling-rules')).toContainText('القانونية تؤكد الساعات')
  })
})

test.describe('Overview and Surveys (F07, F18, F25, F30)', () => {
  test('the Overview carries the next-step box on step 6 with the Monthly pack button', async ({ page }) => {
    await open(page, 'cxmgr', '/overview')
    const next = page.getByRole('region', { name: 'Next step' })
    await expect(next.locator('[aria-current="step"]')).toContainText('6 Report')
    await expect(next).toContainText('Agent 9 writes the Monthly CX pack from these same numbers')
    await next.getByRole('link', { name: 'Monthly pack' }).click()
    await expect(page).toHaveURL(/\/settings\/monthly-pack$/)
  })

  test('the reputation card has "Work the mentions", which opens the Public mentions list', async ({ page }) => {
    await open(page, 'cxmgr', '/overview')
    await page.getByRole('link', { name: 'Work the mentions' }).click()
    await expect(page).toHaveURL(/\/settings\/public-mentions$/)
  })

  test('Surveys and triggers lives under Settings with one page heading, and /surveys redirects there', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/surveys')
    await expect(page).toHaveURL(/\/settings\/surveys$/)
    await expectPageReady(page)
    await expect(page.locator('main h1')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 2, name: 'Surveys and triggers' })).toBeVisible()
  })

  test('skipped surveys state the six reasons, which add up to the total', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/surveys')
    const card = page.getByRole('heading', { name: 'Skipped, by reason' }).locator('..')
    await expect(card).toBeVisible({ timeout: 15_000 })
    for (const reason of ['Inside a cap', 'Not identified', 'Opted out', 'DNCR', 'No consent', 'Duplicate']) await expect(card.getByText(reason, { exact: true })).toBeVisible()
    await expect(page.getByText('3,158', { exact: true })).toBeVisible()
  })

  test('Executive and the environment manager can open Surveys and triggers', async ({ browser }) => {
    for (const role of ['exec', 'envmgmt'] as const) {
      const page = await browser.newPage()
      await open(page, role, '/settings/surveys')
      await expect(page.getByRole('heading', { level: 2, name: 'Surveys and triggers' })).toBeVisible()
      await page.close()
    }
  })
})

test.describe('Data feeds and CRM mapping (F13, F15)', () => {
  test('feeds: three CRM environments as separate feeds plus the shared sources, one late', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/feeds')
    await expect(rowsOf(page)).toHaveCount(8, { timeout: 15_000 })
    for (const name of ['CRM · Abu Dhabi', 'CRM · Dubai', 'CRM · PSI Assets (rental)']) await expect(page.getByRole('cell', { name })).toBeVisible()
    await expect(page.getByText('shared', { exact: true })).toHaveCount(5)
    await expect(page.locator('main tbody tr', { hasText: 'CRM · PSI Assets (rental)' })).toContainText('Late')
    await expect(page.locator('main tbody tr', { hasText: 'CRM · PSI Assets (rental)' })).toContainText('Yesterday')
    await expect(page.getByText('1 feed late or missing').first()).toBeVisible()
  })

  test('mapping: the CX manager changes a value and sees the confirmation; every row is [Proposed]', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/crm-mapping')
    await expect(rowsOf(page)).toHaveCount(13, { timeout: 15_000 })
    await expect(page.locator('main tbody').getByText('[Proposed]')).toHaveCount(13)
    const select = page.getByRole('combobox', { name: /^Youngsters/ })
    await select.click()
    await page.getByRole('option', { name: 'Branch / walk-in' }).click()
    await expect(page.getByText('Mapping saved (prototype).')).toBeVisible()
    await expect(select).toHaveText(/Branch \/ walk-in/)
  })

  test('mapping: three tabs, and an unmapped value is ignored and queued for review', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/crm-mapping')
    await expect(rowsOf(page)).toHaveCount(13, { timeout: 15_000 })
    await page.getByRole('tab', { name: /Stages/ }).click()
    await expect(rowsOf(page)).toHaveCount(14)
    await page.getByRole('tab', { name: /Activities/ }).click()
    await expect(rowsOf(page)).toHaveCount(17)
    await expect(page.locator('main tbody tr', { hasText: 'Automatic' })).toContainText('Ignored · queued for review')
  })

  test('mapping: the CX team only reads it', async ({ page }) => {
    await open(page, 'cxteam', '/settings/crm-mapping')
    await expect(rowsOf(page)).toHaveCount(13, { timeout: 15_000 })
    await expect(page.locator('main tbody').getByRole('combobox')).toHaveCount(0)
    await expect(page.getByText(/View only/)).toBeVisible()
  })
})

test.describe('Survey questions (F23)', () => {
  test('a product selector, the question sets, and the customer-view preview in both languages', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/survey-questions')
    await expect(page.getByRole('list', { name: 'Question sets' }).getByRole('listitem')).toHaveCount(4, { timeout: 15_000 })
    const preview = page.getByRole('figure', { name: 'Preview of the survey on a phone' })
    await expect(preview).toContainText('Hello, this is PSI. One minute of your time:')
    await page.getByRole('button', { name: 'العربية', exact: true }).click()
    await expect(preview).toHaveAttribute('dir', 'rtl')
    await expect(preview).toContainText('مرحباً، معك PSI. دقيقة من وقتك:')
    await page.getByRole('list', { name: 'Question sets' }).getByRole('button', { name: /What stopped you\?/ }).click()
    await expect(preview).toContainText('لاحظنا أنك لم تكمل')
  })

  test('sets of the products not launched are [Proposed]; PSI Wallet has an empty state', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/survey-questions')
    await expect(page.getByRole('list', { name: 'Question sets' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('list', { name: 'Question sets' }).getByText('[Proposed]')).toHaveCount(0)
    await page.getByRole('tab', { name: 'PSI Club' }).click()
    await expect(page.getByRole('list', { name: 'Question sets' }).getByText('[Proposed]')).toBeVisible()
    await page.getByRole('tab', { name: 'PSI Wallet' }).click()
    await expect(page.getByText('No question set for this product yet.')).toBeVisible()
  })

  test('the product tabs move with the arrow keys', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/survey-questions')
    const tabs = page.getByRole('tab')
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 })
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Public mentions (F30)', () => {
  test('Marketing marks a mention replied; the counts and the reply status follow', async ({ page }) => {
    await open(page, 'marketing', '/settings/public-mentions')
    await expect(rowsOf(page)).toHaveCount(16, { timeout: 15_000 })
    const buttons = page.getByRole('button', { name: /^Mark replied/ })
    const before = await buttons.count()
    expect(before).toBeGreaterThan(0)
    await buttons.first().click()
    await expect(page.getByText('Marked replied; the index updates.')).toBeVisible()
    await expect(buttons).toHaveCount(before - 1)
  })

  test('the CX team sees what is over 48 hours, with the owner as Marketing and no link to a person', async ({ page }) => {
    await open(page, 'cxteam', '/settings/public-mentions')
    await expect(rowsOf(page)).toHaveCount(16, { timeout: 15_000 })
    await expect(page.getByText('Reply clock missed: signal raised for the CX team')).toBeVisible()
    await expect(page.getByText('Marketing · channel owner').first()).toBeVisible()
    await expect(page.locator('main tbody a')).toHaveCount(0)
    await page.getByRole('button', { name: /^Over 48 h/ }).click()
    for (const text of await rowsOf(page).allInnerTexts()) expect(text).toContain('No reply, over 48 h')
  })

  test('the Internal Audit and Marketing Lead reads, without the "Mark replied" button', async ({ page }) => {
    await open(page, 'auditmkt', '/settings/public-mentions')
    await expect(rowsOf(page)).toHaveCount(16, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /^Mark replied/ })).toHaveCount(0)
  })
})

test.describe('Weekly sample (F31): the list behind "See all as a list"', () => {
  /** The card flow is the default (v42.2); the list is one button away. */
  async function openList(page: Page, role: RoleId) {
    await open(page, role, '/settings/weekly-sample')
    await page.getByRole('button', { name: 'See all as a list' }).click({ timeout: 15_000 })
    await expect(page.getByText('Due (every Thursday)')).toBeVisible()
  }

  test('the reader\'s 26 rows, the four tiles and Thursday; judging one wrong adds a test and lowers the pass rate', async ({ page }) => {
    await openList(page, 'cxteam')
    await expect(page.getByText('0 / 26')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(26)
    await expect(page.getByText(/^Thu\b/)).toBeVisible()
    await page.getByRole('button', { name: '✗ Wrong' }).first().click()
    await expect(page.getByText('1 / 26')).toBeVisible()
    await expect(page.getByText('Wrong → new test')).toBeVisible()
    await expect(page.getByText(/New supervisor tests \(1\)/)).toBeVisible()
    await expect(page.locator('main').getByText(/\d+% → \d+%/)).toBeVisible()
  })

  test('the Internal Audit and Marketing Lead judges its 35 rows and sees no customer names', async ({ page }) => {
    await openList(page, 'auditmkt')
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(35, { timeout: 15_000 })
    for (const name of ['Sara Khoury', 'Rana Farouk', 'Zaid Saleh', 'Khaled Hamad']) await expect(page.locator('main')).not.toContainText(name)
    await page.getByRole('button', { name: '✓ Right' }).first().click()
    await expect(page.getByText('1 / 35')).toBeVisible()
  })

  test('the CX team sees the names; the Executive can only read, as a list', async ({ browser }) => {
    const cx = await browser.newPage()
    await openList(cx, 'cxteam')
    await expect(cx.getByText(/· Sara Khoury$/).first()).toBeVisible({ timeout: 15_000 })
    await cx.close()
    const exec = await browser.newPage()
    await open(exec, 'exec', '/settings/weekly-sample')
    await expect(exec.getByText('0 / 26')).toBeVisible({ timeout: 15_000 })
    await expect(exec.getByRole('button', { name: '✓ Right' })).toHaveCount(0)
    await expect(exec.getByRole('button', { name: 'See all as a list' })).toHaveCount(0)
    await expect(exec.getByText(/You can read the sample/)).toBeVisible()
    await exec.close()
  })

  test('a CX row can be judged from itself: what it saw, what it produced, the supervisor, and a "How to judge" card (v41.1 F29)', async ({ page }) => {
    await openList(page, 'cxteam')
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(26, { timeout: 15_000 })
    const table = page.locator('main table').last()
    await expect(table.getByRole('columnheader')).toHaveText(['#', 'Agent and kind', 'What it saw', 'What it produced', 'Supervisor', 'Verdict'])
    await expect(page.getByText('How to judge', { exact: true })).toBeVisible()
    await expect(page.getByText(/you are judging the agent/)).toBeVisible()
    // a fix: the pattern, the signals behind it and the recovery figure; its output names the owner title
    const fix = table.locator('tbody tr', { hasText: 'CA-201' })
    await expect(fix).toContainText(/signals? in \d+ days/)
    await expect(fix).toContainText(/recovered in \d+, \d+ of \d+ is \d+%/)
    await expect(fix).toContainText(' → ')
    await expect(fix).toContainText('Schema, recompute, access, evidence, bilingual, risk gate: 6 of 6 passed')
    // an interview brief and a journey reading
    await expect(table.locator('tbody tr', { hasText: 'Interview brief' }).first()).toContainText(/(NPS|CSAT|CES) \d+ · \d+ events? on the timeline · \d+ problems? found/)
    await expect(table.locator('tbody tr', { hasText: 'Journey reading' }).first()).toContainText(/\d+ events? · \d+ problems? · last contact/)
  })

  test('an audit row can be judged from itself too: a classification quotes the source, the date and the text; routing shows the matrix line (v42.1)', async ({ page }) => {
    await openList(page, 'auditmkt')
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(35, { timeout: 15_000 })
    const table = page.locator('main table').last()
    const sig = table.locator('tbody tr', { hasText: 'Classification' }).first()
    await expect(sig).toContainText(/\d{4}-\d{2}-\d{2} · ".+"/)
    await expect(sig).toContainText(/ · (critical|medium|low) severity/)
    const routing = table.locator('tbody tr', { hasText: 'Routing by the matrix' }).first()
    await expect(routing).toContainText('matrix says: Legal (respond ½ h · resolve 4.5 h · VIP · clocks halved)')
    await expect(routing).toContainText('Address repeat contact in PSI Assets team → Legal · kind check')
    await expect(routing).toContainText('Supervisor: schema and recompute only')
  })

  test('Open takes a CX role to the record: a fix, a call, a customer', async ({ page }) => {
    await openList(page, 'cxmgr')
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(26, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(26)
    await page.getByRole('button', { name: 'Open CA-201' }).click()
    await expect(page).toHaveURL(/\/actions\/corrective\?fix=CA-201/)
    await expectPageReady(page)
    await page.goBack()
    await page.getByRole('button', { name: 'See all as a list' }).click({ timeout: 15_000 })
    const table = page.locator('main table').last()
    await table.locator('tbody tr', { hasText: 'Interview brief' }).first().getByRole('button', { name: /^Open dcl-/ }).click()
    await expect(page).toHaveURL(/\/close-the-loop\?item=dcl-/)
    await page.goBack()
    await page.getByRole('button', { name: 'See all as a list' }).click({ timeout: 15_000 })
    await page.locator('main table').last().locator('tbody tr', { hasText: 'Journey reading' }).first().getByRole('button', { name: /^Open P-/ }).click()
    await expect(page).toHaveURL(/\/customers\/p-\d{3}/)
  })

  test('the Internal Audit and Marketing Lead reads ids and titles: no Open button, no clickable id, no names, a note says why', async ({ page }) => {
    await openList(page, 'auditmkt')
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(35, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(0)
    await expect(page.locator('main table').last().locator('[data-slot="trace-id"]').first()).toBeVisible()
    await expect(page.locator('main table').last().locator('button[data-slot="trace-id"]')).toHaveCount(0)
    await expect(page.getByText(/The record behind a row opens for the CX manager and the CX team/)).toBeVisible()
    for (const name of ['Sara Khoury', 'Rana Farouk', 'Zaid Saleh', 'Khaled Hamad']) await expect(page.locator('main')).not.toContainText(name)
  })

  test('the filter shows only what is still to be read', async ({ page }) => {
    await openList(page, 'cxmgr')
    await expect(page.getByText('0 / 26')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: '✓ Right' }).first().click()
    await expect(page.getByText('1 / 26')).toBeVisible()
    await page.getByRole('button', { name: /^To read/ }).click()
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(25)
  })
})

test.describe('Mobile: tables scroll sideways and the page does not (F34)', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  const PAGES = [
    '/customers',
    '/customers/p-005',
    '/runaway',
    '/personas',
    '/close-the-loop',
    '/overview',
    '/settings/surveys',
    '/settings/feeds',
    '/settings/crm-mapping',
    '/settings/survey-questions',
    '/settings/public-mentions',
    '/settings/weekly-sample',
  ]
  for (const lang of ['en', 'ar'] as const) {
    for (const path of PAGES) {
      test(`${path} at 375 px (${lang})`, async ({ page }) => {
        await open(page, 'cxmgr', path, lang)
        await page.waitForTimeout(600)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, 'the whole page must not scroll sideways').toBeLessThanOrEqual(1)
        const containers = await page.locator('[data-slot="table-container"]').evaluateAll((els) => els.map((e) => getComputedStyle(e).overflowX))
        for (const o of containers) expect(o).toBe('auto')
        // A table wider than the screen is reachable from the keyboard (axe: scrollable-region-focusable).
        const wide = await page.locator('[data-slot="table-container"]').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.getAttribute('tabindex')))
        for (const tab of wide) expect(tab).toBe('0')
      })
    }
  }
})

test.describe('Accessibility of the rebuilt pages', () => {
  test.use({ reducedMotion: 'reduce' })
  const CASES: { name: string; role: RoleId; path: string; lang: 'en' | 'ar'; act?: (page: Page) => Promise<void> }[] = [
    { name: 'a person (DNCR)', role: 'cxmgr', path: '/customers/p-005', lang: 'en' },
    { name: 'a person (DNCR), Arabic', role: 'cxmgr', path: '/customers/p-005', lang: 'ar' },
    { name: 'a person as the Internal Audit and Marketing Lead', role: 'auditmkt', path: '/customers/p-005', lang: 'en' },
    { name: 'the customers list as the Internal Audit and Marketing Lead', role: 'auditmkt', path: '/customers', lang: 'en' },
    { name: 'the customers list, Arabic', role: 'cxmgr', path: '/customers', lang: 'ar' },
    { name: 'Close the loop with an inbox row', role: 'cxmgr', path: '/close-the-loop?item=dcl-3', lang: 'en' },
    { name: 'Public mentions as Marketing', role: 'marketing', path: '/settings/public-mentions', lang: 'en' },
    { name: 'Weekly sample as the Internal Audit and Marketing Lead', role: 'auditmkt', path: '/settings/weekly-sample', lang: 'ar' },
    { name: 'Weekly sample as the CX team (Open buttons)', role: 'cxteam', path: '/settings/weekly-sample', lang: 'en' },
    { name: 'Survey questions, Arabic preview', role: 'cxmgr', path: '/settings/survey-questions', lang: 'en', act: (p) => p.getByRole('button', { name: 'العربية', exact: true }).click() },
    { name: 'CRM mapping, Activities tab', role: 'cxmgr', path: '/settings/crm-mapping', lang: 'ar', act: (p) => p.getByRole('tab', { name: /الأنشطة/ }).click() },
  ]
  for (const c of CASES) {
    test(c.name, async ({ page }) => {
      const errors = collectErrors(page)
      await open(page, c.role, c.path, c.lang)
      await page.waitForTimeout(800)
      if (c.act) await c.act(page)
      await waitForAnimations(page)
      const violations = await blockingViolations(page)
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
      expect(errors, errors.join(' | ')).toEqual([])
    })
  }
})
