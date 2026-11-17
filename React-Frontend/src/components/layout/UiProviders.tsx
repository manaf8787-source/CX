import type { ReactNode } from 'react'
import { Direction } from 'radix-ui'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'

/** Radix primitives read direction from context, not from <html dir>, so it is wired to the i18n language here. */
export function UiProviders({ children }: { children: ReactNode }) {
  const { dir } = useI18n()
  return (
    <Direction.Provider dir={dir}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster />
      </TooltipProvider>
    </Direction.Provider>
  )
}
