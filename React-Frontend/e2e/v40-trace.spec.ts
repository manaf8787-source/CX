import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * Workstream B (docs/V40_WS_B.md): the trace, the signal dialog, the fix in full (next step, matrix line, audit trail, Trace card),
 * the escalation matrix, the investigation result, the Rules pointer and What if. Client-side navigation keeps the in-memory
 * sample data; a full page load resets it.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
async function blockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

async function open(page: Page, route: string, role: RoleId = 'cxmgr', lang: 'en' | 'ar' = 'en') {
  await signInAs(page, role, lang)
  await page.goto(route)
  await expectPageReady(page)
}

/** The id of the first signal row on the Signals page (a real SG id; the sample's first problem event is a public mention, so `SG-1` does not exist). */
async function firstSignalId(page: Page) {
  const sg = signalsTable(page).getByRole('button', { name: /^Open SG-\d+$/ }).first()
  await expect(sg).toBeVisible({ timeout: 15_000 })
  return (await sg.textContent())!.trim()
}

const signalsTable = (page: Page) => page.getByRole('columnheader', { name: 'Date' }).locator('xpath=ancestor::table')
const fixCard = (page: Page, ca: string) => page.locator(`li[data-fix="${ca}"]`)
/** The fix cards fold their details (only the first and the ?fix= one are open): open one before reading its matrix line, audit trail or Trace card. */
async function openFix(card: Locator) {
  const toggle = card.getByRole('button', { name: /^(Details|التفاصيل)/ })
  await expect(toggle).toBeVisible({ timeout: 15_000 })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
}

test.describe('the Trace card walks the chain both ways', () => {
  test('a signal opens its detail dialog from the Signals page and its Trace card lists the chain', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, '/actions/signals')
    const sg = signalsTable(page).getByRole('button', { name: /^Open SG-\d+$/ }).first()
    await expect(sg).toBeVisible({ timeout: 15_000 })
    const id = (await sg.textContent())!.trim()
    await sg.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`sg=${id}`))
    await expect(dialog.getByRole('heading', { level: 2 })).toContainText(`${id} · `)
    await expect(dialog).toContainText('Classified by Agent 2 as')
    await expect(dialog).toContainText('Counted by Agent 3; it is worked only through the pattern it belongs to, never alone.')
    const trace = dialog.getByTestId('trace-card')
    await expect(trace.getByRole('heading', { name: 'Trace' })).toBeVisible()
    for (const col of ['1 Event', '2 Signal', '3 Pattern', '4 Fix', '5 Check', '6 Report']) await expect(trace).toContainText(col)
    // the signal's own column is the highlighted one
    await expect(trace.locator('[aria-current="true"]')).toContainText('2 Signal')
    expect(errors).toEqual([])
  })

  test('forward: signal, pattern, fix. The pattern id opens the Signals page on that pattern, the fix id opens the fix', async ({ page }) => {
    await open(page, '/actions/corrective')
    // CA-201 (a fix on a pattern): its Trace card lists events, signals, the pattern and itself
    const trace = fixCard(page, 'CA-201').getByTestId('trace-card')
    await expect(trace).toBeVisible({ timeout: 15_000 })
    await expect(trace.locator('[aria-current="true"]')).toContainText('4 Fix')
    // a signal in the card opens the dialog, whose own card names the same pattern and fix
    await trace.getByRole('listitem').nth(1).getByRole('button').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const dTrace = dialog.getByTestId('trace-card')
    const pt = dTrace.getByRole('listitem').nth(2).getByRole('button')
    await expect(pt).toContainText(/PT-\d{3}/)
    const ptId = (await pt.textContent())!.match(/PT-\d{3}/)![0]
    await pt.click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/actions\/signals\?pt=.*#patterns/)
    await expectPageReady(page)
    const card = page.locator(`li[data-pattern="${ptId}"]`)
    await expect(card).toHaveAttribute('data-selected', 'true', { timeout: 15_000 })
    await expect(card.getByRole('heading', { level: 3 })).toContainText(ptId)
    // from the pattern back to the fix
    await card.getByRole('link', { name: /Address|Act on/ }).click()
    await expect(page).toHaveURL(/\/actions\/corrective\?fix=CA-2\d\d/)
    await expect(page.locator('li[data-fix][data-selected="true"]')).toHaveCount(1, { timeout: 15_000 })
  })

  test('backward: from a fix to an event: the person’s timeline opens on that event, highlighted', async ({ page }) => {
    await open(page, '/actions/corrective')
    const trace = fixCard(page, 'CA-201').getByTestId('trace-card')
    const ev = trace.getByRole('listitem').nth(0).getByRole('button').first()
    await expect(ev).toBeVisible({ timeout: 15_000 })
    const evId = (await ev.textContent())!.match(/EV-\d+/)![0]
    await ev.click()
    await expect(page).toHaveURL(new RegExp(`/customers/p-\\d+\\?ev=${evId}`))
    const row = page.locator(`li[data-ev="${evId}"]`)
    await expect(row).toHaveAttribute('data-highlighted', 'true', { timeout: 15_000 })
    await expect(row.locator('[data-slot="trace-id"]').first()).toContainText(evId)
  })

  test('a timeline row carries its EV tag and an SG button for each signal it produced', async ({ page }) => {
    await open(page, '/actions/corrective')
    const ev = fixCard(page, 'CA-201').getByTestId('trace-card').getByRole('listitem').nth(0).getByRole('button').first()
    await expect(ev).toBeVisible({ timeout: 15_000 })
    const evId = (await ev.textContent())!.match(/EV-\d+/)![0]
    await ev.click()
    const row = page.locator(`li[data-ev="${evId}"]`)
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row).toContainText(evId)
    // the events in a fix's Trace card are the ones that produced its pattern's signals: each has an SG button that opens the dialog on this page
    const sgButtons = row.getByRole('button', { name: /^Open (SG|PUB)-\d+$/ })
    await expect(sgButtons.first()).toBeVisible()
    await sgButtons.first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/sg=SG-\d+/)
    await expect(page).toHaveURL(/\/customers\/p-\d+/)
  })

  test('a public mention names no person and has no event to open', async ({ page }) => {
    await open(page, '/actions/signals?sg=PUB-351')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await expect(dialog.getByRole('heading', { level: 2 })).toContainText('PUB-351')
    const events = dialog.getByTestId('trace-card').getByRole('listitem').nth(0)
    await expect(events).toContainText('public mention, no person identified')
    await expect(events.getByRole('button')).toHaveCount(0)
    await expect(dialog.locator('a[href*="/customers"]')).toHaveCount(0)
  })
})

test.describe('the signal dialog is a real dialog', () => {
  test('keyboard: Enter on the SG button opens it, focus is inside, Escape closes it and focus returns to the button', async ({ page }) => {
    await open(page, '/actions/signals')
    const sg = signalsTable(page).getByRole('button', { name: /^Open SG-\d+$/ }).first()
    await expect(sg).toBeVisible({ timeout: 15_000 })
    await sg.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    // the focus trap: Tab many times and focus never leaves the dialog
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).not.toHaveURL(/sg=/)
    await expect(sg).toBeFocused()
  })

  test('the X button and the backdrop close it', async ({ page }) => {
    await open(page, '/actions/signals')
    const id = await firstSignalId(page)
    await page.goto(`/actions/signals?sg=${id}`)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await expect(dialog.getByRole('heading', { level: 2 })).toContainText(`${id} · `)
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    await page.goto(`/actions/signals?sg=${id}`)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 })
    await page.mouse.click(5, 5)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('no new axe violations with the dialog open, in English and in Arabic (dark)', async ({ page }) => {
    await open(page, '/actions/signals')
    const id = await firstSignalId(page)
    for (const [lang, theme] of [['en', 'light'], ['ar', 'dark']] as const) {
      const p = await page.context().newPage()
      await p.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
      await open(p, `/actions/signals?sg=${id}`, 'cxmgr', lang)
      const dialog = p.getByRole('dialog')
      await expect(dialog.getByTestId('trace-card')).toBeVisible({ timeout: 15_000 })
      await expect(dialog.getByRole('heading', { level: 2 })).toContainText(`${id} · `)
      await waitForAnimations(p)
      expect(await blockingViolations(p), `${lang} ${theme}`).toEqual([])
      if (lang === 'ar') await expect(dialog).toHaveCSS('direction', 'rtl')
    }
  })

  test.use({ reducedMotion: 'reduce' })
})

test.describe('the fix in full', () => {
  test.use({ reducedMotion: 'reduce' })

  test('every fix has its next-step box above it, the matrix line, the audit trail and the Trace card', async ({ page }) => {
    await open(page, '/actions/corrective')
    await expect(fixCard(page, 'CA-201')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Expand all' }).click()
    const cards = page.locator('li[data-fix]')
    const n = await cards.count()
    expect(n).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < n; i++) {
      const c = cards.nth(i)
      await expect(c.getByRole('region', { name: 'Next step' }).first()).toBeVisible()
      await expect(c.getByTestId('matrix-line')).toContainText('From the matrix')
      await expect(c.getByTestId('audit-trail').getByRole('heading', { name: 'Audit trail' })).toBeVisible()
      await expect(c.getByTestId('trace-card')).toBeVisible()
    }
  })

  test('the Actions page has its own next-step box above the tabs, by tab', async ({ page }) => {
    await open(page, '/actions/signals')
    const box = page.getByRole('region', { name: 'Next step' }).first()
    await expect(box).toContainText('Signals that cross the line become a pattern; a pattern gets one suggested fix')
    await expect(box.locator('[aria-current="step"]')).toContainText('2 Signal')
    await page.getByRole('link', { name: 'Investigations' }).click()
    await expect(box).toContainText('Interviews or a shopper check come back as evidence; only then is a fix proposed')
    await expect(box.locator('[aria-current="step"]')).toContainText('3 Pattern')
    await page.getByRole('link', { name: 'Corrective actions' }).click()
    await expect(box).toContainText('Open any fix to see who must say yes and by when')
    await expect(box.locator('[aria-current="step"]')).toContainText('4 Fix')
  })

  test('approving a proposed fix writes the audit line, sets the due date from the matrix and moves the next step', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, '/actions/corrective')
    const card = fixCard(page, 'CA-202')
    await expect(card).toContainText('within 5 working days', { timeout: 15_000 })
    await openFix(card)
    await expect(card).toContainText('if approved today: matrix Resolve 45 h, in working hours')
    await card.getByRole('button', { name: 'Decide' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Save decision' }).click()
    await expect(card).toContainText('The owner does the fix and marks it done')
    await expect(card).toContainText('from the matrix Resolve (h), in working hours from approval')
    const audit = card.getByTestId('audit-trail')
    const firstRow = audit.getByRole('row').nth(1)
    await expect(firstRow).toContainText('Approved')
    await expect(firstRow).toContainText('CX manager')
    await expect(audit.getByRole('row').last()).toContainText('System')
    // then the owner starts and finishes it: each change is a line
    await card.getByRole('button', { name: 'Start' }).click()
    await expect(audit.getByRole('row').nth(1)).toContainText('Status set to In progress')
    await card.getByRole('button', { name: 'Done, start the 60-day check' }).click()
    await expect(audit.getByRole('row').nth(1)).toContainText('Marked done; the 60-day check is scheduled')
    await expect(card).toContainText('Agent 6 counts the same signals again')
    await expect(card.getByTestId('trace-card').getByRole('listitem').nth(4)).toContainText('VR-202')
    expect(errors).toEqual([])
  })

  test('How the AI found this carries the agent chips, in Arabic too', async ({ page }) => {
    await open(page, '/actions/corrective', 'cxmgr', 'ar')
    await openFix(fixCard(page, 'CA-202'))
    const chips = fixCard(page, 'CA-202').getByTestId('found-agents')
    await expect(chips).toContainText('الوكيل 3', { timeout: 15_000 })
    await expect(chips).toContainText('الوكيل 5')
    await expect(chips).toContainText('سوبرفايزر CX: اجتاز 6 فحوصات')
    await expect(chips.getByRole('link', { name: 'من يفعل ماذا' })).toHaveAttribute('href', '/intelligent-cx-team')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('?fix= (the inbox, a Trace id) scrolls to the fix, highlights it and puts focus on its title', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-204')
    const card = fixCard(page, 'CA-204')
    await expect(card).toHaveAttribute('data-selected', 'true', { timeout: 15_000 })
    await expect(card.getByRole('heading', { level: 2 })).toBeFocused()
    await expect(card).toBeInViewport()
  })

  test('the hand-offs are folded and collapsed under the fixes tab and open with the keyboard', async ({ page }) => {
    await open(page, '/actions/corrective')
    const trigger = page.getByTestId('handoffs-block').getByRole('button', { name: /One-customer corrections handed to other systems/ })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false', { timeout: 15_000 })
    await expect(trigger).toContainText('(hand-offs: recorded and checked, no clock)')
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('heading', { name: 'Hand-off rules by signal type' })).toBeVisible()
  })

  test('role gating: L&D sees only the training-gap fix and no action; a team lead has no Matrix button', async ({ browser }) => {
    const ld = await browser.newPage()
    await open(ld, '/actions/corrective', 'ld')
    await expect(ld.locator('li[data-fix]')).toHaveCount(1, { timeout: 15_000 })
    await expect(fixCard(ld, 'CA-204')).toBeVisible()
    await expect(ld.getByRole('button', { name: /Decide|Start|Done, start/ })).toHaveCount(0)
    await ld.close()
    const lead = await browser.newPage()
    await open(lead, '/actions/corrective', 'teamlead')
    await openFix(fixCard(lead, 'CA-202'))
    await expect(fixCard(lead, 'CA-202').getByTestId('matrix-line')).toBeVisible({ timeout: 15_000 })
    await expect(lead.getByRole('link', { name: 'Matrix' })).toHaveCount(0)
    await lead.close()
  })

  test('no new axe violations on the fixes tab with one fix selected and the hand-offs open', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-203')
    await expect(fixCard(page, 'CA-203').getByTestId('trace-card')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('handoffs-block').getByRole('button', { name: /One-customer corrections/ }).click()
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })
})

test.describe('the escalation matrix', () => {
  test.use({ reducedMotion: 'reduce' })

  test('one table per product, ten rows, six columns, every unedited cell [Proposed]', async ({ page }) => {
    await open(page, '/settings/escalation-matrix')
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(11, { timeout: 15_000 })
    for (const c of ['Kind', 'First receiver', 'Informed', 'Backup', 'Respond (h)', 'Resolve (h)']) await expect(table.getByRole('columnheader', { name: c })).toBeVisible()
    await expect(table.getByText('[Proposed]')).toHaveCount(50)
    const group = page.getByRole('group', { name: 'Product' })
    await expect(group.getByRole('button')).toHaveCount(6)
    await expect(group.getByRole('button', { name: 'PSI Real Estate' })).toHaveAttribute('aria-pressed', 'true')
    await group.getByRole('button', { name: 'After-Sales' }).click()
    await expect(group.getByRole('button', { name: 'After-Sales' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveURL(/product=af/)
  })

  test('the CX manager edits a cell: it saves, loses its [Proposed], and the fix line of that product reads it', async ({ page }) => {
    await open(page, '/settings/escalation-matrix')
    const table = page.getByRole('table')
    await expect(table.getByText('[Proposed]')).toHaveCount(50, { timeout: 15_000 })
    const receiver = page.getByRole('textbox', { name: 'Marketing · First receiver' })
    await receiver.fill('Head of Digital Marketing')
    await receiver.press('Enter')
    await expect(table.getByText('[Proposed]')).toHaveCount(49)
    await expect(receiver).toHaveValue('Head of Digital Marketing')
    // client-side navigation keeps the store: CA-202 is a marketing fix on Real Estate
    await page.getByRole('link', { name: '2–4 · Signals and fixes' }).click()
    await page.getByRole('link', { name: 'Corrective actions' }).click()
    await expectPageReady(page)
    await openFix(fixCard(page, 'CA-202'))
    await expect(fixCard(page, 'CA-202').getByTestId('matrix-line')).toContainText('receiver Head of Digital Marketing', { timeout: 15_000 })
  })

  test('a clock cell takes working hours, and the fix’s due date preview follows it', async ({ page }) => {
    await open(page, '/settings/escalation-matrix')
    const resolve = page.getByRole('spinbutton', { name: 'Marketing · Resolve (h)' })
    await expect(resolve).toHaveValue('45', { timeout: 15_000 })
    await resolve.fill('18')
    await resolve.press('Enter')
    await expect(page.getByRole('table').getByText('[Proposed]')).toHaveCount(49)
    await page.getByRole('link', { name: '2–4 · Signals and fixes' }).click()
    await page.getByRole('link', { name: 'Corrective actions' }).click()
    await expect(fixCard(page, 'CA-202')).toContainText('if approved today: matrix Resolve 18 h, in working hours', { timeout: 15_000 })
  })

  test('the Matrix button on a fix opens that fix’s product', async ({ page }) => {
    await open(page, '/actions/corrective')
    await fixCard(page, 'CA-201').getByRole('link', { name: 'Matrix' }).click()
    await expect(page).toHaveURL(/\/settings\/escalation-matrix\?product=wl/)
    await expect(page.getByRole('button', { name: 'PSI Wallet' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('other roles read it: no inputs, a view-only note', async ({ page }) => {
    await open(page, '/settings/escalation-matrix', 'cxteam')
    await expect(page.getByRole('note')).toContainText('View only', { timeout: 15_000 })
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByRole('spinbutton')).toHaveCount(0)
    await expect(page.getByRole('table')).toContainText('Process owner (matrix)')
  })

  test('Arabic: the columns, the product names and the badges, right to left', async ({ page }) => {
    await open(page, '/settings/escalation-matrix', 'cxmgr', 'ar')
    await expect(page.getByRole('columnheader', { name: 'المستلم الأول' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table').getByText('[مقترح]')).toHaveCount(50)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('no new axe violations with editable cells (English and Arabic)', async ({ page }) => {
    await open(page, '/settings/escalation-matrix')
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
    const ar = await page.context().newPage()
    await open(ar, '/settings/escalation-matrix', 'cxmgr', 'ar')
    await expect(ar.getByRole('textbox').first()).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(ar)
    expect(await blockingViolations(ar)).toEqual([])
  })
})

test.describe('investigations close with a result', () => {
  test.use({ reducedMotion: 'reduce' })

  test('Record the result: it becomes evidence on the pattern and a fix is proposed for approval', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, '/actions/investigations')
    const inv = page.locator('li[data-inv="INV-1"]')
    await expect(inv).toBeVisible({ timeout: 15_000 })
    await inv.getByRole('button', { name: 'Record the result' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('What came back').fill('Interviews confirm the cause: the agent quoted a plan that is not on the approved sheet.')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Result recorded as evidence; a fix was proposed for approval.')).toBeVisible()
    await expect(inv.getByTestId('inv-result')).toContainText('the agent quoted a plan')
    const fixLink = inv.getByTestId('inv-proposed-fix').getByRole('link')
    await expect(fixLink).toContainText(/CA-2\d\d/)
    // the proposed fix: by Agent 5 from the investigation, one audit line by the system, evidence tag back to INV-1
    await fixLink.click()
    await expectPageReady(page)
    const card = page.locator('li[data-fix][data-selected="true"]')
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText('Proposed by Agent 5, from the investigation')
    await expect(card.getByRole('link', { name: /Evidence: INV-1/ })).toBeVisible()
    await expect(card.getByTestId('audit-trail').getByRole('row')).toHaveCount(2)
    await expect(card.getByTestId('audit-trail')).toContainText('System')
    // and the pattern card on Signals shows the green evidence line
    await page.getByRole('link', { name: 'Signals & patterns' }).click()
    await page.getByRole('button', { name: /Show all patterns/ }).click()
    await expect(page.getByTestId('pattern-evidence').filter({ hasText: 'the agent quoted a plan' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('pattern-evidence').filter({ hasText: 'the agent quoted a plan' })).toContainText(/Evidence from investigation · INV-1:/)
    expect(errors).toEqual([])
  })
})

test.describe('one place for every threshold', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the Signals page points to Rules as configuration, and What if recomputes when a threshold is edited there', async ({ page }) => {
    await open(page, '/actions/signals')
    await expect(page.getByText('One place for every threshold.')).toBeVisible({ timeout: 15_000 })
    const whatIf = page.getByRole('table').filter({ hasText: 'Same issue, times' })
    await expect(whatIf).toBeVisible()
    const current = whatIf.locator('li[data-current="true"]').first()
    await expect(current).toContainText(/^5 → \d+ patterns/)
    const before = Number((await current.textContent())!.match(/→ (\d+)/)![1])
    // the Open button goes to Settings, Rules as configuration
    await page.getByRole('link', { name: 'Open', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/rules$/)
    await expectPageReady(page)
    const input = page.getByLabel('Same-issue threshold')
    await input.fill('8')
    await page.getByRole('button', { name: 'Save' }).first().click()
    // back to Signals by client-side navigation: the patterns follow the rule
    await page.getByRole('link', { name: '2–4 · Signals and fixes' }).click()
    await page.getByRole('link', { name: 'Signals & patterns' }).click()
    const again = page.getByRole('table').filter({ hasText: 'Same issue, times' }).locator('li[data-current="true"]').first()
    await expect(again).toContainText(/^8 → \d+ patterns/, { timeout: 15_000 })
    const after = Number((await again.textContent())!.match(/→ (\d+)/)![1])
    expect(after).toBeLessThanOrEqual(before)
    await expect(page.getByText(`With today's thresholds there are ${after} patterns.`)).toBeVisible()
  })

  test('Rules: Decision 4 points to the matrix, the working week is a weekday picker, the call hours carry the Legal note', async ({ page }) => {
    await open(page, '/settings/rules')
    await expect(page.getByText('Decision 4 · The escalation matrix')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Cells pending')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Open the escalation matrix' })).toHaveAttribute('href', '/settings/escalation-matrix')
    const week = page.getByRole('group', { name: 'Working days per week (Monday to Friday)' })
    await expect(week.getByRole('checkbox')).toHaveCount(7)
    for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) await expect(week.getByRole('checkbox', { name: d })).toBeChecked()
    for (const d of ['Saturday', 'Sunday']) await expect(week.getByRole('checkbox', { name: d })).not.toBeChecked()
    await expect(page.getByText('Legal to confirm the hours')).toHaveCount(2)
    await expect(page.getByText('[Proposed]')).toHaveCount(0)
  })

  test('Rules in Arabic and no new axe violations', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('psicx.theme', 'dark'))
    await open(page, '/settings/rules', 'cxmgr', 'ar')
    await expect(page.getByText('القرار 4 · مصفوفة التصعيد')).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })
})
