import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CheckCheck, ChevronDown, FileSearch, Gavel, Package, Play, Route, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { canActOnCorrectiveAction } from '@/auth/permissions'
import { useFixDue, useRules, useSetFixStatus } from '@/services/queriesV40'
import { ACTION_KIND } from '@/lib/actionKinds'
import { PRODUCTS } from '@/data/products'
import { ownerTitle } from '@/data/ownerTitles'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '@/utils/effectiveness'
import { approvalDaysLeft } from '@/utils/fixClock'
import { caId, invId } from '@/utils/trace'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { StatusBadge } from '@/components/common/StatusBadge'
import { NextBox } from '@/components/common/NextBox'
import { TraceId } from '@/components/common/TraceId'
import { DayChip } from '@/components/common/DayChip'
import { TraceCard } from '@/components/trace/TraceCard'
import { useScrollToTarget } from '@/components/trace/useScrollToTarget'
import { cn } from '@/lib/utils'
import type { Bi, CorrectiveAction, Pattern } from '@/types'
import { InlineNote } from '@/components/common/InlineNote'
import { LifecycleStepper } from './LifecycleStepper'
import { HowAiFoundThis } from './HowAiFoundThis'
import { MatrixLine } from './MatrixLine'
import { AuditTrail } from './AuditTrail'
import { fixNextStep, isAiMadeFix } from './fixNextStep'

const DECISION_LABEL = {
  modified: { en: 'Modified', ar: 'معدّل' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
} as const

interface FixCardProps {
  fix: CorrectiveAction
  pattern?: Pattern
  /** The fix named by `?fix=CA-201` (inbox, trace links): highlighted, scrolled to and focused. */
  selected: boolean
  now: number
  onDecide: (id: string) => void
  /** Whether the details (lifecycle, matrix line, classification, AI panel, audit trail, Trace card) are shown. The header and the next-step box always are. */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One fix, in full (v40 F07, F11, F21, F22, F26, F33): the "where you are, what happens next" box above it, the title,
 * owner, product and due date (from the matrix "Resolve (h)" in working hours), the lifecycle, the matrix line before the
 * Classification, "How the AI found this" with the agent chips, the audit trail and the Trace card.
 *
 * The page is long with every fix open, so the details fold (v40 integration): the next-step box and the header (title, kind,
 * status, owner, product, due date, decision) always show; the rest sits behind a "Details" toggle (`aria-expanded`, a real
 * button, so Enter and Space work). The page keeps the first card and the one a link named (`?fix=`) open.
 *
 * Composition (Meo-inspired): ONE comfortable card per fix (the `li` is the card, so the next-step box is its first child, a well on
 * top). Header: the id and status tags, the title (22), then a well with owner, product and due. The details are dense and sit under
 * the toggle: the lifecycle is the skill's stepper, the matrix line, the classification and "How the AI found this" are wells, the
 * audit trail is a table on the white card, the Trace card a well. A linked fix (`?fix=`) is the 1.5px ink ring.
 */
export function FixCard({ fix: a, pattern, selected, now, onDecide, open, onOpenChange }: FixCardProps) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const rules = useRules()
  const due = useFixDue(a)
  const setStatus = useSetFixStatus()
  const itemRef = useRef<HTMLLIElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const canAct = canActOnCorrectiveAction(role.id, a.kind)

  useScrollToTarget(itemRef, selected)
  useEffect(() => {
    if (selected) headingRef.current?.focus({ preventScroll: true })
  }, [selected])

  const eff = a.monthlySignalSeries && a.startedMonthIndex !== undefined ? evaluateEffectiveness(a.monthlySignalSeries, a.startedMonthIndex) : null
  const showEff = eff && (a.status === 'verification' || a.status === 'effective' || a.status === 'partial' || a.status === 'failed')
  const product = PRODUCTS.find((p) => p.id === a.product)
  const next = fixNextStep(a, rules)
  const proposedFirst = a.status === 'proposed' && !a.decision && !a.sentToInvestigation
  const approvalLeft = proposedFirst ? approvalDaysLeft(a.proposedAt, new Date(now), rules) : null

  function move(status: 'in_progress' | 'verification') {
    setStatus.mutate(
      { id: a.id, status },
      { onSuccess: () => toast.success(status === 'in_progress' ? t('Started', 'بدأ التنفيذ') : t('Marked done; the 60-day check is scheduled', 'عُلّم منجزاً؛ جُدول فحص الـ60 يوماً')) },
    )
  }

  const action = canAct ? (
    a.status === 'proposed' && !a.sentToInvestigation && a.decision !== 'rejected' ? (
      <Button size="sm" onClick={() => onDecide(a.id)}>
        <Gavel aria-hidden />
        {t('Decide', 'اتخاذ قرار')}
      </Button>
    ) : a.status === 'approved' ? (
      <Button size="sm" disabled={setStatus.isPending} onClick={() => move('in_progress')}>
        <Play aria-hidden className="rtl:-scale-x-100" />
        {t('Start', 'بدء')}
      </Button>
    ) : a.status === 'in_progress' ? (
      <Button size="sm" disabled={setStatus.isPending} onClick={() => move('verification')}>
        <CheckCheck aria-hidden />
        {t('Done, start the 60-day check', 'تم، ابدأ فحص 60 يوماً')}
      </Button>
    ) : undefined
  ) : undefined

  // The date the fix is due, from the hook: the stored one when the fix holds one (approved, or a sample fix), the preview of what
  // approval now would give while it waits for its yes. `due.preview` says which.
  const dueIso = due?.dueAt ?? a.dueDate
  const dueHint: Bi | null = due?.preview
    ? due.source === 'matrix'
      ? { en: `if approved today: matrix Resolve ${due.hours ?? '–'} h, in working hours`, ar: `إن اعتُمد اليوم: الحل حسب المصفوفة ${due.hours ?? '–'} ساعة عمل` }
      : { en: 'if approved today: the matrix cell is empty, so the 14-day fallback', ar: 'إن اعتُمد اليوم: خلية المصفوفة فارغة، فالبديل 14 يوماً' }
    : due?.source === 'matrix'
      ? { en: 'from the matrix Resolve (h), in working hours from approval', ar: 'من حقل الحل (ساعة) في المصفوفة، بساعات العمل من الاعتماد' }
      : due?.source === 'fallback'
        ? { en: 'the matrix cell was empty: Agent 5’s 14-day fallback', ar: 'كانت خلية المصفوفة فارغة: البديل 14 يوماً من الوكيل 5' }
        : null

  return (
    <li
      ref={itemRef}
      id={`fix-${caId(a.id)}`}
      data-density="comfortable"
      className={cn('surface-card flex scroll-mt-24 flex-col gap-5 p-(--card-pad)', selected && 'ring-selected')}
      data-fix={caId(a.id)}
      data-selected={selected ? 'true' : undefined}
    >
      <NextBox next={next} who={L(ownerTitle(a.owner))} action={action} />

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TraceId kind="fix" id={a.id} plain />
          <StatusBadge tone="neutral">{L(ACTION_KIND[a.kind].label)}</StatusBadge>
          <StatusBadge tone={a.status === 'effective' ? 'success' : a.status === 'failed' ? 'danger' : 'neutral'}>{L(CORRECTIVE_STATUS_LABEL[a.status])}</StatusBadge>
          {a.fromInsight && <StatusBadge tone="neutral">{t('From AI Insights', 'من رؤى الذكاء الاصطناعي')}</StatusBadge>}
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="t-card-title outline-hidden focus-visible:[--tw-ring-shadow:0_0_#0000]">
          {L(a.title)}
        </h2>
        {a.fromInsight && <p className="text-sm text-muted-foreground">{L(a.fromInsight.recovery)}</p>}
        {(a.proposedBy || a.source) && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {a.proposedBy && (
              <span>
                {t('Proposed by', 'اقترحه')} {L(a.proposedBy)}
              </span>
            )}
            {a.source && <EvidenceTag investigationId={a.source.investigationId} />}
          </p>
        )}
      </div>

      <div className="well flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <UserRound aria-hidden className="size-4" />
          {t('Owner', 'المالك')}: <span className="font-medium text-foreground">{L(ownerTitle(a.owner))}</span>
        </span>
        {product && (
          <span className="inline-flex items-center gap-1.5">
            <Package aria-hidden className="size-4" />
            {t('Product', 'المنتج')}: <span className="font-medium text-foreground">{L(product.name)}</span>
          </span>
        )}
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <CalendarClock aria-hidden className="size-4" />
          {t('Due', 'الاستحقاق')}{' '}
          <span className="font-medium text-foreground tabular" data-testid="fix-due">
            {new Date(dueIso).toLocaleDateString(lang)}
          </span>
          {dueHint && <span>({L(dueHint)})</span>}
        </span>
        {approvalLeft !== null && (
          <span className="inline-flex items-center gap-1.5">
            {t('Approval window', 'نافذة الاعتماد')}: <DayChip daysLeft={approvalLeft} unit="wd" />
          </span>
        )}
      </div>

      {a.kind === 'employee' && (
        <InlineNote tone="warning">
          {t('Management note — the direct manager only, never a case, never HR, never a name outside this line.', 'ملاحظة إدارية — للمدير المباشر فقط، دون حالة أو موارد بشرية أو اسم خارج هذا الخط.')}
        </InlineNote>
      )}

      {(a.decision === 'modified' || a.decision === 'rejected') && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone={a.decision === 'rejected' ? 'danger' : 'warning'}>{L(DECISION_LABEL[a.decision])}</StatusBadge>
          {a.decisionReason && <span className="text-muted-foreground">{L(a.decisionReason)}</span>}
        </div>
      )}

      {showEff && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('60-day verification', 'تحقق 60 يوماً')}</span>
          <StatusBadge tone={eff.verdict === 'effective' ? 'success' : eff.verdict === 'failed' ? 'danger' : eff.verdict === 'too_early' ? 'neutral' : 'warning'}>
            {L(EFFECTIVENESS_LABEL[eff.verdict])}
          </StatusBadge>
          <bdi dir="ltr" className="tabular text-muted-foreground">
            ({Math.round(eff.changePct * 100)}%)
          </bdi>
        </div>
      )}

      {a.sentToInvestigation && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone="info" icon={<FileSearch aria-hidden />}>
            {t('Sent to investigation first', 'أُحيل إلى التحقيق أولاً')}
          </StatusBadge>
          <span className="text-muted-foreground">{t('Five customer interviews requested; see Investigations.', 'طُلبت خمس مقابلات مع العملاء؛ انظر التحقيقات.')}</span>
        </div>
      )}

      <Collapsible open={open} onOpenChange={onOpenChange} className="flex flex-col gap-5">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-fit [&[data-state=open]>svg]:rotate-180">
            {t('Details', 'التفاصيل')}
            <span className="sr-only"> {caId(a.id)}</span>
            <ChevronDown aria-hidden className="transition-transform duration-400 ease-spring motion-reduce:transition-none" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent data-density="dense" className="flex flex-col gap-4">
          <LifecycleStepper status={a.status} />
          <MatrixLine fix={a} />
          <div className="well grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="t-body-s inline-flex items-center gap-1.5">
                <Route aria-hidden className="size-3.5" />
                {t('Kind and path', 'النوع والمسار')}
              </span>
              <span className="text-foreground">{L(ACTION_KIND[a.kind].path)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-body-s">{t('Who receives it', 'من يستلمه')}</span>
              <span className="text-foreground">{L(ownerTitle(a.owner))}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-body-s">{t('What comes back', 'ما الذي يعود')}</span>
              <span className="text-foreground">{L(ACTION_KIND[a.kind].comesBack)}</span>
            </div>
          </div>
          <HowAiFoundThis actionId={a.id} pattern={pattern} aiMade={isAiMadeFix(a)} />
          <AuditTrail log={a.auditLog} />
          <TraceCard kind="fix" id={a.id} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

/** "Evidence: INV-1": the investigation a fix was proposed from. A link where the role may open Investigations. */
function EvidenceTag({ investigationId }: { investigationId: string }) {
  const { t } = useI18n()
  const { role } = useRole()
  const id = invId(investigationId)
  const label = (
    <>
      {t('Evidence', 'دليل')}: <bdi dir="ltr">{id}</bdi>
    </>
  )
  if (canAccessPath(role.id, '/actions/investigations')) {
    return (
      <Link to={`/actions/investigations?inv=${id}`} className="pill pill-light transition-opacity duration-200 hover:opacity-80">
        <span aria-hidden className="dot dot-info" />
        {label}
      </Link>
    )
  }
  return <StatusBadge tone="info">{label}</StatusBadge>
}
