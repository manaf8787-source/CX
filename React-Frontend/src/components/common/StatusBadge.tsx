import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/status'

/**
 * Status tags per the skill (docs/MEO_DESIGN_SYSTEM.md): states that are fine are a LIGHT tag with a 6px status dot ("coloured dot + ink
 * text"); only states that need action (warning, danger) are a TINTED tag (status text on its tint, no gradient, no shadow). Neutral is
 * the plain light tag. Colour therefore appears only as the dot or as a tint on the two attention tones.
 */
const TONE_CLASSES: Record<Tone, string> = {
  success: 'pill-light',
  info: 'pill-light',
  neutral: 'pill-light',
  warning: 'pill-warning',
  danger: 'pill-error',
}

/** The dot every quiet tone carries by default; the tinted tones only show one when `dot` is set. */
const DOT_CLASSES: Record<Tone, string> = {
  success: 'dot-success',
  info: 'dot-info',
  warning: 'dot-warning',
  danger: 'dot-error',
  neutral: '',
}

const AUTO_DOT: Record<Tone, boolean> = { success: true, info: true, neutral: false, warning: false, danger: false }

interface StatusBadgeProps {
  tone?: Tone
  /** Force the 6px status dot (quiet tones show it by default, tinted tones only when asked). Ignored when an `icon` is given. */
  dot?: boolean
  icon?: ReactNode
  className?: string
  children: ReactNode
}

/** The one status tag for the whole app: map domain statuses through `@/lib/status`. 24px pill, 13/500. */
export function StatusBadge({ tone = 'neutral', dot, icon, className, children }: StatusBadgeProps) {
  const showDot = !icon && (dot ?? AUTO_DOT[tone])
  return (
    <span data-slot="status-badge" data-tone={tone} className={cn('pill [&_svg]:size-3.5', TONE_CLASSES[tone], className)}>
      {showDot && <span aria-hidden className={cn('dot', DOT_CLASSES[tone])} />}
      {icon}
      {children}
    </span>
  )
}
