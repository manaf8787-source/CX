import { useMemo, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { GLOSSARY_TERMS } from '@/data/glossary'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function findTerm(key: string) {
  const k = key.toLowerCase()
  return GLOSSARY_TERMS.find((g) => g.term.en.toLowerCase() === k) ?? GLOSSARY_TERMS.find((g) => g.term.en.toLowerCase().startsWith(k))
}

/**
 * KB §14: a "?" beside a metric or heading opens its definition in place. An 18px light round button (the skill's round icon button on
 * the light material); an invisible ring of padding makes the target 30px. The "?" is drawn by CSS (`before`), so it adds no text to
 * the heading it sits in.
 */
export function TermHelp({ term, className }: { term: string; className?: string }) {
  const { t, L } = useI18n()
  const entry = findTerm(term)
  if (!entry) return null
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t(`What ${entry.term.en} means`, `معنى ${entry.term.ar}`)}
          className={cn(
            'material-light relative inline-grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-full text-2xs leading-none font-medium text-muted-foreground outline-hidden transition-colors duration-200 before:content-["?"] after:absolute after:-inset-1.5 after:content-[""] hover:text-foreground',
            className,
          )}
        />
      </PopoverTrigger>
      <PopoverContent className="flex w-80 flex-col gap-1.5 text-sm" align="start">
        <p className="t-ui-strong">{L(entry.term)}</p>
        <p className="text-muted-foreground">{L(entry.definition)}</p>
      </PopoverContent>
    </Popover>
  )
}

/** KB §14: a "What the terms mean" button on every page: the full list with search. A light pill. */
export function TermsButton() {
  const { t, L } = useI18n()
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return GLOSSARY_TERMS
    return GLOSSARY_TERMS.filter((g) => L(g.term).toLowerCase().includes(needle) || L(g.definition).toLowerCase().includes(needle))
  }, [q, L])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen aria-hidden />
          {t('What the terms mean', 'ماذا تعني المصطلحات')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('What the terms mean', 'ماذا تعني المصطلحات')}</DialogTitle>
          <DialogDescription>{t('What each term is, how it is calculated, and an example.', 'ما هو كل مصطلح، وكيف يُحسب، ومثال عليه.')}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search terms…', 'ابحث عن مصطلح…')} aria-label={t('Search terms', 'ابحث عن مصطلح')} className="h-9 ps-8" />
        </div>
        <dl className="-mx-1 flex max-h-[55dvh] flex-col gap-2 overflow-y-auto px-1 py-1">
          {list.map((g) => (
            <div key={g.term.en} className="glass flex flex-col gap-0.5 rounded-xl px-3.5 py-3">
              <dt className="t-ui-strong">{L(g.term)}</dt>
              <dd className="text-sm text-muted-foreground">{L(g.definition)}</dd>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">{t('No terms match your search.', 'لا توجد مصطلحات مطابقة لبحثك.')}</p>}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
