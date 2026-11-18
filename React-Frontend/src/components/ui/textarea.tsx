import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-md bg-well px-3 py-2.5 text-base text-foreground shadow-field outline-hidden transition-[background-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:bg-well-hover focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-field-invalid",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
