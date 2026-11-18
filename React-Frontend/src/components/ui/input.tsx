import * as React from "react"
import { cn } from "cn"

/**
 * Text field: a #f2f2f2 well with the skill's inset shadow, radius 8, 40px (forms; pass `h-9` in toolbars). No CSS border: the edge is the
 * 1px shadow ring `--ring-field` (rgba(10,10,10,.45), 3.16:1 on white), the documented WCAG 1.4.11 exception for form fields. Hover
 * lightens the fill, focus turns it white and appends the focus ring, invalid is a 1.5px #d93a32 ring (show the message with FieldError).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md bg-well px-3 text-base text-foreground shadow-field outline-none transition-[background-color,box-shadow] duration-200 file:inline-flex file:h-7 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-well-hover focus-visible:bg-card disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-field-invalid",
        className
      )}
      {...props}
    />
  )
}

export { Input }
