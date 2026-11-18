import { ArrowRight, ListPlus, Megaphone, Save } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { ACTION_KIND } from '@/lib/actionKinds'
import { CHANNEL_LABEL } from '@/components/customers/channels'
import { useCreateProposedActions, useSaveCampaignBrief } from '@/services/referenceQueries'
import { Button } from '@/components/ui/button'
import type { AssistantAnswer } from './assistantEngine'

/** KB §2: the CX team creates corrective actions and the CX manager approves them. */
const CAN_CREATE_ACTIONS = new Set(['cxmgr', 'cxteam'])
/** KB §13: the campaign brief is saved for Marketing. */
const CAN_SAVE_BRIEF = new Set(['cxmgr', 'cxteam', 'marketing'])

export function AssistantResult({
  answer,
  onOpenPerson,
  onDone,
}: {
  answer: AssistantAnswer
  onOpenPerson: (id: string) => void
  onDone: (message: string) => void
}) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const createActions = useCreateProposedActions()
  const saveBrief = useSaveCampaignBrief()

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {answer.people && answer.people.length > 0 && (
        <ul className="flex max-h-64 flex-col overflow-y-auto rounded-[14px] bg-card px-1.5 text-sm shadow-card-sm">
          {answer.people.slice(0, 12).map((p) => (
            <li key={p.id} className="row-divider flex items-start gap-2 px-2 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{L(p.reason)}</span>
                <span className="text-xs">
                  {t('Reach via', 'التواصل عبر')}: <span className="font-medium">{L(p.reachVia)}</span>
                </span>
              </div>
              <Button size="icon-sm" variant="ghost" aria-label={t(`Open ${p.name}`, `فتح ${p.name}`)} onClick={() => onOpenPerson(p.id)}>
                <ArrowRight aria-hidden className="rtl:rotate-180" />
              </Button>
            </li>
          ))}
          {answer.people.length > 12 && (
            <li className="px-2 py-2.5 text-xs text-muted-foreground">
              {t(`and ${answer.people.length - 12} more`, `و${answer.people.length - 12} آخرين`)}
            </li>
          )}
        </ul>
      )}

      {answer.plan && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-card p-3.5 text-sm shadow-card-sm">
          <span className="font-medium">{t('Corrective action plan', 'خطة الإجراءات التصحيحية')}</span>
          {answer.plan.length === 0 ? (
            <span className="text-muted-foreground">{t('No fault repeats in this group yet — nothing to propose.', 'لا يتكرر أي خطأ في هذه المجموعة بعد — لا شيء لاقتراحه.')}</span>
          ) : (
            <ol className="flex list-decimal flex-col gap-1.5 ps-5">
              {answer.plan.map((line) => (
                <li key={line.flag}>
                  <span className="font-medium">{L(line.fault)}</span> ×{line.count} · {L(ACTION_KIND[line.kind].label)}
                  <div className="text-xs text-muted-foreground">
                    {t('Owner', 'المالك')}: {L(line.owner)}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {answer.plan.length > 0 &&
            (CAN_CREATE_ACTIONS.has(role.id) ? (
              <Button
                size="sm"
                className="self-start"
                disabled={createActions.isPending || createActions.isSuccess}
                onClick={() =>
                  createActions.mutate(
                    { plan: answer.plan!, scope: { en: 'this group', ar: 'هذه المجموعة' } },
                    { onSuccess: (list) => onDone(t(`${list.length} proposed actions created — waiting for the owners’ decision`, `أُنشئ ${list.length} إجراءً مقترحاً — بانتظار قرار المالكين`)) },
                  )
                }
              >
                <ListPlus aria-hidden />
                {createActions.isSuccess ? t('Created as proposed actions', 'أُنشئت كإجراءات مقترحة') : t('Create as proposed actions', 'إنشاء كإجراءات مقترحة')}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">{t('Only the CX team creates proposed actions.', 'فريق تجربة العملاء وحده ينشئ الإجراءات المقترحة.')}</span>
            ))}
        </div>
      )}

      {answer.brief && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-card p-3.5 text-sm shadow-card-sm">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Megaphone aria-hidden className="size-4 text-muted-foreground" />
            {L(answer.brief.title)}
          </span>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">{t('Who', 'من')}</dt>
            <dd>{L(answer.brief.who)}</dd>
            <dt className="text-muted-foreground">{t('Channel split', 'توزيع القنوات')}</dt>
            <dd>{answer.brief.channelSplit.map((c) => `${L(CHANNEL_LABEL[c.channel])} ${c.count}`).join(' · ') || '—'}</dd>
            <dt className="text-muted-foreground">{t('Language', 'اللغة')}</dt>
            <dd>
              {t('Arabic', 'العربية')} {answer.brief.languageSplit.ar} · {t('English', 'الإنجليزية')} {answer.brief.languageSplit.en}
            </dd>
            <dt className="text-muted-foreground">{t('Message', 'الرسالة')}</dt>
            <dd>{L(answer.brief.message)}</dd>
            <dt className="text-muted-foreground">{t('Timing', 'التوقيت')}</dt>
            <dd>{L(answer.brief.timing)}</dd>
            <dt className="text-muted-foreground">{t('What not to do', 'ما يجب تجنبه')}</dt>
            <dd>{L(answer.brief.whatNotToDo)}</dd>
          </dl>
          {CAN_SAVE_BRIEF.has(role.id) ? (
            <Button
              size="sm"
              className="self-start"
              disabled={saveBrief.isPending || saveBrief.isSuccess || answer.brief.segmentSize === 0}
              onClick={() =>
                saveBrief.mutate(
                  { brief: answer.brief!, savedBy: role.name },
                  { onSuccess: () => onDone(t('Brief saved for Marketing (Personas and campaigns)', 'حُفظ الملخص للتسويق (الشخصيات والحملات)')) },
                )
              }
            >
              <Save aria-hidden />
              {saveBrief.isSuccess ? t('Saved for Marketing', 'حُفظ للتسويق') : t('Save for Marketing', 'حفظ للتسويق')}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t('Saving a brief is for CX and Marketing.', 'حفظ الملخص لفريق تجربة العملاء والتسويق.')}</span>
          )}
        </div>
      )}
    </div>
  )
}
