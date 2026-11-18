/** The skill's motion vocabulary (measured): one spring for every state change, one curve for entrances.
 *  CSS twins live in styles/theme.css (--spring-css, --ease-out, --ease-in-out); use these for `motion` (LazyMotion) transitions. */
export const SPRING_UI = { type: 'spring', duration: 0.4, bounce: 0.2 } as const
export const EASE_OUT_MEO = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT_MEO = [0.45, 0, 0.55, 1] as const

/** Overlay entrance for menus and popovers: opacity + scale .98 -> 1 (keyframes in theme.css; opacity only under reduced motion). */
export const POP_ANIMATION =
  'data-[state=open]:animate-[cx-pop-in_200ms_var(--ease-out)] data-[state=closed]:animate-[cx-pop-out_150ms_var(--ease-in)_forwards]'
