import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Gauge, RotateCcw, Send, ShieldAlert } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useRole } from '@/auth/RoleContext'
import {
  useDecideMsAssignment,
  useMsAssignments,
  useMsChecklists,
  useMsScenarios,
  useMsShoppers,
  useSendMsAssignments,
  useSubmitMsAssignment,
} from '@/services/queries'
import { msSeverityFor } from '@/utils/mysteryShopper'
import type { Bi, MsAssignment, MsAssignmentStatus } from '@/types'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

const TABS = ['results', 'checklists', 'shoppers', 'distribution', 'review'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, Bi> = {
  results: { en: 'Results', ar: 'النتائج' },
  checklists: { en: 'Checklists', ar: 'القوائم' },
  shoppers: { en: 'Shoppers', ar: 'المتسوقون' },
  distribution: { en: 'Distribution', ar: 'التوزيع' },
  review: { en: 'Review', ar: 'المراجعة' },
}

const STATUS_TONE: Partial<Record<MsAssignmentStatus, Tone>> = {
  submitted: 'warning',
  review: 'warning',
  approved: 'success',
  returned: 'danger',
  overdue: 'danger',
}

// The demo sign-in for the separate shopper landing page (FR: "email/mobile
// + one-time code sign-in") — same convention `ShopperTasks.tsx` used.
const SIGNED_IN_SHOPPER_ID = 'sh1'

const TH = 'px-3 text-xs font-semibold text-muted-foreground'

/** Ported from `frontend/src/pages/MysteryShopper.tsx` + `ShopperTasks.tsx`
 * (APPLICATION_MODULES.md §C), with `lib/metrics.ts`'s `scoreChecklist()`
 * reused via `utils/mysteryShopper.ts`. FR-4.14's severity floor is read
 * off the same score here and in Review — a critical outcome is never a
 * second case model, it links to the existing Actions → Shopper cases
 * register rather than duplicating it. The `shopper` role lands here too
 * (`data/roles.ts`'s `home: '/settings/mystery-shopper'`) and sees only its
 * own tasks, per NFR-2 — a different view entirely, not a hidden tab. */
export default function MysteryShopper() {
  const { role } = useRole()
  if (role.id === 'shopper') return <ShopperMyTasks />
  return <MysteryShopperConsole />
}

function MysteryShopperConsole() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canManage = role.id === 'cxmgr' || role.id === 'cxteam'
  const { data: checklists } = useMsChecklists()
  const { data: scenarios } = useMsScenarios()
  const { data: shoppers } = useMsShoppers()
  const { data: assignments, isLoading } = useMsAssignments()
  const send = useSendMsAssignments()
  const decide = useDecideMsAssignment()

  const [dist, setDist] = useState({ checklistId: '', scenarioId: '', via: 'email' as 'email' | 'wa' | 'sms', shopperIds: [] as string[] })

  const list = assignments ?? []
  const scored = list.filter((a) => a.score != null)
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) : null
  const toReview = list.filter((a) => a.status === 'submitted' || a.status === 'review')

  function checklistOf(id: string) {
    return checklists?.find((c) => c.id === id)
  }
  function shopperOf(id: string) {
    return shoppers?.find((s) => s.id === id)
  }

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Mystery shopper', 'التسوق السري')}
        description={t('Plans, distributes, collects and reviews mystery shopping visits and calls.', 'تخطيط وتوزيع وجمع ومراجعة زيارات ومكالمات التسوق السري.')}
      />

      <Tabs defaultValue="results" className="gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-10 min-w-max">
            {TABS.map((id) => (
              <TabsTrigger key={id} value={id} className="gap-1.5 px-3">
                {L(TAB_LABEL[id])}
                {id === 'review' && toReview.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-xs font-semibold text-warning-foreground tabular-nums">
                    {toReview.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="results" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiTile
              label={t('Average score', 'متوسط النتيجة')}
              value={<bdi dir="ltr">{avgScore != null ? `${avgScore}%` : '–'}</bdi>}
              icon={<Gauge />}
              accent="var(--chart-1)"
              loading={isLoading}
            />
            <KpiTile
              label={t('Critical fails', 'الإخفاقات الحرجة')}
              value={list.reduce((s, a) => s + (a.criticalFails ?? 0), 0)}
              icon={<ShieldAlert />}
              accent="var(--destructive)"
              loading={isLoading}
            />
            <KpiTile
              label={t('Completed', 'مكتملة')}
              value={list.filter((a) => a.status === 'approved').length}
              icon={<CheckCircle2 />}
              accent="var(--success)"
              loading={isLoading}
            />
          </div>
          <SectionCard>
            {isLoading ? (
              <LoadingState rows={5} />
            ) : !list.length ? (
              <EmptyState title={t('No visits yet.', 'لا توجد زيارات بعد.')} />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={TH}>{t('Shopper', 'المتسوق')}</TableHead>
                      <TableHead className={TH}>{t('Checklist', 'القائمة')}</TableHead>
                      <TableHead className={TH}>{t('Status', 'الحالة')}</TableHead>
                      <TableHead className={cn(TH, 'text-end')}>{t('Score', 'النتيجة')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((a) => {
                      const cl = checklistOf(a.checklistId)
                      const severity = msSeverityFor(a.score ?? null, a.criticalFails ?? 0)
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="px-3 text-sm font-medium">{shopperOf(a.shopperId)?.name}</TableCell>
                          <TableCell className="px-3 text-sm">{cl ? L(cl.name) : a.checklistId}</TableCell>
                          <TableCell className="px-3">
                            <StatusBadge tone={STATUS_TONE[a.status] ?? 'neutral'}>{a.status}</StatusBadge>
                          </TableCell>
                          <TableCell className="px-3 text-end text-sm tabular-nums">
                            <span className="inline-flex items-center justify-end gap-2">
                              {severity === 'critical' && (
                                <Link
                                  to="/actions/shopper-cases"
                                  className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-danger-text underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                  <AlertTriangle aria-hidden className="size-3.5" />
                                  {t('case opened', 'تم فتح حالة')}
                                </Link>
                              )}
                              <bdi dir="ltr">{a.score != null ? `${a.score}%` : '–'}</bdi>
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(checklists ?? []).map((cl) => (
              <SectionCard
                key={cl.id}
                title={L(cl.name)}
                description={`${t('Version', 'الإصدار')} ${cl.version} · ${cl.items.length} ${t('items', 'عناصر')}`}
                actions={<StatusBadge tone={cl.status === 'published' ? 'success' : 'warning'}>{cl.status}</StatusBadge>}
              >
                <ul className="flex flex-col divide-y">
                  {cl.items.map((it) => (
                    <li key={it.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="min-w-0 text-sm">{L(it.text)}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {it.critical && <StatusBadge tone="danger">{t('critical', 'حرج')}</StatusBadge>}
                        <span className="w-10 text-end text-xs text-muted-foreground tabular-nums">
                          <bdi dir="ltr">{it.weight}%</bdi>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shoppers">
          <SectionCard>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={TH}>{t('Name', 'الاسم')}</TableHead>
                    <TableHead className={TH}>{t('Type', 'النوع')}</TableHead>
                    <TableHead className={cn(TH, 'text-end')}>{t('Shops', 'الزيارات')}</TableHead>
                    <TableHead className={cn(TH, 'text-end')}>{t('Reliability', 'الموثوقية')}</TableHead>
                    <TableHead className={TH}>{t('Active', 'نشط')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(shoppers ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="px-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{s.name}</span>
                          {s.agency && <span className="text-xs text-muted-foreground">{s.agency}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-sm">{s.type}</TableCell>
                      <TableCell className="px-3 text-end text-sm tabular-nums">{s.shopsCompleted}</TableCell>
                      <TableCell className="px-3 text-end text-sm tabular-nums">
                        <bdi dir="ltr">{s.reliability}%</bdi>
                      </TableCell>
                      <TableCell className="px-3">
                        <StatusBadge tone={s.active ? 'success' : 'neutral'} dot>
                          {s.active ? t('yes', 'نعم') : t('no', 'لا')}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="distribution">
          {canManage ? (
            <SectionCard
              title={t('Send new tasks', 'إرسال مهام جديدة')}
              description={t('Pick a checklist, a scenario, a channel and the shoppers.', 'اختر القائمة والسيناريو والقناة والمتسوقين.')}
            >
              <form
                className="flex flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  send.mutate(dist)
                  setDist((d) => ({ ...d, shopperIds: [] }))
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FieldBlock id="ms-checklist" label={t('Checklist', 'القائمة')}>
                    <Select value={dist.checklistId} onValueChange={(v) => setDist((d) => ({ ...d, checklistId: v }))}>
                      <SelectTrigger id="ms-checklist" className="h-10 w-full">
                        <SelectValue placeholder={t('Select…', 'اختر…')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(checklists ?? [])
                          .filter((c) => c.status === 'published')
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {L(c.name)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                  <FieldBlock id="ms-scenario" label={t('Scenario', 'السيناريو')}>
                    <Select value={dist.scenarioId} onValueChange={(v) => setDist((d) => ({ ...d, scenarioId: v }))}>
                      <SelectTrigger id="ms-scenario" className="h-10 w-full">
                        <SelectValue placeholder={t('Select…', 'اختر…')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(scenarios ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {L(s.title)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                  <FieldBlock id="ms-channel" label={t('Channel', 'القناة')}>
                    <Select value={dist.via} onValueChange={(v) => setDist((d) => ({ ...d, via: v as typeof dist.via }))}>
                      <SelectTrigger id="ms-channel" className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">{t('Email', 'بريد إلكتروني')}</SelectItem>
                        <SelectItem value="wa">WhatsApp</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">{t('Shoppers', 'المتسوقون')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {(shoppers ?? [])
                      .filter((s) => s.active)
                      .map((s) => {
                        const on = dist.shopperIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setDist((d) => ({ ...d, shopperIds: on ? d.shopperIds.filter((x) => x !== s.id) : [...d.shopperIds, s.id] }))
                            }
                            className={cn(
                              'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                              on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                            )}
                          >
                            {on && <CheckCircle2 aria-hidden className="size-3.5" />}
                            {s.name}
                          </button>
                        )
                      })}
                  </div>
                </fieldset>

                <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('Simulated — nothing is really sent.', 'محاكاة — لا يُرسل شيء فعلياً.')}
                  </span>
                  <Button type="submit" disabled={!dist.checklistId || !dist.scenarioId || !dist.shopperIds.length}>
                    <Send aria-hidden className="rtl:-scale-x-100" />
                    {t('Send (simulated — nothing is really sent)', 'إرسال (محاكاة — لا يُرسل شيء فعلياً)')}
                  </Button>
                </div>
              </form>
            </SectionCard>
          ) : (
            <EmptyState title={t('CX only.', 'فريق تجربة العملاء فقط.')} />
          )}
        </TabsContent>

        <TabsContent value="review" className="flex flex-col gap-3">
          {toReview.length ? (
            toReview.map((a) => {
              const cl = checklistOf(a.checklistId)
              return (
                <div key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/14 text-warning-text">
                      <ClipboardCheck className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold">{shopperOf(a.shopperId)?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{cl && L(cl.name)}</span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => decide.mutate({ id: a.id, approve: true })}>
                        <CheckCircle2 aria-hidden />
                        {t('Approve', 'اعتماد')}
                      </Button>
                      <Button size="sm" variant="outline" className="text-danger-text" onClick={() => decide.mutate({ id: a.id, approve: false })}>
                        <RotateCcw aria-hidden />
                        {t('Return to shopper', 'إعادة للمتسوق')}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <EmptyState title={t('Nothing waiting for review.', 'لا يوجد شيء بانتظار المراجعة.')} />
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}

function FieldBlock({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function ChoiceButton({ on, onClick, tone = 'primary', children, label }: { on: boolean; onClick: () => void; tone?: 'primary' | 'danger'; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        on
          ? tone === 'danger'
            ? 'border-destructive bg-destructive text-white'
            : 'border-primary bg-primary text-primary-foreground'
          : 'bg-card hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/** The shopper's own view — "sees only their own tasks" (USER_ROLES_AND_
 * PERMISSIONS.md). No access to anyone else's results, review queue or the
 * distribution form above. */
function ShopperMyTasks() {
  const { t, L } = useI18n()
  const now = useNow()
  const { data: checklists } = useMsChecklists()
  const { data: scenarios } = useMsScenarios()
  const { data: assignments, isLoading } = useMsAssignments()
  const submit = useSubmitMsAssignment()
  const [openId, setOpenId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, number | 'na' | null>>({})

  const mine = (assignments ?? []).filter((a) => a.shopperId === SIGNED_IN_SHOPPER_ID)
  const open = mine.find((a: MsAssignment) => a.id === openId)
  const cl = open ? checklists?.find((c) => c.id === open.checklistId) : undefined
  const sc = open ? scenarios?.find((s) => s.id === open.scenarioId) : undefined

  function submitOpen() {
    if (!open) return
    submit.mutate({ id: open.id, checklistId: open.checklistId, answers })
    setOpenId(null)
    setAnswers({})
  }

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('My tasks', 'مهامي')}
        description={t('Signed in as a mystery shopper. You see only your own tasks.', 'تم الدخول كمتسوق سري. تظهر لك مهامك الخاصة فقط.')}
      />

      {!open &&
        (isLoading ? (
          <LoadingState rows={3} />
        ) : mine.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {mine.map((a) => {
              const c = checklists?.find((x) => x.id === a.checklistId)
              const s = scenarios?.find((x) => x.id === a.scenarioId)
              const daysLeft = Math.ceil((new Date(a.dueAt).getTime() - now) / 86_400_000)
              const canOpen = a.status === 'sent' || a.status === 'opened' || a.status === 'progress'
              return (
                <div key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-base font-semibold">{c && L(c.name)}</span>
                      <span className="text-sm text-muted-foreground">{s && L(s.title)}</span>
                    </div>
                    <StatusBadge tone={a.status === 'approved' ? 'success' : a.status === 'overdue' ? 'danger' : 'neutral'}>{a.status}</StatusBadge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-sm', daysLeft < 0 ? 'text-danger-text' : 'text-muted-foreground')}>
                      {daysLeft >= 0 ? t(`${daysLeft} day(s) left`, `متبقي ${daysLeft} يوم`) : t('overdue', 'متأخر')}
                    </span>
                    {canOpen && (
                      <Button size="sm" onClick={() => setOpenId(a.id)}>
                        {t('Open task', 'فتح المهمة')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState title={t('No tasks right now.', 'لا توجد مهام حالياً.')} />
        ))}

      {open && cl && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
          <SectionCard className="lg:col-span-2" title={t('Brief', 'الموجز')}>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">{t('Scenario', 'السيناريو')}</dt>
                <dd>{sc && L(sc.title)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">{t('What is checked', 'ما الذي يُفحص')}</dt>
                <dd>{sc && L(sc.tests)}</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              {t(
                'Consent and privacy: do not record anyone without disclosure where required by local rules.',
                'الموافقة والخصوصية: لا تسجّل أي شخص دون الإفصاح عند الحاجة وفق القواعد المحلية.',
              )}
            </p>
          </SectionCard>

          <SectionCard className="lg:col-span-3" title={L(cl.name)}>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                submitOpen()
              }}
            >
              <ol className="flex flex-col divide-y">
                {cl.items.map((it, i) => (
                  <li key={it.id} className="flex flex-col gap-2 py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm">
                        <span className="me-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                        {L(it.text)}
                      </span>
                      {it.critical && <StatusBadge tone="danger">{t('critical', 'حرج')}</StatusBadge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={L(it.text)}>
                      {it.type === 'passfail' && (
                        <>
                          <ChoiceButton on={answers[it.id] === 1} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 1 }))}>
                            {t('Pass', 'ناجح')}
                          </ChoiceButton>
                          <ChoiceButton tone="danger" on={answers[it.id] === 0} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 0 }))}>
                            {t('Fail', 'راسب')}
                          </ChoiceButton>
                        </>
                      )}
                      {it.type === 'scale' &&
                        [1, 2, 3, 4, 5].map((v) => (
                          <ChoiceButton key={v} on={answers[it.id] === v} onClick={() => setAnswers((a) => ({ ...a, [it.id]: v }))}>
                            {v}
                          </ChoiceButton>
                        ))}
                      {it.type === 'text' && (
                        <Textarea
                          aria-label={L(it.text)}
                          className="min-h-20 w-full"
                          onChange={() => setAnswers((a) => ({ ...a, [it.id]: 1 }))}
                        />
                      )}
                      <ChoiceButton on={answers[it.id] === 'na'} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 'na' }))} label={t('Not applicable', 'لا ينطبق')}>
                        N/A
                      </ChoiceButton>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenId(null)}>
                  <ArrowLeft aria-hidden className="rtl:rotate-180" />
                  {t('Cancel', 'إلغاء')}
                </Button>
                <Button type="submit">{t('Submit', 'إرسال')}</Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </section>
  )
}
