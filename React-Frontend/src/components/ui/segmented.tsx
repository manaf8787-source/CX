import * as React from "react"
import { cn } from "cn"

import { useSlidingIndicator } from "@/components/ui/use-sliding-indicator"
import { useScrollFade } from "@/components/ui/use-scroll-fade"
import { useI18n } from "@/i18n"

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  /** A count shown after the label ("Running 9"). */
  count?: number
  disabled?: boolean
  /** The accessible name when the label is an icon or an abbreviation ("EN" named "English"). It must contain the visible text (WCAG 2.5.3). */
  ariaLabel?: string
  /** A native tooltip, for an icon-only option. */
  title?: string
  /** The language of the label when it differs from the page ("العربية" on an English page). */
  lang?: string
}

/**
 * Exclusive filter or view switch for 2 to 5 options, with counts: a pill track and one dark pill that slides on the spring (the skill's
 * "App filter" segmented control). Use `Tabs` when the options switch panels, `Segmented` when they switch a filter or a view of the same data.
 *
 * Two flavours, one look:
 * - `variant="radio"` (default): `role="radiogroup"` with radio buttons. Roving tabindex; arrow keys move and select, mirrored in RTL.
 * - `variant="pressed"`: `role="group"` with toggle buttons (`aria-pressed`), each its own tab stop. For filters that pages and tests address
 *   as buttons ("To read", "Over 48 h"). The track scrolls sideways when it does not fit (a phone) and pads 4px so the focus ring is not clipped.
 */
function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
  size = "default",
  variant = "radio",
  compact = false,
}: {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Accessible name of the group. */
  label: string
  className?: string
  size?: "default" | "page"
  variant?: "radio" | "pressed"
  /** Narrow keys for icons and two-letter labels (the language and theme switches in the top bar). */
  compact?: boolean
}) {
  const { dir } = useI18n()
  const pressed = variant === "pressed"
  const selector = pressed ? "button[aria-pressed=true]" : "[role=radio][aria-checked=true]"
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>(selector)
  const enabled = options.filter((o) => !o.disabled)
  const { ref: fadeRef, fadeProps } = useScrollFade<HTMLDivElement>()

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight"
    const backward = dir === "rtl" ? "ArrowRight" : "ArrowLeft"
    const i = enabled.findIndex((o) => o.value === value)
    let next: SegmentedOption<T> | undefined
    if (event.key === forward || event.key === "ArrowDown") next = enabled[(i + 1) % enabled.length]
    else if (event.key === backward || event.key === "ArrowUp") next = enabled[(i - 1 + enabled.length) % enabled.length]
    else if (event.key === "Home") next = enabled[0]
    else if (event.key === "End") next = enabled[enabled.length - 1]
    if (!next) return
    event.preventDefault()
    onValueChange(next.value)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(selector)?.focus())
  }

  const track = (
    <div
      ref={ref}
      role={pressed ? "group" : "radiogroup"}
      aria-label={label}
      data-slot="segmented"
      data-indicator={ready ? "on" : "off"}
      onKeyDown={pressed ? undefined : onKeyDown}
      className={cn(
        "group/segmented relative inline-flex w-fit items-center gap-0.5 rounded-full",
        size === "page" ? "min-h-12 bg-card p-1 shadow-card-sm" : "min-h-[35px] bg-well p-[3px] shadow-inset-well",
        !pressed && className
      )}
    >
      {ready && box && (
        <span
          aria-hidden
          data-slot="segmented-indicator"
          // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
          className={cn(
            "material-dark pointer-events-none absolute top-0 left-0 rounded-full",
            animate && "transition-[translate,width,height] duration-400 ease-spring"
          )}
          style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            {...(pressed ? { "aria-pressed": selected } : { role: "radio", "aria-checked": selected, tabIndex: selected ? 0 : -1 })}
            disabled={option.disabled}
            aria-label={option.ariaLabel}
            title={option.title}
            lang={option.lang}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-out outline-hidden hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
              pressed
                ? "aria-pressed:text-primary-foreground aria-pressed:hover:text-primary-foreground group-data-[indicator=off]/segmented:aria-pressed:material-dark"
                : "aria-checked:text-primary-foreground aria-checked:hover:text-primary-foreground group-data-[indicator=off]/segmented:aria-checked:material-dark",
              size === "page" ? "min-h-10 px-4 pt-1.5 pb-2 text-base" : "min-h-[29px] px-[13px] pt-[5px] pb-[7px] leading-[17px]",
              compact && "min-w-[30px] px-2 [&_svg]:size-4"
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular font-normal">{option.count}</span>}
          </button>
        )
      })}
    </div>
  )

  if (!pressed) return track
  return (
    <div ref={fadeRef} {...fadeProps} className={cn("scroll-fade -m-1 max-w-full overflow-x-auto p-1", className)}>
      {track}
    </div>
  )
}

export { Segmented }
