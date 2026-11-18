import { useState } from 'react'
import { Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { usePersonSearch } from '@/hooks/usePersonSearch'
import { useAssistant } from '@/components/ai/AssistantContext'
import { SUGGESTED_QUERIES } from '@/components/ai/assistantEngine'
import { HOME_COPY } from '@/data/steps'
import { INDICATOR_COPY } from '@/data/indicators'
import { useProducts } from '@/services/queries'
import { useEnvScope, useIndicators } from '@/services/queriesV40'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { InlineNote } from '@/components/common/InlineNote'
import { SampleBanner } from '@/components/common/SampleBanner'
import { TermsButton } from '@/components/common/TermHelp'
import { DailyBrief } from '@/components/home/DailyBrief'
import { IndicatorCard } from '@/components/home/IndicatorCard'
import { StartHere } from '@/components/home/StartHere'
import { StepLine } from '@/components/home/StepLine'
import { WorkToday } from '@/components/home/WorkToday'

/**
 * Home as v40 builds it (docs/V40_DELTA.md F01), top to bottom: the header with the six-step line, the Daily brief,
 * "New here? Three things to know", the indicators per live product, "Your work today", and the one search.
 * Everything here reads the same registers as the pages it links to, narrowed by the environment switch where it carries one.
 *
 * Design (comfortable density, docs/MEO_PAGES_A.md): one white header card holding the six-step wells, the Daily brief as the ONE dark
 * feature card, a quiet well for the three notes, a card per live product (card -> three wells), then the work list and the search.
 * Colour appears only as the product dots and the status dots; every number is ink.
 */
export default function Home() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { env } = useEnvScope()
  const search = usePersonSearch()
  const assistant = useAssistant()
  const [query, setQuery] = useState('')
  const { data: sets, isLoading } = useIndicators()
  const { data: products } = useProducts()

  // One card per live product. A role with a product of its own (environment management, team leads, After-Sales) reads only that one.
  const cards = (sets ?? []).filter((s) => !role.product || s.productId === role.product).flatMap((set) => {
    const product = products?.find((p) => p.id === set.productId)
    return product ? [{ set, product }] : []
  })

  const searchTitle = assistant.available ? t('Find a person, or ask', 'ابحث عن شخص، أو اسأل') : t('Find a person', 'ابحث عن شخص')

  return (
    <div data-density="comfortable" className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
      <header>
        <Card>
          <CardContent className="flex flex-col gap-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <h1 className="t-page-title text-[20px] tablet:text-[22px] desktop:text-[24px]">{L(HOME_COPY.h1)}</h1>
                <p className="t-body-m max-w-[72ch]">{L(HOME_COPY.lede)}</p>
              </div>
              <SampleBanner>{L(HOME_COPY.tag)}</SampleBanner>
            </div>
            <StepLine />
          </CardContent>
        </Card>
      </header>

      <DailyBrief />

      <StartHere />

      <section aria-labelledby="home-indicators" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="home-indicators" className="t-card-title">
            {L(INDICATOR_COPY.heading)}
          </h2>
          <TermsButton />
        </div>
        {env !== 'all' && (
          <InlineNote>{L(INDICATOR_COPY.envHint)}</InlineNote>
        )}
        {isLoading || !sets ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-52 rounded-card" />
            <Skeleton className="h-52 rounded-card" />
          </div>
        ) : cards.length === 0 ? (
          <EmptyState title={t('No live product to show.', 'لا منتج فعّال لعرضه.')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cards.map(({ set, product }) => (
              <IndicatorCard key={set.productId} set={set} product={product} />
            ))}
          </div>
        )}
      </section>

      <WorkToday />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="t-card-title">{searchTitle}</h2>
          <form
            role="search"
            aria-label={searchTitle}
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              search(query)
            }}
          >
            <div className="relative flex-1">
              <Search aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('Search for a person', 'ابحث عن شخص')}
                placeholder={
                  assistant.available
                    ? t('A name, a mobile, an ID, or a question: who left from Dubai this month?', 'اسم، جوال، هوية، أو سؤال: مين طلع من دبي هالشهر؟')
                    : t('A name, a mobile or an ID', 'اسم أو جوال أو هوية')
                }
                className="h-12 ps-10 text-base md:text-base"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6">
              {t('Go', 'ابحث')}
            </Button>
          </form>
          {assistant.available && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('Example requests', 'أمثلة على الطلبات')}>
              {SUGGESTED_QUERIES.slice(0, 3).map((q) => (
                <Button
                  key={q.en}
                  type="button"
                  variant="outline"
                  size="sm"
                  roll={false}
                  className="h-auto min-h-9 max-w-full py-1.5 text-start whitespace-normal"
                  onClick={() => assistant.open(L(q))}
                >
                  {L(q)}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
