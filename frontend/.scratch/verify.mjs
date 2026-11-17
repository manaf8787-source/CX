import { chromium } from 'playwright'

const shotDir = 'C:\\Users\\xele\\AppData\\Local\\Temp\\claude\\c--Users-xele-Desktop-CX\\bcf62d1f-f50a-4802-b308-497587d82fb2\\scratchpad'
const errors = []

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()) })

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForSelector('text=CX manager (level 2)', { timeout: 10000 })
await page.screenshot({ path: `${shotDir}\\01-landing.png` })

await page.click('text=CX manager (level 2)')
await page.waitForSelector('h1:has-text("Overview")', { timeout: 10000 })
await page.waitForTimeout(300)
await page.screenshot({ path: `${shotDir}\\02-overview.png` })

// Click into Incidents to verify the detail panel and clocks render.
await page.click('text=Incidents and SLAs')
await page.waitForSelector('text=Escalation', { timeout: 10000 })
await page.waitForTimeout(300)
await page.screenshot({ path: `${shotDir}\\03-incidents.png` })

// Toggle Arabic/RTL.
await page.click('button:has-text("العربية")')
await page.waitForTimeout(300)
const dir = await page.evaluate(() => document.documentElement.dir)
await page.screenshot({ path: `${shotDir}\\04-arabic.png` })

// After-Sales desk call screen flow.
await page.click('button:has-text("English")')
await page.waitForTimeout(200)
await page.click('text=After-Sales Desk')
await page.waitForSelector('text=Call', { timeout: 10000 })
await page.waitForTimeout(300)
await page.screenshot({ path: `${shotDir}\\05-afdesk.png` })

await browser.close()

console.log(JSON.stringify({ dir, errorCount: errors.length, errors: errors.slice(0, 20) }, null, 2))
