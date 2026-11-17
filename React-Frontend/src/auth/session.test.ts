import { describe, expect, it, vi } from 'vitest'
import { readSession, writeSession } from './session'

describe('sample sign-in session', () => {
  it('round-trips through localStorage and stores no password', () => {
    writeSession({ displayName: 'Sample', signedInAt: '2026-11-17T10:00:00Z' })
    const raw = localStorage.getItem('psicx.session') ?? ''
    expect(raw).not.toMatch(/pass/i)
    expect(readSession()).toEqual({ displayName: 'Sample', signedInAt: '2026-11-17T10:00:00Z' })
  })
  it('sign-out clears it', () => {
    writeSession({ displayName: null, signedInAt: '2026-11-17T10:00:00Z' })
    writeSession(null)
    expect(readSession()).toBeNull()
  })
  it('ignores corrupt or incomplete data', () => {
    localStorage.setItem('psicx.session', '{not json')
    expect(readSession()).toBeNull()
    localStorage.setItem('psicx.session', JSON.stringify({ displayName: 'x' }))
    expect(readSession()).toBeNull()
    localStorage.setItem('psicx.session', JSON.stringify({ displayName: 5, signedInAt: 'now' }))
    expect(readSession()).toEqual({ displayName: null, signedInAt: 'now' })
  })
  it('survives storage being unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readSession()).toBeNull()
    spy.mockRestore()
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writeSession({ displayName: null, signedInAt: 'x' })).not.toThrow()
    set.mockRestore()
  })
})
