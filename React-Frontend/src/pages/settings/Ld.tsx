import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useCorrectiveActions, useLdRequests, useShopperCases } from '@/services/queries'
import { useStandardsRegister, useTrainingMaterials, useTrainingSessions } from '@/services/referenceQueries'
import { LD_COMPLAINT_TYPE, MATERIAL_STATUS, REGISTER_STATUS, type LdComplaintType } from '@/data/v38Reference'
import { KpiTile } from '@/components/common/KpiTile'
import {
  CORRECTIVE_STATUS_LABEL,
  CORRECTIVE_STATUS_TONE,
  LD_REQUEST_STATUS_LABEL,
  LD_REQUEST_STATUS_TONE,
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
  const { data: register, isLoading: standardsLoading } = useStandardsRegister()
  const { data: materials } = useTrainingMaterials()
  const { data: sessions } = useTrainingSessions()
  const { data: shopperCases } = useShopperCases()
  const { data: requests, isLoading: requestsLoading } = useLdRequests()

  const trainingGapActions = (actions ?? []).filter((a) => a.kind === 'training_gap')
  // KB §15: L&D owns the fifteen people-facing standards (M-12 to M-26).
  const ownedStandards = (register ?? []).filter((s) => ['beh', 'com', 'sell', 'fol'].includes(s.area))
  const lowFindings = (shopperCases ?? []).filter((c) => c.severity === 'low').length
  const types = Object.keys(LD_COMPLAINT_TYPE) as LdComplaintType[]
  const th = 'px-3 text-xs font-semibold text-muted-foreground'

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('L&D: training & materials', 'التعلم والتطوير')}
        description={t('Training-gap actions, L&D requests, and the standards L&D owns and writes.', 'إجراءات فجوة التدريب، طلبات التعلم والتطوير، والمعايير التي يملكها ويكتبها قسم التعلم والتطوير.')}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t('Training-gap actions', 'إجراءات فجوة التدريب')} value={trainingGapActions.length} accent="var(--warning)" loading={actionsLoading} />
        <KpiTile label={t('Materials in preparation', 'مواد قيد التحضير')} value={(materials ?? []).filter((m) => m.status !== 'ready').length} accent="var(--info)" />
        <KpiTile label={t('Sessions planned', 'جلسات مخططة')} value={(sessions ?? []).filter((x) => x.status === 'planned').length} accent="var(--chart-1)" />
        <KpiTile
          label={t('Low shopper findings', 'نتائج تسوق منخفضة')}
          value={lowFindings}
          sub={t('Arrive here as statistics, not cases', 'تصل هنا كإحصاءات لا كحالات')}
          accent="var(--muted-foreground)"
        />
      </div>

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
        title={t('Complaint types in L&D’s area', 'أنواع الشكاوى ضمن مجال التعلم والتطوير')}
        description={t('Which materials and sessions cover each type.', 'أي المواد والجلسات تغطي كل نوع.')}
      >
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className={th}>{t('Complaint type', 'نوع الشكوى')}</TableHead>
                <TableHead className={th}>{t('Materials', 'المواد')}</TableHead>
                <TableHead className={th}>{t('Sessions', 'الجلسات')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((ty) => {
                const mats = (materials ?? []).filter((m) => m.covers.includes(ty))
                const ses = (sessions ?? []).filter((x) => x.covers.includes(ty))
                return (
                  <TableRow key={ty}>
                    <TableCell className="px-3 text-sm font-medium">{L(LD_COMPLAINT_TYPE[ty])}</TableCell>
                    <TableCell className="px-3 text-sm whitespace-normal">{mats.map((m) => L(m.name)).join(' · ') || <span className="text-danger-text">{t('Not covered', 'غير مغطى')}</span>}</TableCell>
                    <TableCell className="px-3 text-sm whitespace-normal">{ses.map((x) => L(x.name)).join(' · ') || <span className="text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title={t('Training materials in preparation', 'المواد التدريبية قيد التحضير')}>
          <ul className="flex flex-col divide-y">
            {(materials ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm">{L(m.name)}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.standard ? `${m.standard} · ` : ''}
                    {m.due ? <bdi dir="ltr">{m.due}</bdi> : '—'}
                  </span>
                </div>
                <StatusBadge tone={m.status === 'ready' ? 'success' : m.status === 'dev' ? 'warning' : m.status === 'plan' ? 'info' : 'neutral'}>{L(MATERIAL_STATUS[m.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title={t('Training plan', 'خطة التدريب')}>
          <ul className="flex flex-col divide-y">
            {[...(sessions ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((x) => (
              <li key={x.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{L(x.name)}</span>
                  <bdi dir="ltr" className="text-xs text-muted-foreground tabular-nums">{x.date}</bdi>
                </div>
                <span className="text-xs text-muted-foreground">
                  {L(x.audience)} · {L(x.mode)} · {x.covers.map((c) => L(LD_COMPLAINT_TYPE[c])).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

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
              <li key={s.code} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{s.code}</span>
                <span className="min-w-0 flex-1 text-sm">{L(s.name)}</span>
                <StatusBadge tone={s.status === 'appr' ? 'success' : s.status === 'draft' ? 'info' : 'warning'}>{L(REGISTER_STATUS[s.status].label)}</StatusBadge>
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
