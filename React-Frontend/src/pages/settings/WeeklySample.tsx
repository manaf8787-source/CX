// FOUNDATION STUB: owner = workstream C (a working page over `useWeeklySample` and `useJudgeSample`: C finishes the tiles, filters and the [Proposed] badges).
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canJudgeSample, canViewNamesInSample } from '@/auth/permissions'
import { useJudgeSample, useWeeklySample } from '@/services/queriesV40'
import { usePersonsAll } from '@/services/queries'
import { WEEKLY_SAMPLE_COPY as COPY } from '@/data/weeklySample'
import { AgentChip } from '@/components/common/AgentChip'
import { KpiTile } from '@/components/common/KpiTile'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TraceId } from '@/components/common/TraceId'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { kindOfTraceId } from '@/utils/trace'
import { SubPageHeader } from './SubPageHeader'

export default function WeeklySample() {
  const { L, t, lang } = useI18n()
  const { role } = useRole()
  const { data: sample, isLoading } = useWeeklySample()
  const { data: persons } = usePersonsAll()
  const judge = useJudgeSample()
  const canJudge = canJudgeSample(role.id)
  const names = canViewNamesInSample(role.id)
  const c = COPY.columns
  const fmtDate = (d: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(d))

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={<span className="inline-flex items-center gap-2">{L(COPY.title)} <ProposedBadge /></span>} description={L(COPY.intro)} />
      {isLoading || !sample ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiTile label={L(COPY.tiles.read)} value={`${sample.read} / ${sample.size}`} />
            <KpiTile label={L(COPY.tiles.wrong)} value={sample.wrong} />
            <KpiTile label={L(COPY.tiles.accuracy)} value={sample.accuracyPct === null ? '–' : `${sample.accuracyPct}%`} />
            <KpiTile label={L(COPY.tiles.due)} value={fmtDate(sample.due)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{L(c.n)}</TableHead>
                <TableHead>{L(c.agent)}</TableHead>
                <TableHead>{L(c.kind)}</TableHead>
                <TableHead>{L(c.output)}</TableHead>
                <TableHead>{L(c.verdict)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sample.items.map((item, i) => {
                const person = item.personId ? persons?.find((p) => p.id === item.personId) : undefined
                return (
                  <TableRow key={item.id}>
                    <TableCell className="tabular-nums">{i + 1}</TableCell>
                    <TableCell><AgentChip agent={item.agent} /></TableCell>
                    <TableCell>{L(item.kind)}</TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="flex flex-wrap items-center gap-2">
                        {L(item.text)}
                        {kindOfTraceId(item.ref) ? <TraceId kind={kindOfTraceId(item.ref)!} id={item.ref} /> : <bdi dir="ltr" className="font-mono text-xs text-muted-foreground">{item.ref}</bdi>}
                        {names && person && <span className="text-muted-foreground">· {person.name}</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.verdict !== null ? (
                        <StatusBadge tone={item.verdict ? 'success' : 'danger'}>{L(item.verdict ? COPY.chipRight : COPY.chipWrong)}</StatusBadge>
                      ) : canJudge ? (
                        <span className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => judge.mutate({ id: item.id, right: true })}>{L(COPY.right)}</Button>
                          <Button size="sm" variant="outline" onClick={() => judge.mutate({ id: item.id, right: false }, { onSuccess: () => toast(t('A new test was added for the supervisor.', 'أُضيف اختبار جديد للسوبرفايزر.')) })}>{L(COPY.wrong)}</Button>
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {!names && <p className="text-sm text-muted-foreground">{L(COPY.namesNote)}</p>}
        </>
      )}
    </section>
  )
}
