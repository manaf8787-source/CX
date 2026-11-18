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
import { IN_CARD, SubPageHeader } from './SubPageHeader'

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
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('HR team performance', 'أداء فريق الموارد البشرية')}
        description={t('Informed only: team numbers and a late alert. No access to individual cases.', 'للعلم فقط: أرقام الفريق وتنبيه التأخير. لا صلاحية وصول للحالات الفردية.')}
      />
      {/* v40 F09: the HR manager lands here, not on Home, so the Daily brief sits at the top of this page. */}
      <LandingBrief roles={['hrmgr']} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label={t('Open conduct cases', 'حالات السلوك المفتوحة')} value={open.length} icon={<FolderOpen />} loading={casesLoading} />
        <KpiTile
          label={t('Late or at risk', 'متأخرة أو في خطر')}
          value={late.length}
          icon={<AlertTriangle />}
          accent={late.length ? 'var(--destructive)' : undefined}
          loading={casesLoading}
        />
        <KpiTile
          label={t('Closed total', 'إجمالي المغلقة')}
          value={conductCases.filter((c) => c.status === 'closed').length}
          icon={<CheckCircle2 />}
          loading={casesLoading}
        />
      </div>

      <SectionCard title={t('By specialist', 'حسب الأخصائي')} contentClassName={IN_CARD}>
        {poolLoading ? (
          <LoadingState rows={3} />
        ) : !hrPool?.length ? (
          <EmptyState title={t('No specialists in the pool yet', 'لا يوجد أخصائيون في المجموعة بعد')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Specialist', 'الأخصائي')}</TableHead>
                <TableHead className="text-end">{t('Assigned cases', 'الحالات المسندة')}</TableHead>
                <TableHead className="text-end">{t('Late', 'متأخرة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hrPool.map((h) => (
                <TableRow key={h.title}>
                  <TableCell className="font-medium text-foreground">{h.title}</TableCell>
                  <TableCell className="text-end font-medium tabular text-foreground">{h.assignedCases}</TableCell>
                  <TableCell className="text-end tabular">{h.lateCases > 0 ? <StatusBadge tone="danger">{h.lateCases}</StatusBadge> : 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </section>
  )
}
