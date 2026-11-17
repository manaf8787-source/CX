import { describe, expect, it, vi } from 'vitest'
import { ACTION_KIND } from './actionKinds'
import { formatMonth, formatRelative } from './format'
import { DURATION, dirSign, prefersReducedMotion } from './motion'
import * as status from './status'

describe('format', () => {
  const now = Date.parse('2026-11-17T12:00:00Z')
  it('formats relative time in English and Arabic', () => {
    expect(formatRelative(new Date(now - 3 * 86_400_000).toISOString(), now, 'en')).toBe('3 days ago')
    expect(formatRelative(new Date(now + 2 * 3_600_000).toISOString(), now, 'en')).toBe('in 2 hours')
    expect(formatRelative(new Date(now - 3 * 86_400_000).toISOString(), now, 'ar')).toMatch(/[؀-ۿ]/)
    expect(formatRelative(new Date(now).toISOString(), now, 'en')).toBe('this minute')
  })
  it('formats a short month label', () => {
    expect(formatMonth(new Date('2026-11-05T00:00:00Z'), 'en')).toBe('Nov')
    expect(formatMonth(new Date('2026-11-05T00:00:00Z'), 'ar')).toMatch(/[؀-ۿ]/)
  })
})

describe('motion tokens', () => {
  it('keeps durations inside the 150-400ms rule', () => {
    for (const d of Object.values(DURATION)) {
      expect(d).toBeGreaterThanOrEqual(0.15)
      expect(d).toBeLessThanOrEqual(0.4)
    }
  })
  it('mirrors horizontal motion in RTL', () => {
    expect(dirSign('ltr')).toBe(1)
    expect(dirSign('rtl')).toBe(-1)
  })
  it('reads the reduced-motion preference and tolerates a missing matchMedia', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(prefersReducedMotion()).toBe(true)
    spy.mockImplementation(() => {
      throw new Error('no')
    })
    expect(prefersReducedMotion()).toBe(false)
    spy.mockRestore()
  })
})

describe('status maps', () => {
  const tones = new Set(['success', 'warning', 'danger', 'info', 'neutral'])
  it('every tone map uses only the five semantic tones', () => {
    for (const [name, map] of Object.entries(status)) {
      if (!name.endsWith('_TONE')) continue
      for (const v of Object.values(map as Record<string, string>)) expect(tones.has(v), `${name} -> ${v}`).toBe(true)
    }
  })
  it('critical is danger, failed is danger, effective is success', () => {
    expect(status.SEVERITY_TONE.critical).toBe('danger')
    expect(status.CORRECTIVE_STATUS_TONE.failed).toBe('danger')
    expect(status.CORRECTIVE_STATUS_TONE.effective).toBe('success')
  })
  it('every label map has the same keys as its tone map', () => {
    expect(Object.keys(status.CORRECTIVE_STATUS_LABEL).sort()).toEqual(Object.keys(status.CORRECTIVE_STATUS_TONE).sort())
    expect(Object.keys(status.STANDARD_STATUS_LABEL).sort()).toEqual(Object.keys(status.STANDARD_STATUS_TONE).sort())
    expect(Object.keys(status.LD_REQUEST_STATUS_LABEL).sort()).toEqual(Object.keys(status.LD_REQUEST_STATUS_TONE).sort())
    expect(Object.keys(status.MS_ASSIGNMENT_STATUS_LABEL).sort()).toEqual(Object.keys(status.MS_ASSIGNMENT_STATUS_TONE).sort())
  })
})

describe('corrective action kinds (FR-4.3)', () => {
  it('describes all eight kinds with what it looks like, where it goes and what comes back', () => {
    expect(Object.keys(ACTION_KIND).sort()).toEqual(['employee', 'environment', 'legal_privacy', 'marketing', 'process', 'product_app', 'service_behaviour', 'training_gap'])
    for (const k of Object.values(ACTION_KIND)) for (const f of [k.label, k.looksLike, k.path, k.comesBack]) expect(f.ar).toMatch(/[؀-ۿ]/)
  })
})
