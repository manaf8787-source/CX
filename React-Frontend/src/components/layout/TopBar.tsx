import { useEffect, useRef, useState } from 'react'
import { Menu, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePersonSearch } from '@/hooks/usePersonSearch'
import { useI18n } from '@/i18n'
import { LangSwitch } from '../common/LangSwitch'
import { ThemeSwitch } from '../common/ThemeSwitch'
import { AsOfBar } from './AsOfBar'
import { UserMenu } from './UserMenu'

/** The search field (a real input, so a typed query is submitted): the skill's inset well field with a light key-hint tag at its end. */
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
      // phone: second row, beside the tools; from 640px it sits in the bar and takes a share of its width (min 170, max 280)
      className="relative order-3 min-w-0 flex-1 @min-[640px]/bar:order-none @min-[640px]/bar:ms-auto @min-[640px]/bar:w-[clamp(170px,24cqw,280px)] @min-[640px]/bar:flex-none"
      onSubmit={(e) => {
        e.preventDefault()
        search(query)
        setQuery('')
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('Find a person — name, mobile, ID', 'ابحث عن شخص — الاسم، الجوال، الهوية')}
        aria-label={t('Find a person', 'ابحث عن شخص')}
        className="h-9 ps-9 @min-[900px]/bar:pe-16"
      />
      <kbd className="material-light pointer-events-none absolute end-2 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded-full px-2 pt-px font-sans text-2xs font-medium text-muted-foreground @min-[900px]/bar:inline-flex">
        Ctrl K
      </kbd>
    </form>
  )
}

interface TopBarProps {
  /** Phone only: the menu button that opens the full-screen sheet. */
  showMenuButton: boolean
  onOpenMenu: () => void
  assistantAvailable: boolean
  onAskAssistant: () => void
  /** True once content has scrolled under the bar: it gets its 1px line. */
  scrolled: boolean
}

/**
 * The 60px top bar (the skill's "Top navigation"): the workspace selector and data status on the left (AsOfBar: environment, data as
 * of, feeds), then the search field, language, theme, the assistant (the one dark pill) and the profile menu. It is the page's `header`
 * landmark and a CSS container named `bar`, so its parts collapse by the bar's width, not the window's: the sidebar changes the
 * space. Sticky, white; the bottom line appears only while content scrolls beneath it.
 */
export function TopBar({ showMenuButton, onOpenMenu, assistantAvailable, onAskAssistant, scrolled }: TopBarProps) {
  const { t } = useI18n()
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="@container/bar sticky top-0 z-30 bg-background max-tablet:static transition-shadow duration-200 data-[scrolled=true]:shadow-[0_1px_0_var(--line)]"
    >
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 @min-[640px]/bar:flex-nowrap @min-[640px]/bar:px-[18px] @min-[640px]/bar:py-0">
        {showMenuButton && (
          <Button variant="outline" size="icon" onClick={onOpenMenu} aria-label={t('Toggle navigation', 'إظهار/إخفاء التنقل')} aria-haspopup="dialog">
            <Menu aria-hidden />
          </Button>
        )}
        <AsOfBar />
        {/* phone: a line break after the first row (menu, workspace, profile); the search and tools wrap to a second row */}
        <div aria-hidden className="order-2 h-0 basis-full @min-[640px]/bar:hidden" />
        <HeaderSearch />
        <div className="order-4 flex shrink-0 items-center gap-2 @min-[640px]/bar:order-none">
          <LangSwitch />
          <ThemeSwitch />
          {assistantAvailable && (
            <Button
              className="@max-[899px]/bar:size-9 @max-[899px]/bar:p-0"
              size="sm"
              onClick={onAskAssistant}
              aria-label={t('Ask the assistant', 'اسأل المساعد')}
            >
              <Sparkles aria-hidden />
              <span className="hidden @min-[900px]/bar:inline">{t('Ask the assistant', 'اسأل المساعد')}</span>
            </Button>
          )}
        </div>
        <div className="order-1 shrink-0 @min-[640px]/bar:order-none">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
