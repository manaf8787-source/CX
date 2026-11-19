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
  /** `over`: neither side has room (a target taller than the screen), so the card sits on it. */
  placement: 'below' | 'above' | 'over' | 'centre'
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
 * Below the element when there is room, above it when there is not, otherwise on the side with more room, kept on screen. The card's start
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
  const roomBelow = viewport.height - (target.top + target.height)
  const roomAbove = target.top
  return { left, top: clamp(roomBelow >= roomAbove ? below : above, 8, maxTop), placement: 'over' }
}
