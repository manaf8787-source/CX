import type { ReactNode } from 'react'
import { Direction } from 'radix-ui'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { MotionProvider } from './MotionProvider'

/**
 * Radix primitives read direction from context, not from <html dir>, so it is wired to the i18n language here.
 * Toasts sit 16px from the bottom and, from the reading-start edge, `--toast-inline` (set by the shell: the sidebar's width plus 16px,
 * 16px on a phone and on the sign-in page) so they never cover the sidebar's role card.
 */
export function UiProviders({ children }: { children: ReactNode }) {
  const { dir } = useI18n()
  return (
    <Direction.Provider dir={dir}>
      <MotionProvider>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster offset={{ left: 'var(--toast-inline, 16px)', right: 'var(--toast-inline, 16px)', bottom: 16 }} />
        </TooltipProvider>
      </MotionProvider>
    </Direction.Provider>
  )
}
