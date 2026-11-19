import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingState } from '../common/LoadingState'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canUseAssistant } from '@/auth/access'
import { cn } from '@/lib/utils'
import { AssistantContext } from '../ai/AssistantContext'
import { AccessGuard } from './AccessGuard'
import { AppSidebar } from './Sidebar'
import { RouteTransition } from './RouteTransition'
import { TopBar } from './TopBar'
import { TraceHost } from '../trace/TraceHost'
import { TourHost } from '../tour/TourHost'
import { TourProvider } from '../tour/TourProvider'
import { readSidebarExpanded, writeSidebarExpanded } from './sidebarState'
import { useScrollEdge } from './useScrollEdge'
import { useViewportMode } from './useViewportMode'

const AssistantPanel = lazy(() => import('../ai/AssistantPanel').then((m) => ({ default: m.AssistantPanel })))

/**
 * The application shell (docs/MEO_DESIGN_SYSTEM.md, section "Shell"): a grid of the sidebar (220px, 56px as a rail, none on a phone)
 * and a column holding the 60px top bar and the page. The page is white and the sidebar #f6f6f6 with no divider (the tone change is the
 * edge). Above 1440px the whole app sits in a framed card on a #f6f6f6 page (outer radius 26 and padding 10, inner radius 18 with a
 * hairline); the window scrolls, so sticky page elements keep working. Landmarks: a skip link, one `nav` (sidebar), one `header`
 * (top bar), one `main`. A page that should use the full width (a wide table) puts `data-fluid-page` on its root; others read at
 * most 1320px wide.
 */
export function Shell() {
  const { t, dir } = useI18n()
  const { role } = useRole()
  const mode = useViewportMode()
  const [expanded, setExpanded] = useState(readSidebarExpanded)
  const [navOpen, setNavOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [question, setQuestion] = useState<{ text: string; key: number } | null>(null)
  const { ref: sentinelRef, scrolled } = useScrollEdge()
  const gridRef = useRef<HTMLDivElement>(null)
  const available = canUseAssistant(role.id)
  const rail = mode === 'tablet' || (mode === 'desktop' && !expanded)

  // A menu sheet left open must not survive a resize to the desktop layout (adjust state while rendering, not in an effect).
  const [seenMode, setSeenMode] = useState(mode)
  if (mode !== seenMode) {
    setSeenMode(mode)
    setNavOpen(false)
  }

  const controls = useMemo(
    () => ({
      available,
      open: (q?: string) => {
        if (!available) return
        setQuestion(q?.trim() ? { text: q.trim(), key: Date.now() } : null)
        setAssistantOpen(true)
      },
    }),
    [available],
  )

  const setDesktopExpanded = (next: boolean) => {
    setExpanded(next)
    writeSidebarExpanded(next)
  }

  // Ctrl/Cmd+B: the sidebar primitive's own shortcut collapses or expands the desktop sidebar (through `onOpenChange` below); on a
  // tablet or phone the same key opens or closes the menu sheet.
  useEffect(() => {
    if (mode === 'desktop') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) setNavOpen((open) => !open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  // Toasts sit bottom-left (bottom-right in Arabic): keep them clear of the sidebar and its role card.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const root = document.documentElement
    const apply = () => {
      const rect = grid.getBoundingClientRect()
      const side = mode === 'phone' ? 0 : rail ? 56 : 220
      const inline = dir === 'rtl' ? window.innerWidth - rect.right + side + 16 : rect.left + side + 16
      root.style.setProperty('--toast-inline', `${Math.max(16, Math.round(inline))}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      root.style.removeProperty('--toast-inline')
    }
  }, [mode, rail, dir])

  return (
    <AssistantContext.Provider value={controls}>
      <TourProvider>
        <SidebarProvider open={!rail} onOpenChange={(open) => mode === 'desktop' && setDesktopExpanded(open)}>
          <a
            href="#main"
            className="material-dark sr-only z-50 rounded-full px-4 pt-1.5 pb-2 text-sm font-medium focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
          >
            {t('Skip to content', 'انتقل إلى المحتوى')}
          </a>

          {/* Page. Above 1440px: soft page, frame card (radius 26, padding 10, window shadow), inner surface (radius 18, hairline). */}
          <div className="min-h-svh min-w-0 flex-1 bg-background min-[1441px]:bg-soft min-[1441px]:p-[22px]">
            <div className="mx-auto min-[1441px]:max-w-[1600px] min-[1441px]:rounded-frame min-[1441px]:bg-card min-[1441px]:p-2.5 min-[1441px]:shadow-window">
              <div className="min-[1441px]:overflow-clip min-[1441px]:rounded-inner min-[1441px]:bg-background min-[1441px]:shadow-hairline">
                <div
                  ref={gridRef}
                  className={cn(
                    'grid min-h-svh min-[1441px]:min-h-[calc(100svh-64px)]',
                    mode === 'phone'
                      ? 'grid-cols-[minmax(0,1fr)]'
                      : 'transition-[grid-template-columns] duration-400 ease-spring ' +
                          (rail ? 'grid-cols-[var(--sidebar-w-icon)_minmax(0,1fr)]' : 'grid-cols-[var(--sidebar-w)_minmax(0,1fr)]'),
                  )}
                >
                  <AppSidebar
                    mode={mode}
                    expanded={expanded}
                    onToggle={() => (mode === 'desktop' ? setDesktopExpanded(!expanded) : setNavOpen(true))}
                    sheetOpen={navOpen}
                    onSheetOpenChange={setNavOpen}
                  />
                  <div className="flex min-w-0 flex-col">
                    {/* Where the top bar naturally starts: when it leaves the viewport the bar is stuck and gets its hairline. */}
                    <div ref={sentinelRef} aria-hidden className="-mb-px h-px" />
                    <TopBar
                      showMenuButton={mode === 'phone'}
                      onOpenMenu={() => setNavOpen(true)}
                      assistantAvailable={available}
                      onAskAssistant={() => controls.open()}
                      scrolled={scrolled}
                    />
                    <main
                      id="main"
                      tabIndex={-1}
                      className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-4 overflow-x-clip px-5 pt-2 pb-10 outline-hidden focus-visible:[--tw-ring-shadow:0_0_#0000] tablet:px-6 desktop:px-8 has-[[data-fluid-page]]:max-w-none"
                    >
                      <Suspense fallback={<LoadingState rows={6} />}>
                        <RouteTransition>
                          <AccessGuard>
                            <Outlet />
                          </AccessGuard>
                        </RouteTransition>
                      </Suspense>
                    </main>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opens the signal detail dialog from any page, driven by the ?sg= search param (v40 F11). */}
          <TraceHost />

          {/* The guided tour (v41 F28): dim, frame and card above everything, drawn only while it runs. */}
          <TourHost />

          <Sheet open={assistantOpen && available} onOpenChange={setAssistantOpen}>
            <SheetContent side="right" showCloseButton={false} aria-describedby={undefined} className="gap-0 overflow-hidden p-0 sm:max-w-md">
              <Suspense fallback={<LoadingState rows={3} className="p-4" />}>
                <AssistantPanel key={question?.key ?? 'empty'} initialQuestion={question?.text} onClose={() => setAssistantOpen(false)} />
              </Suspense>
            </SheetContent>
          </Sheet>
        </SidebarProvider>
      </TourProvider>
    </AssistantContext.Provider>
  )
}
