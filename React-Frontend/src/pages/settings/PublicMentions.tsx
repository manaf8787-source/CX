import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, ExternalLink, Send, Pencil, Plus, RotateCcw, TimerOff, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Bad, Good } from '@/components/common/Trend'
import { useRole } from '@/auth/RoleContext'
import { canEditReplyLibrary, canMarkMentionReplied } from '@/auth/permissions'
import { usePublicMentions } from '@/services/referenceQueries'
import { useAssignMention, useClassifyMention, useEditReply, useMarkReplied, useRules } from '@/services/queriesV40'
import { PRODUCTS } from '@/data/products'
import { ProductTag } from '@/components/common/Chip'
import type { ProductId } from '@/types'
import { PUBLIC_MENTIONS_COPY as COPY, STAGE_LABEL, mentionStage, postOf, replyLabel, replyState, type ReplyState } from '@/data/publicMentions'
import { useAuth } from '@/auth/session'
import { GiftFlow, mentionJustification } from '@/components/gifts/GiftFlow'
import { useUsers } from '@/data/users'
import { Link, useSearchParams } from 'react-router-dom'
import type { PublicMention, PublicPlatform } from '@/data/v38Reference'
import {
  deleteQuestion,
  deleteScript,
  fillText,
  resetLibrary,
  saveQuestion,
  saveScript,
  setWhatsapp,
  useReplyLibrary,
  type CommonQuestion,
  type ReplyScript,
  type ScriptTone,
} from '@/data/replyLibrary'
import { envNameFromShort } from '@/data/environments'
import { CHANNEL_LABEL } from '@/components/customers/channels'
import { useNow } from '@/hooks/useNow'
import type { Bi } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SourceBadge } from '@/components/customers/SourceBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { InlineNote } from '@/components/common/InlineNote'
import { KpiTile } from '@/components/common/KpiTile'
import { LoadingState } from '@/components/common/LoadingState'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Segmented } from '@/components/ui/segmented'
import { IN_CARD, SubPageHeader } from './SubPageHeader'

type Filter = 'all' | 'open' | ReplyState
type PlatformFilter = 'all' | PublicPlatform
type Tab = 'mentions' | 'scripts' | 'questions'

const HOUR_MS = 3_600_000
const PLATFORMS: PublicPlatform[] = ['facebook', 'instagram', 'linkedin', 'google', 'googleplay', 'appstore', 'webcomment']
const ENV_SHORTS = ['Dubai', 'Abu Dhabi', 'PSI Assets', 'PSI-AI']
const toneOf = (s: number): ScriptTone => (s < 0 ? 'negative' : s > 0 ? 'positive' : 'neutral')
const TONE_LABEL: Record<ScriptTone, Bi> = { positive: COPY.tone.positive, negative: COPY.tone.negative, neutral: COPY.tone.neutral }
const TONE_BADGE: Record<ScriptTone, 'success' | 'danger' | 'neutral'> = { positive: 'success', negative: 'danger', neutral: 'neutral' }

/**
 * Public mentions (v40 F30, extended 23 Nov): every public comment on Facebook, Instagram, LinkedIn and Google with its reply status,
 * in three tabs:
 * - Mentions: filter by reply status and platform; open a row to see where it was posted (the page, the post, a link to the original
 *   and the other comments on it) and to write the reply from a script or a common answer. Marketing and the CX team reply.
 * - Reply scripts and Common questions: the reply library. The CX manager edits it; everyone who opens the page uses it.
 * Nobody here is surveyed or matched to a record: a mention is never linked to a person.
 */
export default function PublicMentions() {
  const { t, L } = useI18n()
  const rules = useRules()
  const hours = rules.publicReplyHours
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = raw === 'scripts' || raw === 'questions' ? raw : 'mentions'

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro(hours))} />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
        <TabsList aria-label={L(COPY.title)}>
          <TabsTrigger value="mentions">{t('Mentions', 'الإشارات')}</TabsTrigger>
          <TabsTrigger value="scripts">{t('Reply scripts', 'ردود جاهزة')}</TabsTrigger>
          <TabsTrigger value="questions">{t('Common questions', 'الأسئلة الشائعة')}</TabsTrigger>
        </TabsList>
        <TabsContent value="mentions">
          <MentionsTab />
        </TabsContent>
        <TabsContent value="scripts">
          <ScriptsTab />
        </TabsContent>
        <TabsContent value="questions">
          <QuestionsTab />
        </TabsContent>
      </Tabs>
    </section>
  )
}

// --- Mentions ---------------------------------------------------------------------------------------------------------

function MentionsTab() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const rules = useRules()
  const hours = rules.publicReplyHours
  const now = useNow()
  const [params] = useSearchParams()
  const { data: mentions, isLoading, isError, refetch } = usePublicMentions()
  const canReply = canMarkMentionReplied(role.id)
  const team = users.filter((u) => u.roleId === 'cxteam')
  const nameOf = (id?: string) => team.find((u) => u.id === id)?.name ?? '–'
  const statusParam = params.get('status')
  const [filter, setFilter] = useState<Filter>(
    statusParam === 'open' || statusParam === 'overdue' || statusParam === 'awaiting' || statusParam === 'replied' ? statusParam : 'all',
  )
  const [platform, setPlatform] = useState<PlatformFilter>('all')
  // 23 Nov (owner): the product filter ('none' = not classified yet)
  const [product, setProduct] = useState<string>(params.get('product') ?? 'all')
  const initialAssignee = params.get('assignee')
  const [assignee, setAssignee] = useState<string>(initialAssignee === 'me' ? (session?.userId ?? 'all') : (initialAssignee ?? 'all'))
  const [open, setOpen] = useState<string | null>(params.get('open'))
  const c = COPY.columns

  const rows = useMemo(
    () => [...(mentions ?? [])].sort((a, b) => b.date.localeCompare(a.date)).map((m) => ({ m, state: replyState(m, now, hours) })),
    [mentions, now, hours],
  )
  const byPlatform = rows.filter(
    (r) =>
      (platform === 'all' || r.m.platform === platform) &&
      (assignee === 'all' || r.m.assignee === assignee) &&
      (product === 'all' || (product === 'none' ? !r.m.productId : r.m.productId === product)),
  )
  const unclassified = rows.filter((r) => !r.m.productId || !r.m.environment).length
  const counts = {
    all: byPlatform.length,
    open: byPlatform.filter((r) => r.state !== 'replied').length,
    awaiting: byPlatform.filter((r) => r.state === 'awaiting').length,
    overdue: byPlatform.filter((r) => r.state === 'overdue').length,
    replied: byPlatform.filter((r) => r.state === 'replied').length,
  }
  const openMention = rows.find((r) => r.m.id === open)?.m
  const shown =
    filter === 'all' ? byPlatform : filter === 'open' ? byPlatform.filter((r) => r.state !== 'replied') : byPlatform.filter((r) => r.state === filter)
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: t('All', 'الكل') },
    { id: 'open', label: t('Not replied', 'بلا رد') },
    { id: 'awaiting', label: t('Awaiting reply', 'بانتظار الرد') },
    { id: 'overdue', label: t(`Over ${hours} h`, `تجاوزت ${hours} ساعة`) },
    { id: 'replied', label: t('Replied', 'رُدّ عليها') },
  ]

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (isLoading || !mentions) return <LoadingState rows={6} />
  return (
    <div className="flex flex-col gap-4">
      <InlineNote
        tone="info"
        title={t('Replied by a person from the CX team', 'يرد عليها شخص من فريق CX')}
        action={
          role.id === 'cxmgr' && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/settings/rules">{t('Change the hours', 'غيّر الساعات')}</Link>
            </Button>
          )
        }
      >
        {t(
          `Each comment is assigned to a CX team member, who replies by hand using the approved scripts (the AI does not reply). No reply after ${rules.publicReminderHours} h: a reminder to that member. No reply after ${hours} h (the SLA): escalated to the CX manager and counted as breached in Team performance. The CX manager sets both hours in Rules as configuration.`,
          `كل تعليق يُسند إلى موظف من فريق CX يرد عليه بنفسه باستخدام الردود المعتمدة (الذكاء الاصطناعي لا يرد). بلا رد بعد ${rules.publicReminderHours} ساعة: تذكير لذلك الموظف. بلا رد بعد ${hours} ساعة (المهلة): تصعيد لمدير CX وتُحسب متجاوزة في أداء الفريق. يحدد مدير CX الساعتين في القواعد كإعدادات.`,
        )}
      </InlineNote>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile label={t('Mentions', 'الإشارات')} value={counts.all} />
        <KpiTile label={t('Awaiting reply', 'بانتظار الرد')} value={counts.awaiting} sub={t(`inside the ${hours}-hour clock`, `ضمن مهلة ${hours} ساعة`)} />
        <KpiTile
          label={t(`Over ${hours} h, no reply`, `تجاوزت ${hours} ساعة بلا رد`)}
          value={counts.overdue ? <Bad>{counts.overdue}</Bad> : <Good>0</Good>}
          accent={counts.overdue ? 'var(--destructive)' : undefined}
          sub={counts.overdue ? L(COPY.missedSignal) : undefined}
        />
        <KpiTile label={t('Replied', 'رُدّ عليها')} value={<Good>{counts.replied}</Good>} />
      </div>

      {unclassified > 0 && (
        <InlineNote
          tone="warning"
          title={t(
            `${unclassified} ${unclassified === 1 ? 'comment needs' : 'comments need'} a product or an environment`,
            `${unclassified} تعليق يحتاج منتجاً أو بيئة`,
          )}
          action={
            <Button size="sm" variant="outline" onClick={() => setProduct('none')}>
              {t('Show them', 'اعرضها')}
            </Button>
          }
        >
          {t(
            'Agent 2 classifies each comment; when it is not sure it leaves it to you. Open the comment and choose. Until then it counts under "Not classified" on the dashboard.',
            'يصنّف الوكيل 2 كل تعليق؛ وحين لا يكون متأكداً يتركه لك. افتح التعليق واختر. وحتى ذلك يُحتسب تحت "غير مصنّفة" في اللوحة.',
          )}
        </InlineNote>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          variant="pressed"
          label={t('Filter by platform', 'تصفية حسب المنصة')}
          options={[
            { value: 'all', label: t('All platforms', 'كل المنصات'), count: rows.length },
            ...PLATFORMS.map((p) => ({ value: p, label: L(CHANNEL_LABEL[p]), count: rows.filter((r) => r.m.platform === p).length })).filter(
              (o) => o.count > 0,
            ),
          ]}
          value={platform}
          onValueChange={(v) => setPlatform(v as PlatformFilter)}
        />
        <Segmented
          variant="pressed"
          label={t('Filter by reply status', 'تصفية حسب حالة الرد')}
          options={FILTERS.map((f) => ({ value: f.id, label: f.label, count: counts[f.id] }))}
          value={filter}
          onValueChange={setFilter}
        />
        <Select value={product} onValueChange={setProduct}>
          <SelectTrigger className="h-9 min-w-44" aria-label={t('Product', 'المنتج')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All products', 'كل المنتجات')}</SelectItem>
            {PRODUCTS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {L(p.name)}
              </SelectItem>
            ))}
            <SelectItem value="none">
              {t(`Not classified yet (${rows.filter((r) => !r.m.productId).length})`, `غير مصنّفة بعد (${rows.filter((r) => !r.m.productId).length})`)}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-9 min-w-44" aria-label={t('Assigned to', 'مُسندة إلى')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('Everyone in the CX team', 'كل فريق CX')}</SelectItem>
            {team.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.id === session?.userId ? t(`${u.name} (me)`, `${u.name} (أنا)`) : u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={t('No mentions match this filter.', 'لا إشارات تطابق هذه التصفية.')} />
      ) : (
        <SectionCard contentClassName={IN_CARD}>
          <Table>
            <TableHeader>
              <TableRow>
                {[c.date, b('Source', 'المصدر'), c.mention, c.tone, c.reply, c.identified, b('Assigned to', 'مُسندة إلى')].map((h) => (
                  <TableHead key={h.en}>{L(h)}</TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">{t('Details', 'التفاصيل')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(({ m, state }) => {
                const leftH = Math.max(1, Math.ceil(hours - (now - Date.parse(m.date)) / HOUR_MS))
                const post = postOf(m)
                const isOpen = open === m.id
                return (
                  <Fragment key={m.id}>
                    <TableRow className="cursor-pointer" onClick={() => setOpen(isOpen ? null : m.id)} aria-expanded={isOpen}>
                      <TableCell className="tabular">
                        <bdi dir="ltr">{fmtDate(m.date)}</bdi>
                      </TableCell>
                      <TableCell className="min-w-36 whitespace-normal">
                        <span className="flex flex-col items-start gap-1">
                          <SourceBadge channel={m.platform} />
                          <span className="text-xs">{post.page}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.environment ? L(envNameFromShort(m.environment)) : t('Environment: not classified', 'البيئة: غير مصنّفة')}
                          </span>
                          {m.productId ? (
                            <ProductTag productId={m.productId} lang={lang} />
                          ) : (
                            <StatusBadge tone="danger">{t('Product: not classified', 'المنتج: غير مصنّف')}</StatusBadge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-40 whitespace-normal text-foreground">{m.text}</TableCell>
                      <TableCell>
                        <StatusBadge tone={TONE_BADGE[toneOf(m.sentiment)]}>{L(TONE_LABEL[toneOf(m.sentiment)])}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-col items-start gap-1.5">
                          <StatusBadge
                            tone={state === 'replied' ? 'success' : state === 'overdue' ? 'danger' : 'warning'}
                            icon={state === 'overdue' ? <TimerOff aria-hidden /> : undefined}
                          >
                            {L(replyLabel(m, now, hours))}
                          </StatusBadge>
                          {state === 'awaiting' && (
                            <span className="text-xs tabular">{t(`${leftH} h left on the clock`, `${leftH} ساعة متبقية على المهلة`)}</span>
                          )}
                          {(() => {
                            const st = mentionStage(m, now, rules)
                            return st === 'reminded' || st === 'escalated' ? (
                              <span className={cn('text-xs', st === 'escalated' && 'font-medium text-destructive')}>{L(STAGE_LABEL[st])}</span>
                            ) : null
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-24 whitespace-normal">
                        {m.becameIdentified ? L(COPY.identified[m.channelMovedTo ?? 'private']) : '–'}
                      </TableCell>
                      <TableCell className="min-w-24 whitespace-normal">
                        <span className="flex flex-col">
                          <span className="text-foreground">{nameOf(m.assignee)}</span>
                          <span className="text-xs text-muted-foreground">{L(m.owner)}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={isOpen ? t('Close the details', 'أغلق التفاصيل') : t('Open the details and reply', 'افتح التفاصيل والرد')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpen(isOpen ? null : m.id)
                          }}
                        >
                          <ChevronRight aria-hidden className="rtl:rotate-180" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </SectionCard>
      )}
      <Sheet open={!!openMention} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-[40rem]">
          {openMention && (
            <>
              <SheetHeader>
                <SheetTitle>{t('Public comment', 'تعليق عام')}</SheetTitle>
                <SheetDescription>
                  {L(CHANNEL_LABEL[openMention.platform])} · <bdi dir="ltr">{fmtDate(openMention.date)}</bdi>
                  {openMention.environment && <> · {L(envNameFromShort(openMention.environment))}</>}
                </SheetDescription>
              </SheetHeader>
              <div className="px-5 pt-1 pb-6">
                <MentionDetail key={openMention.id} m={openMention} canReply={canReply} onDone={() => setOpen(null)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

const b = (en: string, ar: string): Bi => ({ en, ar })

/** 25 Nov (owner): one public comment on its own page (opened from the inbox): the same detail and reply as the side panel. */
export function MentionAlone({ id }: { id: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: mentions, isLoading } = usePublicMentions()
  const m = mentions?.find((x) => x.id === id)
  if (isLoading) return <LoadingState rows={3} />
  if (!m) return <EmptyState title={t('This comment is no longer open for you.', 'هذا التعليق لم يعد مفتوحاً لك.')} />
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <SectionCard
      title={t('Public comment', 'تعليق عام')}
      description={
        <>
          {L(CHANNEL_LABEL[m.platform])} · <bdi dir="ltr">{fmt(m.date)}</bdi>
          {m.environment && <> · {L(envNameFromShort(m.environment))}</>}
        </>
      }
    >
      <MentionDetail key={m.id} m={m} canReply={canMarkMentionReplied(role.id)} onDone={() => {}} />
    </SectionCard>
  )
}

/** One mention, opened: where it was posted, the thread, and the reply (from a script or a common answer). */
function MentionDetail({ m, canReply, onDone }: { m: PublicMention; canReply: boolean; onDone: () => void }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const assign = useAssignMention()
  const team = users.filter((u) => u.roleId === 'cxteam')
  const me = users.find((u) => u.id === session?.userId)
  const lib = useReplyLibrary()
  const markReplied = useMarkReplied()
  const post = postOf(m)
  const tone = toneOf(m.sentiment)
  const values = { whatsapp: lib.whatsapp, branch: L(envNameFromShort(m.environment)), platform: L(CHANNEL_LABEL[m.platform]) }
  const scripts = [...lib.scripts].sort((a, b2) => Number(b2.tone === tone) - Number(a.tone === tone))
  const [text, setText] = useState(() => {
    const first = lib.scripts.find((s) => s.tone === tone)
    return first ? fillText(L(first.text), values) : ''
  })

  const editReply = useEditReply()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.replyText ?? '')
  const platformName = L(CHANNEL_LABEL[m.platform])
  const byMe = me ? { en: me.name, ar: me.name } : role.name

  return (
    <div className="flex flex-col gap-6">
      {/* 26 Nov (owner): the panel redesigned: the comment first, then what it is about, who has it, and the reply; one style of section */}
      <section className="well flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <SourceBadge channel={m.platform} />
            <span className="text-sm font-medium text-foreground">{post.page}</span>
          </span>
          <StatusBadge tone={TONE_BADGE[tone]}>{L(TONE_LABEL[tone])}</StatusBadge>
        </div>
        {post.post ? (
          <span className="text-xs text-muted-foreground">
            {t('Comment on the post: ', 'تعليق على المنشور: ')}“{L(post.post)}”
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {m.platform === 'google'
              ? t('A review on the branch’s Google listing.', 'مراجعة على صفحة الفرع في Google.')
              : t('A review of the app in the store.', 'مراجعة للتطبيق في المتجر.')}
          </span>
        )}
        <ul className="flex flex-col gap-2">
          {post.thread.map((c, i) => (
            <li
              key={i}
              className={cn(
                'flex flex-col gap-1 rounded-xl px-3.5 py-2.5',
                i === 0 ? 'bg-card text-base shadow-hairline' : c.isPsi ? 'ms-8 bg-card/60 text-sm' : 'bg-card/60 text-sm',
              )}
            >
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className={cn(c.isPsi && 'font-medium text-foreground')}>
                  {i === 0 ? t('The comment', 'التعليق') : c.isPsi ? t('PSI reply', 'رد PSI') : c.who}
                </span>
                {c.hoursAfter > 0 && <span className="tabular">{t(`${c.hoursAfter} h later`, `بعد ${c.hoursAfter} ساعة`)}</span>}
              </span>
              <span className="text-foreground">{c.text}</span>
            </li>
          ))}
        </ul>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
        >
          {t('Open the original post', 'افتح المنشور الأصلي')}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </section>

      <ClassificationBox m={m} />

      <div className="flex flex-col gap-3">
        {role.id === 'cxmgr' && !m.replied && (
          <label className="flex flex-col gap-1.5">
            <span className="t-small-strong">{t('Assigned to', 'مُسندة إلى')}</span>
            <Select
              value={m.assignee ?? ''}
              onValueChange={(id) => assign.mutate({ id: m.id, userId: id }, { onSuccess: () => toast(t('Reassigned.', 'أُعيد الإسناد.')) })}
            >
              <SelectTrigger size="sm" className="w-full" aria-label={t('Assigned to', 'مُسندة إلى')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {team.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        {m.replied ? (
          editing ? (
            <div className="flex flex-col gap-2">
              <span className="t-small text-muted-foreground">{t('Edit the reply', 'عدّل الرد')}</span>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                aria-label={t('Reply text', 'نص الرد')}
              />
              {m.platform === 'instagram' && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Instagram does not let a reply be edited: the old reply is deleted and the new one is posted in its place.',
                    'إنستغرام لا يسمح بتعديل الرد: يُحذف الرد القديم ويُنشر الجديد مكانه.',
                  )}
                </p>
              )}
              <span className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!draft.trim() || draft.trim() === m.replyText || editReply.isPending}
                  onClick={() =>
                    editReply.mutate(
                      { id: m.id, text: draft.trim(), by: byMe },
                      {
                        onSuccess: () => {
                          toast(t(`Reply updated on ${platformName}.`, `حُدّث الرد على ${platformName}.`))
                          setEditing(false)
                        },
                      },
                    )
                  }
                >
                  <Send aria-hidden />
                  {t(`Update on ${platformName}`, `حدّث على ${platformName}`)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => (setEditing(false), setDraft(m.replyText ?? ''))}>
                  {t('Cancel', 'إلغاء')}
                </Button>
              </span>
            </div>
          ) : (
            <InlineNote
              tone="success"
              title={t(`Replied on ${platformName}`, `تم الرد على ${platformName}`)}
              action={
                canReply &&
                m.replyText && (
                  <Button size="sm" variant="outline" onClick={() => (setDraft(m.replyText ?? ''), setEditing(true))}>
                    <Pencil aria-hidden />
                    {t('Edit', 'تعديل')}
                  </Button>
                )
              }
            >
              {m.replyText ?? t('The reply was posted on the platform; its text was not recorded here.', 'نُشر الرد على المنصة؛ لم يُسجَّل نصه هنا.')}
              {m.repliedBy && (
                <span className="block pt-1 text-xs">
                  {t(`By ${m.repliedBy.en}`, `بواسطة ${m.repliedBy.ar}`)}
                  {m.replyEditedAt && t(` · edited ${m.replyEdits ?? 1}×`, ` · عُدّل ${m.replyEdits ?? 1} مرة`)}
                </span>
              )}
            </InlineNote>
          )
        ) : canReply ? (
          <>
            <span className="t-small-strong">{t('Your reply', 'ردك')}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select onValueChange={(id) => setText(fillText(L(lib.scripts.find((s) => s.id === id)!.text), values))}>
                <SelectTrigger size="sm" className="w-full" aria-label={t('Use a script', 'استخدم رداً جاهزاً')}>
                  <SelectValue placeholder={t('Use a reply script', 'استخدم رداً جاهزاً')} />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {L(TONE_LABEL[s.tone])} · {L(s.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(id) => setText((x) => `${x ? `${x}\n\n` : ''}${fillText(L(lib.questions.find((q) => q.id === id)!.answer), values)}`)}>
                <SelectTrigger size="sm" className="w-full" aria-label={t('Add a common answer', 'أضف إجابة شائعة')}>
                  <SelectValue placeholder={t('Add a common answer', 'أضف إجابة شائعة')} />
                </SelectTrigger>
                <SelectContent>
                  {lib.questions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {L(q.question)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              aria-label={t('Reply text', 'نص الرد')}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                `Never write a name, number or price in a public reply. "Publish" posts it on ${platformName} under this comment, as the PSI page; you can edit it afterwards. Prototype: nothing is really posted.`,
                `لا تكتب اسماً أو رقماً أو سعراً في رد عام. "انشر" يضع الرد على ${platformName} تحت هذا التعليق باسم صفحة PSI؛ ويمكنك تعديله بعدها. في النموذج لا يُنشر شيء فعلاً.`,
              )}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                disabled={!text.trim() || markReplied.isPending}
                onClick={() =>
                  markReplied.mutate(
                    { id: m.id, text: text.trim(), by: byMe },
                    {
                      onSuccess: () => {
                        toast(t(`Published on ${platformName}.`, `نُشر على ${platformName}.`))
                        onDone()
                      },
                    },
                  )
                }
              >
                <Send aria-hidden />
                {t(`Publish on ${platformName}`, `انشر على ${platformName}`)}
              </Button>
            </div>
          </>
        ) : (
          <InlineNote tone="neutral">
            {t('The CX team replies to public comments. You can read them.', 'فريق CX يرد على التعليقات العامة. يمكنك قراءتها.')}
          </InlineNote>
        )}
      </div>
      {/* 23 Nov (owner): "eligible for a gift", approved by the CX manager, sent to Administration, all from this panel */}
      <GiftFlow relatedRef={m.id} reason={m.sentiment < 0 ? 'recovery' : 'thanks'} justification={mentionJustification(m, post.page, platformName, lang)} />
    </div>
  )
}

// --- Reply scripts ----------------------------------------------------------------------------------------------------

function ScriptsTab() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const lib = useReplyLibrary()
  const canEdit = canEditReplyLibrary(role.id)
  const [editing, setEditing] = useState<string | null>(null)
  const [wa, setWa] = useState(lib.whatsapp)

  return (
    <div className="flex flex-col gap-4">
      <InlineNote tone="info" title={canEdit ? t('You edit these', 'أنت من يعدّل هذه') : t('Read only', 'للقراءة فقط')}>
        {t(
          'Approved public replies. Everyone who replies uses them from the mention (open a mention, then "Use a reply script"). Only the CX manager adds or changes them. {whatsapp} and {branch} are filled in when a script is used.',
          'ردود عامة معتمدة. يستخدمها كل من يرد من داخل الإشارة (افتح الإشارة ثم "استخدم رداً جاهزاً"). مدير CX وحده يضيفها أو يعدّلها. يُملأ {whatsapp} و{branch} عند استخدام الرد.',
        )}
      </InlineNote>
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t('WhatsApp number used in replies ({whatsapp})', 'رقم واتساب المستخدم في الردود ({whatsapp})')}
            <Input value={wa} onChange={(e) => setWa(e.target.value)} className="h-9 w-56" dir="ltr" />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={wa === lib.whatsapp || !wa.trim()}
            onClick={() => (setWhatsapp(wa.trim()), toast(t('Number saved.', 'حُفظ الرقم.')))}
          >
            {t('Save', 'احفظ')}
          </Button>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (resetLibrary(), setWa(lib.whatsapp), toast(t('Scripts and questions reset.', 'أُعيدت الردود والأسئلة.')))}
          >
            <RotateCcw aria-hidden />
            {t('Reset to the defaults', 'إعادة إلى الافتراضي')}
          </Button>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('Add a script', 'أضف رداً')}
          </Button>
        </div>
      )}
      {editing === 'new' && <ScriptForm onClose={() => setEditing(null)} />}
      {(['negative', 'positive', 'neutral'] as ScriptTone[]).map((tone) => {
        const list = lib.scripts.filter((s) => s.tone === tone)
        return (
          <SectionCard
            key={tone}
            title={t(
              `For ${TONE_LABEL[tone].en.toLowerCase()} comments`,
              `للتعليقات ${tone === 'negative' ? 'السلبية' : tone === 'positive' ? 'الإيجابية' : 'المحايدة'}`,
            )}
            contentClassName="flex flex-col gap-3"
          >
            {list.length === 0 && <p className="text-sm text-muted-foreground">{t('No script yet.', 'لا ردود بعد.')}</p>}
            {list.map((s) =>
              editing === s.id ? (
                <ScriptForm key={s.id} script={s} onClose={() => setEditing(null)} />
              ) : (
                <div key={s.id} className="well flex flex-col gap-1.5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{L(s.title)}</span>
                    {canEdit && (
                      <span className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={t('Edit', 'تعديل')} onClick={() => setEditing(s.id)}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('Delete', 'حذف')}
                          onClick={() => (deleteScript(s.id), toast(t('Script deleted.', 'حُذف الرد.')))}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </span>
                    )}
                  </span>
                  <span className="text-sm">{L(s.text)}</span>
                </div>
              ),
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

function ScriptForm({ script, onClose }: { script?: ReplyScript; onClose: () => void }) {
  const { t } = useI18n()
  const [tone, setTone] = useState<ScriptTone>(script?.tone ?? 'negative')
  const [title, setTitle] = useState<Bi>(script?.title ?? { en: '', ar: '' })
  const [text, setText] = useState<Bi>(script?.text ?? { en: '', ar: '' })
  const valid = (title.en.trim() || title.ar.trim()) && (text.en.trim() || text.ar.trim())
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <Segmented
        variant="pressed"
        label={t('Tone', 'النبرة')}
        value={tone}
        onValueChange={(v) => setTone(v as ScriptTone)}
        options={(['negative', 'positive', 'neutral'] as ScriptTone[]).map((x) => ({ value: x, label: t(TONE_LABEL[x].en, TONE_LABEL[x].ar) }))}
      />
      <BiFields label={t('Name', 'الاسم')} value={title} onChange={setTitle} />
      <BiFields label={t('Reply', 'الرد')} value={text} onChange={setText} multiline />
      <span className="flex gap-2">
        <Button
          size="sm"
          disabled={!valid}
          onClick={() => {
            saveScript({ id: script?.id, tone, title: fillBi(title), text: fillBi(text) })
            toast(t('Script saved.', 'حُفظ الرد.'))
            onClose()
          }}
        >
          {t('Save', 'احفظ')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('Cancel', 'إلغاء')}
        </Button>
      </span>
    </div>
  )
}

// --- Common questions -------------------------------------------------------------------------------------------------

function QuestionsTab() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const lib = useReplyLibrary()
  const canEdit = canEditReplyLibrary(role.id)
  const [editing, setEditing] = useState<string | null>(null)
  const list = [...lib.questions].sort((a, b2) => b2.timesAsked - a.timesAsked)

  return (
    <div className="flex flex-col gap-4">
      <InlineNote tone="info" title={canEdit ? t('You edit these', 'أنت من يعدّل هذه') : t('Read only', 'للقراءة فقط')}>
        {t(
          'The questions people ask most on our posts, most asked first, each with its approved answer. Use an answer from the mention ("Add a common answer"). Only the CX manager adds or changes them.',
          'الأسئلة الأكثر تكراراً على منشوراتنا، الأكثر سؤالاً أولاً، ولكل منها إجابتها المعتمدة. استخدم الإجابة من داخل الإشارة ("أضف إجابة شائعة"). مدير CX وحده يضيفها أو يعدّلها.',
        )}
      </InlineNote>
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('Add a question', 'أضف سؤالاً')}
          </Button>
        </div>
      )}
      {editing === 'new' && <QuestionForm onClose={() => setEditing(null)} />}
      <SectionCard contentClassName="flex flex-col gap-3">
        {list.map((q, i) =>
          editing === q.id ? (
            <QuestionForm key={q.id} question={q} onClose={() => setEditing(null)} />
          ) : (
            <div key={q.id} className="well flex flex-col gap-1.5">
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">
                  <span className="tabular text-muted-foreground">{i + 1}. </span>
                  {L(q.question)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <StatusBadge tone="neutral">{t(`Asked ${q.timesAsked} times`, `سُئل ${q.timesAsked} مرة`)}</StatusBadge>
                  {canEdit && (
                    <>
                      <Button size="icon-sm" variant="ghost" aria-label={t('Edit', 'تعديل')} onClick={() => setEditing(q.id)}>
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('Delete', 'حذف')}
                        onClick={() => (deleteQuestion(q.id), toast(t('Question deleted.', 'حُذف السؤال.')))}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </>
                  )}
                </span>
              </span>
              <span className="text-sm">{L(q.answer)}</span>
            </div>
          ),
        )}
      </SectionCard>
    </div>
  )
}

function QuestionForm({ question, onClose }: { question?: CommonQuestion; onClose: () => void }) {
  const { t } = useI18n()
  const [q, setQ] = useState<Bi>(question?.question ?? { en: '', ar: '' })
  const [a, setA] = useState<Bi>(question?.answer ?? { en: '', ar: '' })
  const [n, setN] = useState(String(question?.timesAsked ?? 0))
  const valid = (q.en.trim() || q.ar.trim()) && (a.en.trim() || a.ar.trim())
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <BiFields label={t('Question', 'السؤال')} value={q} onChange={setQ} />
      <BiFields label={t('Approved answer', 'الإجابة المعتمدة')} value={a} onChange={setA} multiline />
      <label className="flex w-fit flex-col gap-1 text-sm">
        {t('Times asked (90 days)', 'مرات السؤال (90 يوماً)')}
        <Input type="number" min={0} value={n} onChange={(e) => setN(e.target.value)} className="h-9 w-28" dir="ltr" />
      </label>
      <span className="flex gap-2">
        <Button
          size="sm"
          disabled={!valid}
          onClick={() => {
            saveQuestion({ id: question?.id, question: fillBi(q), answer: fillBi(a), timesAsked: Math.max(0, Number(n) || 0) })
            toast(t('Question saved.', 'حُفظ السؤال.'))
            onClose()
          }}
        >
          {t('Save', 'احفظ')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('Cancel', 'إلغاء')}
        </Button>
      </span>
    </div>
  )
}

// --- shared -----------------------------------------------------------------------------------------------------------

/** When only one language was written, the other side shows the same text. */
const fillBi = (v: Bi): Bi => ({ en: v.en.trim() || v.ar.trim(), ar: v.ar.trim() || v.en.trim() })

function BiFields({ label, value, onChange, multiline }: { label: string; value: Bi; onChange: (v: Bi) => void; multiline?: boolean }) {
  const { t } = useI18n()
  const Field = multiline ? Textarea : Input
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        {label} · {t('English', 'الإنجليزية')}
        <Field
          value={value.en}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, en: e.target.value })}
          dir="ltr"
          rows={multiline ? 4 : undefined}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {label} · {t('Arabic', 'العربية')}
        <Field
          value={value.ar}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, ar: e.target.value })}
          dir="rtl"
          rows={multiline ? 4 : undefined}
        />
      </label>
    </div>
  )
}

/**
 * 23 Nov (owner): which product and environment the comment is about. Agent 2 sets them (from the page the comment sits on, or by
 * reading it) with how sure it was; when it is not sure, the comment says "not classified" and the CX team or the CX manager choose.
 * A person's choice wins and is named; it feeds the product filter here and on the dashboard.
 */
function ClassificationBox({ m }: { m: PublicMention }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const classify = useClassifyMention()
  const me = users.find((u) => u.id === session?.userId)
  const canEdit = role.id === 'cxmgr' || role.id === 'cxteam'
  const by = me ? { en: me.name, ar: me.name } : role.name
  const missing = !m.productId || !m.environment
  const how = (src: 'page' | 'ai' | 'person' | 'none', conf?: number) =>
    src === 'page'
      ? t('from the page it sits on', 'من الصفحة التي نُشر عليها')
      : src === 'ai'
        ? t(`by Agent 2${conf ? `, ${Math.round(conf * 100)}% sure` : ''}`, `بواسطة الوكيل 2${conf ? `، متأكد ${Math.round(conf * 100)}%` : ''}`)
        : src === 'person'
          ? t(`by ${m.classifiedBy?.en ?? 'the CX team'}`, `بواسطة ${m.classifiedBy?.ar ?? 'فريق CX'}`)
          : t('Agent 2 could not tell', 'لم يستطع الوكيل 2 التحديد')
  const save = (patch: { productId?: ProductId | null; environment?: string }) =>
    classify.mutate(
      { id: m.id, ...patch, by },
      { onSuccess: () => toast(t('Saved. It now counts under this product on the dashboard.', 'حُفظ. يُحتسب الآن تحت هذا المنتج في اللوحة.')) },
    )

  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border p-3', missing && 'border-destructive/50')}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{t('What it is about', 'عن ماذا يتحدث')}</span>
        {missing && <StatusBadge tone="danger">{t('Needs a person to classify', 'يحتاج تصنيفاً من شخص')}</StatusBadge>}
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t('Product', 'المنتج')}
          <Select value={m.productId ?? ''} onValueChange={(v) => save({ productId: v as ProductId })} disabled={!canEdit}>
            <SelectTrigger aria-label={t('Product', 'المنتج')}>
              <SelectValue placeholder={t('Not classified: choose', 'غير مصنّف: اختر')} />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {L(p.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{m.productId ? how(m.productBy, m.productConfidence) : how('none')}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('Environment', 'البيئة')}
          <Select value={m.environment || ''} onValueChange={(v) => save({ environment: v })} disabled={!canEdit}>
            <SelectTrigger aria-label={t('Environment', 'البيئة')}>
              <SelectValue placeholder={t('Not classified: choose', 'غير مصنّف: اختر')} />
            </SelectTrigger>
            <SelectContent>
              {ENV_SHORTS.map((e) => (
                <SelectItem key={e} value={e}>
                  {L(envNameFromShort(e))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{m.environment ? how(m.envBy) : how('none')}</span>
        </label>
      </div>
      {lang && canEdit && (
        <span className="text-xs text-muted-foreground">
          {t(
            'A correction you make here is checked in the auditor’s weekly sample, so Agent 2 learns from it.',
            'أي تصحيح هنا يُراجع في العينة الأسبوعية للمدقق، ليتعلم منه الوكيل 2.',
          )}
        </span>
      )}
    </div>
  )
}
