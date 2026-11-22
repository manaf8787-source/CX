import { BrainCircuit, PhoneOff } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewAgentNames, resolveAgentDisplay } from '@/auth/permissions'
import { useAgentDirectory } from '@/services/queries'
import { RUNAWAY_TYPE_LABEL } from '@/utils/runaway'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import type { AiJourneyReading, Interaction } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CHANNEL_LABEL } from './channels'

/** Parts and chips on the dark feature card are the skill's `--fx-tint` (white 7%, ink 7% in the dark theme). */
const TINT = 'bg-(--on-dark-tint)'

/**
 * The journey in short (rewritten 22 Nov so the person understands it the moment they open someone): a verdict line that says in words
 * what the badge means, three plainly named parts, and the problems listed one by one with the date and where each happened.
 * "High effort" is said from the customer's side: how hard they had to work, never how hard we worked.
 */
export function AiReadingCard({ reading, interactions }: { reading: AiJourneyReading; interactions: Interaction[] }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: directory } = useAgentDirectory()
  const seesNames = canViewAgentNames(role.id)
  const agentOf = (ref?: string) => (directory ? resolveAgentDisplay(ref, role.id, directory, { en: 'Agent', ar: 'موظف' }, lang) : null)
  const tone = reading.verdict === 'healthy' ? 'success' : reading.verdict === 'high_effort' ? 'warning' : 'danger'
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

  const problems = interactions
    .filter((i) => i.problemFlags.length > 0)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const n = problems.length

  // the same agent on more than one problem: the pattern the manager asked to see
  const perAgent = new Map<string, number>()
  for (const e of problems) if (e.agentRef) perAgent.set(e.agentRef, (perAgent.get(e.agentRef) ?? 0) + 1)
  const [topAgent, topCount] = [...perAgent.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  const topLabel = topCount >= 2 ? agentOf(topAgent) : null

  const verdictLabel =
    reading.verdict === 'healthy'
      ? t('Going well', 'الأمور جيدة')
      : reading.verdict === 'high_effort'
        ? t('High effort for the customer', 'جهد مرتفع على العميل')
        : L(RUNAWAY_TYPE_LABEL[reading.verdict])
  const verdictMeaning =
    reading.verdict === 'healthy'
      ? t('No problems found on this journey.', 'لا توجد مشاكل على هذه الرحلة.')
      : reading.verdict === 'high_effort'
        ? t(
            `The customer had to work hard to get what they needed: ${n} problems on the journey (2 or more counts as high effort). They may still be with us, but the experience was tiring for them.`,
            `اضطر العميل لبذل جهد كبير ليحصل على ما يحتاجه: ${n} مشاكل على الرحلة (مشكلتان أو أكثر تُحسب جهداً مرتفعاً). قد يبقى معنا، لكن التجربة كانت متعبة له.`,
          )
        : t('The customer looks like they are leaving or have left. Reason below.', 'يبدو أن العميل يبتعد أو غادر. السبب أدناه.')

  return (
    <Card variant="dark">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="t-card-title inline-flex items-center gap-2.5">
            <span aria-hidden className={`${TINT} inline-grid size-[30px] shrink-0 place-items-center rounded-full`}>
              <BrainCircuit className="size-4" />
            </span>
            {t('This person’s journey in short', 'رحلة هذا الشخص باختصار')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('Written by AI from the CRM log, chats and scores.', 'كتبها الذكاء الاصطناعي من سجل CRM والدردشات والتقييمات.')}</p>
        </div>

        <div className={`${TINT} flex flex-wrap items-center gap-3 rounded-xl p-4`}>
          <StatusBadge tone={tone} dot className={tone === 'success' ? `bg-none ${TINT} text-foreground shadow-none` : undefined}>
            {verdictLabel}
          </StatusBadge>
          <p className="min-w-0 flex-1 basis-64 text-sm text-foreground">{verdictMeaning}</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <Part label={t('Who they are', 'من هو')} text={L(reading.whoHowLongChannels)} />
          <Part label={t('What went wrong for them', 'ما الذي حدث معه')} text={L(reading.whatWentWrong)} />
          <Part label={t('What we do now', 'ماذا نفعل الآن')} text={L(reading.whatToDoNext)} highlight />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">{t('The problems, newest first', 'المشاكل، الأحدث أولاً')}</span>
          {n === 0 ? (
            <p className="text-sm text-muted-foreground">{t('None.', 'لا يوجد.')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {problems.slice(0, 5).map((e) => {
                const rule = JOURNEY_RULES.find((r) => r.id === e.problemFlags[0])
                const ag = agentOf(e.agentRef)
                return (
                  <li key={e.id} className={`${TINT} flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3`}>
                    <span className="tabular shrink-0 text-muted-foreground sm:w-40">{fmtDate(e.occurredAt)}</span>
                    <span className="shrink-0 whitespace-nowrap font-medium text-foreground">{rule ? L(rule.label) : e.problemFlags[0]}</span>
                    <span className="text-muted-foreground">
                      {rule ? `${L(rule.definition)} ` : ''}· {L(CHANNEL_LABEL[e.channel])}
                    </span>
                    {ag && (
                      <span className="shrink-0 font-medium text-foreground sm:ms-auto">
                        {seesNames && ag.visible ? t(`Agent: ${ag.label}`, `الموظف: ${ag.label}`) : t(`Team: ${ag.label}`, `الفريق: ${ag.label}`)}
                      </span>
                    )}
                  </li>
                )
              })}
              {topLabel && (
                <li className="rounded-lg border border-(--status-warning-solid) px-3 py-2 text-sm text-foreground">
                  {seesNames && topLabel.visible
                    ? t(`${topLabel.label} was the agent on ${topCount} of these ${n} problems.`, `${topLabel.label} هو الموظف في ${topCount} من هذه المشاكل الـ${n}.`)
                    : t(`The same agent was on ${topCount} of these ${n} problems (team: ${topLabel.label}).`, `نفس الموظف في ${topCount} من هذه المشاكل الـ${n} (الفريق: ${topLabel.label}).`)}
                </li>
              )}
              {n > 5 && <li className="text-xs text-muted-foreground">{t(`and ${n - 5} more in the timeline below`, `و${n - 5} أخرى في الجدول الزمني أدناه`)}</li>}
            </ul>
          )}
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <PhoneOff aria-hidden className="mt-px size-3.5 shrink-0" />
          {t('Calls are not recorded, so the AI did not listen to any call. It only saw that a call happened.', 'المكالمات غير مسجَّلة، فلم يستمع الذكاء الاصطناعي إلى أي مكالمة. رأى فقط أن مكالمة حدثت.')}
        </p>
      </CardContent>
    </Card>
  )
}

function Part({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div className={`${TINT} flex flex-col gap-1.5 rounded-xl p-4`}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {highlight && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />}
        {label}
      </span>
      <p className={highlight ? 't-ui-strong text-foreground' : 'text-sm text-foreground'}>{text}</p>
    </div>
  )
}
