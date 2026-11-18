import { useState } from 'react'
import { CalendarClock, CheckCircle2, Clock, Download, FolderOpen, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useSignals } from '@/services/queries'
import { ownerTitle } from '@/data/ownerTitles'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '@/utils/effectiveness'
import { downloadCsv } from '@/utils/csv'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { RankedBars } from '@/components/common/charts'
import { IN_CARD, SubPageHeader } from './SubPageHeader'

/** Ported and upgraded from `frontend/src/pages/Report.tsx`
 * (APPLICATION_MODULES.md §C) — "one page for the management meeting,"
 * now reading the live Signals and Corrective-actions registers instead of
 * the old standalone `Incident`/`Effectiveness` arrays (those registers are
 * the v38 replacement, FR-4). The CX manager alone releases it (FR "the CX
 * manager releases this report monthly").
 *
 * Composition (comfortable, a report for the meeting): the header carries the two actions (Download CSV light, Release dark), four KPI
 * cards (no colour on the numbers), the signal categories as the skill's bar comparison (first row dark, counts printed) and the
 * verification table on its card. */
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
    <section data-density="comfortable" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
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
          <p className="t-body-s inline-flex items-center gap-2">
            <span aria-hidden className="dot dot-success" />
            <span>
              {t('Released', 'صدرت في')} {new Date(releasedAt).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-(--grid-gap) xl:grid-cols-4">
        <KpiTile label={t('Open actions', 'الإجراءات المفتوحة')} value={open.length} icon={<FolderOpen />} loading={actionsLoading} />
        <KpiTile label={t('Late verification', 'تحقق متأخر')} value={late.length} icon={<Clock />} accent={late.length ? 'var(--destructive)' : undefined} loading={actionsLoading} />
        <KpiTile label={t('Awaiting 60-day check', 'بانتظار تحقق 60 يوماً')} value={awaitingCheck.length} icon={<CalendarClock />} loading={actionsLoading} />
        <KpiTile label={t('Closed total', 'إجمالي المغلقة')} value={closedTotal} icon={<CheckCircle2 />} loading={actionsLoading} />
      </div>

      <SectionCard term="Signal" title={t('Most common signal categories', 'أكثر فئات الإشارات شيوعاً')} well>
        {signalsLoading ? (
          <LoadingState rows={4} />
        ) : topCategories.length ? (
          <RankedBars
            label={t('Most common signal categories', 'أكثر فئات الإشارات شيوعاً')}
            items={topCategories.map(([name, count]) => ({ key: name, label: <span className="capitalize">{name.replace(/_/g, ' ')}</span>, value: count }))}
          />
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
        contentClassName={IN_CARD}
      >
        {actionsLoading ? (
          <LoadingState rows={3} />
        ) : withSeries.length ? (
          <Table density="comfortable">
            <TableHeader>
              <TableRow className="row-divider-none">
                <TableHead>{t('Action', 'الإجراء')}</TableHead>
                <TableHead>{t('Owner', 'المالك')}</TableHead>
                <TableHead className="text-end">{t('Change', 'التغيّر')}</TableHead>
                <TableHead>{t('Verdict', 'الحكم')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withSeries.map((a) => {
                const res = evaluateEffectiveness(a.monthlySignalSeries!, a.startedMonthIndex!)
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium whitespace-normal text-foreground">{L(a.title)}</TableCell>
                    <TableCell>{L(ownerTitle(a.owner))}</TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">
                      <bdi dir="ltr">{Math.round(res.changePct * 100)}%</bdi>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={res.verdict === 'effective' ? 'success' : res.verdict === 'failed' ? 'danger' : 'warning'}>
                        {L(EFFECTIVENESS_LABEL[res.verdict])}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title={t('No actions past verification yet.', 'لا توجد إجراءات تجاوزت مرحلة التحقق بعد.')} />
        )}
      </SectionCard>
    </section>
  )
}
