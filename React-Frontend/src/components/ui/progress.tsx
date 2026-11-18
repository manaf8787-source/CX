import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"

/**
 * Progress bar: a 12px pill track (#ececec with the inset track shadow) and a dark-material fill. The fill is a flat colour plus a gloss
 * overlay, so a caller can still recolour it with `[&>[data-slot=progress-indicator]]:bg-destructive`. RTL-aware: the fill grows from the
 * reading-start edge. Use h-1 for the 4px mini meter.
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-line shadow-inset-track",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full bg-primary bg-(image:--fill-gloss) shadow-raised-dark transition-transform duration-500 ease-out translate-x-[calc(var(--progress-offset)*-1)] rtl:translate-x-(--progress-offset)"
        style={{ "--progress-offset": `${100 - (value || 0)}%` } as React.CSSProperties}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
