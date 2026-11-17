import * as React from "react"

type AutoFocusHandler = (event: Event) => void

/**
 * Radix modal Dialog/Sheet return focus only to a <DialogTrigger>. Our dialogs are
 * opened from state by ordinary buttons, so remember what had focus when the dialog
 * opened and send focus back there on close (WCAG 2.4.3).
 */
export function useRestoreFocus(onOpenAutoFocus?: AutoFocusHandler, onCloseAutoFocus?: AutoFocusHandler) {
  const returnTo = React.useRef<HTMLElement | null>(null)

  const handleOpen = React.useCallback(
    (event: Event) => {
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null
      onOpenAutoFocus?.(event)
    },
    [onOpenAutoFocus],
  )

  const handleClose = React.useCallback(
    (event: Event) => {
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return
      const target = returnTo.current
      returnTo.current = null
      if (target?.isConnected) {
        event.preventDefault()
        target.focus({ preventScroll: true })
      }
    },
    [onCloseAutoFocus],
  )

  return { onOpenAutoFocus: handleOpen, onCloseAutoFocus: handleClose }
}
