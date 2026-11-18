import { AlertTriangle, CheckCircle2, FolderOpen } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useHrPool, useShopperCases } from '@/services/queries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LandingBrief } from '@/components/home/LandingBrief'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

/** Ported from `frontend/src/pages/HrTeam.tsx` (APPLICATION_MODULES.md §C) —
 * "informed only: team numbers and a late alert, no access to individual
 * cases" (USER_ROLES_AND_PERMISSIONS.md). Reads conduct-flagged shopper
 * cases from the live Actions register rather than a separate incident
 * list, so this page and Actions never disagree on the same case. */
export default function HrTeamPerf() {
  const { t } = useI18n()
  const now = useNow()
  const { data: cases, isLoading: casesLoading } = useShopperCases()
  const { data: hrPool, isLoading: poolLoading } = useHrPool()

  const conductCases = (cases ?? []).filter((c) => c.isConductIssue)
  const open = conductCases.filter((c) => c.status !== 'closed')
  const late = open.filter((c) => new Date(c.resolveDueAt).getTime() < now)

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('HR team performance', 'أداء فريق الموارد البشرية')}
        description={t('Informed only: team numbers and a late alert. No access to individual cases.', 'للعلم فقط: أرقام الفريق وتنبيه التأخير. لا صلاحية وصول للحالات الفردية.')}
      />
      {/* v40 F09: the HR manager lands here, not on Home, so the Daily brief sits at the top of this page. */}
      <LandingBrief roles={['hrmgr']} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label={t('Open conduct cases', 'حالات السلوك المفتوحة')} value={open.length} icon={<FolderOpen />} accent="var(--chart-4)" loading={casesLoading} />
        <KpiTile
          label={t('Late or at risk', 'متأخرة أو في خطر')}
          value={late.length}
          icon={<AlertTriangle />}
          accent={late.length ? 'var(--destructive)' : 'var(--chart-1)'}
          loading={casesLoading}
        />
        <KpiTile
          label={t('Closed total', 'إجمالي المغلقة')}
          value={conductCases.filter((c) => c.status === 'closed').length}
          icon={<CheckCircle2 />}
          accent="var(--success)"
          loading={casesLoading}
        />
      </div>

      <SectionCard title={t('By specialist', 'حسب الأخصائي')}>
        {poolLoading ? (
          <LoadingState rows={3} />
        ) : !hrPool?.length ? (
          <EmptyState title={t('No specialists in the pool yet', 'لا يوجد أخصائيون في المجموعة بعد')} />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{t('Specialist', 'الأخصائي')}</TableHead>
                  <TableHead className="px-3 text-end text-xs font-semibold text-muted-foreground">{t('Assigned cases', 'الحالات المسندة')}</TableHead>
                  <TableHead className="px-3 text-end text-xs font-semibold text-muted-foreground">{t('Late', 'متأخرة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrPool.map((h) => (
                  <TableRow key={h.title}>
                    <TableCell className="px-3 text-sm">{h.title}</TableCell>
                    <TableCell className="px-3 text-end text-sm tabular-nums">{h.assignedCases}</TableCell>
                    <TableCell className="px-3 text-end text-sm tabular-nums">
                      {h.lateCases > 0 ? <StatusBadge tone="danger">{h.lateCases}</StatusBadge> : 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </section>
  )
}
