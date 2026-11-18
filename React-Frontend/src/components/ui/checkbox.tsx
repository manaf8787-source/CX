import * as React from "react"
import { cn } from "cn"
import { CheckIcon, MinusIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

/** Checkbox: 16px, radius 4, light material. Checked (and indeterminate) = dark material with a white check, the skill's selection rule. */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-grid size-4 shrink-0 place-items-center rounded-xs material-light outline-none transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:material-dark data-[state=indeterminate]:material-dark aria-invalid:shadow-field-invalid",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-items-center text-current">
        {props.checked === "indeterminate" ? <MinusIcon className="size-2.5 stroke-[2.5]" /> : <CheckIcon className="size-2.5 stroke-[2.5]" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
