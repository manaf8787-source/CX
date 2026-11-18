import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useI18n, type Lang } from '@/i18n'
import { useQuestionSets } from '@/services/queriesV40'
import { SURVEY_QUESTIONS_COPY as COPY, questionSetsFor } from '@/data/surveyQuestions'
import { PRODUCTS } from '@/data/products'
import { cn } from '@/lib/utils'
import type { Product, SurveyQuestionSet } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { SubPageHeader } from './SubPageHeader'

/**
 * Survey questions (v40 F23): the exact questions per product and moment, in both languages, with a preview of what the
 * customer receives. A product selector (six products, Real Estate first); on the left the question sets (name, when it
 * fires, how many questions), on the right the phone-style preview in the language of your choice, and below the two
 * languages side by side. Each set that is not confirmed by its product owners (PSI Club, Tour Estate, PSI Events) carries
 * [Proposed] at the set level. A product with no set (PSI Wallet) shows an empty state.
 */
export default function SurveyQuestions() {
  const { t, L, lang } = useI18n()
  const { data: sets, isLoading, isError, refetch } = useQuestionSets()
  const [product, setProduct] = useState<Product['id']>('re')
  // The preview language is the viewer's choice and survives a change of product.
  const [previewLang, setPreviewLang] = useState<Lang>(lang)

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !sets ? (
        <LoadingState rows={5} />
      ) : (
        <Tabs value={product} onValueChange={(v) => setProduct(v as Product['id'])} className="gap-4">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="h-10 min-w-max" aria-label={t('Product', 'المنتج')}>
              {PRODUCTS.map((p) => (
                <TabsTrigger key={p.id} value={p.id} className="gap-1.5 px-3">
                  {L(p.name)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {PRODUCTS.map((p) => (
            <TabsContent key={p.id} value={p.id} className="flex flex-col gap-4">
              <ProductSets product={p} sets={questionSetsFor(p.id, sets)} previewLang={previewLang} onPreviewLang={setPreviewLang} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  )
}

function ProductSets({ product, sets, previewLang, onPreviewLang }: { product: Product; sets: SurveyQuestionSet[]; previewLang: Lang; onPreviewLang: (l: Lang) => void }) {
  const { t, L } = useI18n()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const selected = sets.find((s) => s.id === pickedId) ?? sets[0]

  if (!selected) return <EmptyState title={L(COPY.empty)} />

  // The re-survey rule applies to every product with a close-the-loop call, though the prototype lists the set under Real Estate only.
  const showResurveyNote = product.live && !sets.some((s) => s.id === 're2')

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={L(product.name)} description={t(`${sets.length} sets, one per moment`, `${sets.length} مجموعات، واحدة لكل لحظة`)}>
          <ul className="flex flex-col gap-2" aria-label={t('Question sets', 'مجموعات الأسئلة')}>
            {sets.map((s) => {
              const active = s.id === selected.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPickedId(s.id)}
                    className={cn(
                      'flex w-full min-w-0 flex-col gap-1 rounded-lg border px-3 py-2.5 text-start outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      active ? 'border-primary bg-primary/5' : 'hover:bg-muted/60',
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {L(s.name)}
                      {s.proposed && <ProposedBadge title={L(COPY.proposedNote)} />}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {L(s.when)} · {L(COPY.count(s.questions.length))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {showResurveyNote && <p className="mt-3 text-sm text-muted-foreground">{L(COPY.resurveyNote)}</p>}
        </SectionCard>

        <SectionCard
          title={L(COPY.previewCaption)}
          actions={
            <div role="group" aria-label={t('Preview language', 'لغة المعاينة')} className="inline-flex rounded-lg bg-muted p-0.5">
              {(['en', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={previewLang === l}
                  onClick={() => onPreviewLang(l)}
                  className={cn(
                    'h-8 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    previewLang === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {l === 'en' ? 'English' : 'العربية'}
                </button>
              ))}
            </div>
          }
        >
          <Preview set={selected} previewLang={previewLang} />
        </SectionCard>
      </div>

      <SectionCard title={t('Both languages', 'اللغتان معاً')} description={`${L(selected.name)} · ${L(selected.when)}`}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 px-3 text-xs font-semibold text-muted-foreground">#</TableHead>
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">English</TableHead>
                <TableHead className="px-3 text-xs font-semibold text-muted-foreground">العربية</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.questions.map((q, i) => (
                <TableRow key={i}>
                  <TableCell className="px-3 py-2.5 align-top tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="min-w-64 px-3 py-2.5 align-top whitespace-normal" dir="ltr" lang="en">
                    {q.en}
                  </TableCell>
                  <TableCell className="min-w-64 px-3 py-2.5 align-top whitespace-normal" dir="rtl" lang="ar">
                    {q.ar}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {selected.proposed && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge tone="warning" className="border-dashed">
              {t('[Proposed]', '[مقترح]')}
            </StatusBadge>
            {L(COPY.proposedNote)}
          </p>
        )}
      </SectionCard>
    </>
  )
}

/** The phone-style preview: what the customer receives on WhatsApp or in the app, in their language. */
function Preview({ set, previewLang }: { set: SurveyQuestionSet; previewLang: Lang }) {
  const { t, L } = useI18n()
  const dir = previewLang === 'ar' ? 'rtl' : 'ltr'
  return (
    <div className="flex flex-col gap-3">
      <figure
        aria-label={t('Preview of the survey on a phone', 'معاينة الاستبيان على هاتف')}
        dir={dir}
        lang={previewLang}
        className="mx-auto flex w-full max-w-sm flex-col gap-2 rounded-[2rem] border-4 border-foreground/15 bg-muted/40 p-4"
      >
        <div className="flex items-center gap-2 pb-1 text-sm font-semibold">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-success/15 text-success-text">
            <MessageCircle className="size-4" />
          </span>
          PSI
        </div>
        <p className="max-w-[88%] rounded-2xl rounded-ss-sm bg-card px-3 py-2 text-sm shadow-xs">{COPY.greeting[previewLang]}</p>
        <ol className="flex flex-col gap-2">
          {set.questions.map((q, i) => (
            <li key={i} className="max-w-[88%] rounded-2xl rounded-ss-sm bg-card px-3 py-2 text-sm shadow-xs">
              <span className="me-1.5 font-semibold tabular-nums">{i + 1}.</span>
              {q[previewLang]}
            </li>
          ))}
        </ol>
      </figure>
      <p className="text-sm text-muted-foreground">{L(COPY.footer)}</p>
    </div>
  )
}
