import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Card: radius 22, white, the card shadow stack, padding 28 (comfortable) or 20 (dense). Radius, padding and gaps come from the density
 * tokens (theme.css), so `density="dense"` here or `data-density="dense"` on any ancestor switches them. Put visuals in a CardWell.
 * `dark` is the one dark feature card a view may have; `frame` is the outer 26px frame (children: `surface-frame-inner`).
 */
const cardVariants = cva("flex flex-col gap-(--card-gap) text-card-foreground", {
  variants: {
    variant: {
      default: "surface-card py-(--card-pad)",
      dark: "surface-dark py-(--card-pad)",
      frame: "surface-frame gap-0",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Card({
  className,
  variant = "default",
  density,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    density?: "comfortable" | "dense"
  }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-density={density}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-(--card-pad) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("t-card-title", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-pad)", className)}
      {...props}
    />
  )
}

/** The signature "data lives here" container: #f2f2f2, radius 14 (12 dense), padding 22 (16 dense), no shadow. Charts, stats, dot grids. */
function CardWell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-well"
      className={cn("well mx-(--card-pad) flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-(--card-pad)", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardWell,
}
