import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, CheckCircle2, ChevronRight, Clock4, Inbox, ListChecks, MapPin, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useDecideCorrectiveAction, usePatternsAll, useProducts, useSignalsAll } from '@/services/queries'
import { useEnvScope } from '@/services/envScope'
import { envsOfFix } from '@/utils/envScope'
import { ENVIRONMENTS, environmentById } from '@/data/environments'
import { ownerTitle } from '@/data/ownerTitles'
import { ACTION_KIND } from '@/lib/actionKinds'
import { downloadCsv } from '@/utils/csv'
import type { CorrectiveAction, CorrectiveActionKind, EnvId, Pattern, ProductId } from '@/types'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useViewportMode } from '@/components/layout/useViewportMode'
import { ProductTag } from '@/components/common/Chip'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ExportButton } from '@/components/common/ExportButton'
import { useSendToInvestigation } from '@/services/referenceQueries'
import { useNow } from '@/hooks/useNow'
import { visibleFixes } from '@/utils/inbox'
import { caId } from '@/utils/trace'
import { Button } from '@/components/ui/button'
import { KpiTile } from '@/components/common/KpiTile'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { DecisionDialog } from './components/DecisionDialog'
import { FixCard } from './components/FixCard'
import { HandoffsBlock } from './components/HandoffsBlock'
import { InlineNote } from '@/components/common/InlineNote'

const STATUS_FILTERS = ['all', 'proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]
const ALL = 'all'
const PAGE = 12
type SortKey = 'newest' | 'due' | 'signals'
const CLOSED = ['effective', 'partial', 'failed']

/** `?status=proposed` opens the register on one status (the guided tour uses it for "waiting for a yes"); anything else is no filter. */
function statusFromParam(value: string | null): StatusFilter | null {
  return STATUS_FILTERS.find((s) => s === value) ?? null
}

const STATUS_TONE = (s: CorrectiveAction['status']) =>
  (s === 'effective' ? 'success' : s === 'failed' ? 'danger' : s === 'partial' || s === 'proposed' ? 'warning' : 'neutral') as
    'success' | 'danger' | 'warning' | 'neutral'

/**
 * The problems and fixes register (26 Nov, owner): one table with filters (status, product, environment, kind of problem, owner,
 * clock, dates and a search), exportable, and a click on a row opens the whole fix in a pop-up: what was found, the AI's
 * proposal and why, what to do next and by whom, the decision buttons and the history.
 * `only` (24 Nov, owner): the inbox opens one fix on its own page: just that card, no register, filters or hand-offs.
 */
export default function Corrective({ only }: { only?: string } = {}) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  // `dataUpdatedAt`: the mock registers are edited in place (a decision, a status change), so the array keeps its identity; the stamp is the change signal.
  const { data: actions, isLoading, error, refetch, dataUpdatedAt } = useCorrectiveActions()
  const { data: patterns } = usePatternsAll()
  const { data: signals } = useSignalsAll()
  const { data: products } = useProducts()
  const { env, allowed, fixed } = useEnvScope()
  const decide = useDecideCorrectiveAction()
  const sendToInvestigation = useSendToInvestigation()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const selectedFix = only ?? params.get('fix')
  const urlStatus = statusFromParam(params.get('status'))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(urlStatus ?? 'all')
  // A new `?status=` (or its removal) moves the filter; picking one in the Select afterwards is the person's own.
  const [seenUrlStatus, setSeenUrlStatus] = useState(urlStatus)
  if (urlStatus !== seenUrlStatus) {
    setSeenUrlStatus(urlStatus)
    setStatusFilter(urlStatus ?? 'all')
  }
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [product, setProduct] = useState<string>(ALL)
  const [envF, setEnvF] = useState<string>(ALL)
  const [kind, setKind] = useState<string>(ALL)
  const [owner, setOwner] = useState<string>(ALL)
  const [clock, setClock] = useState<string>(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // the fix open in the pop-up: a link that names one (`?fix=`, the inbox, a trace id) opens it
  const [openId, setOpenId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('newest')
  const [shown, setShown] = useState(PAGE)
  const phone = useViewportMode() === 'phone'

  // KB §15: L&D sees only actions classified as training gap; KB §2: environment management sees only its own environment.
  const scoped = useMemo(
    () => visibleFixes(actions ?? [], patterns ?? [], role.id, role.environment),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [actions, patterns, role, dataUpdatedAt],
  )
  const patternById = useMemo(() => new Map((patterns ?? []).map((p) => [p.id, p])), [patterns])
  const signalById = useMemo(() => new Map((signals ?? []).map((x) => [x.id, x])), [signals])
  const envsOf = (a: CorrectiveAction): EnvId[] | null => envsOfFix(a, patternById, signalById)
  const isLate = (a: CorrectiveAction) => !CLOSED.includes(a.status) && a.status !== 'verification' && new Date(a.dueDate).getTime() < now
  const isSelected = (a: { id: string }) => !!selectedFix && (selectedFix === caId(a.id) || selectedFix === a.id)

  useEffect(() => {
    if (only || !selectedFix) return
    const target = scoped.find(isSelected)
    if (target) {
      setOpenId(target.id)
      if (!urlStatus) setStatusFilter('all')
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFix, scoped.length])

  const owners = useMemo(() => [...new Set(scoped.map((a) => a.owner))], [scoped])
  const kinds = useMemo(() => [...new Set(scoped.map((a) => a.kind))], [scoped])
  const productIds = useMemo(() => [...new Set(scoped.map((a) => a.product))], [scoped])

  const visible = useMemo(() => {
    if (only) return scoped.filter((a) => only === caId(a.id) || only === a.id)
    const needle = q.trim().toLowerCase()
    return scoped.filter((a) => {
      const envs = envsOf(a)
      return (
        (statusFilter === 'all' || a.status === statusFilter) &&
        (product === ALL || a.product === product) &&
        (envF === ALL || envs === null || envs.includes(envF as EnvId)) &&
        (kind === ALL || a.kind === kind) &&
        (owner === ALL || a.owner === owner) &&
        (clock === ALL || (clock === 'late' ? isLate(a) : !isLate(a))) &&
        (!from || a.proposedAt.slice(0, 10) >= from) &&
        (!to || a.proposedAt.slice(0, 10) <= to) &&
        (!needle ||
          [caId(a.id), a.title.en, a.title.ar, L(ownerTitle(a.owner)), patternById.get(a.patternId ?? '')?.category ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle))
      )
    })
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, only, q, statusFilter, product, envF, kind, owner, clock, from, to, now, patternById, signalById])

  const sorted = useMemo(() => {
    const signalsOf = (a: CorrectiveAction) => patternById.get(a.patternId ?? '')?.signalIds.length ?? 0
    const list = [...visible]
    if (sort === 'due') list.sort((x, y) => x.dueDate.localeCompare(y.dueDate))
    else if (sort === 'signals') list.sort((x, y) => signalsOf(y) - signalsOf(x))
    else list.sort((x, y) => y.proposedAt.localeCompare(x.proposedAt))
    return list
  }, [visible, sort, patternById])

  const tally = {
    proposed: scoped.filter((a) => a.status === 'proposed').length,
    open: scoped.filter((a) => !CLOSED.includes(a.status)).length,
    late: scoped.filter(isLate).length,
    effective: scoped.filter((a) => a.status === 'effective').length,
  }

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' })
  const timeFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' })
  const productName = (id: ProductId) => L(products?.find((p) => p.id === id)?.name ?? { en: id, ar: id })
  const envText = (a: CorrectiveAction) => {
    const envs = envsOf(a)
    return envs ? envs.map((e) => L(environmentById(e).name)).join(', ') : t('All environments', 'كل البيئات')
  }
  const RULE_WORD: Record<string, string> = {
    same_agent: t('same person, repeated', 'الشخص نفسه متكرر'),
    same_issue: t('same issue, repeated', 'المشكلة نفسها متكررة'),
    environment_concentration: t('concentrated in one environment', 'متركّزة في بيئة واحدة'),
  }
  const problemOf = (pattern?: Pattern) =>
    pattern ? `${pattern.traceId} · ${pattern.signalIds.length} ${t('signals', 'إشارة')} · ${RULE_WORD[pattern.thresholdKind] ?? ''}` : ''

  /** Every field of every filtered fix, with the AI's proposal behind it. */
  function exportList() {
    downloadCsv(
      'problems-and-fixes.csv',
      visible.map((a) => {
        const pattern = patternById.get(a.patternId ?? '')
        return {
          [t('ID', 'الرقم')]: caId(a.id),
          [t('Problem and fix', 'المشكلة والحل')]: L(a.title),
          [t('Pattern', 'النمط')]: problemOf(pattern),
          [t('Signals', 'الإشارات')]: pattern?.signalIds.length ?? '',
          [t('AI proposal', 'اقتراح الذكاء الاصطناعي')]: pattern ? L(pattern.aiSuggestion) : a.fromInsight ? L(a.fromInsight.recovery) : '',
          [t('Recovery in similar cases', 'الاستعادة في حالات مشابهة')]: pattern ? L(pattern.recoveryFigure) : '',
          [t('Product', 'المنتج')]: productName(a.product),
          [t('Environment', 'البيئة')]: envText(a),
          [t('Kind', 'النوع')]: L(ACTION_KIND[a.kind].label),
          [t('Path', 'المسار')]: L(ACTION_KIND[a.kind].path),
          [t('Owner', 'المسؤول')]: L(ownerTitle(a.owner)),
          [t('Status', 'الحالة')]: L(CORRECTIVE_STATUS_LABEL[a.status]),
          [t('Decision', 'القرار')]: a.decision ?? '',
          [t('Decision reason', 'سبب القرار')]: a.decisionReason ? L(a.decisionReason) : '',
          [t('Raised (date)', 'تاريخ الرفع')]: dateFmt.format(new Date(a.proposedAt)),
          [t('Raised (time)', 'وقت الرفع')]: timeFmt.format(new Date(a.proposedAt)),
          [t('Due', 'الاستحقاق')]: dateFmt.format(new Date(a.dueDate)),
          [t('Late', 'متأخر')]: isLate(a) ? t('yes', 'نعم') : t('no', 'لا'),
          [t('60-day check', 'فحص 60 يوماً')]: dateFmt.format(new Date(a.verificationDueAt)),
          [t('Check result', 'نتيجة الفحص')]: a.verificationResult ?? '',
          [t('What was done', 'ما تم تنفيذه')]: a.completion?.note ?? '',
        }
      }),
    )
  }

  const openFix = scoped.find((a) => a.id === openId)
  const closeFix = () => {
    setOpenId(null)
    if (params.get('fix')) {
      const next = new URLSearchParams(params)
      next.delete('fix')
      setParams(next, { replace: true })
    }
  }
  const clearable = q || statusFilter !== 'all' || product !== ALL || envF !== ALL || kind !== ALL || owner !== ALL || clock !== ALL || from || to

  const filter = (label: string, value: string, onChange: (v: string) => void, allLabel: string, items: { value: string; label: string }[]) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div data-density="dense" className="flex flex-col gap-4">
      {!only && (
        <>
          <section aria-label={t('The register', 'السجل')} className="grid grid-cols-2 gap-(--grid-gap) md:grid-cols-4">
            <KpiTile
              label={t('Proposed', 'مقترحة')}
              value={tally.proposed}
              sub={t('Waiting for a person’s yes', 'بانتظار موافقة شخص')}
              icon={<Inbox />}
              loading={isLoading}
              onClick={() => setStatusFilter('proposed')}
            />
            <KpiTile
              label={t('Open', 'مفتوحة')}
              value={tally.open}
              sub={t('Not yet verified', 'لم يُتحقق منها بعد')}
              icon={<ListChecks />}
              loading={isLoading}
              onClick={() => setStatusFilter('all')}
            />
            <KpiTile
              label={t('Late', 'متأخرة')}
              value={tally.late}
              sub={t('Past the due date', 'تجاوزت تاريخ الاستحقاق')}
              icon={<Clock4 />}
              accent={tally.late ? 'var(--destructive)' : undefined}
              loading={isLoading}
              onClick={() => setClock('late')}
            />
            <KpiTile
              term="60-day check"
              label={t('Effective', 'فعّالة')}
              value={tally.effective}
              sub={t('Signals halved, held 90 days', 'انخفضت الإشارات للنصف وثبتت 90 يوماً')}
              icon={<CheckCircle2 />}
              loading={isLoading}
              onClick={() => setStatusFilter('effective')}
            />
          </section>
          {role.id === 'ld' && (
            <InlineNote tone="neutral">
              {t(
                'Showing the actions classified as training gap — the ones L&D receives.',
                'عرض الإجراءات المصنفة كفجوة تدريبية — التي يستلمها التعلم والتطوير.',
              )}
            </InlineNote>
          )}
        </>
      )}

      {only ? (
        isLoading ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : visible.length === 0 ? (
          <EmptyState title={t('This item is no longer open for you.', 'هذا البند لم يعد مفتوحاً لك.')} />
        ) : (
          <ul className="flex flex-col gap-4">
            {visible.map((a) => (
              <FixCard
                key={a.id}
                fix={a}
                pattern={patternById.get(a.patternId ?? '')}
                selected
                now={now}
                onDecide={setDecidingId}
                open
                onOpenChange={() => {}}
              />
            ))}
          </ul>
        )
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <section
          className="surface-card flex flex-col gap-4 p-(--card-pad)"
          data-density="comfortable"
          data-tour="fix-card"
          aria-label={t('Problems and fixes', 'المشاكل والحلول')}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="t-card-title">{t('Problems and fixes', 'المشاكل والحلول')}</h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  'Click a card for the whole fix: what was found, the proposal, and what to do next.',
                  'اضغط على بطاقة لعرض الحل كاملاً: ما وُجد، والاقتراح، وما يجب فعله.',
                )}
              </p>
            </div>
            <span className="flex items-center gap-3">
              <span className="t-body-s tabular">
                {visible.length} {t('fixes', 'حل')}
              </span>
              <ExportButton
                variant="outline"
                size="sm"
                onExport={exportList}
                disabled={!visible.length}
                what={{ en: `the problems and fixes list (${visible.length})`, ar: `قائمة المشاكل والحلول (${visible.length})` }}
              >
                {t('Export (CSV)', 'تصدير (CSV)')}
              </ExportButton>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('ID, problem or owner', 'الرقم أو المشكلة أو المسؤول')}
                aria-label={t('Search the fixes', 'ابحث في الحلول')}
                className="h-9 ps-9"
              />
            </div>
            {filter(
              t('Status', 'الحالة'),
              statusFilter,
              (v) => setStatusFilter(v as StatusFilter),
              t('All statuses', 'كل الحالات'),
              STATUS_FILTERS.filter((s) => s !== 'all').map((s) => ({ value: s, label: L(CORRECTIVE_STATUS_LABEL[s]) })),
            )}
            {filter(
              t('Product', 'المنتج'),
              product,
              setProduct,
              t('All products', 'كل المنتجات'),
              productIds.map((id) => ({ value: id, label: productName(id) })),
            )}
            {fixed ? (
              <StatusBadge tone="info">
                {t('Your environment:', 'بيئتك:')} {L(environmentById(fixed).name)}
              </StatusBadge>
            ) : (
              env === 'all' &&
              filter(
                t('Environment', 'البيئة'),
                envF,
                setEnvF,
                t('All environments', 'كل البيئات'),
                ENVIRONMENTS.filter((e) => allowed.includes(e.id)).map((e) => ({ value: e.id, label: L(e.name) })),
              )
            )}
            {filter(
              t('Kind', 'النوع'),
              kind,
              setKind,
              t('All kinds', 'كل الأنواع'),
              kinds.map((k) => ({ value: k, label: L(ACTION_KIND[k as CorrectiveActionKind].label) })),
            )}
            {filter(
              t('Owner', 'المسؤول'),
              owner,
              setOwner,
              t('All owners', 'كل المسؤولين'),
              owners.map((o) => ({ value: o, label: L(ownerTitle(o)) })),
            )}
            {filter(t('Clock', 'الوقت'), clock, setClock, t('Late and on time', 'المتأخر وفي الوقت'), [
              { value: 'late', label: t('Late only', 'المتأخر فقط') },
              { value: 'ontime', label: t('On time only', 'في الوقت فقط') },
            ])}
            <span className="flex items-center gap-2">
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                aria-label={t('Raised from', 'رُفع من')}
                className="h-9 w-40"
                dir="ltr"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                aria-label={t('Raised to', 'رُفع إلى')}
                className="h-9 w-40"
                dir="ltr"
              />
            </span>
            {clearable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ('')
                  setStatusFilter('all')
                  setProduct(ALL)
                  setEnvF(ALL)
                  setKind(ALL)
                  setOwner(ALL)
                  setClock(ALL)
                  setFrom('')
                  setTo('')
                }}
              >
                {t('Clear filters', 'مسح الفلاتر')}
              </Button>
            )}
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger aria-label={t('Sort', 'الترتيب')} className="h-9 min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('Newest raised first', 'الأحدث رفعاً أولاً')}</SelectItem>
                <SelectItem value="due">{t('Due soonest first', 'الأقرب استحقاقاً أولاً')}</SelectItem>
                <SelectItem value="signals">{t('Most signals first', 'الأكثر إشارات أولاً')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <LoadingState rows={4} />
          ) : sorted.length === 0 ? (
            <EmptyState title={t('No corrective actions for this filter.', 'لا توجد إجراءات تصحيحية لهذا الفلتر.')} />
          ) : (
            <>
              {/* 26 Nov (owner): cards instead of a table, friendlier on a phone; a card opens the whole fix */}
              <ul className="grid grid-cols-1 gap-(--grid-gap) md:grid-cols-2 xl:grid-cols-3">
                {sorted.slice(0, shown).map((a) => (
                  <li key={a.id}>
                    <FixSummaryCard
                      fix={a}
                      pattern={patternById.get(a.patternId ?? '')}
                      late={isLate(a)}
                      envText={envText(a)}
                      problem={problemOf(patternById.get(a.patternId ?? ''))}
                      raised={`${dateFmt.format(new Date(a.proposedAt))} · ${timeFmt.format(new Date(a.proposedAt))}`}
                      due={dateFmt.format(new Date(a.dueDate))}
                      onOpen={() => setOpenId(a.id)}
                    />
                  </li>
                ))}
              </ul>
              {sorted.length > shown && (
                <Button variant="outline" className="self-center" onClick={() => setShown((n) => n + PAGE)}>
                  {t(`Show more (${sorted.length - shown} left)`, `عرض المزيد (${sorted.length - shown} متبقية)`)}
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {!only && <HandoffsBlock />}

      {openFix &&
        (() => {
          const card = (
            <ul className="flex flex-col [&>li]:p-0 [&>li]:shadow-none">
              <FixCard
                fix={openFix}
                pattern={patternById.get(openFix.patternId ?? '')}
                selected={false}
                now={now}
                onDecide={(id) => {
                  setOpenId(null)
                  setDecidingId(id)
                }}
                open
                onOpenChange={() => {}}
              />
            </ul>
          )
          const title = <>{L(openFix.title)}</>
          const desc = t('The whole fix, the proposal and what to do next.', 'الحل كاملاً، والاقتراح، وما يجب فعله.')
          // 26 Nov (owner): a pop-up on a computer, a bottom sheet on a phone
          return phone ? (
            <Sheet open onOpenChange={(o) => !o && closeFix()}>
              <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-b-none px-4 pt-6 pb-8">
                <SheetTitle className="sr-only">{title}</SheetTitle>
                <SheetDescription className="sr-only">{desc}</SheetDescription>
                <span aria-hidden className="mx-auto -mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-line" />
                {card}
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open onOpenChange={(o) => !o && closeFix()}>
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <DialogDescription className="sr-only">{desc}</DialogDescription>
                {card}
              </DialogContent>
            </Dialog>
          )
        })()}

      {decidingId && (
        <DecisionDialog
          title={t('Decide this corrective action', 'اتخاذ قرار بشأن هذا الإجراء')}
          approveLabel="approved"
          allowInvestigate
          onCancel={() => setDecidingId(null)}
          onSubmit={(v) => {
            if (v.decision === 'confirmed') return
            if (v.decision === 'investigate') {
              const action = actions?.find((x) => x.id === decidingId)
              const pattern = action ? patterns?.find((p) => p.id === action.patternId) : undefined
              sendToInvestigation.mutate({ actionId: decidingId, patternId: pattern?.id, environment: pattern?.team, reason: v.reason })
              setDecidingId(null)
              toast.success(t('Sent to investigation — five interviews requested', 'أُحيل إلى التحقيق — طُلبت خمس مقابلات'))
              return
            }
            decide.mutate({ id: decidingId, decision: v.decision, reason: v.reason })
            setDecidingId(null)
            toast.success(t('Decision saved', 'تم حفظ القرار'))
          }}
        />
      )}
    </div>
  )
}

/** One fix as a card in the register (26 Nov, owner): ID, status and the clock on top, the problem, then product, environment,
 * owner and dates. The whole card is one button that opens the fix. */
function FixSummaryCard({
  fix: a,
  pattern,
  late,
  envText,
  problem,
  raised,
  due,
  onOpen,
}: {
  fix: CorrectiveAction
  pattern?: Pattern
  late: boolean
  envText: string
  problem: string
  raised: string
  due: string
  onOpen: () => void
}) {
  const { t, L, lang } = useI18n()
  return (
    <button
      type="button"
      onClick={onOpen}
      data-fix={caId(a.id)}
      className="group surface-card flex h-full w-full flex-col gap-3 p-4 text-start outline-hidden transition-shadow duration-200 hover:shadow-(--shadow-card-frame) focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="tabular text-sm text-muted-foreground">{caId(a.id)}</span>
        <StatusBadge tone={STATUS_TONE(a.status)}>{L(CORRECTIVE_STATUS_LABEL[a.status])}</StatusBadge>
        {late && <StatusBadge tone="danger">{t('Late', 'متأخر')}</StatusBadge>}
        <ChevronRight
          aria-hidden
          className="ms-auto size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180"
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="t-small-strong text-base text-foreground">{L(a.title)}</span>
        {pattern && <span className="text-xs text-muted-foreground">{problem}</span>}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <ProductTag productId={a.product} lang={lang} />
        <StatusBadge tone="neutral">{L(ACTION_KIND[a.kind].label)}</StatusBadge>
      </span>
      <span className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3 text-sm text-muted-foreground">
        <span className="flex items-start gap-2">
          <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{envText}</span>
        </span>
        <span className="flex items-start gap-2">
          <UserRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span className="text-foreground">{L(ownerTitle(a.owner))}</span>
        </span>
        <span className="flex items-start gap-2 tabular">
          <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {t('Raised', 'رُفع')} {raised} · {t('Due', 'الاستحقاق')}{' '}
            <span className={late ? 'font-medium text-(--status-error-text)' : 'text-foreground'}>{due}</span>
          </span>
        </span>
      </span>
    </button>
  )
}
