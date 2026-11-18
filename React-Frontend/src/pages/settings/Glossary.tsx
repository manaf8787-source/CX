import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useGlossaryTerms } from '@/services/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

/** Ported from `frontend/src/pages/Glossary.tsx`, extended with v38 terms,
 * and given the search box NFR-6 asks for: "a sitewide 'What the terms
 * mean' search modal, sourced from one glossary data file" — this page
 * *is* that one data file's reference view; the sitewide "?" affordance
 * reading the same `useGlossaryTerms()` hook is a later, separate build
 * pass (each page would need its own "?" wiring), not done here.
 *
 * Design: comfortable. One card holds the whole list (term in ink 500 on the left, the definition in grey on the right, a row divider
 * between entries) instead of a grid of cards; the search is the inset field. */
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
    <section data-density="comfortable" className="flex flex-col gap-6">
      <SubPageHeader
        title={t('What the terms mean', 'ماذا تعني المصطلحات')}
        description={t('Plain definitions for the terms used across the portal.', 'تعريفات مبسّطة للمصطلحات المستخدمة في البوابة.')}
      />
      <div className="relative w-full sm:w-80">
        <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search terms…', 'ابحث عن مصطلح…')}
          aria-label={t('Search terms', 'ابحث عن مصطلح')}
          className="h-9 ps-9"
        />
      </div>
      {isLoading ? (
        <LoadingState rows={4} />
      ) : filtered.length ? (
        <Card>
          <CardContent>
            <dl className="flex flex-col">
              {filtered.map((g) => (
                <div key={L(g.term)} className="row-divider grid grid-cols-1 gap-1.5 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-10">
                  <dt className="t-ui-strong">{L(g.term)}</dt>
                  <dd className="t-ui">{L(g.definition)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : (
        <EmptyState title={t('No terms match your search.', 'لا توجد مصطلحات مطابقة لبحثك.')} />
      )}
    </section>
  )
}
