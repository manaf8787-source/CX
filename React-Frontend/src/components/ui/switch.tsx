import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

/** Switch: 36x20 pill track (#ececec, inset track shadow), 16px thumb on the light material. On = dark material, thumb slides on the spring. */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full p-0.5 shadow-inset-track outline-none transition-[background-color,box-shadow] duration-300 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=unchecked]:bg-line data-[state=checked]:material-dark",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-(image:--thumb-off) shadow-raised-light ring-0 transition-transform duration-400 ease-spring group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:bg-(--thumb-on) data-[state=checked]:bg-none data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-[state=checked]:translate-x-4 group-data-[size=sm]/switch:data-[state=checked]:translate-x-3 rtl:group-data-[size=default]/switch:data-[state=checked]:-translate-x-4 rtl:group-data-[size=sm]/switch:data-[state=checked]:-translate-x-3"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
