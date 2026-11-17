import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-transform duration-300 ease-out translate-x-[calc(var(--progress-offset)*-1)] rtl:translate-x-(--progress-offset)"
        style={{ "--progress-offset": `${100 - (value || 0)}%` } as React.CSSProperties}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
