import * as React from "react"
import { cn } from "cn"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />
}

/** Radio: 16px circle, light material; selected = dark material with a 6px dot in the text-on-dark colour. */
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer inline-grid aspect-square size-4 shrink-0 place-items-center rounded-full material-light outline-hidden transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:material-dark aria-invalid:shadow-field-invalid",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="size-1.5 rounded-full bg-(--on-dark)" />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
