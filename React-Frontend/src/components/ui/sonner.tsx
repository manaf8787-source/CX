import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/theme/ThemeContext"
import { useI18n } from "@/i18n"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toast: a radius-20 card with the toast shadow, bottom-left (bottom-right in Arabic, mirrored), 360px. The status shows in the icon
 * colour only; the card stays white. Sonner injects its own unlayered stylesheet, so the look is set through its CSS variables and inline
 * styles (utility classes would lose to it).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useTheme()
  const { dir } = useI18n()

  return (
    <Sonner
      theme={mode}
      dir={dir}
      position={dir === "rtl" ? "bottom-right" : "bottom-left"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-(--status-success-solid)" />,
        info: <InfoIcon className="size-4 text-(--status-info-solid)" />,
        warning: <TriangleAlertIcon className="size-4 text-(--status-warning-solid)" />,
        error: <OctagonXIcon className="size-4 text-(--status-error-solid)" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        style: {
          boxShadow: "var(--shadow-toast)",
          padding: "16px 18px",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: 500,
          letterSpacing: "calc(-0.01em * var(--track))",
        },
        actionButtonStyle: {
          height: 30,
          padding: "3px 12px 5px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          backgroundImage: "var(--grad-dark)",
          color: "var(--on-dark)",
          boxShadow: "var(--shadow-raised-dark)",
        },
        cancelButtonStyle: {
          height: 30,
          padding: "3px 12px 5px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          backgroundImage: "var(--grad-light)",
          color: "var(--ink)",
          boxShadow: "var(--shadow-raised-light)",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "transparent",
          "--border-radius": "20px",
          "--width": "360px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
