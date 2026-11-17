import { expect, test } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs } from './helpers.ts'

test('an AI Insights suggestion becomes a proposed corrective action', async ({ page }) => {
  await signInAs(page, 'cxmgr')
  const errors = collectErrors(page)
  await page.goto('/actions/ai-insights')
  await expectPageReady(page)
  await page.getByRole('button', { name: 'Make it a proposed action' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Make it a proposed corrective action' })).toBeVisible()
  // Top management is refused as the receiver.
  await dialog.getByLabel('Receiver (title)').fill('Head of Sales')
  await dialog.getByRole('button', { name: 'Propose action' }).click()
  await expect(dialog.getByText('never top management')).toBeVisible()
  await dialog.getByLabel('Receiver (title)').fill('Environment manager')
  await dialog.getByRole('button', { name: 'Propose action' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Proposed — see Corrective actions').first()).toBeVisible()
  // Client-side navigation keeps the in-memory sample data.
  await page.getByRole('link', { name: 'Proposed — see Corrective actions' }).first().click()
  await expectPageReady(page)
  await expect(page.getByText('From AI Insights').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('only CX can propose from AI Insights', async ({ page }) => {
  await signInAs(page, 'envmgmt')
  await page.goto('/actions/ai-insights')
  await expectPageReady(page)
  await expect(page.getByRole('button', { name: 'Make it a proposed action' })).toHaveCount(0)
  await expect(page.getByText('CX creates the action.').first()).toBeVisible()
})

test('Signals shows the closest patterns first and the rest on request', async ({ page }) => {
  await signInAs(page, 'cxmgr')
  await page.goto('/actions/signals')
  await expectPageReady(page)
  const cards = page.locator('main section, main').getByRole('listitem').filter({ has: page.getByRole('progressbar') })
  await expect(cards).toHaveCount(4)
  await page.getByRole('button', { name: /Show all patterns \(\d+\)/ }).click()
  await expect.poll(async () => cards.count()).toBeGreaterThan(4)
  await expect(page.getByRole('heading', { name: 'Hand-off rules by signal type' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Lead asked not to be called' })).toBeVisible()
})

test('Close the loop shows the 60-day recovered rule', async ({ page }) => {
  await signInAs(page, 'cxmgr')
  await page.goto('/close-the-loop')
  await expectPageReady(page)
  await expect(page.getByText('Recovered within 60 days', { exact: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Recovered (60 days)' })).toBeVisible()
  await expect(page.getByText('Too early').first()).toBeVisible()
})

test('Settings: the CX manager edits notices, the CX team only reads them', async ({ browser }) => {
  const mgr = await browser.newPage()
  await signInAs(mgr, 'cxmgr')
  await mgr.goto('/settings/admin')
  await expectPageReady(mgr)
  await expect(mgr.getByText('Notices and digests', { exact: true })).toBeVisible()
  await expect(mgr.getByRole('combobox', { name: /Digest: Head of Sales/ })).toBeEnabled()
  await mgr.close()

  const team = await browser.newPage()
  await signInAs(team, 'cxteam')
  await team.goto('/settings/admin')
  await expectPageReady(team)
  await expect(team.getByText('View only. The CX manager changes these settings.')).toBeVisible()
  await expect(team.getByRole('combobox', { name: /Digest:/ })).toHaveCount(0)
  await team.close()
})

test('a "?" beside a heading explains the term', async ({ page }) => {
  await signInAs(page, 'cxmgr')
  await page.goto('/runaway')
  await expectPageReady(page)
  await page.getByRole('button', { name: 'What Runaway customer means' }).first().click()
  await expect(page.getByRole('dialog').getByText('Runaway customer')).toBeVisible()
})
