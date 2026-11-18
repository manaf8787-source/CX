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
import { PageHeader } from '@/components/common/PageHeader'
import { CustomersTabs } from '@/components/customers/CustomersTabs'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
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
        cell: ({ row }) => (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold-text tabular-nums">
            {row.original.rank}
          </span>
        ),
        meta: { headerClassName: 'w-16' },
      },
      {
        id: 'persona',
        accessorFn: (r) => personaName(r.personaId),
        header: t('Persona', 'الشخصية'),
        cell: ({ getValue }) => <span className="font-semibold">{getValue<string>()}</span>,
      },
      {
        id: 'campaign',
        accessorFn: (r) => L(r.title),
        header: t('Campaign', 'الحملة'),
        cell: ({ getValue }) => <span className="whitespace-normal">{getValue<string>()}</span>,
      },
      {
        id: 'who',
        accessorFn: (r) => L(r.summary),
        header: t('Who', 'لمن'),
        cell: ({ getValue }) => <span className="block min-w-48 whitespace-normal text-muted-foreground">{getValue<string>()}</span>,
      },
    ]
  }, [t, L, personas])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        term="Persona" title={t('Personas and campaigns', 'الشخصيات والحملات')}
        description={t(
          'Six personas built from the CRM, each with a Marketing recommendation and a ranked next campaign.',
          'ست شخصيات مبنية من بيانات نظام إدارة العملاء، لكل منها توصية تسويقية وحملة تالية مرتبة.',
        )}
      />

      <CustomersTabs />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col items-start gap-2 rounded-xl border bg-muted/40 p-5">
          <StatusBadge tone="info" icon={<Layers aria-hidden />}>
            {t('How personas are built', 'كيف تُبنى الشخصيات')}
          </StatusBadge>
          <p className="text-sm">
            {t(
              'Built first by rules on CRM fields (residence, work sector, income source, units owned, lost reason) plus the channel actually used — not by clustering. Clustering is a phase-two addition once three months of live timeline data exist (FR-6.3). A persona nobody can act on is dropped.',
              'تُبنى أولاً بقواعد على بيانات نظام إدارة العملاء (السكن، قطاع العمل، مصدر الدخل، الوحدات المملوكة، سبب الخسارة) بالإضافة إلى القناة المستخدمة فعلياً — وليس بالتجميع الآلي. التجميع الآلي إضافة لمرحلة لاحقة بعد توفر ثلاثة أشهر من بيانات حية — FR-6.3. أي شخصية لا يمكن التصرف بناءً عليها تُسقَط.',
            )}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-xl border bg-muted/40 p-5">
          <StatusBadge tone="warning" icon={<Lock aria-hidden />}>
            {t('Aggregated only', 'إجمالي فقط')}
          </StatusBadge>
          <p className="text-sm">
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
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className={
          danger
            ? 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-destructive/12 text-danger-text [&_svg]:size-3.5'
            : 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5'
        }
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className={danger ? 'text-xs font-semibold text-danger-text' : 'text-xs font-semibold text-muted-foreground'}>{label}</span>
        <span className="text-sm">{children}</span>
      </div>
    </div>
  )
}

function PersonaCard({ persona, canApprove, canAudit, onDecide }: { persona: Persona; canApprove: boolean; canAudit: boolean; onDecide: () => void }) {
  const { t, L } = useI18n()
  const r = persona.recommendation
  return (
    <article
      id={`persona-${persona.id}`}
      tabIndex={-1}
      className="flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="text-lg font-semibold">{L(persona.name)}</h2>
            <span className="text-sm text-muted-foreground">{L(persona.who)}</span>
          </div>
        </div>
        <StatusBadge tone={persona.approvedByCxManager ? 'success' : 'warning'} icon={persona.approvedByCxManager ? <CheckCircle2 aria-hidden /> : <Clock aria-hidden />}>
          {persona.approvedByCxManager ? t('Approved', 'معتمدة') : t('Pending CX approval', 'بانتظار الاعتماد')}
        </StatusBadge>
      </header>

      <p className="text-sm">
        <span className="font-semibold">{t('Main pain', 'المشكلة الرئيسية')}:</span> {L(persona.mainPain)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {persona.channelsUsed.map((c) => (
          <StatusBadge key={c} icon={<Radio aria-hidden />}>
            {c}
          </StatusBadge>
        ))}
        <StatusBadge tone="info">
          <span className="tabular-nums">{persona.segmentSize}</span> {t('segment', 'شريحة')}
        </StatusBadge>
        <StatusBadge tone="danger" icon={<UserX aria-hidden />}>
          <span className="tabular-nums">{persona.runawayCount}</span> {t('runaway', 'هارب')}
        </StatusBadge>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Megaphone aria-hidden className="size-4 text-gold-text rtl:-scale-x-100" />
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
      </section>

      {canAudit && persona.auditNote && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <StatusBadge tone="warning">{t('Audit note', 'ملاحظة تدقيق')}</StatusBadge>
          <span className="text-sm text-warning-text">{L(persona.auditNote)}</span>
        </div>
      )}

      {canApprove && (
        <div className="mt-auto flex justify-end border-t pt-3">
          <Button size="sm" onClick={onDecide}>
            <Gavel aria-hidden />
            {t('Decide', 'اتخاذ قرار')}
          </Button>
        </div>
      )}
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
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {briefs.map((b) => (
          <li key={b.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Megaphone aria-hidden className="size-4 text-gold-text" />
              {L(b.title)}
            </span>
            <span>{L(b.who)}</span>
            <span className="text-muted-foreground">
              {b.channelSplit.map((c) => `${L(CHANNEL_LABEL[c.channel])} ${c.count}`).join(' · ')}
            </span>
            <span className="text-muted-foreground">
              {t('What not to do', 'ما يجب تجنبه')}: {L(b.whatNotToDo)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('Saved by', 'حفظه')} {L(b.savedBy)} · {new Date(b.savedAt).toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
