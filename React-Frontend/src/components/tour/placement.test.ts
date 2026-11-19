import { describe, expect, it } from 'vitest'
import { CARD_WIDTH, EDGE, GAP, cardWidth, placeCard } from './placement'

const viewport = { width: 1440, height: 900 }
const card = { width: 380, height: 200 }

describe('placeCard', () => {
  it('goes below the element, its start edge on the element’s start edge', () => {
    const p = placeCard({ target: { top: 100, left: 300, width: 200, height: 40 }, viewport, card, rtl: false })
    expect(p).toEqual({ placement: 'below', left: 300, top: 100 + 40 + GAP })
  })

  it('goes above the element when there is no room below', () => {
    const p = placeCard({ target: { top: 760, left: 300, width: 200, height: 40 }, viewport, card, rtl: false })
    expect(p.placement).toBe('above')
    expect(p.top).toBe(760 - card.height - GAP)
  })

  it('stands beside the element, level with its top, when it fits neither below nor above (a tall card on a short screen)', () => {
    // the owner's case, 19 Nov: a 283px card of indicators in a 580px window, centred, with a 189px tour card
    const short = { width: 1265, height: 580 }
    const tall = { width: 380, height: 189 }
    const target = { top: 148, left: 200, width: 440, height: 283 }
    const p = placeCard({ target, viewport: short, card: tall, rtl: false })
    expect(p).toEqual({ placement: 'side', left: 200 + 440 + GAP, top: 148 })
    // never on top of what it points at
    expect(p.left).toBeGreaterThanOrEqual(target.left + target.width)
  })

  it('beside it: the reading-order end first (left in Arabic), the other side when that one has no room', () => {
    const short = { width: 1265, height: 580 }
    const tall = { width: 380, height: 189 }
    const middle = { top: 148, left: 430, width: 400, height: 283 }
    expect(placeCard({ target: middle, viewport: short, card: tall, rtl: false }).left).toBe(430 + 400 + GAP)
    expect(placeCard({ target: middle, viewport: short, card: tall, rtl: true }).left).toBe(430 - GAP - 380)
    // hard against the right edge: no room after it in English, so it goes before it
    const atRight = { top: 148, left: 800, width: 440, height: 283 }
    const p = placeCard({ target: atRight, viewport: short, card: tall, rtl: false })
    expect(p).toMatchObject({ placement: 'side', left: 800 - GAP - 380 })
    // a long element scrolled past the top: the card stays on screen
    const scrolled = placeCard({ target: { top: -300, left: 200, width: 440, height: 1200 }, viewport: short, card: tall, rtl: false })
    expect(scrolled).toMatchObject({ placement: 'side', top: 8 })
  })

  it('sits on the element, kept on screen, only when it is as wide and as tall as the screen', () => {
    const p = placeCard({ target: { top: 40, left: 0, width: 1440, height: 1400 }, viewport, card, rtl: false })
    expect(p.placement).toBe('over')
    expect(p.top).toBeGreaterThanOrEqual(8)
    expect(p.top + card.height).toBeLessThanOrEqual(viewport.height - 8)
  })

  it('mirrors in Arabic: the card’s right edge lines up with the element’s right edge', () => {
    const target = { top: 100, left: 700, width: 300, height: 40 }
    const ltr = placeCard({ target, viewport, card, rtl: false })
    const rtl = placeCard({ target, viewport, card, rtl: true })
    expect(ltr.left).toBe(700)
    expect(rtl.left).toBe(700 + 300 - card.width)
    expect(rtl.top).toBe(ltr.top)
  })

  it('is pulled inside the screen at either edge', () => {
    const farRight = placeCard({ target: { top: 100, left: 1400, width: 30, height: 30 }, viewport, card, rtl: false })
    expect(farRight.left).toBe(viewport.width - card.width - EDGE)
    const farLeft = placeCard({ target: { top: 100, left: -50, width: 30, height: 30 }, viewport, card, rtl: false })
    expect(farLeft.left).toBe(EDGE)
    const farLeftRtl = placeCard({ target: { top: 100, left: 5, width: 30, height: 30 }, viewport, card, rtl: true })
    expect(farLeftRtl.left).toBe(EDGE)
  })

  it('centres the card when there is no element', () => {
    const p = placeCard({ target: null, viewport, card, rtl: false })
    expect(p.placement).toBe('centre')
    expect(p.left).toBe((viewport.width - card.width) / 2)
    expect(p.top).toBe((viewport.height - card.height) / 2)
    expect(placeCard({ target: null, viewport, card, rtl: true }).left).toBe(p.left)
  })

  it('fits a 320px screen: the card is 296px wide with a 12px margin, never off screen', () => {
    const phone = { width: 320, height: 568 }
    const w = cardWidth(phone.width)
    expect(w).toBe(296)
    const p = placeCard({ target: { top: 200, left: 150, width: 100, height: 40 }, viewport: phone, card: { width: w, height: 220 }, rtl: false })
    expect(p.left).toBe(EDGE)
    expect(p.left + w).toBeLessThanOrEqual(phone.width - EDGE)
  })
})

describe('cardWidth', () => {
  it('is 380px, or the screen minus a 12px margin each side', () => {
    expect(cardWidth(1440)).toBe(CARD_WIDTH)
    expect(cardWidth(390)).toBe(366)
    expect(cardWidth(10)).toBe(0)
  })
})
