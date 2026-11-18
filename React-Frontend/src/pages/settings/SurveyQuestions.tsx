// FOUNDATION STUB: owner = workstream C (a working list over `useQuestionSets`: C builds the product selector, the two-column layout and the phone preview).
import { useI18n } from '@/i18n'
import { useQuestionSets } from '@/services/queriesV40'
import { SURVEY_QUESTIONS_COPY as COPY } from '@/data/surveyQuestions'
import { PRODUCTS } from '@/data/products'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SectionCard } from '@/components/common/SectionCard'
import { SubPageHeader } from './SubPageHeader'

export default function SurveyQuestions() {
  const { L } = useI18n()
  const { data: sets, isLoading } = useQuestionSets()
  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />
      {isLoading || !sets ? (
        <LoadingState rows={5} />
      ) : (
        PRODUCTS.map((p) => {
          const mine = sets.filter((s) => s.product === p.id)
          return (
            <SectionCard key={p.id} title={L(p.name)}>
              {mine.length === 0 ? (
                <p className="text-sm text-muted-foreground">{L(COPY.empty)}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {mine.map((s) => (
                    <li key={s.id} className="flex flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {L(s.name)} {s.proposed && <ProposedBadge title={L(COPY.proposedNote)} />}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {L(s.when)} · {L(COPY.count(s.questions.length))}
                      </p>
                      <ol className="ms-5 list-decimal text-sm">
                        {s.questions.map((q, i) => (
                          <li key={i}>{L(q)}</li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )
        })
      )}
    </section>
  )
}
