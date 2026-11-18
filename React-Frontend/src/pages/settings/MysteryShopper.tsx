import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ClipboardCheck, Gauge, RotateCcw, Send, ShieldAlert } from 'lucide-react'
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
import type { Bi, MsAssignment } from '@/types'
import { CHECKLIST_STATUS_LABEL, MS_ASSIGNMENT_STATUS_LABEL, MS_ASSIGNMENT_STATUS_TONE } from '@/lib/status'
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
import { IN_CARD, InlineNote, SubPageHeader } from './SubPageHeader'

const TABS = ['results', 'checklists', 'shoppers', 'distribution', 'review'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, Bi> = {
  results: { en: 'Results', ar: 'النتائج' },
  checklists: { en: 'Checklists', ar: 'القوائم' },
  shoppers: { en: 'Shoppers', ar: 'المتسوقون' },
  distribution: { en: 'Distribution', ar: 'التوزيع' },
  review: { en: 'Review', ar: 'المراجعة' },
}

// The demo sign-in for the separate shopper landing page (FR: "email/mobile
// + one-time code sign-in") — same convention `ShopperTasks.tsx` used.
const SIGNED_IN_SHOPPER_ID = 'sh1'

/** Ported from `frontend/src/pages/MysteryShopper.tsx` + `ShopperTasks.tsx`
 * (APPLICATION_MODULES.md §C), with `lib/metrics.ts`'s `scoreChecklist()`
 * reused via `utils/mysteryShopper.ts`. FR-4.14's severity floor is read
 * off the same score here and in Review — a critical outcome is never a
 * second case model, it links to the existing Actions → Shopper cases
 * register rather than duplicating it. The `shopper` role lands here too
 * (`data/roles.ts`'s `home: '/settings/mystery-shopper'`) and sees only its
 * own tasks, per NFR-2 — a different view entirely, not a hidden tab.
 *
 * Design: the console lists are dense (44px rows, tables in one card each); the tabs are the segmented track. Choices and the
 * shoppers to send to are pills (selected = the dark material, a check chip for the multi-select); the shopper's own task view is
 * comfortable, with a sticky bar that says "Unsaved changes" while answers are open. */
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
  const criticalFails = list.reduce((s, a) => s + (a.criticalFails ?? 0), 0)

  function checklistOf(id: string) {
    return checklists?.find((c) => c.id === id)
  }
  function shopperOf(id: string) {
    return shoppers?.find((s) => s.id === id)
  }

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Mystery shopper', 'التسوق السري')}
        description={t('Plans, distributes, collects and reviews mystery shopping visits and calls.', 'تخطيط وتوزيع وجمع ومراجعة زيارات ومكالمات التسوق السري.')}
      />

      <Tabs defaultValue="results" className="gap-4">
        <div className="-m-1 overflow-x-auto p-1">
          <TabsList className="min-w-max">
            {TABS.map((id) => (
              <TabsTrigger key={id} value={id}>
                {L(TAB_LABEL[id])}
                {id === 'review' && toReview.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-bg px-1.5 text-xs font-medium text-warning-text tabular">{toReview.length}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="results" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiTile label={t('Average score', 'متوسط النتيجة')} value={<bdi dir="ltr">{avgScore != null ? `${avgScore}%` : '–'}</bdi>} icon={<Gauge />} loading={isLoading} />
            <KpiTile label={t('Critical fails', 'الإخفاقات الحرجة')} value={criticalFails} icon={<ShieldAlert />} accent={criticalFails ? 'var(--destructive)' : undefined} loading={isLoading} />
            <KpiTile label={t('Completed', 'مكتملة')} value={list.filter((a) => a.status === 'approved').length} icon={<CheckCircle2 />} loading={isLoading} />
          </div>
          <SectionCard contentClassName={IN_CARD}>
            {isLoading ? (
              <LoadingState rows={5} />
            ) : !list.length ? (
              <EmptyState title={t('No visits yet.', 'لا توجد زيارات بعد.')} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Shopper', 'المتسوق')}</TableHead>
                    <TableHead>{t('Checklist', 'القائمة')}</TableHead>
                    <TableHead>{t('Status', 'الحالة')}</TableHead>
                    <TableHead className="text-end">{t('Score', 'النتيجة')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((a) => {
                    const cl = checklistOf(a.checklistId)
                    const severity = msSeverityFor(a.score ?? null, a.criticalFails ?? 0)
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-foreground">{shopperOf(a.shopperId)?.name}</TableCell>
                        <TableCell>{cl ? L(cl.name) : a.checklistId}</TableCell>
                        <TableCell>
                          <StatusBadge tone={MS_ASSIGNMENT_STATUS_TONE[a.status]}>{L(MS_ASSIGNMENT_STATUS_LABEL[a.status])}</StatusBadge>
                        </TableCell>
                        <TableCell className="text-end font-medium tabular text-foreground">
                          <span className="inline-flex items-center justify-end gap-2">
                            {severity === 'critical' && (
                              <Link to="/actions/shopper-cases" className="inline-flex rounded-full outline-none">
                                <StatusBadge tone="danger" icon={<AlertTriangle aria-hidden />}>
                                  {t('case opened', 'تم فتح حالة')}
                                </StatusBadge>
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
                actions={<StatusBadge tone={cl.status === 'published' ? 'success' : 'warning'}>{L(CHECKLIST_STATUS_LABEL[cl.status])}</StatusBadge>}
              >
                <ul className="flex flex-col">
                  {cl.items.map((it) => (
                    <li key={it.id} className="row-divider flex min-h-11 items-start justify-between gap-3 py-2.5">
                      <span className="t-body-s min-w-0 text-foreground">{L(it.text)}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {it.critical && <StatusBadge tone="danger">{t('critical', 'حرج')}</StatusBadge>}
                        <span className="w-10 text-end text-sm text-muted-foreground tabular">
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
          <SectionCard contentClassName={IN_CARD}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name', 'الاسم')}</TableHead>
                  <TableHead>{t('Type', 'النوع')}</TableHead>
                  <TableHead className="text-end">{t('Shops', 'الزيارات')}</TableHead>
                  <TableHead className="text-end">{t('Reliability', 'الموثوقية')}</TableHead>
                  <TableHead>{t('Active', 'نشط')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(shoppers ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{s.name}</span>
                        {s.agency && <span className="text-xs">{s.agency}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">{s.shopsCompleted}</TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">
                      <bdi dir="ltr">{s.reliability}%</bdi>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={s.active ? 'success' : 'neutral'} dot>
                        {s.active ? t('yes', 'نعم') : t('no', 'لا')}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="distribution">
          {canManage ? (
            <SectionCard
              density="comfortable"
              title={t('Send new tasks', 'إرسال مهام جديدة')}
              description={t('Pick a checklist, a scenario, a channel and the shoppers.', 'اختر القائمة والسيناريو والقناة والمتسوقين.')}
            >
              <form
                className="flex flex-col gap-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  send.mutate(dist)
                  setDist((d) => ({ ...d, shopperIds: [] }))
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FieldBlock id="ms-checklist" label={t('Checklist', 'القائمة')}>
                    <Select value={dist.checklistId} onValueChange={(v) => setDist((d) => ({ ...d, checklistId: v }))}>
                      <SelectTrigger id="ms-checklist" className="w-full">
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
                      <SelectTrigger id="ms-scenario" className="w-full">
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
                      <SelectTrigger id="ms-channel" className="w-full">
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

                <div className="row-divider pb-6">
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-medium text-foreground">{t('Shoppers', 'المتسوقون')}</legend>
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
                              className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full bg-well ps-[5px] pe-3.5 pt-px text-sm font-medium text-foreground outline-none transition-colors duration-200 ease-out hover:bg-well-hover"
                            >
                              <span aria-hidden className={cn('grid size-6 place-items-center rounded-full', on ? 'material-dark' : 'bg-line shadow-dot-off')}>
                                {on && <Check className="size-3" />}
                              </span>
                              {s.name}
                            </button>
                          )
                        })}
                    </div>
                  </fieldset>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted-foreground">{t('Simulated — nothing is really sent.', 'محاكاة — لا يُرسل شيء فعلياً.')}</span>
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

        <TabsContent value="review">
          {toReview.length ? (
            <SectionCard>
              <ul className="flex flex-col">
                {toReview.map((a) => {
                  const cl = checklistOf(a.checklistId)
                  return (
                    <li key={a.id} className="row-divider flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full [&_svg]:size-4">
                          <ClipboardCheck />
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="t-ui-strong">{shopperOf(a.shopperId)?.name}</span>
                          <span className="truncate text-sm text-muted-foreground">{cl && L(cl.name)}</span>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, approve: false })}>
                            <RotateCcw aria-hidden />
                            {t('Return to shopper', 'إعادة للمتسوق')}
                          </Button>
                          <Button size="sm" onClick={() => decide.mutate({ id: a.id, approve: true })}>
                            <CheckCircle2 aria-hidden />
                            {t('Approve', 'اعتماد')}
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </SectionCard>
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

/** One answer: a pill on the well, pressed = the dark material (the skill's selected state; a fail is not painted red). */
function ChoiceButton({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-well px-3.5 pt-px text-sm font-medium text-foreground outline-none transition-colors duration-200 ease-out hover:bg-well-hover aria-pressed:material-dark"
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
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('My tasks', 'مهامي')}
        description={t('Signed in as a mystery shopper. You see only your own tasks.', 'تم الدخول كمتسوق سري. تظهر لك مهامك الخاصة فقط.')}
      />

      {!open &&
        (isLoading ? (
          <LoadingState rows={3} />
        ) : mine.length ? (
          <SectionCard>
            <ul className="flex flex-col">
              {mine.map((a) => {
                const c = checklists?.find((x) => x.id === a.checklistId)
                const s = scenarios?.find((x) => x.id === a.scenarioId)
                const daysLeft = Math.ceil((new Date(a.dueAt).getTime() - now) / 86_400_000)
                const canOpen = a.status === 'sent' || a.status === 'opened' || a.status === 'progress'
                return (
                  <li key={a.id} className="row-divider flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="t-ui-strong">{c && L(c.name)}</span>
                      <span className="text-sm text-muted-foreground">{s && L(s.title)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={MS_ASSIGNMENT_STATUS_TONE[a.status]}>{L(MS_ASSIGNMENT_STATUS_LABEL[a.status])}</StatusBadge>
                      {daysLeft >= 0 ? (
                        <span className="text-sm text-muted-foreground">{t(`${daysLeft} day(s) left`, `متبقي ${daysLeft} يوم`)}</span>
                      ) : (
                        <StatusBadge tone="danger">{t('overdue', 'متأخر')}</StatusBadge>
                      )}
                      {canOpen && (
                        <Button size="sm" onClick={() => setOpenId(a.id)}>
                          {t('Open task', 'فتح المهمة')}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        ) : (
          <EmptyState title={t('No tasks right now.', 'لا توجد مهام حالياً.')} />
        ))}

      {open && cl && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
          <SectionCard className="lg:col-span-2" title={t('Brief', 'الموجز')} contentClassName="flex flex-col gap-4">
            <dl className="well flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="t-small-strong">{t('Scenario', 'السيناريو')}</dt>
                <dd className="text-muted-foreground">{sc && L(sc.title)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="t-small-strong">{t('What is checked', 'ما الذي يُفحص')}</dt>
                <dd className="text-muted-foreground">{sc && L(sc.tests)}</dd>
              </div>
            </dl>
            <InlineNote tone="info">
              {t(
                'Consent and privacy: do not record anyone without disclosure where required by local rules.',
                'الموافقة والخصوصية: لا تسجّل أي شخص دون الإفصاح عند الحاجة وفق القواعد المحلية.',
              )}
            </InlineNote>
          </SectionCard>

          <SectionCard className="lg:col-span-3" title={L(cl.name)}>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                submitOpen()
              }}
            >
              <ol className="flex flex-col">
                {cl.items.map((it, i) => (
                  <li key={it.id} className="row-divider flex flex-col gap-3 py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-base text-foreground">
                        <span className="me-1.5 text-muted-foreground tabular">{i + 1}.</span>
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
                          <ChoiceButton on={answers[it.id] === 0} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 0 }))}>
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
              {/* The skill's sticky save bar: white, a 1px top line (drawn as a shadow), the unsaved state on the left, Cancel and the
                  primary action on the right. */}
              <div className="sticky bottom-0 z-10 -mx-[var(--card-pad)] -mb-[var(--card-pad)] flex items-center justify-between gap-3 rounded-b-card bg-card px-[var(--card-pad)] py-3 shadow-[0_-1px_0_var(--line)]">
                <span className="inline-flex min-h-9 items-center gap-2 text-sm text-foreground">
                  {Object.keys(answers).length > 0 && (
                    <>
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
                      {t('Unsaved changes', 'تغييرات غير محفوظة')}
                    </>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenId(null)}>
                    <ArrowLeft aria-hidden className="rtl:rotate-180" />
                    {t('Cancel', 'إلغاء')}
                  </Button>
                  <Button type="submit">{t('Submit', 'إرسال')}</Button>
                </span>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </section>
  )
}
