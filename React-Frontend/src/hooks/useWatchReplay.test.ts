import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useWatchReplay } from './useWatchReplay'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useWatchReplay (v42 F31)', () => {
  it('starts at the first step, not playing', () => {
    const { result } = renderHook(() => useWatchReplay(9))
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(false)
  })

  it('Play starts at step 1 and advances one step every 750 ms, stopping at step 9 after 6 seconds', () => {
    const { result } = renderHook(() => useWatchReplay(9))
    act(() => result.current.play())
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(true)
    act(() => void vi.advanceTimersByTime(749))
    expect(result.current.index).toBe(0)
    act(() => void vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(1)
    act(() => void vi.advanceTimersByTime(750 * 7 - 1))
    expect(result.current.index).toBe(7)
    expect(result.current.playing).toBe(true)
    act(() => void vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(8)
    expect(result.current.playing).toBe(false)
    // nothing runs after the end
    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(8)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('Play restarts from step 1 even while playing, with one timer only', () => {
    const { result } = renderHook(() => useWatchReplay(9))
    act(() => result.current.play())
    act(() => void vi.advanceTimersByTime(750 * 3))
    expect(result.current.index).toBe(3)
    act(() => result.current.play())
    expect(result.current.index).toBe(0)
    expect(vi.getTimerCount()).toBe(1)
    act(() => void vi.advanceTimersByTime(750))
    expect(result.current.index).toBe(1)
  })

  it('Play after the end replays from step 1', () => {
    const { result } = renderHook(() => useWatchReplay(9))
    act(() => result.current.play())
    act(() => void vi.advanceTimersByTime(6000))
    expect(result.current.index).toBe(8)
    act(() => result.current.play())
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(true)
    act(() => void vi.advanceTimersByTime(6000))
    expect(result.current.index).toBe(8)
  })

  it('Next walks one step at a time and stops at the last; it takes over from Play', () => {
    const { result } = renderHook(() => useWatchReplay(9))
    act(() => result.current.next())
    expect(result.current.index).toBe(1)
    act(() => result.current.play())
    act(() => void vi.advanceTimersByTime(750))
    act(() => result.current.next())
    expect(result.current.playing).toBe(false)
    const at = result.current.index
    act(() => void vi.advanceTimersByTime(3000))
    expect(result.current.index).toBe(at)
    for (let i = 0; i < 20; i++) act(() => result.current.next())
    expect(result.current.index).toBe(8)
  })

  it('Reset goes back to step 1 and stops Play', () => {
    const { result } = renderHook(() => useWatchReplay(9))
    act(() => result.current.play())
    act(() => void vi.advanceTimersByTime(750 * 4))
    act(() => result.current.reset())
    expect(result.current.index).toBe(0)
    expect(result.current.playing).toBe(false)
    act(() => void vi.advanceTimersByTime(3000))
    expect(result.current.index).toBe(0)
  })

  it('stops when the page is left: the interval is cleared on unmount', () => {
    const { result, unmount } = renderHook(() => useWatchReplay(9))
    act(() => result.current.play())
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
