// Step 4 — render frames with headless Chrome and encode with ffmpeg.
//
//   node 4-render.mjs --sheet     sample frames from every scene → out/contact-sheet-*.jpg
//   node 4-render.mjs             full render → out/psi-cx-portal-explainer.mp4
//   node 4-render.mjs --from 40 --to 60   render a slice (for spot checks)
import { createRequire } from 'node:module'
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(HERE, '../frontend/package.json'))
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const SHEET = args.includes('--sheet')
const argNum = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d }
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true })
const TL = JSON.parse(fs.readFileSync(path.join(HERE, 'build/timeline.json'), 'utf8'))

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('[page]', m.text()) })
await page.goto(pathToFileURL(path.join(HERE, 'render/index.html')).href)
await page.evaluate(([tl, base, dbg]) => window.init(tl, base, dbg), [TL, pathToFileURL(path.join(HERE, 'captures')).href + '/', SHEET])

async function frame(t) {
  await page.evaluate((t) => window.render(t), t)
  return page.screenshot({ type: 'jpeg', quality: 94 })
}

if (SHEET) {
  // Sample: settled start, ~1s after each beat/line, and just before the scene ends.
  const times = []
  for (const s of TL.scenes) {
    times.push(s.start + TL.dip + 0.25)
    for (const b of s.beats || s.lines || []) times.push(b.t + (b.click ? 1.3 : 1.0))
    times.push(s.end - TL.dip - 0.05)
  }
  const dir = path.join(OUT, 'sheet'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir)
  let n = 0
  for (const t of times) fs.writeFileSync(path.join(dir, `f${String(n++).padStart(3, '0')}.jpg`), await frame(t))
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '1', '-i', path.join(dir, 'f%03d.jpg'),
    '-vf', 'scale=640:360,pad=648:368:4:4:color=0x0B1F31,tile=4x4', '-q:v', '3', path.join(OUT, 'contact-sheet-%02d.jpg')])
  console.log(`contact sheet: ${n} frames → out/contact-sheet-*.jpg`)
} else {
  const from = argNum('--from', 0), to = argNum('--to', TL.duration)
  const total = Math.round((to - from) * TL.fps)
  const video = path.join(OUT, 'video-only.mp4')
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', video], { stdio: ['pipe', 'inherit', 'inherit'] })
  const t0 = Date.now()
  for (let i = 0; i < total; i++) {
    const buf = await frame(from + i / TL.fps)
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    if (i % 150 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r))
  const final = path.join(OUT, from === 0 && to === TL.duration ? 'psi-cx-portal-explainer.mp4' : `slice-${from}-${to}.mp4`)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-ss', String(from), '-t', String(to - from), '-i', path.join(HERE, 'build/mix.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final])
  fs.rmSync(video)
  console.log('wrote', final)
}
await browser.close()
