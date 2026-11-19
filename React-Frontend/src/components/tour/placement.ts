/** Geometry of the guided tour: where the card goes next to the highlighted element. Pure, so it is tested without a browser. */

export interface Box {
  top: number
  left: number
  width: number
  height: number
}

export interface Placement {
  top: number
  left: number
  /** `side`: no room below or above, so the card stands beside the element. `over`: no room anywhere (an element as large as the screen), so the card sits on it. */
  placement: 'below' | 'above' | 'side' | 'over' | 'centre'
}

/** Space between the highlighted element and the card, and between the card and the screen edge. */
export const GAP = 14
export const EDGE = 12
/** The highlight sits this far outside the element. */
export const RING_PAD = 6
/** The card is 380px wide, and never wider than the screen minus a 12px margin each side. */
export const CARD_WIDTH = 380

export const cardWidth = (viewportWidth: number) => Math.max(0, Math.min(CARD_WIDTH, viewportWidth - 2 * EDGE))

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * Below the element when there is room, above it when there is not. When neither fits (a tall card on a short screen) the card stands beside
 * the element, level with its top, on the side after it in reading order if there is room, else the side before it: it never covers what
 * it points at while there is anywhere else to go. Only an element as large as the screen gets the card on top of it. The card's start
 * edge lines up with the element's start edge (left in English, right in Arabic), then is pulled inside the screen. With no element
 * (`target` null: the target is missing, or the closing card) the card is centred and nothing is highlighted.
 */
export function placeCard({ target, viewport, card, rtl }: { target: Box | null; viewport: { width: number; height: number }; card: { width: number; height: number }; rtl: boolean }): Placement {
  const maxLeft = Math.max(EDGE, viewport.width - card.width - EDGE)
  if (!target) {
    return { left: clamp((viewport.width - card.width) / 2, EDGE, maxLeft), top: Math.max(8, (viewport.height - card.height) / 2), placement: 'centre' }
  }
  const left = clamp(rtl ? target.left + target.width - card.width : target.left, EDGE, maxLeft)
  const below = target.top + target.height + GAP
  const above = target.top - card.height - GAP
  const maxTop = Math.max(8, viewport.height - card.height - 8)
  if (below + card.height <= viewport.height - 8) return { left, top: below, placement: 'below' }
  if (above >= 8) return { left, top: above, placement: 'above' }
  // Beside it: the room on each side of the element, the reading-order end first (right in English, left in Arabic).
  const right = viewport.width - (target.left + target.width)
  const need = card.width + GAP + EDGE
  const top = clamp(target.top, 8, maxTop)
  const onRight = { left: target.left + target.width + GAP, top, placement: 'side' as const }
  const onLeft = { left: target.left - GAP - card.width, top, placement: 'side' as const }
  if ((rtl ? target.left : right) >= need) return rtl ? onLeft : onRight
  if ((rtl ? right : target.left) >= need) return rtl ? onRight : onLeft
  const roomBelow = viewport.height - (target.top + target.height)
  const roomAbove = target.top
  return { left, top: clamp(roomBelow >= roomAbove ? below : above, 8, maxTop), placement: 'over' }
}
