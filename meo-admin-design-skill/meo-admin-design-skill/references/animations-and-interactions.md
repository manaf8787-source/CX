# Animations and interactions

Source of truth: `../tokens/motion.json`. Transition values were read from the site's compiled Framer Motion configuration (53 distinct transition objects), hover behaviour from the stylesheet's `.hover` rules and live hovering. Items marked *estimated* were judged by eye.

## The motion vocabulary (measured)

| Name | Definition | Count in source | Role |
|---|---|---|---|
| `spring.ui` | `{ type: "spring", duration: 0.4, bounce: 0.2 }` | 10 components | Default transition for **every component variant change** |
| `ease.out` | `cubic-bezier(0.22, 1, 0.36, 1)` | about 45 tweens | Entrances and staggered loops |
| `ease.inOut` | `cubic-bezier(0.45, 0, 0.55, 1)` | 7 tweens | Ambient breathing loops |
| linear | `cubic-bezier(0, 0, 1, 1)` | 1 | Continuous rotation |

There are no CSS keyframes and almost no CSS transitions (one: the cookie banner). Motion is deliberately uniform.

## Entrance animations

### Scroll reveal (measured)
| Property | Value |
|---|---|
| Trigger | Element enters the viewport; threshold 0.5; plays once |
| Initial | `opacity: 0; y: 24px` |
| Final | `opacity: 1; y: 0` |
| Duration / easing | 1.0s, `ease.out` (some 1.1s) |
| Delays seen | 0, .09, .15, .18, .3, .35, .5, .6s for siblings in a group |
| Applied to | Hero app window, logo caption and rail, section headers, each bento card, tab block, pricing, FAQ |

No scale, no blur, no horizontal movement in reveals.

### Hero heading (measured)
Per-word text effect: `opacity: 0.001; y: 40px; rotate: 4deg; filter: blur(4px)` -> rest. Per-word delay not captured; visually about 0.05-0.08s (estimated).

### Preloader
A full-viewport overlay covers the page until ready, then clears. Details not captured.

### Toast / banner (measured)
`transition: opacity, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)`.

## Hover and press

| Element | Behaviour | Source |
|---|---|---|
| Button (all variants), floating pill | Label roll: 18px mask, two stacked copies, alignment flips top -> bottom on `spring.ui`. Nothing else changes | measured |
| Nav link | Label opacity 0.6 -> 1 (animated values of .67 and .92 were captured mid-transition) | measured |
| Dropdown trigger | Opens on hover; chevron rotates 180 degrees; label goes to full opacity | measured |
| Dropdown row | Soft grey fill, radius 10 | observed; fill value estimated |
| Footer link, accordion question | Text nudges 3px right (`padding-left: 3px`) | measured |
| Use-case card | Glass note slides to `top: 22px` | measured |
| A hover scale of 1.06 exists on one small element | Target not isolated | measured value |
| Cards | No lift, no shadow change | measured |
| Pressed states | None defined | - |

## State transitions (all `spring.ui`, measured)

- **Tabs / segmented:** the dark indicator slides to the new position; labels cross-fade between dark-text and white-text copies; number chip fill changes.
- **Accordion:** answer container height animates open; toggle icon morphs plus -> minus.
- **Billing toggle:** indicator slides; the tier grid swaps variant.
- **Side nav (document page):** indicator pill slides to the section in view.
- **Phone menu:** nav expands to a full-height white sheet; icon morphs to a close mark.
- **Feature panel:** images cross-fade (opacity) when the tab changes; tabs auto-advance about every 6s (estimated from one interval).

## Ambient loops (measured)

All loops pause when off-screen and mirror back and forth unless noted.

| Loop | Animates | Duration | Easing | Extra |
|---|---|---|---|---|
| Live dot pulse | opacity 1 -> .3 | 0.9-1.0s | inOut | |
| Floating quotes | y 0 -> -8px | 3.5s (delay 1s) or 4.25s | inOut | Two periods so neighbours desynchronise |
| Photo zoom | scale 1 -> 1.08 | 8s | inOut | |
| Sync icon | rotate 0 -> 360 | 4s | linear | `loop`, not mirrored |
| Check pills nudge | x 0 -> 6 / 12 / 18px | 1s | out | delays 0 / .15 / .3s; repeat delay 1s |
| Battery cells | opacity -> .55 | 1.5s | out | delay step .15s across 7 cells |
| Fingerprint dots | opacity 0 <-> 1 | .9 / 1.25 / 1.6 / 1.95s | out | delay step .17s; repeat delays .4-2.4s |
| Hero bar fill | x 0 -> -10px | 3s | inOut | |
| Staggered fills (four bars; component not isolated) | x 0 -> -36px | 1.1s | out | delays 0 / .35 / .7 / 1.05s; repeat delay 1.2s |
| Selected compare chip | scale -> 1.05 | .6s | out | repeat delay 1.4s |
| Logo rail | continuous horizontal marquee | speed not captured | linear | Edge-masked |

No parallax and no scroll-linked (scrubbed) animation was found.

## Reduced motion

The reference has no `prefers-reduced-motion` handling. Implementations must add it (derived):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; }
}
```
With Framer Motion: wrap the app in `<MotionConfig reducedMotion="user">` and gate loops with `useReducedMotion()`.

## Motion tokens

| Category | Token | Value |
|---|---|---|
| Micro interaction | `motion.micro` | `spring.ui` (CSS: `400ms cubic-bezier(.34, 1.3, .64, 1)`, estimated equivalent) |
| Button interaction | `motion.button` | label roll on `spring.ui` |
| Component transition | `motion.component` | `spring.ui` for position/size; 200ms opacity for cross-fades (estimated) |
| Overlay | `motion.overlay` | 600ms `ease.out`, opacity + 8-12px translate |
| Page / scroll reveal | `motion.reveal` | 1000ms `ease.out`, y 24, stagger 90-150ms |
| Ambient | `motion.pulse` / `motion.float` / `motion.zoom` | 900ms / 3500-4250ms / 8000ms `ease.inOut`, mirrored |

## Implementation

### CSS

```css
/* label roll */
.btn__mask { display: flex; flex-direction: column; height: 18px; overflow: clip; }
.btn__mask > span { line-height: 18px; flex: none; transition: transform var(--spring-css); }
.btn:hover .btn__mask > span, .btn:focus-visible .btn__mask > span { transform: translateY(-18px); }

/* nav link */
.navlink { opacity: .6; transition: opacity 200ms var(--ease-out); }
.navlink:hover, .navlink[aria-expanded="true"], .navlink[aria-current="page"] { opacity: 1; }

/* link nudge */
.nudge { transition: padding-left var(--spring-css); }
.nudge:hover { padding-left: 3px; }

/* reveal */
.reveal { opacity: 0; transform: translateY(24px); }
.reveal.is-in { opacity: 1; transform: none; transition: opacity 1s var(--ease-out), transform 1s var(--ease-out);
                transition-delay: calc(var(--i, 0) * 120ms); }

/* live dot */
@keyframes pulse { to { opacity: .3; } }
.dot--live { animation: pulse .9s var(--ease-in-out) infinite alternate; }
```

### Framer Motion (`motion`)

```tsx
import { motion, MotionConfig } from "motion/react";

export const springUi = { type: "spring", duration: 0.4, bounce: 0.2 } as const;
export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeInOut = [0.45, 0, 0.55, 1] as const;

// Scroll reveal
export const Reveal = ({ i = 0, children }: { i?: number; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.5 }}
    transition={{ duration: 1, ease: easeOut, delay: i * 0.12 }}
  >{children}</motion.div>
);

// Sliding selection indicator: render inside the active segment only
export const Indicator = ({ id }: { id: string }) => (
  <motion.span layoutId={id} transition={springUi} className="seg__indicator" />
);

// Live dot
export const LiveDot = () => (
  <motion.span className="dot" animate={{ opacity: 0.3 }}
    transition={{ duration: 0.9, ease: easeInOut, repeat: Infinity, repeatType: "mirror" }} />
);

// App root
export const Motion = ({ children }: { children: React.ReactNode }) => (
  <MotionConfig reducedMotion="user" transition={springUi}>{children}</MotionConfig>
);
```

## Adapting motion for admin (derived)

| Marketing behaviour | Admin rule |
|---|---|
| 1s reveals on scroll | 400-600ms, `y: 12`, on first mount of a page only. Never re-animate on filter, sort, pagination or polling |
| Stagger of 90-150ms | Cap total stagger at 240ms (first 3-4 items), then show the rest together |
| Ambient loops everywhere | Keep only: live-dot pulse, sync/progress spinner. Remove float, zoom, twinkle |
| Auto-advancing tabs | Never auto-advance |
| Hover-opened dropdown | Open on click; hover may only highlight |
| Label roll | Keep on primary and secondary buttons; skip on icon-only and dense table actions |
| Height spring on accordion | Keep; also use for expanding table rows and collapsible sidebar groups |
| Toast .6s ease-out | Keep for toasts, drawers (translate from the edge), dialogs (opacity + scale .98 -> 1) |
| - | Skeleton shimmer: none; use a static `#F2F2F2` block with a 1.2s opacity pulse .6 <-> 1 |
