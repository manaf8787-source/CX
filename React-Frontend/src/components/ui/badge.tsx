import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Badge: 24px pill, 11/500 with +0.02em tracking (0 in Arabic). `default` is the dark badge, `secondary` the light one, the status
 * variants are the skill's derived text/tint pairs (use them only for states, never decoratively). `dot` adds the 6px status dot.
 */
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-[5px] overflow-hidden rounded-full px-2.5 pt-1 pb-1.5 text-2xs font-medium whitespace-nowrap outline-none transition-[background-color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-grad-dark text-primary-foreground shadow-badge-dark [a&]:hover:opacity-90",
        secondary: "bg-grad-badge-light text-foreground shadow-badge-light [a&]:hover:opacity-90",
        outline: "bg-grad-light text-foreground shadow-raised-light [a&]:hover:opacity-90",
        ghost: "text-foreground [a&]:hover:bg-accent",
        link: "text-foreground underline-offset-4 [a&]:hover:underline",
        destructive: "bg-danger-bg text-danger-text",
        success: "bg-success-bg text-success-text",
        warning: "bg-warning-bg text-warning-text",
        info: "bg-info-bg text-info-text",
        accent: "bg-accent-bg text-accent-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const DOT_CLASS = {
  live: "dot-live",
  idle: "",
  success: "dot-success",
  info: "dot-info",
  warning: "dot-warning",
  error: "dot-error",
} as const

type BadgeDot = keyof typeof DOT_CLASS | boolean

function Badge({
  className,
  variant = "default",
  asChild = false,
  dot,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    /** A 6px status dot before the text. `true` is the idle grey dot; `live` pulses (always pair it with words). */
    dot?: BadgeDot
  }) {
  const Comp = asChild ? Slot.Root : "span"
  const dotKey = dot === true ? "idle" : dot || null

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {dotKey && <span aria-hidden className={cn("dot", DOT_CLASS[dotKey])} />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Badge, badgeVariants }
