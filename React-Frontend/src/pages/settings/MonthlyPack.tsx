import { useState } from 'react'
import { CalendarClock, CheckCircle2, Clock, Download, FolderOpen, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useSignals } from '@/services/queries'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '@/utils/effectiveness'
import { downloadCsv } from '@/utils/csv'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

/** Ported and upgraded from `frontend/src/pages/Report.tsx`
 * (APPLICATION_MODULES.md §C) — "one page for the management meeting,"
 * now reading the live Signals and Corrective-actions registers instead of
 * the old standalone `Incident`/`Effectiveness` arrays (those registers are
 * the v38 replacement, FR-4). The CX manager alone releases it (FR "the CX
 * manager releases this report monthly"). */
export default function MonthlyPack() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const { data: signals, isLoading: signalsLoading } = useSignals()
  const { data: actions, isLoading: actionsLoading } = useCorrectiveActions()
  const [releasedAt, setReleasedAt] = useState<string | null>(null)

  const open = (actions ?? []).filter((a) => a.status !== 'effective' && a.status !== 'failed')
  const late = open.filter((a) => new Date(a.verificationDueAt).getTime() < now && a.status === 'verification')
  const awaitingCheck = (actions ?? []).filter((a) => a.status === 'verification')
  const closedTotal = (actions ?? []).filter((a) => a.status === 'effective' || a.status === 'failed' || a.status === 'partial').length

  const byCategory = new Map<string, number>()
  ;(signals ?? []).forEach((s) => byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1))
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  const withSeries = (actions ?? []).filter((a) => a.monthlySignalSeries && a.startedMonthIndex !== undefined)
  const th = 'px-3 text-xs font-semibold text-muted-foreground'

  function exportCsv() {
    downloadCsv(
      'monthly-cx-pack.csv',
      (actions ?? []).map((a) => ({
        id: a.id,
        kind: a.kind,
        status: a.status,
        owner: a.owner,
        due_date: a.dueDate,
        verification_due_at: a.verificationDueAt,
      })),
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Monthly CX pack', 'الحزمة الشهرية')}
        description={t('One page for the management meeting.', 'صفحة واحدة لاجتماع الإدارة.')}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download aria-hidden />
              {t('Download CSV', 'تنزيل CSV')}
            </Button>
            {role.id === 'cxmgr' && (
              <Button
                size="sm"
                disabled={!!releasedAt}
                onClick={() => {
                  setReleasedAt(new Date().toISOString())
                  toast.success(t('This month’s pack is released', 'تم إصدار حزمة هذا الشهر'))
                }}
              >
                {releasedAt ? <CheckCircle2 aria-hidden /> : <Send aria-hidden className="rtl:-scale-x-100" />}
                {releasedAt ? t('Released', 'تم الإصدار') : t('Release this month’s pack', 'إصدار حزمة هذا الشهر')}
              </Button>
            )}
          </>
        }
      />
      {releasedAt && (
        <p className="text-sm text-muted-foreground">
          {t('Released', 'صدرت في')} {new Date(releasedAt).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile label={t('Open actions', 'الإجراءات المفتوحة')} value={open.length} icon={<FolderOpen />} accent="var(--chart-4)" loading={actionsLoading} />
        <KpiTile
          label={t('Late verification', 'تحقق متأخر')}
          value={late.length}
          icon={<Clock />}
          accent={late.length ? 'var(--destructive)' : 'var(--chart-1)'}
          loading={actionsLoading}
        />
        <KpiTile label={t('Awaiting 60-day check', 'بانتظار تحقق 60 يوماً')} value={awaitingCheck.length} icon={<CalendarClock />} accent="var(--warning)" loading={actionsLoading} />
        <KpiTile label={t('Closed total', 'إجمالي المغلقة')} value={closedTotal} icon={<CheckCircle2 />} accent="var(--success)" loading={actionsLoading} />
      </div>

      <SectionCard term="Signal" title={t('Most common signal categories', 'أكثر فئات الإشارات شيوعاً')}>
        {signalsLoading ? (
          <LoadingState rows={4} />
        ) : topCategories.length ? (
          <ul className="flex flex-col gap-3">
            {topCategories.map(([name, count]) => (
              <li key={name} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                <span className="truncate text-sm capitalize">{name.replace(/_/g, ' ')}</span>
                <Progress value={(count / Math.max(1, topCategories[0][1])) * 100} aria-label={name.replace(/_/g, ' ')} className="h-2" />
                <span className="w-8 text-end text-sm font-medium tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('No signals yet.', 'لا توجد إشارات بعد.')} />
        )}
      </SectionCard>

      <SectionCard
        term="60-day check" title={t('Did past corrective actions work?', 'هل نجحت الإجراءات التصحيحية السابقة؟')}
        description={t(
          'A before/after comparison is a signal, not proof. Real analysis needs two to three months of closed cases.',
          'المقارنة بين قبل وبعد مؤشر وليست دليلاً قاطعاً. التحليل الحقيقي يحتاج شهرين إلى ثلاثة من الحالات المغلقة.',
        )}
      >
        {actionsLoading ? (
          <LoadingState rows={3} />
        ) : withSeries.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={th}>{t('Action', 'الإجراء')}</TableHead>
                  <TableHead className={th}>{t('Owner', 'المالك')}</TableHead>
                  <TableHead className={`${th} text-end`}>{t('Change', 'التغيّر')}</TableHead>
                  <TableHead className={th}>{t('Verdict', 'الحكم')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withSeries.map((a) => {
                  const res = evaluateEffectiveness(a.monthlySignalSeries!, a.startedMonthIndex!)
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="px-3 text-sm whitespace-normal">{L(a.title)}</TableCell>
                      <TableCell className="px-3 text-sm text-muted-foreground">{a.owner}</TableCell>
                      <TableCell className="px-3 text-end text-sm tabular-nums">
                        <bdi dir="ltr">{Math.round(res.changePct * 100)}%</bdi>
                      </TableCell>
                      <TableCell className="px-3">
                        <StatusBadge tone={res.verdict === 'effective' ? 'success' : res.verdict === 'failed' ? 'danger' : 'warning'}>
                          {L(EFFECTIVENESS_LABEL[res.verdict])}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title={t('No actions past verification yet.', 'لا توجد إجراءات تجاوزت مرحلة التحقق بعد.')} />
        )}
      </SectionCard>
    </section>
  )
}
