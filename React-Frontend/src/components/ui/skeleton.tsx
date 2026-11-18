import { cn } from "cn"

/** A static #f2f2f2 block with the radius of what it replaces (pills for tags, circles for avatars) and a 1.2s opacity pulse .6 <-> 1. No shimmer. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("cx-shimmer rounded-md bg-well", className)}
      {...props}
    />
  )
}

export { Skeleton }
