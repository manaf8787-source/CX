import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { AppSidebar } from './Sidebar'
import { RouteTransition } from './RouteTransition'
import { UserMenu } from './UserMenu'
import { LangSwitch } from '../common/LangSwitch'
import { ThemeSwitch } from '../common/ThemeSwitch'
import { LoadingState } from '../common/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { usePersonSearch } from '@/hooks/usePersonSearch'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canUseAssistant } from '@/auth/access'
import { AssistantContext } from '../ai/AssistantContext'
import { AccessGuard } from './AccessGuard'

const AssistantPanel = lazy(() => import('../ai/AssistantPanel').then((m) => ({ default: m.AssistantPanel })))

function HeaderSearch() {
  const { t } = useI18n()
  const search = usePersonSearch()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1 md:max-w-md"
      onSubmit={(e) => {
        e.preventDefault()
        search(query)
        setQuery('')
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('Find a person — name, mobile, ID', 'ابحث عن شخص — الاسم، الجوال، الهوية')}
        aria-label={t('Find a person', 'ابحث عن شخص')}
        className="h-9 bg-card ps-8 md:pe-14"
      />
      <kbd className="pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground md:inline-block">
        Ctrl K
      </kbd>
    </form>
  )
}

export function Shell() {
  const { t } = useI18n()
  const { role } = useRole()
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [question, setQuestion] = useState<{ text: string; key: number } | null>(null)
  const available = canUseAssistant(role.id)
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

  return (
    <AssistantContext.Provider value={controls}>
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-5">
          <SidebarTrigger className="size-9 shrink-0" aria-label={t('Toggle navigation', 'إظهار/إخفاء التنقل')} />
          <Separator orientation="vertical" className="hidden data-[orientation=vertical]:h-5 sm:block" />
          <HeaderSearch />
          <div className="ms-auto flex shrink-0 items-center gap-1">
            <LangSwitch />
            <ThemeSwitch />
            {available && (
              <Button variant="gold" className="ms-1 h-9 gap-1.5 px-2.5 sm:px-3" onClick={() => controls.open()} aria-label={t('Ask the assistant', 'اسأل المساعد')}>
                <Sparkles aria-hidden />
                <span className="hidden sm:inline">{t('Ask the assistant', 'اسأل المساعد')}</span>
              </Button>
            )}
            <UserMenu />
          </div>
        </header>
        <div id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 overflow-x-clip p-4 outline-none md:p-6">
          <Suspense fallback={<LoadingState rows={6} />}>
            <RouteTransition>
              <AccessGuard>
                <Outlet />
              </AccessGuard>
            </RouteTransition>
          </Suspense>
        </div>
      </SidebarInset>

      <Sheet open={assistantOpen && available} onOpenChange={setAssistantOpen}>
        <SheetContent side="right" showCloseButton={false} aria-describedby={undefined} className="w-full gap-0 p-0 sm:max-w-md">
          <Suspense fallback={<LoadingState rows={3} className="p-4" />}>
            <AssistantPanel key={question?.key ?? 'empty'} initialQuestion={question?.text} onClose={() => setAssistantOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
    </AssistantContext.Provider>
  )
}
