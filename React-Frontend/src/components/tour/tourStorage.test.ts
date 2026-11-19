import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOUR_STORAGE_KEY, readTourDone, writeTourDone } from './tourStorage'

afterEach(() => vi.restoreAllMocks())

describe('tour storage', () => {
  it('remembers who is done, under one key, as { done: { role: true } }', () => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    expect(readTourDone()).toEqual({})
    writeTourDone({ cxmgr: true, marketing: true })
    expect(JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY)!)).toEqual({ done: { cxmgr: true, marketing: true } })
    expect(readTourDone()).toEqual({ cxmgr: true, marketing: true })
  })

  it('reads a damaged value as nobody being done', () => {
    for (const raw of ['not json', '[]', 'null', '{"done":5}', '{"done":null}']) {
      localStorage.setItem(TOUR_STORAGE_KEY, raw)
      expect(readTourDone(), raw).toEqual({})
    }
    localStorage.setItem(TOUR_STORAGE_KEY, '{"done":{"cxmgr":true,"ld":"yes","hrmgr":false}}')
    expect(readTourDone()).toEqual({ cxmgr: true })
  })

  it('works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readTourDone()).toEqual({})
    expect(() => writeTourDone({ cxmgr: true })).not.toThrow()
  })
})
