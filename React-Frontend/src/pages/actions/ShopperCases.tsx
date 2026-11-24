import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, FileText, Gavel, Image, Mic, MessageSquare, ShieldCheck, Undo2, UserRound, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { useUsers } from '@/data/users'
import { isInformedOnly } from '@/auth/permissions'
import { useAdvanceShopperCase, useDecideShopperCaseAction, useMarkShopperActionDone, useReviewShopperCase, useShopperCases } from '@/services/queries'
import { awaitingCxReview, isCxSide, isShopperOwner, ownerLabel, readyToClose, shopperCategory, withOwner } from '@/data/shopperInbox'
import { caseDue, kindConfig, useShopperWorkflow, type ShopperWorkflowConfig } from '@/data/shopperWorkflow'
import { SEVERITY_TONE } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { Bi, ShopperCase, ShopperProposedAction, Severity } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { ClockBadge } from './components/ClockBadge'
import { StepPills } from '@/components/common/StepPills'

/**
 * Mystery shopper cases (rebuilt 24 Nov, owner). The flow:
 * 1. The visit comes in; the CX manager checks the evidence and sends it to the owner (or asks for more evidence).
 * 2. The owner (the environment manager of that environment, or the agent's direct manager) decides each proposed action. Every decision
 *    needs a comment; approving also needs the date that fits the action (a training date, a session date, a deadline).
 * 3. The owner marks each approved action done, saying what was done.
 * 4. When every action is done or rejected, the CX manager closes the case.
 * Each case shows the visit itself: where, when, who (a title, never a name), the scenario, what the shopper wrote, the checklist, the evidence.
 */
const DAY_MS = 86_400_000

const SEVERITY_LABEL: Record<Severity, Bi> = {
  critical: { en: 'Critical', ar: 'حرجة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  low: { en: 'Low', ar: 'منخفضة' },
}

const STEPS: { key: string; label: Bi }[] = [
  { key: 'review', label: { en: 'CX manager checks the evidence', ar: 'مدير CX يتحقق من الأدلة' } },
  { key: 'decide', label: { en: 'Owner decides', ar: 'المالك يقرر' } },
  { key: 'do', label: { en: 'Actions done', ar: 'تنفيذ الإجراءات' } },
  { key: 'closed', label: { en: 'Closed', ar: 'مغلقة' } },
]

const DECISION: Record<ShopperProposedAction['decision'], { label: Bi; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  pending: { label: { en: 'Waiting for a decision', ar: 'بانتظار القرار' }, tone: 'neutral' },
  confirmed: { label: { en: 'Approved', ar: 'معتمد' }, tone: 'success' },
  modified: { label: { en: 'Approved with changes', ar: 'معتمد بتعديل' }, tone: 'warning' },
  rejected: { label: { en: 'Rejected', ar: 'مرفوض' }, tone: 'danger' },
}

const EVIDENCE_ICON = { recording: Mic, photo: Image, form: FileText, chat: MessageSquare }

function stepsFor(c: ShopperCase, cfg: ShopperWorkflowConfig) {
  const steps = cfg.cxReviewRequired ? STEPS : STEPS.slice(1)
  const key = c.status === 'closed' ? 'closed' : awaitingCxReview(c, cfg) ? 'review' : c.proposedActions.some((p) => p.decision === 'pending') ? 'decide' : 'do'
  return { steps, step: steps.findIndex((s) => s.key === key) }
}

export default function ShopperCases() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const me = users.find((u) => u.id === session?.userId)?.name ?? role.name.en
  const [params] = useSearchParams()
  const focus = params.get('case')
  const { data: cases, isLoading, error, refetch } = useShopperCases()
  const decide = useDecideShopperCaseAction()
  const review = useReviewShopperCase()
  const markDone = useMarkShopperActionDone()
  const advance = useAdvanceShopperCase()
  const [deciding, setDeciding] = useState<{ c: ShopperCase; p: ShopperProposedAction } | null>(null)
  const [reviewing, setReviewing] = useState<{ c: ShopperCase; approve: boolean } | null>(null)
  const [finishing, setFinishing] = useState<{ c: ShopperCase; p: ShopperProposedAction } | null>(null)
  const { config: cfg } = useShopperWorkflow()
  const cx = isCxSide(role.id)
  const informedOnly = isInformedOnly(role.id)
  const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  // the owner sees a case only after the CX manager has checked the evidence
  const visible = (cases ?? []).filter((c) => cx || !awaitingCxReview(c, cfg))

  useEffect(() => {
    if (!focus || !visible.length) return
    const el = document.getElementById(`case-${focus}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus, visible.length])

  return (
    <div data-density="dense" className="flex flex-col gap-4">
      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !visible.length ? (
        <EmptyState title={t('No mystery shopper cases for you.', 'لا توجد حالات تسوق سري لك.')} />
      ) : (
        <ul className="flex flex-col gap-(--grid-gap)">
          {visible.map((c) => {
            const owner = isShopperOwner(role.id, role.environment, c, cfg)
            const { steps, step } = stepsFor(c, cfg)
            const due = caseDue(cfg, c.openedAt, c.severity)
            const v = c.visit
            const failed = v?.items.filter((i) => !i.pass).length ?? 0
            return (
              <li key={c.id} id={`case-${c.id}`} className="scroll-mt-24">
                <Card className={cn(focus === c.id && 'ring-2 ring-foreground/70')}>
                  <CardContent className="flex flex-col gap-5">
                    {/* header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={SEVERITY_TONE[c.severity]} dot>
                            {L(SEVERITY_LABEL[c.severity])}
                          </StatusBadge>
                          <h2 className="t-h4">{L(shopperCategory(c.category))}</h2>
                          <ProductTag productId={c.product} lang={lang} />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {v ? `${L(v.where)} · ${fmt(v.date)} · ` : `${c.environment} · `}
                          {t('visit score', 'درجة الزيارة')}{' '}
                          <bdi dir="ltr" className="font-medium text-foreground tabular">
                            {c.visitScorePct}%
                          </bdi>
                        </span>
                      </div>
                      <StatusBadge tone={informedOnly ? 'neutral' : 'info'} icon={<UserRound aria-hidden />} className="self-start">
                        {informedOnly ? t('Informed only', 'للعلم فقط') : `${t('Decides', 'يقرر')}: ${L(ownerLabel(cfg, c))}`}
                      </StatusBadge>
                    </div>

                    <StepPills
                      label={t('Case flow', 'مسار الحالة')}
                      steps={steps.map((s, i) => ({ key: s.key, label: L(s.label), state: i < step ? 'done' : i === step ? 'current' : 'todo' }))}
                    />

                    {/* the visit */}
                    {v && (
                      <section className="well flex flex-col gap-4 text-sm" aria-label={t('What the shopper found', 'ما وجده المتسوق')}>
                        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                          <Fact label={t('Channel', 'القناة')} value={L(v.channel)} />
                          <Fact label={t('Served by', 'خدمه')} value={L(v.staff)} />
                          <Fact label={t('Scenario', 'السيناريو')} value={L(v.scenario)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="t-body-s">{t('What the shopper wrote', 'ما كتبه المتسوق')}</span>
                          <p className="border-s-2 ps-3 text-foreground italic">“{L(v.shopperNote)}”</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="t-body-s">
                            {t(`Checklist: ${failed} of ${v.items.length} missed`, `قائمة التحقق: ${failed} من ${v.items.length} لم تتحقق`)}
                          </span>
                          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                            {v.items.map((i) => (
                              <li key={i.label.en} className="flex items-start gap-2">
                                {i.pass ? (
                                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-(--status-success-text)" />
                                ) : (
                                  <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-(--status-error-text)" />
                                )}
                                <span className="text-foreground">
                                  <span className="sr-only">{i.pass ? t('Met: ', 'تحقق: ') : t('Missed: ', 'لم يتحقق: ')}</span>
                                  {L(i.label)}
                                  {i.note && <span className="text-muted-foreground"> · {L(i.note)}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="t-body-s">{t('Evidence', 'الأدلة')}</span>
                          <span className="flex flex-wrap gap-2">
                            {v.evidence.map((e) => {
                              const Icon = EVIDENCE_ICON[e.kind]
                              return (
                                <StatusBadge key={e.label.en} tone="neutral" icon={<Icon aria-hidden />}>
                                  {L(e.label)}
                                </StatusBadge>
                              )
                            })}
                          </span>
                        </div>
                      </section>
                    )}

                    {/* the CX manager's check */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      {c.cxReview && !c.cxReview.returned ? (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <ShieldCheck aria-hidden className="size-4 text-(--status-success-text)" />
                          <span className="text-foreground">
                            {t(`Evidence checked by the ${c.cxReview.by}`, `تحقق ${c.cxReview.by === 'CX manager' ? 'مدير CX' : c.cxReview.by} من الأدلة`)} ·{' '}
                            {fmt(c.cxReview.at)}
                          </span>
                          {c.cxReview.note && <span className="text-muted-foreground">“{c.cxReview.note}”</span>}
                        </span>
                      ) : c.cxReview?.returned ? (
                        <span className="inline-flex items-center gap-2 text-foreground">
                          <Undo2 aria-hidden className="size-4" />
                          {t('Sent back for more evidence', 'أُعيدت لطلب أدلة إضافية')}: “{c.cxReview.note}”
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t(
                            'Waiting for the CX manager to check the evidence. The owner sees it after that.',
                            'بانتظار تحقق مدير CX من الأدلة. يراها المالك بعد ذلك.',
                          )}
                        </span>
                      )}
                      {role.id === 'cxmgr' && awaitingCxReview(c, cfg) && (
                        <span className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => setReviewing({ c, approve: false })}>
                            <Undo2 aria-hidden />
                            {t('Ask for more evidence', 'اطلب أدلة إضافية')}
                          </Button>
                          <Button size="sm" onClick={() => setReviewing({ c, approve: true })}>
                            <ShieldCheck aria-hidden />
                            {t('Evidence is good, send to the owner', 'الأدلة سليمة، أرسلها للمالك')}
                          </Button>
                        </span>
                      )}
                    </div>

                    {c.status !== 'closed' && (
                      <div className="well flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-muted-foreground">{t('First response', 'أول استجابة')}</span>
                          <ClockBadge dueIso={due.respondDueAt} totalWindowMs={cfg.clocks[c.severity].respondDays * DAY_MS} stoppedAtIso={c.respondedAt} />
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-muted-foreground">{t('Resolve', 'الحل')}</span>
                          <ClockBadge dueIso={due.resolveDueAt} totalWindowMs={cfg.clocks[c.severity].resolveDays * DAY_MS} stoppedAtIso={c.closedAt} />
                        </span>
                      </div>
                    )}

                    {/* proposed actions */}
                    <section className="flex flex-col gap-2" aria-label={t('Proposed actions', 'الإجراءات المقترحة')}>
                      <h3 className="t-ui-strong">{t('Proposed actions', 'الإجراءات المقترحة')}</h3>
                      <ol className="flex flex-col">
                        {c.proposedActions.map((p) => {
                          const k = kindConfig(cfg, p.kind)
                          const canDecide = owner && withOwner(c, cfg) && p.decision === 'pending'
                          const canFinish = owner && withOwner(c, cfg) && (p.decision === 'confirmed' || p.decision === 'modified') && !p.doneAt
                          return (
                            <li key={p.n} className="row-divider flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 basis-96 flex-col gap-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="tabular text-muted-foreground">{p.n}.</span>
                                    {k && <StatusBadge tone="neutral">{L(k.label)}</StatusBadge>}
                                    <span className="text-foreground">{L(p.text)}</span>
                                  </span>
                                  {p.why && (
                                    <span className="text-sm text-muted-foreground">
                                      {t('Why', 'لماذا')}: {L(p.why)}
                                    </span>
                                  )}
                                </div>
                                <span className="flex flex-wrap items-center gap-2">
                                  <StatusBadge tone={p.doneAt ? 'success' : DECISION[p.decision].tone} dot>
                                    {p.doneAt ? t('Done', 'منجز') : L(DECISION[p.decision].label)}
                                  </StatusBadge>
                                  {canDecide && (
                                    <Button size="sm" onClick={() => setDeciding({ c, p })}>
                                      <Gavel aria-hidden />
                                      {t('Decide', 'قرّر')}
                                    </Button>
                                  )}
                                  {canFinish && (
                                    <Button variant="outline" size="sm" onClick={() => setFinishing({ c, p })}>
                                      <ClipboardCheck aria-hidden />
                                      {t('Mark done', 'علّم كمنجز')}
                                    </Button>
                                  )}
                                </span>
                              </div>
                              {p.decision !== 'pending' && (
                                <div className="ms-5 flex flex-col gap-1 rounded-well bg-well px-3 py-2 text-sm">
                                  <span className="text-foreground">
                                    {p.decidedBy && <span className="font-medium">{p.decidedBy}</span>}
                                    {p.decidedAt && <span className="text-muted-foreground"> · {fmt(p.decidedAt)}</span>}
                                    {p.decisionNote && <span>: “{p.decisionNote}”</span>}
                                  </span>
                                  {p.plannedFor && k && (
                                    <span className="text-muted-foreground">
                                      {L(k.dateLabel)}: <span className="font-medium text-foreground">{fmt(p.plannedFor)}</span>
                                    </span>
                                  )}
                                  {p.doneAt && (
                                    <span className="text-muted-foreground">
                                      {t('Done', 'نُفذ')} {fmt(p.doneAt)}: <span className="text-foreground">“{p.doneNote}”</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </section>

                    {role.id === 'cxmgr' && readyToClose(c, cfg) && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            advance.mutate({ caseId: c.id, status: 'closed' })
                            toast.success(t('Case closed', 'أُغلقت الحالة'))
                          }}
                        >
                          {t('Every action is done: close the case', 'كل الإجراءات نُفذت: أغلق الحالة')}
                        </Button>
                      </div>
                    )}
                    {c.status === 'closed' && c.closedAt && (
                      <p className="text-sm text-muted-foreground">
                        {t(`Closed on ${fmt(c.closedAt)} by the CX manager.`, `أغلقها مدير CX في ${fmt(c.closedAt)}.`)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {deciding && (
        <DecideDialog
          p={deciding.p}
          cfg={cfg}
          onCancel={() => setDeciding(null)}
          onSave={(v) => {
            decide.mutate({ caseId: deciding.c.id, n: deciding.p.n, ...v, by: me })
            setDeciding(null)
            toast.success(t('Decision saved. The CX manager sees it.', 'حُفظ القرار. يراه مدير CX.'))
          }}
        />
      )}
      {reviewing && (
        <NoteDialog
          title={reviewing.approve ? t('Send to the owner', 'أرسل للمالك') : t('Ask for more evidence', 'اطلب أدلة إضافية')}
          description={
            reviewing.approve
              ? t('Optional: what you checked. The owner sees it with the case.', 'اختياري: ما الذي تحققت منه. يراه المالك مع الحالة.')
              : t('Say what is missing. The case stays with you.', 'اذكر ما ينقص. تبقى الحالة عندك.')
          }
          required={!reviewing.approve}
          saveLabel={reviewing.approve ? t('Send', 'أرسل') : t('Send back', 'أعِدها')}
          onCancel={() => setReviewing(null)}
          onSave={(note) => {
            review.mutate({ caseId: reviewing.c.id, approve: reviewing.approve, note: note || undefined, by: 'CX manager' })
            setReviewing(null)
            toast.success(reviewing.approve ? t('Sent to the owner; it is in their inbox.', 'أُرسلت للمالك؛ وهي في صندوقه.') : t('Sent back', 'أُعيدت'))
          }}
        />
      )}
      {finishing && (
        <NoteDialog
          title={t('Mark this action done', 'علّم هذا الإجراء كمنجز')}
          description={t('What was done, and when. The CX manager reads it before closing the case.', 'ما الذي نُفذ ومتى. يقرأه مدير CX قبل إغلاق الحالة.')}
          required
          saveLabel={t('Mark done', 'علّم كمنجز')}
          onCancel={() => setFinishing(null)}
          onSave={(note) => {
            markDone.mutate({ caseId: finishing.c.id, n: finishing.p.n, note })
            setFinishing(null)
            toast.success(t('Marked done', 'عُلّم كمنجز'))
          }}
        />
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="t-body-s">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

/** Approve, approve with changes, or reject: a comment every time, and the date that fits the action when it goes ahead. */
function DecideDialog({
  p,
  cfg,
  onCancel,
  onSave,
}: {
  p: ShopperProposedAction
  cfg: ShopperWorkflowConfig
  onCancel: () => void
  onSave: (v: { decision: 'confirmed' | 'modified' | 'rejected'; note: string; plannedFor?: string }) => void
}) {
  const { t, L } = useI18n()
  const [decision, setDecision] = useState<'confirmed' | 'modified' | 'rejected'>('confirmed')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [tried, setTried] = useState(false)
  // what is required comes from the workflow configuration (Settings → Rules as configuration)
  const k = kindConfig(cfg, p.kind)
  const showDate = decision !== 'rejected' && !!k
  const needsDate = showDate && !!k?.dateRequired
  const needsNote = decision !== 'confirmed' || cfg.commentOnApprove
  const ok = (!needsNote || note.trim().length > 0) && (!needsDate || !!date)
  const options = [
    { value: 'confirmed' as const, label: t('Approve', 'اعتماد'), note: t('Goes ahead as proposed.', 'يمضي كما اقتُرح.') },
    { value: 'modified' as const, label: t('Approve with changes', 'اعتماد بتعديل'), note: t('Say what changes.', 'اذكر ما يتغير.') },
    { value: 'rejected' as const, label: t('Reject', 'رفض'), note: t('Does not go ahead; say why.', 'لا يمضي؛ اذكر السبب.') },
  ]
  const placeholder =
    decision === 'rejected'
      ? t('Why it does not go ahead', 'لماذا لا يمضي')
      : p.kind === 'training'
        ? t('Who attends, who gives it, where', 'من يحضر، ومن يقدمه، وأين')
        : p.kind === 'coaching'
          ? t('Who meets whom, and what you will agree', 'من يلتقي بمن، وما الذي ستتفقون عليه')
          : p.kind === 'hr'
            ? t('What you sent to HR', 'ما الذي أرسلته للموارد البشرية')
            : t('Who does it and how', 'من ينفذه وكيف')
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTried(true)
            if (ok) onSave({ decision, note: note.trim(), plannedFor: showDate && date ? date : undefined })
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('Decide this proposed action', 'قرّر هذا الإجراء المقترح')}</DialogTitle>
            <DialogDescription>{L(p.text)}</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label={t('Decision', 'القرار')} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {options.map((o) => {
              const checked = decision === o.value
              return (
                <label
                  key={o.value}
                  className={cn(
                    'ring-within flex min-h-10 cursor-pointer flex-col gap-0.5 rounded-well px-4 py-3 text-start transition-colors duration-200',
                    checked ? 'material-dark' : 'bg-well hover:bg-well-hover',
                  )}
                >
                  <input type="radio" className="sr-only" name="decision" value={o.value} checked={checked} onChange={() => setDecision(o.value)} />
                  <span className="t-ui-strong text-inherit">{o.label}</span>
                  <span className={cn('text-xs', checked ? 'text-(--on-dark-muted)' : 'text-muted-foreground')}>{o.note}</span>
                </label>
              )
            })}
          </div>
          {showDate && k && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">
                {L(k.dateLabel)} {needsDate ? t('(required)', '(مطلوب)') : t('(optional)', '(اختياري)')}
              </span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={tried && !date} className="w-48" />
              {tried && needsDate && !date && <span className="text-xs text-(--status-error-text)">{t('Pick a date.', 'اختر تاريخاً.')}</span>}
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">
              {t('Comment', 'تعليق')} {needsNote ? t('(required)', '(مطلوب)') : t('(optional)', '(اختياري)')}
            </span>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder} aria-invalid={tried && !note.trim()} />
            {tried && needsNote && !note.trim() && <span className="text-xs text-(--status-error-text)">{t('A comment is required.', 'التعليق مطلوب.')}</span>}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Save decision', 'حفظ القرار')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NoteDialog({
  title,
  description,
  required,
  saveLabel,
  onCancel,
  onSave,
}: {
  title: string
  description: string
  required: boolean
  saveLabel: string
  onCancel: () => void
  onSave: (note: string) => void
}) {
  const { t } = useI18n()
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTried(true)
            if (!required || note.trim()) onSave(note.trim())
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label={title} aria-invalid={tried && required && !note.trim()} />
          {tried && required && !note.trim() && <span className="text-xs text-(--status-error-text)">{t('This is required.', 'هذا مطلوب.')}</span>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{saveLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
