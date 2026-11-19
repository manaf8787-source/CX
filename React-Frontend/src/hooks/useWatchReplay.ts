import { useCallback, useEffect, useState } from 'react'
import { WATCH_STEP_MS } from '../data/watchTeam'

/**
 * The state of the "Watch the AI team work" replay (v42 F31): the step reached (0-based) and whether Play is running.
 * Play starts at the first step and advances one step every 750 ms, so nine steps take 6 seconds; it stops at the last step, when the
 * page unmounts (the interval is cleared in the effect cleanup) and when the user takes over with Next or Reset. Pressing Play again while
 * it runs restarts from the first step with a fresh interval, so two timers never run at once.
 */
export function useWatchReplay(total: number, stepMs: number = WATCH_STEP_MS) {
  const [index, setIndex] = useState(0)
  const [wantsPlay, setWantsPlay] = useState(false)
  // Bumped by every Play so the interval below restarts even when Play was already running.
  const [run, setRun] = useState(0)
  // Running only while there is a step left to reach: at the last step the interval is cleared by the effect below, no extra state to reset.
  const playing = wantsPlay && index < total - 1

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setIndex((i) => Math.min(i + 1, total - 1)), stepMs)
    return () => window.clearInterval(id)
  }, [playing, run, total, stepMs])

  const play = useCallback(() => {
    setIndex(0)
    setWantsPlay(true)
    setRun((r) => r + 1)
  }, [])
  const next = useCallback(() => {
    setWantsPlay(false)
    setIndex((i) => Math.min(i + 1, total - 1))
  }, [total])
  const reset = useCallback(() => {
    setWantsPlay(false)
    setIndex(0)
  }, [])

  return { index, playing, play, next, reset }
}
