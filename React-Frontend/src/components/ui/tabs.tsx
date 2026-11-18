import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

import { useSlidingIndicator } from "@/components/ui/use-sliding-indicator"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-3 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

/**
 * Segmented control: a pill track (#f2f2f2 with the inset well shadow, 3px padding) and ONE dark pill that slides to the selected trigger
 * on the spring. `page` is the larger page-level toggle (white track, card shadow). `line` is kept for old call sites and renders as `page`.
 */
const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center gap-0.5 rounded-full text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch",
  {
    variants: {
      variant: {
        default: "min-h-[35px] bg-well p-[3px] shadow-inset-well",
        page: "min-h-12 bg-card p-1 shadow-card-sm",
        line: "min-h-12 bg-card p-1 shadow-card-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>("[role=tab][data-state=active]")
  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      data-variant={variant === "line" ? "page" : variant}
      data-indicator={ready ? "on" : "off"}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {ready && box && (
        <span
          aria-hidden
          data-slot="tabs-indicator"
          // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
          className={cn(
            "material-dark pointer-events-none absolute top-0 left-0 rounded-full",
            animate && "transition-[translate,width,height] duration-400 ease-spring"
          )}
          style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-full min-h-[29px] flex-1 items-center justify-center gap-1.5 rounded-full px-[13px] pt-[5px] pb-[7px] text-sm leading-[17px] font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-out outline-none group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground group-data-[variant=page]/tabs-list:min-h-10 group-data-[variant=page]/tabs-list:px-4 group-data-[variant=page]/tabs-list:pt-1.5 group-data-[variant=page]/tabs-list:pb-2 group-data-[variant=page]/tabs-list:text-base [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // until the sliding pill is measured (first paint, no layout engine) the selected trigger paints the dark material itself
        "group-data-[indicator=off]/tabs-list:data-[state=active]:material-dark",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 data-[state=active]:ease-out", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
