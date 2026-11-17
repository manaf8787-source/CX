import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useCorrectiveActions, useLdRequests, useStandards } from '@/services/queries'
import {
  CORRECTIVE_STATUS_LABEL,
  CORRECTIVE_STATUS_TONE,
  LD_REQUEST_STATUS_LABEL,
  LD_REQUEST_STATUS_TONE,
  STANDARD_STATUS_LABEL,
  STANDARD_STATUS_TONE,
} from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

function GoLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to={to}>
        {children}
        <ArrowRight aria-hidden className="rtl:rotate-180" />
      </Link>
    </Button>
  )
}

/** Net-new — no dedicated L&D page or role existed in the pre-omnichannel
 * scaffold (APPLICATION_MODULES.md §C: "HR pages don't cover L&D"). Reads
 * the training-gap kind of corrective action and the standards L&D owns,
 * rather than inventing a third data model for the same facts. */
export default function Ld() {
  const { t, L } = useI18n()
  const { data: actions, isLoading: actionsLoading } = useCorrectiveActions()
  const { data: standards, isLoading: standardsLoading } = useStandards()
  const { data: requests, isLoading: requestsLoading } = useLdRequests()

  const trainingGapActions = (actions ?? []).filter((a) => a.kind === 'training_gap')
  const ownedStandards = (standards ?? []).filter((s) => s.writer.en.toLowerCase().includes('l&d') || s.owner.toLowerCase().includes('l&d'))

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('L&D: training & materials', 'التعلم والتطوير')}
        description={t('Training-gap actions, L&D requests, and the standards L&D owns and writes.', 'إجراءات فجوة التدريب، طلبات التعلم والتطوير، والمعايير التي يملكها ويكتبها قسم التعلم والتطوير.')}
      />

      <SectionCard
        title={t('Training-gap corrective actions', 'الإجراءات التصحيحية لفجوة التدريب')}
        actions={<GoLink to="/actions/corrective">{t('Open Actions → Corrective actions', 'فتح الإجراءات ← الإجراءات التصحيحية')}</GoLink>}
      >
        {actionsLoading ? (
          <LoadingState rows={2} />
        ) : trainingGapActions.length ? (
          <ul className="flex flex-col divide-y">
            {trainingGapActions.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 text-sm">{L(a.title)}</span>
                <StatusBadge tone={CORRECTIVE_STATUS_TONE[a.status]}>{L(CORRECTIVE_STATUS_LABEL[a.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('No training-gap actions open right now.', 'لا توجد إجراءات فجوة تدريب مفتوحة حالياً.')} />
        )}
      </SectionCard>

      <SectionCard title={t('L&D requests', 'طلبات التعلم والتطوير')}>
        {requestsLoading ? (
          <LoadingState rows={3} />
        ) : !requests?.length ? (
          <EmptyState title={t('No L&D requests yet.', 'لا توجد طلبات تعلم وتطوير بعد.')} />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{t('Request', 'الطلب')}</TableHead>
                  <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{t('Requested by', 'الطلب من')}</TableHead>
                  <TableHead className="px-3 text-xs font-semibold text-muted-foreground">{t('Status', 'الحالة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="px-3 text-sm whitespace-normal">{L(r.title)}</TableCell>
                    <TableCell className="px-3 text-sm text-muted-foreground">
                      {r.requestedBy}
                      {r.environment ? ` · ${r.environment}` : ''}
                    </TableCell>
                    <TableCell className="px-3">
                      <StatusBadge tone={LD_REQUEST_STATUS_TONE[r.status]}>{L(LD_REQUEST_STATUS_LABEL[r.status])}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t('Standards L&D owns', 'المعايير التي يملكها قسم التعلم والتطوير')}
        description={t('CX approves a standard for scoring; L&D writes it (FR: "writes the standards it owns").', 'يعتمد مدير تجربة العملاء المعيار للتقييم؛ يكتبه قسم التعلم والتطوير.')}
        actions={<GoLink to="/settings/standards">{t('Open the full standards register', 'فتح سجل المعايير الكامل')}</GoLink>}
      >
        {standardsLoading ? (
          <LoadingState rows={2} />
        ) : ownedStandards.length ? (
          <ul className="flex flex-col divide-y">
            {ownedStandards.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{s.code}</span>
                <span className="min-w-0 flex-1 text-sm">{L(s.title)}</span>
                <StatusBadge tone={STANDARD_STATUS_TONE[s.status]}>{L(STANDARD_STATUS_LABEL[s.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('No L&D-owned standards matched yet.', 'لا توجد معايير مملوكة للتعلم والتطوير بعد.')} />
        )}
      </SectionCard>
    </section>
  )
}
