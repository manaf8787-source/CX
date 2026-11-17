import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import * as m from 'motion/react-m'
import { useI18n } from '@/i18n'
import { dirSign, ENTER } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Fades and slides page content in from the reading-end edge when the route
 * changes; the shell and sidebar stay put. Enter-only on purpose: the old page
 * leaves instantly (exit faster than enter), which also keeps lazy routes'
 * Suspense boundaries simple. `.cx-page` staggers the page's sections in.
 *
 * `scope="page"` keys on the top-level section (/actions, /settings …), so tab
 * changes inside a section don't replay the whole page; `scope="section"` is
 * for those nested outlets and keys on the full path.
 */
export function RouteTransition({ children, scope = 'page', className }: { children: ReactNode; scope?: 'page' | 'section'; className?: string }) {
  const { pathname } = useLocation()
  const { dir } = useI18n()
  const segment = pathname.split('/')[1] ?? ''
  const key = scope === 'section' || segment === 'customers' ? pathname : segment
  const offset = (scope === 'page' ? 12 : 8) * dirSign(dir)

  return (
    <m.div key={key} initial={{ opacity: 0, x: offset }} animate={{ opacity: 1, x: 0 }} transition={ENTER} className={cn('cx-page flex min-w-0 flex-1 flex-col', className)}>
      {children}
    </m.div>
  )
}
