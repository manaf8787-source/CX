import { useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, CheckCircle2, Clock, Gavel, Layers, Lock, Megaphone, Radio, Target, UserX } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canApprovePersona, canViewPersonaAudit } from '@/auth/permissions'
import { useCampaignRecommendations, useDecidePersona, usePersonas } from '@/services/queries'
import { useCampaignBriefs } from '@/services/referenceQueries'
import { CHANNEL_LABEL } from '@/components/customers/channels'
import type { Persona } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardWell } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { CustomersTabs } from '@/components/customers/CustomersTabs'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { DecisionDialog } from './actions/components/DecisionDialog'

type Recommendation = NonNullable<ReturnType<typeof useCampaignRecommendations>['data']>[number]

/** FR-6.1–6.5 — six rule-built personas, each with a Marketing
 * recommendation and a ranked next campaign; CX-manager approval and
 * Internal Audit review are real role-gated actions, not cosmetic labels;
 * personal fields never appear per-person here, only as aggregates (FR-6.5). */
export default function Personas() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: personas, isLoading: personasLoading } = usePersonas()
  const { data: recommendations, isLoading: recsLoading } = useCampaignRecommendations()
  const decide = useDecidePersona()
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const canApprove = canApprovePersona(role.id)
  const canAudit = canViewPersonaAudit(role.id)
  const ranked = useMemo(() => [...(recommendations ?? [])].sort((a, b) => a.rank - b.rank), [recommendations])

  const columns = useMemo<ColumnDef<Recommendation>[]>(() => {
    const personaName = (id: string) => L(personas?.find((p) => p.id === id)?.name ?? { en: id, ar: id })
    return [
      {
        accessorKey: 'rank',
        header: t('Rank', 'الترتيب'),
        cell: ({ row }) => <span className="tabular font-medium text-foreground">{row.original.rank}</span>,
        meta: { headerClassName: 'w-16' },
      },
      {
        id: 'persona',
        accessorFn: (r) => personaName(r.personaId),
        header: t('Persona', 'الشخصية'),
        cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
      },
      {
        id: 'campaign',
        accessorFn: (r) => L(r.title),
        header: t('Campaign', 'الحملة'),
        cell: ({ getValue }) => <span className="whitespace-normal text-foreground">{getValue<string>()}</span>,
      },
      {
        id: 'who',
        accessorFn: (r) => L(r.summary),
        header: t('Who', 'لمن'),
        cell: ({ getValue }) => <span className="block min-w-48 whitespace-normal">{getValue<string>()}</span>,
      },
    ]
  }, [t, L, personas])

  return (
    <div data-density="dense" className="flex flex-col gap-6">
      <PageHeader
        term="Persona" title={t('Personas and campaigns', 'الشخصيات والحملات')}
        description={t(
          'Six personas built from the CRM, each with a Marketing recommendation and a ranked next campaign.',
          'ست شخصيات مبنية من بيانات نظام إدارة العملاء، لكل منها توصية تسويقية وحملة تالية مرتبة.',
        )}
      />

      <CustomersTabs />

      <div className="grid grid-cols-1 gap-(--grid-gap) md:grid-cols-2">
        <div className="well flex flex-col items-start gap-2.5">
          <StatusBadge tone="info" icon={<Layers aria-hidden />}>
            {t('How personas are built', 'كيف تُبنى الشخصيات')}
          </StatusBadge>
          <p className="t-body-s">
            {t(
              'Built first by rules on CRM fields (residence, work sector, income source, units owned, lost reason) plus the channel actually used — not by clustering. Clustering is a phase-two addition once three months of live timeline data exist (FR-6.3). A persona nobody can act on is dropped.',
              'تُبنى أولاً بقواعد على بيانات نظام إدارة العملاء (السكن، قطاع العمل، مصدر الدخل، الوحدات المملوكة، سبب الخسارة) بالإضافة إلى القناة المستخدمة فعلياً — وليس بالتجميع الآلي. التجميع الآلي إضافة لمرحلة لاحقة بعد توفر ثلاثة أشهر من بيانات حية — FR-6.3. أي شخصية لا يمكن التصرف بناءً عليها تُسقَط.',
            )}
          </p>
        </div>
        <div className="well flex flex-col items-start gap-2.5">
          <StatusBadge tone="warning" icon={<Lock aria-hidden />}>
            {t('Aggregated only', 'إجمالي فقط')}
          </StatusBadge>
          <p className="t-body-s">
            {t(
              'Personal fields used to build a persona are shown only as aggregated attributes and segment sizes on this page — never exported per-person to Marketing (FR-6.5). The CX manager names and approves each persona; the Internal Audit and Marketing Lead audits the criteria behind it.',
              'الحقول الشخصية المستخدمة لبناء الشخصية تُعرض هنا كسمات إجمالية وأحجام شرائح فقط — ولا تُصدَّر أبداً على مستوى الفرد للتسويق — FR-6.5. يسمّي مدير تجربة العملاء ويعتمد كل شخصية، ويراجع مسؤول التدقيق الداخلي والتسويق المعايير خلفها.',
            )}
          </p>
        </div>
      </div>

      <SectionCard
        title={t('Ranked next campaigns', 'الحملات التالية المرتبة')}
        description={t('Select a row to jump to its persona.', 'اختر صفاً للانتقال إلى شخصيته.')}
      >
        <DataTable
          columns={columns}
          data={ranked}
          isLoading={recsLoading}
          getRowId={(r) => r.id}
          pageSize={0}
          // a phone: the campaign and its persona on two lines, the rank and "Who" behind "Details"
          phone={{ title: 'campaign', meta: ['persona'], detail: ['rank', 'who'] }}
          emptyTitle={t('No ranked campaigns yet.', 'لا توجد حملات مرتبة بعد.')}
          onRowClick={(r) => {
            const el = document.getElementById(`persona-${r.personaId}`)
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
            el?.focus({ preventScroll: true })
          }}
        />
      </SectionCard>

      <SavedBriefs />

      {personasLoading ? (
        <LoadingState rows={6} />
      ) : personas?.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {personas.map((p) => (
            <PersonaCard key={p.id} persona={p} canApprove={canApprove} canAudit={canAudit} onDecide={() => setDecidingId(p.id)} />
          ))}
        </div>
      ) : (
        <EmptyState title={t('No personas yet.', 'لا توجد شخصيات بعد.')} />
      )}

      {decidingId && (
        <DecisionDialog
          title={t('Decide this persona', 'اتخاذ قرار بشأن هذه الشخصية')}
          approveLabel="approved"
          onCancel={() => setDecidingId(null)}
          onSubmit={(v) => {
            if (v.decision === 'confirmed' || v.decision === 'investigate') return
            decide.mutate({ id: decidingId, decision: v.decision, reason: v.reason })
            setDecidingId(null)
          }}
        />
      )}
    </div>
  )
}

function RecRow({ icon, label, children, danger }: { icon: ReactNode; label: string; children: ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="material-light mt-0.5 inline-grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="t-caption flex items-center gap-1.5">
          {danger && <span aria-hidden className="dot dot-error" />}
          {label}
        </span>
        <span className="text-sm text-foreground">{children}</span>
      </div>
    </div>
  )
}

function PersonaCard({ persona, canApprove, canAudit, onDecide }: { persona: Persona; canApprove: boolean; canAudit: boolean; onDecide: () => void }) {
  const { t, L } = useI18n()
  const r = persona.recommendation
  return (
    <article id={`persona-${persona.id}`} tabIndex={-1} className="min-w-0 scroll-mt-24 rounded-card outline-hidden">
      <Card density="comfortable" className="h-full">
        <div data-slot="card-header" className="flex flex-col gap-2 px-(--card-pad)">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full [&_svg]:size-4">
                <Target />
              </span>
              <h2 className="t-card-title">{L(persona.name)}</h2>
            </div>
            <StatusBadge tone={persona.approvedByCxManager ? 'success' : 'warning'} icon={persona.approvedByCxManager ? <CheckCircle2 aria-hidden /> : <Clock aria-hidden />}>
              {persona.approvedByCxManager ? t('Approved', 'معتمدة') : t('Pending CX approval', 'بانتظار الاعتماد')}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">{L(persona.who)}</p>
        </div>

        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            <span className="font-medium text-foreground">{t('Main pain', 'المشكلة الرئيسية')}:</span> <span className="text-muted-foreground">{L(persona.mainPain)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {persona.channelsUsed.map((c) => (
              <StatusBadge key={c} icon={<Radio aria-hidden />}>
                {c}
              </StatusBadge>
            ))}
            <StatusBadge tone="info">
              <span className="tabular">{persona.segmentSize}</span> {t('segment', 'شريحة')}
            </StatusBadge>
            <StatusBadge tone="danger" icon={<UserX aria-hidden />}>
              <span className="tabular">{persona.runawayCount}</span> {t('runaway', 'هارب')}
            </StatusBadge>
          </div>
        </CardContent>

        <CardWell className="gap-4">
          <h3 className="t-small-strong flex items-center gap-2">
            <Megaphone aria-hidden className="size-4 text-muted-foreground rtl:-scale-x-100" />
            {t('Marketing recommendation', 'التوصية التسويقية')}
          </h3>
          <RecRow icon={<Target />} label={t('Target', 'الفئة المستهدفة')}>
            {L(r.targetWho)}
          </RecRow>
          <RecRow icon={<Radio />} label={t('Channel & when', 'القناة والتوقيت')}>
            {L(r.channelAndWhen)}
          </RecRow>
          <RecRow icon={<Megaphone />} label={t('Campaign type', 'نوع الحملة')}>
            {L(r.campaignType)}
          </RecRow>
          <RecRow icon={<Ban />} label={t('What not to do', 'ما لا يجب فعله')} danger>
            {L(r.whatNotToDo)}
          </RecRow>
        </CardWell>

        {canAudit && persona.auditNote && (
          <InlineNote tone="warning" className="mx-(--card-pad)">
            <span className="font-medium">{t('Audit note', 'ملاحظة تدقيق')}</span> · <span className="text-muted-foreground">{L(persona.auditNote)}</span>
          </InlineNote>
        )}

        {canApprove && (
          <CardFooter className="mt-auto justify-end">
            <Button size="sm" onClick={onDecide}>
              <Gavel aria-hidden />
              {t('Decide', 'اتخاذ قرار')}
            </Button>
          </CardFooter>
        )}
      </Card>
    </article>
  )
}

/** KB §13: a campaign brief built by the assistant, saved for Marketing. */
function SavedBriefs() {
  const { t, L, lang } = useI18n()
  const { data: briefs } = useCampaignBriefs()
  if (!briefs?.length) return null
  return (
    <SectionCard
      title={t('Campaign briefs saved for Marketing', 'ملخصات الحملات المحفوظة للتسويق')}
      description={t('Built by the assistant from the sample records; Marketing writes the final campaign.', 'أعدها المساعد من السجلات التجريبية؛ ويكتب التسويق الحملة النهائية.')}
    >
      <ul className="grid grid-cols-1 gap-(--grid-gap) lg:grid-cols-2">
        {briefs.map((b) => (
          <li key={b.id} className="well flex min-w-0 flex-col gap-1.5 text-sm">
            <span className="t-ui-strong inline-flex items-center gap-2">
              <Megaphone aria-hidden className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
              {L(b.title)}
            </span>
            <span className="text-foreground">{L(b.who)}</span>
            <span className="text-muted-foreground">{b.channelSplit.map((c) => `${L(CHANNEL_LABEL[c.channel])} ${c.count}`).join(' · ')}</span>
            <span className="text-muted-foreground">
              {t('What not to do', 'ما يجب تجنبه')}: {L(b.whatNotToDo)}
            </span>
            <span className="t-caption">
              {t('Saved by', 'حفظه')} {L(b.savedBy)} · {new Date(b.savedAt).toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
