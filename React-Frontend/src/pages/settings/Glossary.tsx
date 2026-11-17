import { useMemo, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useGlossaryTerms } from '@/services/queries'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

/** Ported from `frontend/src/pages/Glossary.tsx`, extended with v38 terms,
 * and given the search box NFR-6 asks for: "a sitewide 'What the terms
 * mean' search modal, sourced from one glossary data file" — this page
 * *is* that one data file's reference view; the sitewide "?" affordance
 * reading the same `useGlossaryTerms()` hook is a later, separate build
 * pass (each page would need its own "?" wiring), not done here. */
export default function Glossary() {
  const { t, L } = useI18n()
  const { data: terms, isLoading } = useGlossaryTerms()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return terms ?? []
    return (terms ?? []).filter((g) => L(g.term).toLowerCase().includes(needle) || L(g.definition).toLowerCase().includes(needle))
  }, [terms, q, L])

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('What the terms mean', 'ماذا تعني المصطلحات')}
        description={t('Plain definitions for the terms used across the portal.', 'تعريفات مبسّطة للمصطلحات المستخدمة في البوابة.')}
      />
      <div className="relative w-full sm:w-80">
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search terms…', 'ابحث عن مصطلح…')}
          aria-label={t('Search terms', 'ابحث عن مصطلح')}
          className="h-9 bg-card ps-8"
        />
      </div>
      {isLoading ? (
        <LoadingState rows={4} />
      ) : filtered.length ? (
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((g) => (
            <div key={L(g.term)} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs">
              <dt className="flex items-center gap-2 text-base font-semibold">
                <BookOpen aria-hidden className="size-4 shrink-0 text-gold-text" />
                {L(g.term)}
              </dt>
              <dd className="text-sm text-muted-foreground">{L(g.definition)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <EmptyState title={t('No terms match your search.', 'لا توجد مصطلحات مطابقة لبحثك.')} />
      )}
    </section>
  )
}
