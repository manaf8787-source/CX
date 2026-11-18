import { useState } from 'react'
import { FlaskConical, Info, Search } from 'lucide-react'
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
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
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
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <header>
        <Card className="gap-4 py-5">
          <CardContent className="flex flex-col gap-4 px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{L(HOME_COPY.h1)}</h1>
                <p className="max-w-[72ch] text-base text-muted-foreground">{L(HOME_COPY.lede)}</p>
              </div>
              <StatusBadge tone="warning" icon={<FlaskConical aria-hidden />}>
                {L(HOME_COPY.tag)}
              </StatusBadge>
            </div>
            <StepLine />
          </CardContent>
        </Card>
      </header>

      <DailyBrief />

      <StartHere />

      <section aria-labelledby="home-indicators" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="home-indicators" className="text-lg font-semibold">
            {L(INDICATOR_COPY.heading)}
          </h2>
          <TermsButton />
        </div>
        {env !== 'all' && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {L(INDICATOR_COPY.envHint)}
          </p>
        )}
        {isLoading || !sets ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
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

      <Card className="py-5">
        <CardContent className="flex flex-col gap-3 px-5">
          <h2 className="text-lg font-semibold">{searchTitle}</h2>
          <form
            role="search"
            aria-label={searchTitle}
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              search(query)
            }}
          >
            <div className="relative flex-1">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
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
                  className="h-auto min-h-8 max-w-full rounded-full py-1 text-start font-normal whitespace-normal"
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
