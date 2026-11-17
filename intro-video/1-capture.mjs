// Step 1 — capture the real app screens with Playwright.
// Starts the Vite dev server (frontend/) if it isn't running, signs in as the
// CX team (level 1) demo role, walks a complaint through the full cycle, and
// saves 2x screenshots + the on-screen boxes of every element the video
// highlights to captures/manifest.json.
//
//   node 1-capture.mjs
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installDemoSeed } from './lib/demo-seed.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../frontend')
const require = createRequire(path.join(FRONTEND, 'package.json'))
const { chromium } = require('playwright')

const PORT = 5179
const BASE = `http://localhost:${PORT}`
const OUT = path.join(HERE, 'captures')
fs.mkdirSync(OUT, { recursive: true })

async function up() { try { return (await fetch(BASE)).ok } catch { return false } }
let server = null
if (!(await up())) {
  console.log('starting vite…')
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, shell: true, stdio: 'ignore' })
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500))
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, locale: 'en-GB', timezoneId: 'Asia/Dubai' })
await installDemoSeed(ctx)
const page = await ctx.newPage()
page.on('dialog', async (d) => { console.error('UNEXPECTED DIALOG:', d.message()); await d.dismiss(); process.exitCode = 1 })

const manifest = {}

async function boxOf(sel) {
  const loc = typeof sel === 'string' ? page.locator(sel) : sel
  const n = await loc.count()
  if (!n) { console.warn('  (skip, not on screen:', String(sel) + ')'); return null }
  const b = await loc.first().boundingBox()
  const sy = await page.evaluate(() => window.scrollY)
  return { x: b.x, y: b.y + sy, w: b.width, h: b.height }
}
function union(...bs) {
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y))
  const r = Math.max(...bs.map((b) => b.x + b.w)), btm = Math.max(...bs.map((b) => b.y + b.h))
  return { x, y, w: r - x, h: btm - y }
}

async function shot(name, elements) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(350)
  // Hide the text caret and the mouse-hover state so stills are clean.
  await page.mouse.move(0, 0)
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur())
  const boxes = {}
  for (const [k, sel] of Object.entries(elements)) {
    const b = Array.isArray(sel) ? (await Promise.all(sel.map(boxOf))).filter(Boolean) : [await boxOf(sel)].filter(Boolean)
    if (b.length) boxes[k] = union(...b)
  }
  const file = `${name}.png`
  await page.screenshot({ path: path.join(OUT, file), fullPage: true, caret: 'hide', animations: 'disabled' })
  const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))
  manifest[name] = { file, w: size.w, h: size.h, boxes }
  console.log('✓', name, `${size.w}x${size.h}`, Object.keys(boxes).length, 'boxes')
}

const go = async (p) => { await page.goto(BASE + p); await page.waitForLoadState('networkidle') }

// --- Sign in -------------------------------------------------------------
await go('/')
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('psicx.lang', 'en') })
await go('/')
await shot('landing', {
  title: 'h1',
  grid: '.grid.g3',
  cxteam: 'button.card:has-text("CX team (level 1)")',
})
await page.click('button.card:has-text("CX team (level 1)")')
await page.waitForURL('**/overview')

// --- Overview ------------------------------------------------------------
await shot('overview', {
  tiles: '.grid.g5',
  nps: '.tile >> nth=0',
  csat: '.tile >> nth=1',
  incidents: '.tile >> nth=4',
  trend: '.card:has(h2:text-is("Monthly NPS trend by product"))',
  alerts: '.card:has(h2:text-is("Alerts"))',
  role: '.brand',
})

// --- Voice of Customer -----------------------------------------------------
await page.click('a.nav-b:has-text("Voice of Customer")')
await page.waitForURL('**/voc')
await shot('voc', {
  products: ['.card:has-text("Promoters") >> nth=0', '.card:has-text("Promoters") >> nth=1'],
  comments: '.card:has(h2:text-is("Comments and free text"))',
  negative: '.item:has-text("Three weeks late")',
  themes: '.item:has-text("Three weeks late") >> text=Handover delay',
})

// --- Complaint cycle (Incidents and SLAs) ----------------------------------
await page.click('a.nav-b:has-text("Incidents and SLAs")')
await page.waitForURL('**/incidents')
await page.click('button.item:has-text("INC-1001")')
const detail = '.grid.g-case > .card.list'
const fixCard = `${detail} .card.tint:has(h3:text-is("Owner fixes and records"))`
const incBoxes = () => ({
  list: '.grid.g-case > .card >> nth=0',
  item: 'button.item:has-text("INC-1001")',
  head: `${detail} > .row.between >> nth=0`,
  clocks: `${detail} .grid.g2`,
  respond: `${detail} .grid.g2 > .row >> nth=0`,
  resolve: `${detail} .grid.g2 > .row >> nth=1`,
  escalation: `${detail} .row:has-text("Escalation:")`,
  detail,
  timeline: `${detail} > div:has(h3:text-is("Timeline"))`,
  lastEvent: `${detail} > div:has(h3:text-is("Timeline")) .row.between >> nth=-1`,
})
await shot('inc_open', { ...incBoxes(), btnFirst: 'button:has-text("Record first response")', filters: '.seg' })

await page.click('button:has-text("Record first response")')
await shot('inc_responded', { ...incBoxes(), fix: fixCard })

const f = (label) => `${fixCard} label.f:has-text("${label}")`
await page.selectOption(`${f('Root cause category')} select`, 'process')
await page.fill(`${f('Explanation')} textarea`, 'The developer moved the handover date and the change never reached the customer.')
await shot('inc_rc1', { ...incBoxes(), fix: fixCard, category: f('Root cause category'), explanation: f('Explanation') })
await page.fill(`${f('Corrective action')} textarea`, 'Called the customer with a confirmed new date and sent a written apology.')
await shot('inc_rc2', { ...incBoxes(), fix: fixCard, corrective: f('Corrective action') })
await page.fill(`${f('Preventive action')} textarea`, 'Any developer date change now triggers a customer notice the same day.')
await page.fill(`${f('Preventive owner')} input`, 'After-Sales lead')
await page.fill(`${f('Due date')} input`, '2026-11-20')
const actionItem = (n) => `${fixCard} .item:has-text("#${n} ")`
await shot('inc_rc3', {
  ...incBoxes(), fix: fixCard,
  preventive: f('Preventive action'),
  ownerDue: [f('Preventive owner'), f('Due date')],
  priority: `${detail} .chip:text-is("high")`,
  actions: `${fixCard} > .list`,
  action1: actionItem(1), action2: actionItem(2),
  decide1: `${actionItem(1)} select`,
})

for (const n of [1, 2]) {
  await page.selectOption(`${actionItem(n)} select`, 'confirmed')
  await page.click(`${actionItem(n)} button:has-text("Save")`)
}
await shot('inc_actions', {
  ...incBoxes(), fix: fixCard,
  actions: `${fixCard} > .list`,
  chip1: `${actionItem(1)} .chip`, chip2: `${actionItem(2)} .chip`,
  chips: [`${actionItem(1)} .chip`, `${actionItem(2)} .chip`],
  submit: 'button:has-text("Submit fix")',
})

await page.click('button:has-text("Submit fix")')
const verifyCard = `${detail} .card.tint:has(h3:text-is("Verify and close"))`
const cb = (txt) => `${verifyCard} label.row:has-text("${txt}")`
const verifyBoxes = () => ({
  ...incBoxes(), verify: verifyCard,
  cb1: cb('Root cause is clear'), cb2: cb('really done'), cb3: cb('customer was told'),
  closeBtn: `${verifyCard} button:has-text("Close case")`,
  record: `${fixCard} > .list`,
})
await shot('inc_resolved', verifyBoxes())
await page.check(`${cb('Root cause is clear')} input`); await shot('inc_chk1', verifyBoxes())
await page.check(`${cb('really done')} input`); await shot('inc_chk2', verifyBoxes())
await page.check(`${cb('customer was told')} input`); await shot('inc_chk3', verifyBoxes())
await page.click(`${verifyCard} button:has-text("Close case")`)
await shot('inc_closed', { ...incBoxes(), verify: verifyCard, status: `${detail} .chip:text-is("closed")`, reopen: 'button:has-text("Reopen")' })

// --- Survey Engine ---------------------------------------------------------
await page.click('a.nav-b:has-text("Survey Engine")')
await page.waitForURL('**/survey-engine')
const reCard = '.card:has(h2:text-is("Real Estate quarterly voice of customer"))'
const afCard = '.card:has(h2:text-is("After-Sales monthly calls"))'
await shot('survey', {
  cards: [reCard, afCard],
  re: reCard, af: afCard,
  channels: [`${reCard} td:text-is("WhatsApp: link")`, `${reCard} td:text-is("SMS")`, `${afCard} td:text-is("team call") >> nth=0`],
  whatsapp: `${reCard} td:text-is("WhatsApp: link")`,
  rates: [`${reCard} tr >> nth=1 >> td >> nth=-1`, `${afCard} tr >> nth=-1 >> td >> nth=-1`],
  rateRe: `${reCard} tr >> nth=1 >> td >> nth=-1`,
})

// --- Mystery Shopper -------------------------------------------------------
await page.click('a.nav-b:has-text("Mystery")')
await page.waitForURL('**/mystery-shopper')
await shot('shopper', {
  tiles: '.grid:has(.tile)',
  score: '.tile >> nth=0',
  crit: '.tile >> nth=1',
  table: '.card:has(table)',
  failRow: 'tr:has-text("64%")',
  tabs: '[role=tablist], .tabs',
})

// --- After-Sales Desk ------------------------------------------------------
await page.click('a.nav-b:has-text("After-Sales Desk")')
await page.waitForURL('**/after-sales/desk')
await shot('desk', {
  table: '.card:has(table)',
  row1: 'tr:has-text("Yara Belcarro")',
  tries: ['th:text-is("Tries")', 'tr:has-text("Omar Pindlewick") td:has-text("3/3")'],
  unit: ['th:text-is("Unit status")', 'tr:has-text("Karim Velloquay") td:has-text("rental")'],
  callBtn: 'tr:has-text("Yara Belcarro") button:has-text("Call")',
})
await page.click('tr:has-text("Yara Belcarro") button:has-text("Call")')
await page.waitForTimeout(300)
await shot('desk_call', { main: '.main > .card, .main > .grid', screenTab: 'button:has-text("Call screen")' })

// --- AI Insights -----------------------------------------------------------
await page.click('a.nav-b:has-text("AI Insights")')
await page.waitForURL('**/insights')
await shot('insights', {
  cards: '.main > .list, .main .list >> nth=0',
  card1: '.card:has-text("Agent attitude")',
  evidence: '.card:has-text("Agent attitude") .chip:has-text("success")',
  approve: '.card:has-text("Agent attitude") >> text=Only the CX manager can approve',
})

// --- Arabic / RTL ----------------------------------------------------------
await page.click('a.nav-b:has-text("Overview")')
await page.waitForURL('**/overview')
await page.click('button:has-text("العربية")')
await page.waitForTimeout(400)
await shot('arabic', { rail: '.rail', tiles: '.grid.g5', head: '.pagehead' })
await page.click('button:has-text("English")')

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
console.log('manifest written:', Object.keys(manifest).length, 'shots')
await browser.close()
if (server) server.kill()
