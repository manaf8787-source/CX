import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { TOUR_COPY, tourStepsFor } from '@/data/tours'
import { TourContext, type TourValue } from './tourContext'
import { readTourDone, writeTourDone, type TourDone } from './tourStorage'

interface TourProviderProps {
  children: ReactNode
  /** Wait before the first-entry tour starts (the prototype waits 400 ms, so the page has painted). Tests pass 0. */
  startDelayMs?: number
}

/**
 * The guided tour's state (v41 F28): running or not, the current step, and who has finished (per role, in `localStorage`).
 * It starts by itself on first entry under a role that has not done its tour, and again after a role switch (a running tour is reset
 * by the switch, as in the prototype). It lives in the shell, inside the router and the providers; `TourHost` draws it and moves
 * between pages. Skip and the last "Done" both store completion, so a role never sees the tour start twice by itself.
 *
 * Moving between steps is a transition, like the router's own location updates: a "Do it and continue" step clicks a link and moves on in the
 * same event, and the next card must be drawn with the page that link opened, not the page before it.
 */
export function TourProvider({ children, startDelayMs = 400 }: TourProviderProps) {
  const { t } = useI18n()
  const { role } = useRole()
  const steps = useMemo(() => tourStepsFor(role.id), [role.id])
  const available = steps.length > 0
  const [done, setDone] = useState<TourDone>(readTourDone)
  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const askedFor = useRef<string | null>(null)

  // A role switch resets the running tour (adjust state while rendering, not in an effect).
  const [seenRole, setSeenRole] = useState(role.id)
  if (seenRole !== role.id) {
    setSeenRole(role.id)
    setRunning(false)
    setIndex(0)
  }

  // First entry: after a short wait, start the tour of a role that has one and has not done it. Once per role per switch.
  useEffect(() => {
    askedFor.current = null
  }, [role.id])
  useEffect(() => {
    if (!available || done[role.id] || running || askedFor.current === role.id) return
    const timer = window.setTimeout(() => {
      askedFor.current = role.id
      setIndex(0)
      setRunning(true)
    }, startDelayMs)
    return () => window.clearTimeout(timer)
  }, [available, done, role.id, running, startDelayMs])

  const start = useCallback(() => {
    if (!available) return
    startTransition(() => {
      setIndex(0)
      setRunning(true)
    })
  }, [available])

  const skip = useCallback(() => {
    startTransition(() => {
      setRunning(false)
      setIndex(0)
    })
    const nextDone = { ...done, [role.id]: true }
    writeTourDone(nextDone)
    setDone(nextDone)
    toast(t(TOUR_COPY.finished.en, TOUR_COPY.finished.ar))
  }, [done, role.id, t])

  const next = useCallback(() => {
    if (index >= steps.length - 1) skip()
    else startTransition(() => setIndex(index + 1))
  }, [index, steps.length, skip])

  const back = useCallback(() => startTransition(() => setIndex((i) => Math.max(0, i - 1))), [])

  const value = useMemo<TourValue>(() => ({ available, running, index, steps, start, next, back, skip }), [available, running, index, steps, start, next, back, skip])
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
