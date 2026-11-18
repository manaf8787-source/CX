import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useI18n, type Lang } from '@/i18n'
import { useQuestionSets } from '@/services/queriesV40'
import { SURVEY_QUESTIONS_COPY as COPY, questionSetsFor } from '@/data/surveyQuestions'
import { PRODUCTS } from '@/data/products'
import type { Product, SurveyQuestionSet } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { IN_CARD, PressFilter, SubPageHeader } from './SubPageHeader'

/**
 * Survey questions (v40 F23): the exact questions per product and moment, in both languages, with a preview of what the
 * customer receives. A product selector (six products, Real Estate first); on the left the question sets (name, when it
 * fires, how many questions), on the right the phone-style preview in the language of your choice, and below the two
 * languages side by side. Each set that is not confirmed by its product owners (PSI Club, Tour Estate, PSI Events) carries
 * [Proposed] at the set level. A product with no set (PSI Wallet) shows an empty state.
 *
 * Design: comfortable. The product selector is the segmented tab track; the sets are rows (the chosen one is the dark material); the
 * phone preview is a well holding light-material bubbles with the 6px tail; the two languages are one table in a card.
 */
export default function SurveyQuestions() {
  const { t, L, lang } = useI18n()
  const { data: sets, isLoading, isError, refetch } = useQuestionSets()
  const [product, setProduct] = useState<Product['id']>('re')
  // The preview language is the viewer's choice and survives a change of product.
  const [previewLang, setPreviewLang] = useState<Lang>(lang)

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !sets ? (
        <LoadingState rows={5} />
      ) : (
        <Tabs value={product} onValueChange={(v) => setProduct(v as Product['id'])} className="gap-4">
          <div className="-m-1 overflow-x-auto p-1">
            <TabsList className="min-w-max" aria-label={t('Product', 'المنتج')}>
              {PRODUCTS.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
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
          <ul className="flex flex-col gap-1" aria-label={t('Question sets', 'مجموعات الأسئلة')}>
            {sets.map((s) => {
              const active = s.id === selected.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPickedId(s.id)}
                    className="group/set flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-well px-4 py-3 text-start outline-none transition-colors duration-200 ease-out hover:bg-row-hover aria-pressed:material-dark aria-pressed:hover:bg-transparent"
                  >
                    <span className="t-ui-strong flex flex-wrap items-center gap-2 group-aria-pressed/set:text-inherit">
                      {L(s.name)}
                      {s.proposed && <ProposedBadge title={L(COPY.proposedNote)} />}
                    </span>
                    <span className="text-sm text-muted-foreground group-aria-pressed/set:text-(--on-dark-muted)">
                      {L(s.when)} · {L(COPY.count(s.questions.length))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {showResurveyNote && <p className="mt-4 text-sm text-muted-foreground">{L(COPY.resurveyNote)}</p>}
        </SectionCard>

        <SectionCard
          title={L(COPY.previewCaption)}
          actions={
            <PressFilter
              label={t('Preview language', 'لغة المعاينة')}
              options={[
                { id: 'en' as const, label: 'English' },
                { id: 'ar' as const, label: 'العربية' },
              ]}
              value={previewLang}
              onChange={onPreviewLang}
            />
          }
        >
          <Preview set={selected} previewLang={previewLang} />
        </SectionCard>
      </div>

      <SectionCard title={t('Both languages', 'اللغتان معاً')} description={`${L(selected.name)} · ${L(selected.when)}`} contentClassName={IN_CARD}>
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead dir="ltr">English</TableHead>
              <TableHead dir="rtl">العربية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selected.questions.map((q, i) => (
              <TableRow key={i}>
                <TableCell className="align-top tabular">{i + 1}</TableCell>
                <TableCell className="min-w-64 align-top whitespace-normal text-foreground" dir="ltr" lang="en">
                  {q.en}
                </TableCell>
                <TableCell className="min-w-64 align-top whitespace-normal text-foreground" dir="rtl" lang="ar">
                  {q.ar}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {selected.proposed && (
          <p className="mt-4 flex items-center gap-2 px-2.5 text-sm text-muted-foreground">
            <StatusBadge tone="warning">{t('[Proposed]', '[مقترح]')}</StatusBadge>
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
        className="well mx-auto flex w-full max-w-sm flex-col gap-2 rounded-[28px] p-4"
      >
        <div className="t-ui-strong flex items-center gap-2.5 pb-1">
          <span aria-hidden className="material-light inline-grid size-[30px] place-items-center rounded-full [&_svg]:size-4">
            <MessageCircle />
          </span>
          PSI
        </div>
        <p className="material-light max-w-[88%] rounded-[20px] rounded-ss-[6px] px-3.5 py-2.5 text-base text-foreground">{COPY.greeting[previewLang]}</p>
        <ol className="flex flex-col gap-2">
          {set.questions.map((q, i) => (
            <li key={i} className="material-light max-w-[88%] rounded-[20px] rounded-ss-[6px] px-3.5 py-2.5 text-base text-foreground">
              <span className="me-1.5 font-medium tabular">{i + 1}.</span>
              {q[previewLang]}
            </li>
          ))}
        </ol>
      </figure>
      <p className="text-sm text-muted-foreground">{L(COPY.footer)}</p>
    </div>
  )
}
