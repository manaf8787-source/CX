import * as React from "react"
import { cn } from "cn"

import { useSlidingIndicator } from "@/components/ui/use-sliding-indicator"
import { useI18n } from "@/i18n"

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  /** A count shown after the label ("Running 9"). */
  count?: number
  disabled?: boolean
}

/**
 * Exclusive filter or view switch for 2 to 5 options, with counts: a `role="radiogroup"` pill track and one dark pill that slides on the
 * spring (the skill's "App filter" segmented control). Roving tabindex; arrow keys move and select, mirrored in RTL.
 * Use `Tabs` when the options switch panels, `Segmented` when they switch a filter or a view of the same data.
 */
function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
  size = "default",
}: {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Accessible name of the group. */
  label: string
  className?: string
  size?: "default" | "page"
}) {
  const { dir } = useI18n()
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>("[role=radio][aria-checked=true]")
  const enabled = options.filter((o) => !o.disabled)

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
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("[role=radio][aria-checked=true]")?.focus())
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      data-slot="segmented"
      data-indicator={ready ? "on" : "off"}
      onKeyDown={onKeyDown}
      className={cn(
        "group/segmented relative inline-flex w-fit items-center gap-0.5 rounded-full",
        size === "page" ? "min-h-12 bg-card p-1 shadow-card-sm" : "min-h-[35px] bg-well p-[3px] shadow-inset-well",
        className
      )}
    >
      {ready && box && (
        <span
          aria-hidden
          data-slot="segmented-indicator"
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
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-out outline-none hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-checked:text-primary-foreground aria-checked:hover:text-primary-foreground",
              size === "page" ? "min-h-10 px-4 pt-1.5 pb-2 text-base" : "min-h-[29px] px-[13px] pt-[5px] pb-[7px] leading-[17px]",
              "group-data-[indicator=off]/segmented:aria-checked:material-dark"
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular font-normal">{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export { Segmented }
