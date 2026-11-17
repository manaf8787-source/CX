import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("cx-shimmer rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
