import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { TOUR_COPY, type TourStep } from '@/data/tours'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useTour } from './tourContext'
import { cardWidth, placeCard, RING_PAD, type Box } from './placement'

/** How long a step waits for its element (the page may still be loading) before the card is centred with no highlight. It keeps looking afterwards. */
export const WAIT_FOR_TARGET_MS = 2000

interface LayerState {
  /** `waiting`: looking for the element; `ready`: found and measured; `missing`: not there after the wait (centred card, no highlight). */
  status: 'waiting' | 'ready' | 'missing'
  rect: Box | null
  radius: number
  width: number
  height: number
}

/**
 * The dim is the portal's own `--scrim` (a white frame round the element, then the scrim over everything else, drawn as a huge shadow so the
 * element itself stays lit). The light theme's scrim (32%) is stacked twice (about 54%, as in the prototype) so the lit element stands out on a white page;
 * the dark theme's (60%) is already enough.
 */
const DIM_RING = 'fixed shadow-[0_0_0_3px_white,0_0_0_9999px_var(--scrim),0_0_0_9999px_var(--scrim)] dark:shadow-[0_0_0_3px_white,0_0_0_9999px_var(--scrim)]'
const DIM_ALL = 'scrim fixed inset-0 shadow-[inset_0_0_0_9999px_var(--scrim)] dark:shadow-none'

/** An element taller than this share of the screen (a 50-row table) is shown by its first part: scrolled to the top, and framed down to `TALL_CAP` of the screen. */
const TALL_RATIO = 0.7
const TALL_CAP = 0.5
/** Where the top of a tall element is put: below the 60px top bar. */
const TALL_TOP = 96

const WAITING: LayerState = { status: 'waiting', rect: null, radius: 0, width: 0, height: 0 }

/** The frame: where it is and how round. Held by the host, not the step, so it outlives a step and glides to the next element. */
interface Ring {
  rect: Box
  radius: number
}
const sameRing = (a: Ring | null, b: Ring | null) =>
  a === b || (!!a && !!b && a.radius === b.radius && a.rect.top === b.rect.top && a.rect.left === b.rect.left && a.rect.width === b.rect.width && a.rect.height === b.rect.height)
/** How long the frame takes to glide from one element to the next (owner's request, 19 Nov: gradual and smooth). */
const GLIDE_MS = 520

/** The first visible element for the step's selector (its `highlightParent` when it names one). A bad selector finds nothing and never breaks the tour. */
function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null
  let found: HTMLElement | null = null
  try {
    for (const el of document.querySelectorAll<HTMLElement>(step.target)) {
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) continue
      found = el
      break
    }
    if (found && step.highlightParent) found = found.closest<HTMLElement>(step.highlightParent) ?? found
  } catch {
    return null
  }
  return found
}

/**
 * Bring the element to the middle of the screen, unless it lives in a fixed container or one that sticks to the top or bottom of the screen
 * (the menu): scrolling the page would only move the rest. A cell pinned to a table's side (Close the loop's Call column) still scrolls.
 * An element taller than the screen has no middle worth showing: its top goes just under the top bar.
 */
function centre(el: HTMLElement) {
  const set = (v: string) => v !== '' && v !== 'auto'
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    const { position, top, bottom } = getComputedStyle(p)
    if (position === 'fixed' || (position === 'sticky' && (set(top) || set(bottom)))) return
  }
  if (el.getBoundingClientRect().height > window.innerHeight * TALL_RATIO) {
    el.scrollIntoView?.({ block: 'start', inline: 'nearest', behavior: 'instant' })
    window.scrollBy?.({ top: -TALL_TOP, behavior: 'instant' })
    return
  }
  el.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'instant' })
}

/** The box to frame: the element's own, or for a tall one its first part (`TALL_CAP` of the screen). */
const boxOf = (r: DOMRect, screenHeight: number): Box => ({
  top: Math.round(r.top),
  left: Math.round(r.left),
  width: Math.round(r.width),
  height: Math.round(r.height > screenHeight * TALL_RATIO ? screenHeight * TALL_CAP : r.height),
})

function sameLayer(a: LayerState, b: LayerState) {
  const ra = a.rect
  const rb = b.rect
  return (
    a.status === b.status &&
    a.radius === b.radius &&
    a.width === b.width &&
    a.height === b.height &&
    (ra === rb || (!!ra && !!rb && ra.top === rb.top && ra.left === rb.left && ra.width === rb.width && ra.height === rb.height))
  )
}

/**
 * Draws the guided tour (v41 F28): the dim, a white frame round the real element, and a card next to it. Mounted once in the shell; it
 * renders nothing until the tour runs. The overlay never takes a click (the host and the frame are `pointer-events: none`, only the card
 * takes them), so the page underneath stays usable, and a missing element only centres the card. It moves between pages by itself
 * (once per step: a person who goes elsewhere by hand is not pulled back), and Escape skips the tour unless a dialog or menu is open.
 */
export function TourHost({ waitMs = WAIT_FOR_TARGET_MS }: { waitMs?: number }) {
  const { running, steps, index, skip } = useTour()
  const { L } = useI18n()
  const step = running ? steps[index] : undefined
  const reduced = prefersReducedMotion()

  // The frame glides while a step changes, then follows its element frame by frame (scrolling must not trail behind a transition).
  const [ring, setRingState] = useState<Ring | null>(null)
  const setRing = useCallback((next: Ring | null) => setRingState((prev) => (sameRing(prev, next) ? prev : next)), [])
  const [glide, setGlide] = useState(false)
  const [seenIndex, setSeenIndex] = useState(index)
  if (seenIndex !== index) {
    setSeenIndex(index)
    setGlide(true)
  }
  if (!running && ring) setRingState(null)
  useEffect(() => {
    if (!glide) return
    const id = window.setTimeout(() => setGlide(false), GLIDE_MS + 160)
    return () => window.clearTimeout(id)
  }, [glide, index])

  // Focus: remember where it was when the tour began, give it back when the tour ends (or the main area if that is gone).
  const returnTo = useRef<HTMLElement | null>(null)
  const wasRunning = useRef(false)
  useEffect(() => {
    if (running && !wasRunning.current) {
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null
    } else if (!running && wasRunning.current) {
      const target = returnTo.current
      returnTo.current = null
      if (target?.isConnected) target.focus({ preventScroll: true })
      else document.getElementById('main')?.focus({ preventScroll: true })
    }
    wasRunning.current = running
  }, [running])

  // Escape = Skip. A dialog, menu or list that is open gets the key first (Radix also marks the event as handled).
  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"], [role="listbox"]')) return
      skip()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [running, skip])

  if (!step) return null
  return (
    <div
      data-testid="tour-host"
      data-motion={reduced ? 'reduced' : undefined}
      className={cn('pointer-events-none fixed inset-0 z-60', !reduced && 'animate-[cx-fade-in_300ms_var(--ease-out)]')}
    >
      {/* Read out at every step: the visible "Tour n / total" sits in a card that is new each time, which a screen reader would not repeat. */}
      <p role="status" className="sr-only">
        {L(TOUR_COPY.progress(index + 1, steps.length))}
      </p>
      {ring ? (
        <div
          aria-hidden
          data-testid="tour-ring"
          className={cn(
            DIM_RING,
            !reduced && 'animate-[cx-fade-in_300ms_var(--ease-out)]',
            !reduced && glide && 'transition-[top,left,width,height,border-radius] duration-[520ms] ease-smooth',
          )}
          style={{
            top: ring.rect.top - RING_PAD,
            left: ring.rect.left - RING_PAD,
            width: ring.rect.width + 2 * RING_PAD,
            height: ring.rect.height + 2 * RING_PAD,
            borderRadius: Math.min(ring.radius + RING_PAD, (Math.min(ring.rect.width, ring.rect.height) + 2 * RING_PAD) / 2),
          }}
        />
      ) : (
        <div aria-hidden data-testid="tour-dim" className={DIM_ALL} />
      )}
      <TourLayer key={index} step={step} index={index} total={steps.length} reduced={reduced} waitMs={waitMs} onRing={setRing} />
    </div>
  )
}

/**
 * One step: goes to its page, waits for its element, then reports where the frame goes and shows the card. Mounted per step (keyed by the
 * index), so its state starts fresh. The frame itself belongs to the host: on the same page it stays where it was until the new element is
 * found and then glides there; when the step changes page it is dropped first (the old place means nothing on the new page).
 */
function TourLayer({
  step,
  index,
  total,
  reduced,
  waitMs,
  onRing,
}: {
  step: TourStep
  index: number
  total: number
  reduced: boolean
  waitMs: number
  onRing: (ring: Ring | null) => void
}) {
  const { next, back, skip } = useTour()
  const { dir } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [layer, setLayer] = useState<LayerState>(WAITING)
  const [card, setCard] = useState({ width: 0, height: 0 })

  // 1. Go to the step's page (and query) once, when the step begins.
  const navigated = useRef(false)
  useEffect(() => {
    if (navigated.current) return
    navigated.current = true
    if (step.route === null) return
    const want = `${step.route}${step.search ?? ''}`
    if (`${location.pathname}${location.search}` !== want) {
      onRing(null)
      navigate(want)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Look for the element, centre it once, and keep measuring every frame: scroll, resize, the sidebar's spring and late data all move it.
  useEffect(() => {
    let raf = 0
    let scrolled = false
    let seen = false
    const started = performance.now()
    const tick = () => {
      const el = findTarget(step)
      if (el && !scrolled) {
        scrolled = true
        centre(el)
      }
      if (el) seen = true
      const width = window.innerWidth
      const height = window.innerHeight
      const radius = el ? Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 : 0
      const nextLayer: LayerState = el
        ? { status: 'ready', rect: boxOf(el.getBoundingClientRect(), height), radius, width, height }
        : { status: seen || performance.now() - started >= waitMs ? 'missing' : 'waiting', rect: null, radius: 0, width, height }
      setLayer((prev) => (sameLayer(prev, nextLayer) ? prev : nextLayer))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [step, waitMs])

  const onSize = useCallback((width: number, height: number) => setCard((prev) => (prev.width === width && prev.height === height ? prev : { width, height })), [])

  // Tell the host where the frame goes: on the element once it is found, nowhere once it is known to be missing. While still looking, say nothing.
  useEffect(() => {
    if (layer.status === 'ready' && layer.rect) onRing({ rect: layer.rect, radius: layer.radius })
    else if (layer.status === 'missing') onRing(null)
  }, [layer, onRing])

  const handleNext = () => {
    // "Do it and continue": the real action, unless the control already shows it done (an open "Details" toggle).
    if (step.click) {
      const el = findTarget(step)
      if (el && el.getAttribute('aria-expanded') !== 'true') el.click()
    }
    next()
  }

  const rect = layer.status === 'ready' ? layer.rect : null
  const width = cardWidth(layer.width)
  const placed = placeCard({ target: rect, viewport: { width: layer.width, height: layer.height }, card: { width, height: card.height }, rtl: dir === 'rtl' })

  return (
    <>
      {layer.status !== 'waiting' && (
        <TourCard
          step={step}
          index={index}
          total={total}
          top={placed.top}
          left={placed.left}
          width={width}
          placement={placed.placement}
          reduced={reduced}
          onSize={onSize}
          onNext={handleNext}
          onBack={back}
          onSkip={skip}
        />
      )}
    </>
  )
}

interface TourCardProps {
  step: TourStep
  index: number
  total: number
  top: number
  left: number
  width: number
  placement: string
  reduced: boolean
  onSize: (width: number, height: number) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

/** The card: "Tour n / total", the title and text, Skip, Back and Next (the last step says Done, a "Do it and continue" step says so). Focus goes to the primary button when it appears. */
function TourCard({ step, index, total, top, left, width, placement, reduced, onSize, onNext, onBack, onSkip }: TourCardProps) {
  const { L, dir } = useI18n()
  const titleId = useId()
  const textId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const last = index === total - 1

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => onSize(el.offsetWidth, el.offsetHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [onSize])

  useEffect(() => {
    primary.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={textId}
      dir={dir}
      data-testid="tour-card"
      data-placement={placement}
      className={cn('material-light pointer-events-auto fixed flex flex-col gap-3 rounded-card p-5', !reduced && 'animate-[cx-rise_520ms_var(--ease-smooth)_140ms_backwards]')}
      style={{ top, left, width }}
    >
      <p className="t-caption text-muted-foreground">
        {L(TOUR_COPY.tour)}{' '}
        <bdi dir="ltr" className="tabular">
          {index + 1} / {total}
        </bdi>
      </p>
      <h2 id={titleId} className="t-h4">
        {L(step.title)}
      </h2>
      <p id={textId} className="text-sm text-muted-foreground">
        {L(step.text)}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {L(TOUR_COPY.skip)}
        </Button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button variant="outline" size="sm" onClick={onBack}>
              {L(TOUR_COPY.back)}
            </Button>
          )}
          <Button ref={primary} size="sm" onClick={onNext}>
            {last ? L(TOUR_COPY.done) : step.click ? L(TOUR_COPY.doIt) : L(TOUR_COPY.next)}
          </Button>
        </div>
      </div>
    </div>
  )
}
