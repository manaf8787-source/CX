import { useState } from 'react'
import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { useRulesConfig, useUpdateRuleConfig } from '@/services/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'

/** The three numbers that decide how often a customer is asked (they used to sit in Rules as configuration, decision 5). */
export const SURVEY_RULE_IDS = ['rule_survey_nps_cap', 'rule_survey_csat_cap', 'rule_silence_why']

const PLAIN: Record<string, { en: string; ar: string }> = {
  rule_survey_nps_cap: { en: 'The same customer is asked the NPS question at most once in this many days.', ar: 'العميل نفسه يُسأل سؤال NPS مرة واحدة كحد أقصى كل هذا العدد من الأيام.' },
  rule_survey_csat_cap: { en: 'The same customer is asked the satisfaction and effort questions at most once in this many days.', ar: 'العميل نفسه يُسأل أسئلة الرضا والجهد مرة واحدة كحد أقصى كل هذا العدد من الأيام.' },
  rule_silence_why: { en: 'After this many days of silence on an enquiry, we ask "What stopped you?".', ar: 'بعد هذا العدد من أيام الصمت على استفسار، نسأل «ما الذي أوقفك؟».' },
}

export function SurveyCaps({ canEdit }: { canEdit: boolean }) {
  const { t, L } = useI18n()
  const { log } = useAuditActor()
  const { data: rules, isLoading } = useRulesConfig()
  const update = useUpdateRuleConfig()
  const [draft, setDraft] = useState<Record<string, number>>({})
  const mine = SURVEY_RULE_IDS.map((id) => (rules ?? []).find((r) => r.id === id)).filter((r) => !!r)

  return (
    <SectionCard
      title={t('How often we ask', 'كم مرة نسأل')}
      description={canEdit ? t('The numbers you can change. A change applies to the surveys sent from now on.', 'الأرقام التي يمكنك تغييرها. التغيير يسري على الاستبيانات المرسلة من الآن.') : t('View only. The CX manager changes these.', 'للعرض فقط. يغيّرها مدير تجربة العملاء.')}
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : (
        <ul className="flex flex-col" data-testid="survey-caps">
          {mine.map((r) => {
            const dirty = draft[r.id] !== undefined && draft[r.id] !== r.value
            return (
              <li key={r.id} className="row-divider flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <label htmlFor={`cap-${r.id}`} className="t-ui-strong">
                    {L(r.label)}
                  </label>
                  <span className="t-caption">{PLAIN[r.id] ? L(PLAIN[r.id]) : ''}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canEdit ? (
                    <>
                      <Input id={`cap-${r.id}`} type="number" inputMode="numeric" min={1} className="h-9 w-24 text-end tabular" value={draft[r.id] ?? r.value} onChange={(e) => setDraft((d) => ({ ...d, [r.id]: Number(e.target.value) }))} />
                      <span className="w-12 text-sm text-muted-foreground">{L(r.unit)}</span>
                      <Button
                        size="sm"
                        className={dirty ? '' : 'invisible'}
                        aria-hidden={!dirty}
                        tabIndex={dirty ? 0 : -1}
                        disabled={!(draft[r.id] >= 1)}
                        onClick={() => {
                          update.mutate({ id: r.id, value: draft[r.id] })
                          log('action', { en: `Changed "${r.label.en}" from ${r.value} to ${draft[r.id]} ${r.unit.en}`, ar: `غيّر "${r.label.ar}" من ${r.value} إلى ${draft[r.id]} ${r.unit.ar}` })
                          setDraft((d) => {
                            const { [r.id]: _gone, ...rest } = d
                            return rest
                          })
                        }}
                      >
                        {t('Save', 'حفظ')}
                      </Button>
                    </>
                  ) : (
                    <span className="t-ui-strong tabular">
                      {r.value} <span className="font-normal text-muted-foreground">{L(r.unit)}</span>
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

