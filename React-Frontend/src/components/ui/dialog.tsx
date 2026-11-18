import * as React from "react"
import { cn } from "cn"
import { TriangleAlertIcon, XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { useRestoreFocus } from "@/components/ui/use-restore-focus"
import { useI18n } from "@/i18n"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/** Scrim rgba(0,0,0,.32) (derived; .6 in the dark theme). */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "scrim fixed inset-0 z-50 data-[state=open]:animate-[cx-fade-in_var(--dur-overlay)_var(--ease-out)] data-[state=closed]:animate-[cx-fade-out_200ms_var(--ease-in)_forwards]",
        className
      )}
      {...props}
    />
  )
}

/** Centred card: radius 24, padding 28, the toast shadow. Enters with opacity + scale .98 -> 1 over 400ms (opacity only under reduced motion). */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const focus = useRestoreFocus(onOpenAutoFocus, onCloseAutoFocus)
  const { t } = useI18n()
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-card-lg bg-card p-7 text-card-foreground shadow-toast outline-none data-[state=open]:animate-[cx-pop-in_var(--dur-overlay)_var(--ease-out)] data-[state=closed]:animate-[cx-pop-out_200ms_var(--ease-in)_forwards] sm:max-w-lg",
          className
        )}
        {...props}
        {...focus}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="material-light absolute top-4 end-4 inline-grid size-[30px] place-items-center rounded-full outline-none transition-opacity hover:opacity-80 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
          >
            <XIcon />
            <span className="sr-only">{t("Close", "إغلاق")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/** The alert circle above the title of a destructive confirmation (the button stays dark and says its verb). */
function DialogAlertIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="dialog-alert-icon"
      className={cn("inline-grid size-[30px] place-items-center rounded-full bg-danger-bg text-(--status-error-solid)", className)}
      {...props}
    >
      <TriangleAlertIcon className="size-3.5" />
    </span>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-start", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const { t } = useI18n()
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{t("Close", "إغلاق")}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

/** Heading 4: 17/500 (the dialog title is the one heading in the card). */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("t-h4 pe-8", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-base text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogAlertIcon,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
