import * as React from "react"
import { cn } from "cn"
import { useRestoreFocus } from "@/components/ui/use-restore-focus"
import { useI18n } from "@/i18n"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "scrim fixed inset-0 z-50 data-[state=open]:animate-[cx-fade-in_var(--dur-overlay)_var(--ease-out)] data-[state=closed]:animate-[cx-fade-out_200ms_var(--ease-in)_forwards]",
        className
      )}
      {...props}
    />
  )
}

/**
 * Floating drawer: 10px from the edges it does not touch, radius 24, white, the toast shadow. Slides in from its edge over 600ms ease-out
 * (a 150ms fade under reduced motion). Width 420 to 560: pass `sm:max-w-*` to change the 26rem default.
 */
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const focus = useRestoreFocus(onOpenAutoFocus, onCloseAutoFocus)
  const { t } = useI18n()
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 rounded-card-lg bg-card text-card-foreground shadow-toast outline-hidden ease-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-[var(--dur-drawer)]",
          side === "right" &&
            "inset-y-2.5 end-2.5 h-auto w-[calc(100%-1.25rem)] data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end sm:max-w-[26rem]",
          side === "left" &&
            "inset-y-2.5 start-2.5 h-auto w-[calc(100%-1.25rem)] data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start sm:max-w-[26rem]",
          side === "top" &&
            "inset-x-2.5 top-2.5 h-auto data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "inset-x-2.5 bottom-2.5 h-auto data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
        {...focus}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="material-light absolute top-4 end-4 inline-grid size-[30px] place-items-center rounded-full outline-hidden transition-opacity hover:opacity-80 disabled:pointer-events-none">
            <XIcon className="size-3.5" />
            <span className="sr-only">{t("Close", "إغلاق")}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-5 pe-14", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-5", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("t-h4", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
