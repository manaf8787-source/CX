import { useMemo, useState } from 'react'
import { BookOpen, CircleHelp, Search } from 'lucide-react'
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

/** KB §14: a "?" beside a metric or heading opens its definition in place. */
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
            'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
            className,
          )}
        >
          <CircleHelp aria-hidden className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="start">
        <p className="mb-1 font-semibold">{L(entry.term)}</p>
        <p className="text-muted-foreground">{L(entry.definition)}</p>
      </PopoverContent>
    </Popover>
  )
}

/** KB §14: a "What the terms mean" button on every page — the full list with search. */
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
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
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
        <dl className="-mx-1 flex max-h-[55dvh] flex-col gap-3 overflow-y-auto px-1">
          {list.map((g) => (
            <div key={g.term.en} className="flex flex-col gap-0.5 rounded-lg border p-3">
              <dt className="text-sm font-semibold">{L(g.term)}</dt>
              <dd className="text-sm text-muted-foreground">{L(g.definition)}</dd>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">{t('No terms match your search.', 'لا توجد مصطلحات مطابقة لبحثك.')}</p>}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
