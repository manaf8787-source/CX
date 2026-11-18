import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canJudgeSample, canViewNamesInSample } from '@/auth/permissions'
import { useAgentPassRates, useJudgeSample, useSupervisorTests, useWeeklySample } from '@/services/queriesV40'
import { usePersonsAll } from '@/services/queries'
import { WEEKLY_SAMPLE_COPY as COPY } from '@/data/weeklySample'
import { personLabel } from '@/utils/peopleExport'
import { kindOfTraceId } from '@/utils/trace'
import { AgentChip } from '@/components/common/AgentChip'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { KpiTile } from '@/components/common/KpiTile'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TraceId } from '@/components/common/TraceId'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Segmented } from '@/components/ui/segmented'
import { IN_CARD, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

type Filter = 'all' | 'unread' | 'wrong'

/** One half of the Right / Wrong pair: a 29px pill key (the light one is Right, the dark one Wrong). */
const VERDICT_KEY = 'inline-flex min-h-[29px] cursor-pointer items-center justify-center rounded-full px-3.5 pt-[3px] pb-[5px] text-sm font-medium whitespace-nowrap outline-hidden transition-opacity duration-200 hover:opacity-85'

/**
 * Weekly sample (v40 F31): fifty outputs that passed the supervisor this week, read by eye. Each one is Right or Wrong; a
 * "Wrong" becomes a new test for the supervisor and lowers that agent's pass rate (decided 18 Nov, so no page-level badge;
 * the pass-rate formula is still [Proposed], badged where the rates are). It is due every Thursday. The CX manager, the CX
 * team and the Internal Audit and Marketing Lead judge; others read. A sample text never holds a customer name: an item
 * about a person shows `personLabel`, so the Internal Audit and Marketing Lead sees `P-005`, not a name.
 *
 * Design: a register, so dense. Right and Wrong are a light/dark segmented pair on a well track (the skill's segmented control read as
 * two answers); a judged row shows its verdict as a tag and a small "Change". A role that may only read sees plain text, not buttons.
 */
export default function WeeklySample() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: sample, isLoading, isError, refetch } = useWeeklySample()
  const { data: persons } = usePersonsAll()
  const { data: rates } = useAgentPassRates()
  const { data: tests } = useSupervisorTests()
  const judge = useJudgeSample()
  const canJudge = canJudgeSample(role.id)
  const [filter, setFilter] = useState<Filter>('all')
  const c = COPY.columns

  const numbered = useMemo(() => (sample?.items ?? []).map((item, i) => ({ item, n: i + 1 })), [sample])
  const shown = numbered.filter(({ item }) => (filter === 'all' ? true : filter === 'unread' ? item.verdict === null : item.verdict === false))
  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB'
  const fmtDue = (d: string) => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`))
  const name = (personId?: string) => {
    if (!personId) return null
    const p = persons?.find((x) => x.id === personId)
    return p ? personLabel(p, role.id) : null
  }

  function verdict(id: string, agent: number, right: boolean) {
    judge.mutate(
      { id, right },
      {
        onSuccess: () =>
          toast(
            right
              ? t('Marked right.', 'عُلّم كصحيح.')
              : t(`Marked wrong: a new supervisor test was added and Agent ${agent}'s pass rate was lowered.`, `عُلّم كخطأ: أُضيف اختبار جديد للسوبرفايزر وانخفضت نسبة نجاح الوكيل ${agent}.`),
          ),
      },
    )
  }

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t('All', 'الكل'), count: numbered.length },
    { id: 'unread', label: t('To read', 'للقراءة'), count: numbered.filter(({ item }) => item.verdict === null).length },
    { id: 'wrong', label: t('Wrong', 'خطأ'), count: numbered.filter(({ item }) => item.verdict === false).length },
  ]

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />

      {!canJudge && <ViewOnlyNotice>{t('You can read the sample. The CX manager, the CX team and the Internal Audit and Marketing Lead judge it.', 'يمكنك قراءة العينة. يحكم عليها مدير CX وفريقه ومدير التدقيق الداخلي والتسويق.')}</ViewOnlyNotice>}

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !sample ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiTile label={L(COPY.tiles.read)} value={`${sample.read} / ${sample.size}`} />
            <KpiTile label={L(COPY.tiles.wrong)} value={sample.wrong} accent={sample.wrong ? 'var(--destructive)' : undefined} />
            <KpiTile label={L(COPY.tiles.accuracy)} value={sample.accuracyPct === null ? '–' : `${sample.accuracyPct}%`} />
            <KpiTile label={L(COPY.tiles.due)} value={fmtDue(sample.due)} />
          </div>

          <SectionCard
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                {t('Pass rate this week', 'نسبة النجاح هذا الأسبوع')}
                <ProposedBadge title={t('The size of the drop is not decided: here a wrong takes its share of the agent’s sampled outputs off its pass rate.', 'حجم الانخفاض لم يُحسم: هنا يخصم كل خطأ حصته من مخرجات الوكيل في العينة من نسبة نجاحه.')} />
              </span>
            }
            description={t(
              'A "wrong" lowers that agent’s pass rate (the agents page shows the same figure) and becomes a test the supervisor runs from now on.',
              'كل "خطأ" يخفض نسبة نجاح ذلك الوكيل (صفحة الوكلاء تعرض الرقم نفسه) ويصبح اختباراً يجريه السوبرفايزر من الآن.',
            )}
            contentClassName={IN_CARD}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L(c.agent)}</TableHead>
                  <TableHead className="text-end">{t('In the sample', 'في العينة')}</TableHead>
                  <TableHead className="text-end">{t('Wrong', 'خطأ')}</TableHead>
                  <TableHead className="text-end">{t('Pass rate', 'نسبة النجاح')}</TableHead>
                  <TableHead className="text-end">{t('New tests', 'اختبارات جديدة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rates ?? []).map((r) => (
                  <TableRow key={r.agent}>
                    <TableCell>
                      <AgentChip agent={r.agent} />
                    </TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">{r.sampled}</TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">{r.wrong}</TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">
                      {r.current !== r.base ? (
                        <StatusBadge tone="danger">
                          <bdi dir="ltr">{r.base === null ? '–' : `${r.base}% → ${r.current}%`}</bdi>
                        </StatusBadge>
                      ) : (
                        <bdi dir="ltr">{r.base === null ? '–' : `${r.base}%`}</bdi>
                      )}
                    </TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">{r.tests}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(tests?.length ?? 0) > 0 && (
              <div className="well mx-2.5 mt-4 flex flex-col gap-2.5">
                <p className="t-small-strong">{t(`New supervisor tests (${tests?.length})`, `اختبارات جديدة للسوبرفايزر (${tests?.length})`)}</p>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {tests?.map((x) => (
                    <li key={x.id}>
                      <AgentChip agent={x.agent} className="me-2 align-middle" />
                      {L(x.text)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          <Segmented
            variant="pressed"
            label={t('Filter the sample', 'تصفية العينة')}
            options={FILTERS.map((f) => ({ value: f.id, label: f.label, count: f.count }))}
            value={filter}
            onValueChange={setFilter}
          />

          {shown.length === 0 ? (
            <EmptyState title={t('Nothing in this view.', 'لا شيء في هذا العرض.')} />
          ) : (
            <SectionCard contentClassName={IN_CARD}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {[c.n, c.agent, c.kind, c.output, c.verdict].map((h) => (
                      <TableHead key={h.en}>{L(h)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(({ item, n }) => {
                    const who = name(item.personId)
                    const traceKind = kindOfTraceId(item.ref)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="tabular">{n}</TableCell>
                        <TableCell>
                          <AgentChip agent={item.agent} />
                        </TableCell>
                        <TableCell>{L(item.kind)}</TableCell>
                        <TableCell className="min-w-56 whitespace-normal text-foreground">
                          <span className="flex flex-wrap items-center gap-2">
                            {L(item.text)}
                            {traceKind ? <TraceId kind={traceKind} id={item.ref} /> : <bdi dir="ltr" className="text-sm text-muted-foreground tabular">{item.ref}</bdi>}
                            {who && <span className="text-muted-foreground">· {who}</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.verdict !== null ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone={item.verdict ? 'success' : 'danger'}>{L(item.verdict ? COPY.chipRight : COPY.chipWrong)}</StatusBadge>
                              {canJudge && (
                                <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => verdict(item.id, item.agent, !item.verdict)}>
                                  {t('Change', 'تغيير')}
                                </Button>
                              )}
                            </span>
                          ) : canJudge ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-well p-[3px] shadow-inset-well">
                              <button type="button" className={VERDICT_KEY + ' material-light text-foreground'} onClick={() => verdict(item.id, item.agent, true)}>
                                {L(COPY.right)}
                              </button>
                              <button type="button" className={VERDICT_KEY + ' material-dark text-primary-foreground'} onClick={() => verdict(item.id, item.agent, false)}>
                                {L(COPY.wrong)}
                              </button>
                            </span>
                          ) : (
                            <span>{t('Not read yet', 'لم يُقرأ بعد')}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </SectionCard>
          )}

          {sample.items.some((i) => i.personId) && !canViewNamesInSample(role.id) && (
            <p className="max-w-[72ch] text-sm text-muted-foreground">{t('No customer names are shown to this role: an output about a person carries the reference (for example P-005).', 'لا تظهر أسماء الزبائن لهذا الدور: المخرج عن شخص يحمل المرجع (مثل P-005).')}</p>
          )}
        </>
      )}
    </section>
  )
}

