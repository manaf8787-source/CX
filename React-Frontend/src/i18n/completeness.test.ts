import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** Bilingual EN/AR is a hard requirement (CLAUDE.md, NFR-1): every bilingual
 * string object exported by the app must carry real Arabic, and every inline
 * `t('English', 'Arabic')` call must have a non-empty Arabic side. */

const ARABIC = /[؀-ۿ]/
const LATIN_WORD = /[A-Za-z]{3,}/

const modules = import.meta.glob(['../data/*.ts', '../lib/*.ts', '../utils/*.ts', '../services/mockData.ts', '!../**/*.test.ts', '!../lib/motionFeatures.ts'], { eager: true })

interface Missing {
  where: string
  en: string
  ar: string
}

function isBi(v: unknown): v is { en: string; ar: string } {
  return !!v && typeof v === 'object' && typeof (v as { en?: unknown }).en === 'string' && typeof (v as { ar?: unknown }).ar === 'string'
}

function walk(value: unknown, where: string, out: Missing[], seen: Set<unknown>) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (isBi(value)) {
    const { en, ar } = value
    const needsArabic = LATIN_WORD.test(en) && !ARABIC.test(ar)
    if ((en.trim() && !ar.trim()) || needsArabic) out.push({ where, en, ar })
    return
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(v, `${where}.${k}`, out, seen)
}

/** Brand and product names, codes and units are written the same way in both languages. */
const SAME_IN_BOTH = /^(PSI\b.*|NPS|CSAT|CES|CRM|SLA|KPI|AI|IVR|ID|HR|L&D|CX|QA|WhatsApp|Instagram|TikTok|Facebook|LinkedIn|X|Google|Bayut|Property Finder|Dubizzle|[A-Z0-9 .:/%+·-]+)$/

describe('i18n completeness', () => {
  it('found the modules to check', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(10)
  })

  it('every exported bilingual string has Arabic', () => {
    const missing: Missing[] = []
    for (const [file, mod] of Object.entries(modules)) walk(mod, path.basename(file), missing, new Set())
    const real = missing.filter((m) => !SAME_IN_BOTH.test(m.ar.trim() || m.en.trim()))
    expect(real, JSON.stringify(real.slice(0, 15), null, 2)).toEqual([])
  })

  it("every inline t('en', 'ar') call has a non-empty Arabic side with Arabic text", () => {
    const root = path.resolve(import.meta.dirname, '..')
    const files: string[] = []
    const collect = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) collect(full)
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(full)
      }
    }
    collect(root)
    const call = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(['"`])((?:\\.|(?!\3).)*)\3\s*\)/g
    const bad: string[] = []
    let calls = 0
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(call)) {
        calls++
        const [, , en, , ar] = m
        if (!ar.trim() || (LATIN_WORD.test(en) && !ARABIC.test(ar) && !SAME_IN_BOTH.test(ar.trim()))) {
          bad.push(`${path.relative(root, file)}: t(${JSON.stringify(en)}, ${JSON.stringify(ar)})`)
        }
      }
    }
    expect(calls).toBeGreaterThan(100)
    expect(bad, bad.slice(0, 15).join('\n')).toEqual([])
  })
})
