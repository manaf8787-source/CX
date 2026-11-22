import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useCorrectiveActions, useLdRequests, useShopperCases } from '@/services/queries'
import { useTrainingMaterials, useTrainingSessions } from '@/services/referenceQueries'
import { LD_COMPLAINT_TYPE, MATERIAL_STATUS, type LdComplaintType } from '@/data/v38Reference'
import { LandingBrief } from '@/components/home/LandingBrief'
import { KpiTile } from '@/components/common/KpiTile'
import { CORRECTIVE_STATUS_LABEL, CORRECTIVE_STATUS_TONE, LD_REQUEST_STATUS_LABEL, LD_REQUEST_STATUS_TONE } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { IN_CARD, SubPageHeader } from './SubPageHeader'

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
  const { data: materials } = useTrainingMaterials()
  const { data: sessions } = useTrainingSessions()
  const { data: shopperCases } = useShopperCases()
  const { data: requests, isLoading: requestsLoading } = useLdRequests()

  const trainingGapActions = (actions ?? []).filter((a) => a.kind === 'training_gap')
  const lowFindings = (shopperCases ?? []).filter((c) => c.severity === 'low').length
  const types = Object.keys(LD_COMPLAINT_TYPE) as LdComplaintType[]

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('L&D: training & materials', 'التعلم والتطوير')}
        description={t(
          'Training-gap actions, L&D requests, training materials and the training plan.',
          'إجراءات فجوة التدريب، طلبات التعلم والتطوير، المواد التدريبية وخطة التدريب.',
        )}
      />
      {/* v40 F09: L&D lands here, not on Home, so the Daily brief sits at the top of this page. */}
      <LandingBrief roles={['ld']} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label={t('Training-gap actions', 'إجراءات فجوة التدريب')} value={trainingGapActions.length} loading={actionsLoading} />
        <KpiTile label={t('Materials in preparation', 'مواد قيد التحضير')} value={(materials ?? []).filter((m) => m.status !== 'ready').length} />
        <KpiTile label={t('Sessions planned', 'جلسات مخططة')} value={(sessions ?? []).filter((x) => x.status === 'planned').length} />
        <KpiTile
          label={t('Low shopper findings', 'نتائج تسوق منخفضة')}
          value={lowFindings}
          sub={t('Arrive here as statistics, not cases', 'تصل هنا كإحصاءات لا كحالات')}
        />
      </div>

      <SectionCard
        term="Corrective action"
        title={t('Training-gap corrective actions', 'الإجراءات التصحيحية لفجوة التدريب')}
        actions={<GoLink to="/actions/corrective">{t('Open Actions → Corrective actions', 'فتح الإجراءات ← الإجراءات التصحيحية')}</GoLink>}
      >
        {actionsLoading ? (
          <LoadingState rows={2} />
        ) : trainingGapActions.length ? (
          <ul className="flex flex-col">
            {trainingGapActions.map((a) => (
              <li key={a.id} className="row-divider flex min-h-14 items-center justify-between gap-3 py-2">
                <span className="t-ui-strong min-w-0">{L(a.title)}</span>
                <StatusBadge tone={CORRECTIVE_STATUS_TONE[a.status]}>{L(CORRECTIVE_STATUS_LABEL[a.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('No training-gap actions open right now.', 'لا توجد إجراءات فجوة تدريب مفتوحة حالياً.')} />
        )}
      </SectionCard>

      <SectionCard title={t('L&D requests', 'طلبات التعلم والتطوير')} contentClassName={IN_CARD}>
        {requestsLoading ? (
          <LoadingState rows={3} />
        ) : !requests?.length ? (
          <EmptyState title={t('No L&D requests yet.', 'لا توجد طلبات تعلم وتطوير بعد.')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Request', 'الطلب')}</TableHead>
                <TableHead>{t('Requested by', 'الطلب من')}</TableHead>
                <TableHead>{t('Status', 'الحالة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium whitespace-normal text-foreground">{L(r.title)}</TableCell>
                  <TableCell>
                    {r.requestedBy}
                    {r.environment ? ` · ${r.environment}` : ''}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={LD_REQUEST_STATUS_TONE[r.status]}>{L(LD_REQUEST_STATUS_LABEL[r.status])}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <SectionCard
        title={t('Complaint types in L&D’s area', 'أنواع الشكاوى ضمن مجال التعلم والتطوير')}
        description={t('Which materials and sessions cover each type.', 'أي المواد والجلسات تغطي كل نوع.')}
        contentClassName={IN_CARD}
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Complaint type', 'نوع الشكوى')}</TableHead>
              <TableHead>{t('Materials', 'المواد')}</TableHead>
              <TableHead>{t('Sessions', 'الجلسات')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((ty) => {
              const mats = (materials ?? []).filter((m) => m.covers.includes(ty))
              const ses = (sessions ?? []).filter((x) => x.covers.includes(ty))
              return (
                <TableRow key={ty}>
                  <TableCell className="font-medium text-foreground">{L(LD_COMPLAINT_TYPE[ty])}</TableCell>
                  <TableCell className="whitespace-normal">
                    {mats.map((m) => L(m.name)).join(' · ') || <StatusBadge tone="danger">{t('Not covered', 'غير مغطى')}</StatusBadge>}
                  </TableCell>
                  <TableCell className="whitespace-normal">{ses.map((x) => L(x.name)).join(' · ') || '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <SectionCard title={t('Training materials in preparation', 'المواد التدريبية قيد التحضير')}>
          <ul className="flex flex-col">
            {(materials ?? []).map((m) => (
              <li key={m.id} className="row-divider flex min-h-14 flex-wrap items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="t-ui-strong">{L(m.name)}</span>
                  <span className="text-sm text-muted-foreground">
                    {m.standard ? `${m.standard} · ` : ''}
                    {m.due ? <bdi dir="ltr">{m.due}</bdi> : '—'}
                  </span>
                </div>
                <StatusBadge tone={m.status === 'ready' ? 'success' : m.status === 'dev' ? 'warning' : m.status === 'plan' ? 'info' : 'neutral'}>
                  {L(MATERIAL_STATUS[m.status])}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title={t('Training plan', 'خطة التدريب')}>
          <ul className="flex flex-col">
            {[...(sessions ?? [])]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((x) => (
                <li key={x.id} className="row-divider flex min-h-14 flex-col justify-center gap-0.5 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="t-ui-strong">{L(x.name)}</span>
                    <bdi dir="ltr" className="text-sm text-muted-foreground tabular">
                      {x.date}
                    </bdi>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {L(x.audience)} · {L(x.mode)} · {x.covers.map((c) => L(LD_COMPLAINT_TYPE[c])).join(', ')}
                  </span>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>

      {/* 22 Nov (owner): the standards register is not on this page; L&D opens it from its own Standards register page. */}
      <p className="t-body-s">
        {t('The standards L&D writes are in the Standards register.', 'المعايير التي يكتبها قسم التعلم والتطوير موجودة في سجل المعايير.')}{' '}
        <GoLink to="/settings/standards">{t('Open the standards register', 'فتح سجل المعايير')}</GoLink>
      </p>
    </section>
  )
}

