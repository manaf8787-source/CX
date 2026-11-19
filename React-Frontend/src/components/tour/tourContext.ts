import { createContext, useContext } from 'react'
import type { TourStep } from '@/data/tours'

export interface TourValue {
  /** The signed-in role has a tour (everyone but the mystery shopper): the replay button shows only then. */
  available: boolean
  running: boolean
  /** Index of the current step in `steps`. */
  index: number
  /** The steps this role gets, after the pages it cannot open are dropped. */
  steps: readonly TourStep[]
  /** Start from the first step (the replay button; the first entry does this by itself). */
  start: () => void
  next: () => void
  back: () => void
  /** End the tour now: stores completion, shows the closing toast (the prototype's Skip and its last "Done" are the same function). */
  skip: () => void
}

/** Outside a provider (a page rendered on its own in a test) the tour is simply not there. */
const INERT: TourValue = { available: false, running: false, index: 0, steps: [], start: () => {}, next: () => {}, back: () => {}, skip: () => {} }

export const TourContext = createContext<TourValue>(INERT)

export const useTour = (): TourValue => useContext(TourContext)
