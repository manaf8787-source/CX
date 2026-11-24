import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Download, Gift as GiftIcon, Mail, PackagePlus, Plus, Search, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Good } from '@/components/common/Trend'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { useAuditActor } from '@/auth/useAuditActor'
import { useUsers } from '@/data/users'
import { usePersonsAll } from '@/services/queries'
import { usePeopleFacts } from '@/components/customers/usePeopleFacts'
import { GiftFlow, customerJustification } from '@/components/gifts/GiftFlow'
import { envNameFromShort } from '@/data/environments'
import {
  CONTACT_LABEL,
  KIND_LABEL,
  REASON_LABEL,
  STATUS_LABEL,
  addStock,
  available,
  cancelGift,
  giftEmail,
  given,
  markDelivered,
  requestGift,
  saveItem,
  setAdminEmail,
  useGifts,
  type ContactMethod,
  type Gift,
  type GiftItem,
  type GiftKind,
  type GiftReason,
  type GiftStatus,
} from '@/data/gifts'
import { downloadCsv } from '@/utils/csv'
import type { Bi, Person } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { EmptyState } from '@/components/common/EmptyState'

type Tab = 'send' | 'approvals' | 'history' | 'inventory'

/**
 * Gifts (owner's request, 23 Nov): the CX manager and the CX team send a gift to any customer; the request is emailed to the
 * Administration team (no portal user needed), the stock goes down, and every gift stays in the history. Three tabs: Send a gift,
 * History, Inventory. The CX manager edits the inventory and the Administration email; the CX team sends and reads.
 */
export default function Gifts() {
  const { t } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const gs = useGifts()
  const waiting =
    role.id === 'cxmgr'
      ? gs.gifts.filter((x) => x.status === 'pending').length
      : gs.gifts.filter((x) => x.status === 'approved' && x.requestedById === session?.userId).length
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = raw === 'history' || raw === 'inventory' || raw === 'approvals' ? raw : 'send'
  const go = (v: string) => {
    const next = new URLSearchParams(params)
    next.set('tab', v)
    setParams(next, { replace: true })
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('Gifts', 'الهدايا')}
        description={t(
          'Send a gift to any customer: to recover an unhappy one, to thank a kind one, or on an occasion. The request is emailed to the Administration team with everything they need, and the gift comes out of the stock.',
          'أرسل هدية لأي عميل: لاستعادة عميل غير راضٍ، أو لشكر عميل لطيف، أو في مناسبة. يُرسل الطلب بالبريد إلى فريق الإدارة مع كل ما يحتاجونه، وتُخصم الهدية من المخزون.',
        )}
      />
      <Tabs value={tab} onValueChange={go} className="gap-4">
        <TabsList aria-label={t('Gifts', 'الهدايا')}>
          <TabsTrigger value="send">{t('Send a gift', 'أرسل هدية')}</TabsTrigger>
          <TabsTrigger value="approvals">
            {/* 24 Nov (owner): the CX team sends requests to the CX manager, so for them the tab is "My requests"; the CX manager approves */}
            {role.id === 'cxmgr' ? t('Approvals', 'الموافقات') : t('My requests', 'طلباتي')}
            {waiting > 0 && <span className="ms-1.5 rounded-full bg-foreground px-1.5 text-xs text-background tabular">{waiting}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">{t('History', 'السجل')}</TabsTrigger>
          <TabsTrigger value="inventory">{t('Inventory', 'المخزون')}</TabsTrigger>
        </TabsList>
        <TabsContent value="send">
          <SendTab onSent={() => go('history')} />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// --- Send a gift --------------------------------------------------------------------------------------------------------

const CONTACT_OF: Partial<Record<string, ContactMethod>> = { whatsapp: 'whatsapp', email: 'email', call: 'call', phone: 'call' }

function SendTab({ onSent }: { onSent: () => void }) {
  const { t, L, lang } = useI18n()
  const [params] = useSearchParams()
  const { session } = useAuth()
  const users = useUsers()
  const { log } = useAuditActor()
  const s = useGifts()
  const { data: persons } = usePersonsAll()
  const me = users.find((u) => u.id === session?.userId)
  const { role } = useRole()
  // 23 Nov (owner): the CX team asks the CX manager first; the CX manager sends directly
  const teamMode = role.id !== 'cxmgr'
  const { facts } = usePeopleFacts(persons)

  const [query, setQuery] = useState('')
  const [personId, setPersonId] = useState<string | null>(params.get('person'))
  const person = persons?.find((p) => p.id === personId)
  const [form, setForm] = useState(() => blankForm(params.get('ref') ?? ''))
  const [filledFor, setFilledFor] = useState<string | null>(null)
  const [sent, setSent] = useState<Gift | null>(null)

  // fill the contact fields from the CRM once, when a customer is picked (they stay editable)
  if (person && filledFor !== person.id) {
    setFilledFor(person.id)
    setForm((f) => ({
      ...f,
      fullName: person.name,
      phone: person.identity.mobile ?? '',
      email: person.identity.email ?? '',
      contactMethod: CONTACT_OF[person.preferredChannel] ?? 'call',
      address: person.residence ?? '',
    }))
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !persons) return []
    return persons
      .filter(
        (p) => p.name.toLowerCase().includes(q) || (p.identity.mobile ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) || p.id.toLowerCase() === q,
      )
      .slice(0, 8)
  }, [query, persons])

  const items = s.items.filter((i) => !i.archived)
  const item = items.find((i) => i.id === form.itemId)
  const stock = item ? available(s, item.id) : 0
  const qty = Math.max(1, Number(form.qty) || 1)
  const missing = [
    !form.fullName.trim() && t('full name', 'الاسم الكامل'),
    !form.phone.trim() && t('phone', 'الهاتف'),
    !form.address.trim() && t('address', 'العنوان'),
    !form.deliverOn && t('delivery day', 'يوم التوصيل'),
    !item && t('gift', 'الهدية'),
  ].filter(Boolean) as string[]
  const short = !!item && stock < qty

  const submit = () => {
    try {
      const gift = requestGift({
        personId: person?.id,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        contactMethod: form.contactMethod,
        address: form.address.trim(),
        deliverOn: form.deliverOn,
        deliverWindow: form.deliverWindow,
        itemId: form.itemId,
        qty,
        reason: form.reason,
        note: form.note.trim() || undefined,
        relatedRef: form.relatedRef.trim() || undefined,
        requestedBy: me?.name ?? 'CX team',
      })
      log('action', { en: `Requested gift ${gift.id} for a customer, emailed to Administration`, ar: `طلب الهدية ${gift.id} لعميل، أُرسلت للإدارة` }, '/gifts')
      toast(t(`Emailed to ${gift.emailedTo}. ${L(item!.name)}: ${stock - qty} left.`, `أُرسلت إلى ${gift.emailedTo}. ${L(item!.name)}: بقي ${stock - qty}.`))
      setSent(gift)
    } catch {
      toast(t('Not enough in stock.', 'لا يكفي المخزون.'))
    }
  }

  if (sent) {
    const email = giftEmail(
      sent,
      s.items.find((i) => i.id === sent.itemId),
      lang,
    )
    return (
      <div className="flex flex-col gap-4">
        <InlineNote tone="success" title={t('Request sent to the Administration team', 'أُرسل الطلب لفريق الإدارة')}>
          {t('This is the email they receive.', 'هذا هو البريد الذي يصلهم.')}
        </InlineNote>
        <EmailPreview email={email} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSent(null)
              setPersonId(null)
              setFilledFor(null)
              setQuery('')
              setForm(blankForm(''))
            }}
          >
            <Plus aria-hidden />
            {t('Send another gift', 'أرسل هدية أخرى')}
          </Button>
          <Button onClick={onSent}>{t('Open the history', 'افتح السجل')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <SectionCard
          title={t('1 · The customer', '1 · العميل')}
          description={t('Any customer we have: search by name or mobile.', 'أي عميل لدينا: ابحث بالاسم أو رقم الجوال.')}
        >
          {person ? (
            <div className="well flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-col">
                <Link to={`/customers/${person.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
                  {person.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {L(envNameFromShort(person.environment))} · {person.vip ? t('PSI Club', 'نادي PSI') : t('Customer', 'عميل')}
                  {person.identity.mobile && (
                    <>
                      {' · '}
                      <bdi dir="ltr">{person.identity.mobile}</bdi>
                    </>
                  )}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPersonId(null)
                  setFilledFor(null)
                }}
              >
                <X aria-hidden />
                {t('Change', 'غيّر')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Name or mobile', 'الاسم أو الجوال')}
                  className="ps-9"
                  aria-label={t('Find the customer', 'ابحث عن العميل')}
                />
              </div>
              {matches.length > 0 && (
                <ul className="flex flex-col divide-y rounded-xl border">
                  {matches.map((p: Person) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start hover:bg-muted/50"
                        onClick={() => setPersonId(p.id)}
                      >
                        <span className="text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {L(envNameFromShort(p.environment))} {p.identity.mobile && <bdi dir="ltr">· {p.identity.mobile}</bdi>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim() && matches.length === 0 && <p className="text-sm text-muted-foreground">{t('No customer found.', 'لم يُعثر على عميل.')}</p>}
              <p className="text-xs text-muted-foreground">
                {t('Not in the list? Fill the details below by hand.', 'ليس في القائمة؟ املأ البيانات أدناه يدوياً.')}
              </p>
            </div>
          )}
        </SectionCard>

        {teamMode ? (
          person ? (
            <GiftFlow
              relatedRef={`person:${person.id}`}
              person={person}
              reason={(facts.lastFeedback.get(person.id)?.score ?? 10) <= 6 ? 'recovery' : 'thanks'}
              justification={customerJustification(
                person,
                {
                  lastFeedback: facts.lastFeedback.get(person.id),
                  problems: facts.problems.get(person.id),
                  drifting: facts.drifting.get(person.id) ? L(facts.drifting.get(person.id)!.reason) : undefined,
                },
                lang,
              )}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('Pick the customer: you then ask the CX manager, and send it once approved.', 'اختر العميل: ثم تطلب موافقة مدير CX، وترسلها بعد الموافقة.')}
            </p>
          )
        ) : (
          <>
            <SectionCard
              title={t('2 · How the Administration team reaches them', '2 · كيف يصل إليه فريق الإدارة')}
              contentClassName="grid gap-3 sm:grid-cols-2"
            >
              <Field label={t('Full name', 'الاسم الكامل')}>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </Field>
              <Field label={t('Phone', 'الهاتف')}>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              </Field>
              <Field label={t('Email (optional)', 'البريد (اختياري)')}>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
              </Field>
              <Field label={t('Best way to reach them', 'أفضل طريقة للتواصل')}>
                <Select value={form.contactMethod} onValueChange={(v) => setForm({ ...form, contactMethod: v as ContactMethod })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONTACT_LABEL) as ContactMethod[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {L(CONTACT_LABEL[c])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('Delivery address', 'عنوان التوصيل')} className="sm:col-span-2">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t('Building, street, area, city', 'المبنى، الشارع، المنطقة، المدينة')}
                />
              </Field>
              <Field label={t('Deliver on', 'التوصيل يوم')}>
                <Input type="date" value={form.deliverOn} onChange={(e) => setForm({ ...form, deliverOn: e.target.value })} dir="ltr" />
              </Field>
              <Field label={t('Between', 'بين الساعات')}>
                <Select value={form.deliverWindow} onValueChange={(v) => setForm({ ...form, deliverWindow: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOWS.map((w) => (
                      <SelectItem key={w} value={w}>
                        <bdi dir="ltr">{w}</bdi>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </SectionCard>

            <SectionCard title={t('3 · The gift', '3 · الهدية')} contentClassName="grid gap-3 sm:grid-cols-2">
              <Field label={t('Gift', 'الهدية')}>
                <Select value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Choose from the stock', 'اختر من المخزون')} />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => {
                      const n = available(s, i.id)
                      return (
                        <SelectItem key={i.id} value={i.id} disabled={n <= 0}>
                          {L(i.name)} · {n > 0 ? t(`${n} left`, `بقي ${n}`) : t('out of stock', 'نفد')}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('Quantity', 'الكمية')}>
                <Input
                  type="number"
                  min={1}
                  max={stock || 1}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  dir="ltr"
                  className="w-28"
                />
              </Field>
              {item && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {L(KIND_LABEL[item.kind])} · {L(item.nature)}
                </p>
              )}
              <Field label={t('Why', 'السبب')}>
                <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v as GiftReason })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REASON_LABEL) as GiftReason[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {L(REASON_LABEL[r])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('Related to (optional)', 'مرتبط بـ (اختياري)')}>
                <Input
                  value={form.relatedRef}
                  onChange={(e) => setForm({ ...form, relatedRef: e.target.value })}
                  placeholder={t('e.g. PUB-312 or a case number', 'مثل PUB-312 أو رقم حالة')}
                  dir="ltr"
                />
              </Field>
              <Field label={t('Card message or a note for Administration (optional)', 'رسالة البطاقة أو ملاحظة للإدارة (اختياري)')} className="sm:col-span-2">
                <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} />
              </Field>
            </SectionCard>
          </>
        )}
      </div>

      {!teamMode && (
        <div className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <SectionCard title={t('Send', 'إرسال')} contentClassName="flex flex-col gap-3">
            <p className="text-sm">
              {t('Goes by email to', 'يُرسل بالبريد إلى')}{' '}
              <bdi dir="ltr" className="font-medium text-foreground">
                {s.adminEmail}
              </bdi>
            </p>
            {item && (
              <p className={cn('text-sm', short && 'text-destructive')}>
                {short
                  ? t(`Only ${stock} left of this gift.`, `بقي ${stock} فقط من هذه الهدية.`)
                  : t(`${stock} in stock; ${stock - qty} left after this.`, `${stock} في المخزون؛ يبقى ${stock - qty} بعد هذا.`)}
              </p>
            )}
            {missing.length > 0 && (
              <p className="text-xs text-muted-foreground">{t(`Still needed: ${missing.join(', ')}.`, `ما زال مطلوباً: ${missing.join('، ')}.`)}</p>
            )}
            <Button disabled={missing.length > 0 || short} onClick={submit}>
              <Mail aria-hidden />
              {t('Email the request to Administration', 'أرسل الطلب للإدارة بالبريد')}
            </Button>
          </SectionCard>
          {form.fullName && item && form.deliverOn && (
            <EmailPreview
              email={giftEmail(
                {
                  ...form,
                  id: 'GF-…',
                  qty,
                  email: form.email || undefined,
                  note: form.note || undefined,
                  requestedBy: me?.name ?? 'CX team',
                  requestedAt: '',
                  emailedTo: s.adminEmail,
                  status: 'sent',
                },
                item,
                lang,
              )}
              compact
            />
          )}
        </div>
      )}
    </div>
  )
}

const WINDOWS = ['09:00–12:00', '10:00–13:00', '12:00–15:00', '15:00–18:00', '18:00–21:00']
const blankForm = (relatedRef: string) => ({
  fullName: '',
  phone: '',
  email: '',
  contactMethod: 'call' as ContactMethod,
  address: '',
  deliverOn: '',
  deliverWindow: WINDOWS[1],
  itemId: '',
  qty: '1',
  reason: 'recovery' as GiftReason,
  note: '',
  relatedRef,
})

function EmailPreview({ email, compact }: { email: { to: string; subject: string; body: string }; compact?: boolean }) {
  const { t } = useI18n()
  return (
    <SectionCard title={compact ? t('The email, as it will go', 'البريد كما سيُرسل') : undefined} contentClassName="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {t('To', 'إلى')}: <bdi dir="ltr">{email.to}</bdi>
      </p>
      <p className="text-sm font-medium text-foreground">{email.subject}</p>
      <pre className={cn('whitespace-pre-wrap font-sans text-sm', compact && 'text-xs')}>{email.body}</pre>
    </SectionCard>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm', className)}>
      {label}
      {children}
    </label>
  )
}

// --- History --------------------------------------------------------------------------------------------------------------

function HistoryTab() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { log } = useAuditActor()
  const s = useGifts()
  const [status, setStatus] = useState<'all' | GiftStatus>('all')
  const [year, setYear] = useState('all')
  const [open, setOpen] = useState<string | null>(null)
  const years = [...new Set(s.gifts.filter((x) => x.deliverOn).map((x) => x.deliverOn.slice(0, 4)))].sort().reverse()
  const list = s.gifts
    .filter((x) => x.status === 'sent' || x.status === 'delivered' || x.status === 'cancelled')
    .filter((x) => (status === 'all' || x.status === status) && (year === 'all' || x.deliverOn.startsWith(year)))
    .sort((a, b) => b.deliverOn.localeCompare(a.deliverOn))
  const itemOf = (id: string) => s.items.find((i) => i.id === id)
  const delivered = list.filter((x) => x.status === 'delivered')
  const value = delivered.reduce((n, x) => n + (itemOf(x.itemId)?.unitValue ?? 0) * x.qty, 0)
  const fmt = (d: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))

  const exportCsv = () => {
    downloadCsv(
      `gifts-${year}.csv`,
      list.map((x) => ({
        [t('Reference', 'المرجع')]: x.id,
        [t('Deliver on', 'التوصيل')]: x.deliverOn,
        [t('Recipient', 'المستلم')]: x.fullName,
        [t('Phone', 'الهاتف')]: x.phone,
        [t('Gift', 'الهدية')]: L(itemOf(x.itemId)?.name ?? { en: x.itemId, ar: x.itemId }),
        [t('Quantity', 'الكمية')]: x.qty,
        [t('Why', 'السبب')]: L(REASON_LABEL[x.reason]),
        [t('Requested by', 'طلبها')]: x.requestedBy,
        [t('Status', 'الحالة')]: L(STATUS_LABEL[x.status]),
        [t('Related to', 'مرتبط بـ')]: x.relatedRef ?? '',
      })),
    )
    log('action', { en: 'Exported the gift history', ar: 'صدّر سجل الهدايا' }, '/gifts')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t('Gifts', 'الهدايا')} value={list.length} />
        <KpiTile label={t('Delivered', 'سُلّمت')} value={<Good>{delivered.length}</Good>} />
        <KpiTile label={t('Waiting for delivery', 'بانتظار التسليم')} value={list.filter((x) => x.status === 'sent').length} />
        <KpiTile label={t('Value delivered', 'قيمة ما سُلّم')} value={<bdi dir="ltr">{`AED ${value.toLocaleString('en-US')}`}</bdi>} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          variant="pressed"
          label={t('Status', 'الحالة')}
          value={status}
          onValueChange={(v) => setStatus(v as 'all' | GiftStatus)}
          options={[
            { value: 'all', label: t('All', 'الكل') },
            { value: 'sent', label: t('Waiting', 'بانتظار التسليم') },
            { value: 'delivered', label: L(STATUS_LABEL.delivered) },
            { value: 'cancelled', label: L(STATUS_LABEL.cancelled) },
          ]}
        />
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-32" aria-label={t('Year', 'السنة')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All years', 'كل السنوات')}</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!list.length}>
          <Download aria-hidden />
          {t('Export CSV', 'تصدير CSV')}
        </Button>
      </div>
      {list.length === 0 ? (
        <EmptyState title={t('No gifts match.', 'لا هدايا مطابقة.')} />
      ) : (
        <SectionCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Deliver on', 'التوصيل')}</TableHead>
                <TableHead>{t('Recipient', 'المستلم')}</TableHead>
                <TableHead>{t('Gift', 'الهدية')}</TableHead>
                <TableHead>{t('Why', 'السبب')}</TableHead>
                <TableHead>{t('Requested by', 'طلبها')}</TableHead>
                <TableHead>{t('Status', 'الحالة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((x) => {
                const it = itemOf(x.itemId)
                const isOpen = open === x.id
                return (
                  <TableRow key={x.id} className="cursor-pointer align-top" onClick={() => setOpen(isOpen ? null : x.id)}>
                    <TableCell className="tabular">
                      <bdi dir="ltr">{fmt(x.deliverOn)}</bdi>
                      <span className="block text-xs text-muted-foreground">
                        <bdi dir="ltr">{x.deliverWindow}</bdi>
                      </span>
                    </TableCell>
                    <TableCell className="min-w-40 whitespace-normal">
                      {x.personId ? (
                        <Link
                          to={`/customers/${x.personId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {x.fullName}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{x.fullName}</span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        <bdi dir="ltr">{x.phone}</bdi> · {L(CONTACT_LABEL[x.contactMethod])}
                      </span>
                      {isOpen && (
                        <div className="mt-2 flex flex-col gap-1 text-xs">
                          <span>{x.address}</span>
                          {x.note && <span>“{x.note}”</span>}
                          {x.justification && <span className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2">{x.justification}</span>}
                          {x.approvedBy && <span>{t(`Approved by ${x.approvedBy}`, `وافق ${x.approvedBy}`)}</span>}
                          {x.relatedRef && <span>{t(`Related to ${x.relatedRef}`, `مرتبط بـ ${x.relatedRef}`)}</span>}
                          <span className="text-muted-foreground">
                            {t('Emailed to', 'أُرسل إلى')} <bdi dir="ltr">{x.emailedTo}</bdi> · <bdi dir="ltr">{fmt(x.requestedAt)}</bdi>
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {it ? L(it.name) : x.itemId} {x.qty > 1 && <span className="tabular">× {x.qty}</span>}
                    </TableCell>
                    <TableCell className="min-w-32 whitespace-normal text-sm">{L(REASON_LABEL[x.reason])}</TableCell>
                    <TableCell>{x.requestedBy}</TableCell>
                    <TableCell>
                      <span className="flex flex-col items-start gap-1.5">
                        <StatusBadge tone={x.status === 'delivered' ? 'success' : x.status === 'cancelled' ? 'neutral' : 'warning'}>
                          {L(STATUS_LABEL[x.status])}
                        </StatusBadge>
                        {x.status === 'sent' && (role.id === 'cxmgr' || role.id === 'cxteam') && (
                          <span className="flex gap-1">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                markDelivered(x.id)
                                toast(t('Marked delivered.', 'عُلّمت كمسلّمة.'))
                              }}
                            >
                              <Check aria-hidden />
                              {t('Delivered', 'سُلّمت')}
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelGift(x.id)
                                toast(t('Cancelled; the gift is back in the stock.', 'أُلغيت؛ عادت الهدية للمخزون.'))
                              }}
                            >
                              {t('Cancel', 'إلغاء')}
                            </Button>
                          </span>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </div>
  )
}

// --- Inventory ------------------------------------------------------------------------------------------------------------

function InventoryTab() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const { log } = useAuditActor()
  const s = useGifts()
  const canEdit = role.id === 'cxmgr'
  const me = users.find((u) => u.id === session?.userId)?.name ?? 'CX manager'
  const [adding, setAdding] = useState(false)
  const [restock, setRestock] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('5')
  const [mail, setMail] = useState(s.adminEmail)
  const items = s.items.filter((i) => !i.archived)
  const low = items.filter((i) => available(s, i.id) <= i.lowAt)

  return (
    <div className="flex flex-col gap-4">
      {low.length > 0 && (
        <InlineNote tone="warning" title={t('Running low', 'على وشك النفاد')}>
          {low.map((i) => `${L(i.name)} (${available(s, i.id)})`).join(' · ')}
        </InlineNote>
      )}
      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t('Administration team email (requests go here)', 'بريد فريق الإدارة (تُرسل الطلبات إليه)')}
            <Input value={mail} onChange={(e) => setMail(e.target.value)} className="h-9 w-72" dir="ltr" />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={mail === s.adminEmail || !/^\S+@\S+\.\S+$/.test(mail)}
            onClick={() => {
              setAdminEmail(mail.trim())
              log('action', { en: `Changed the gift requests email to ${mail.trim()}`, ar: `غيّر بريد طلبات الهدايا إلى ${mail.trim()}` }, '/gifts')
              toast(t('Saved.', 'حُفظ.'))
            }}
          >
            {t('Save', 'احفظ')}
          </Button>
          <span className="flex-1" />
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {t('Add a gift item', 'أضف صنف هدية')}
          </Button>
        </div>
      ) : (
        <InlineNote tone="neutral">
          {t('The CX manager adds items and stock. You can see what is available.', 'مدير CX يضيف الأصناف والمخزون. يمكنك رؤية المتوفر.')}
        </InlineNote>
      )}
      {adding && <ItemForm by={me} onClose={() => setAdding(false)} />}
      <SectionCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Item', 'الصنف')}</TableHead>
              <TableHead>{t('Type', 'النوع')}</TableHead>
              <TableHead className="text-end">{t('Value (AED)', 'القيمة (درهم)')}</TableHead>
              <TableHead className="text-end">{t('Received', 'المستلم')}</TableHead>
              <TableHead className="text-end">{t('Given', 'الموزَّع')}</TableHead>
              <TableHead className="text-end">{t('Available', 'المتوفر')}</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => {
              const n = available(s, i.id)
              const received = s.moves.filter((m) => m.itemId === i.id).reduce((a, m) => a + m.qty, 0)
              return (
                <TableRow key={i.id}>
                  <TableCell className="min-w-44 whitespace-normal">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <GiftIcon aria-hidden className="size-4 text-muted-foreground" />
                      {L(i.name)}
                    </span>
                    <span className="block text-xs text-muted-foreground">{L(i.nature)}</span>
                    {restock === i.id && (
                      <span className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={restockQty}
                          onChange={(e) => setRestockQty(e.target.value)}
                          className="h-8 w-20"
                          dir="ltr"
                          aria-label={t('Units received', 'الوحدات المستلمة')}
                        />
                        <Button
                          size="xs"
                          disabled={!(Number(restockQty) > 0)}
                          onClick={() => {
                            addStock(i.id, Number(restockQty), me, 'Restock')
                            log(
                              'action',
                              { en: `Added ${restockQty} to the gift stock: ${i.name.en}`, ar: `أضاف ${restockQty} إلى مخزون الهدايا: ${i.name.ar}` },
                              '/gifts',
                            )
                            toast(t('Stock added.', 'أُضيف المخزون.'))
                            setRestock(null)
                          }}
                        >
                          {t('Add', 'أضف')}
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setRestock(null)}>
                          {t('Cancel', 'إلغاء')}
                        </Button>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{L(KIND_LABEL[i.kind])}</TableCell>
                  <TableCell className="tabular text-end">{i.unitValue ?? '–'}</TableCell>
                  <TableCell className="tabular text-end">{received}</TableCell>
                  <TableCell className="tabular text-end">{given(s, i.id)}</TableCell>
                  <TableCell className="text-end">
                    <StatusBadge tone={n <= 0 ? 'danger' : n <= i.lowAt ? 'warning' : 'success'}>{n}</StatusBadge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button size="xs" variant="outline" onClick={() => setRestock(i.id)}>
                        <PackagePlus aria-hidden />
                        {t('Add stock', 'أضف مخزوناً')}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
      <p className="text-xs text-muted-foreground">
        {t(
          'Available = received − given. A request takes the gift out of the stock at once; a cancelled request puts it back.',
          'المتوفر = المستلم − الموزَّع. الطلب يخصم الهدية من المخزون فوراً؛ والطلب الملغى يعيدها.',
        )}
      </p>
    </div>
  )
}

function ItemForm({ by, onClose }: { by: string; onClose: () => void }) {
  const { t } = useI18n()
  const { log } = useAuditActor()
  const [name, setName] = useState<Bi>({ en: '', ar: '' })
  const [nature, setNature] = useState<Bi>({ en: '', ar: '' })
  const [kind, setKind] = useState<GiftKind>('physical')
  const [value, setValue] = useState('')
  const [stock, setStock] = useState('10')
  const [lowAt, setLowAt] = useState('2')
  const fill = (v: Bi): Bi => ({ en: v.en.trim() || v.ar.trim(), ar: v.ar.trim() || v.en.trim() })
  const valid = !!(name.en.trim() || name.ar.trim())
  return (
    <SectionCard title={t('New gift item', 'صنف هدية جديد')} contentClassName="grid gap-3 sm:grid-cols-2">
      <Field label={t('Name · English', 'الاسم · الإنجليزية')}>
        <Input value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('Name · Arabic', 'الاسم · العربية')}>
        <Input value={name.ar} onChange={(e) => setName({ ...name, ar: e.target.value })} dir="rtl" />
      </Field>
      <Field label={t('What it is · English', 'طبيعته · الإنجليزية')}>
        <Input value={nature.en} onChange={(e) => setNature({ ...nature, en: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('What it is · Arabic', 'طبيعته · العربية')}>
        <Input value={nature.ar} onChange={(e) => setNature({ ...nature, ar: e.target.value })} dir="rtl" />
      </Field>
      <Field label={t('Type', 'النوع')}>
        <Select value={kind} onValueChange={(v) => setKind(v as GiftKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABEL) as GiftKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {t(KIND_LABEL[k].en, KIND_LABEL[k].ar)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t('Value of one, AED (optional)', 'قيمة الواحدة بالدرهم (اختياري)')}>
        <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" />
      </Field>
      <Field label={t('Units in stock now', 'الوحدات المتوفرة الآن')}>
        <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} dir="ltr" />
      </Field>
      <Field label={t('Warn when it falls to', 'نبّه عندما ينخفض إلى')}>
        <Input type="number" min={0} value={lowAt} onChange={(e) => setLowAt(e.target.value)} dir="ltr" />
      </Field>
      <span className="flex gap-2 sm:col-span-2">
        <Button
          size="sm"
          disabled={!valid}
          onClick={() => {
            const item: Omit<GiftItem, 'id'> = {
              name: fill(name),
              nature: fill(nature),
              kind,
              unitValue: value ? Number(value) : undefined,
              lowAt: Math.max(0, Number(lowAt) || 0),
            }
            saveItem(item, Math.max(0, Number(stock) || 0), by)
            log('action', { en: `Added the gift item ${item.name.en}`, ar: `أضاف صنف الهدية ${item.name.ar}` }, '/gifts')
            toast(t('Item added.', 'أُضيف الصنف.'))
            onClose()
          }}
        >
          {t('Save', 'احفظ')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('Cancel', 'إلغاء')}
        </Button>
      </span>
    </SectionCard>
  )
}

// --- Approvals -------------------------------------------------------------------------------------------------------------

/**
 * 23 Nov (owner): the requests between the CX team and the CX manager. The CX manager approves or rejects; the member who asked sends the
 * approved ones. Each card is the same workflow as on the comment or the customer, so it can be done from here too.
 */
function ApprovalsTab() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const s = useGifts()
  const { data: persons } = usePersonsAll()
  const isManager = role.id === 'cxmgr'
  // 24 Nov: an inbox row opens the approvals with that gift (?gift=) scrolled to and ringed
  const [params] = useSearchParams()
  const focus = params.get('gift')
  useEffect(() => {
    if (!focus) return
    const id = window.setTimeout(() => document.getElementById(`gift-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
    return () => window.clearTimeout(id)
  }, [focus])
  const open = s.gifts
    .filter((x) => x.status === 'pending' || x.status === 'approved' || x.status === 'rejected')
    .filter((x) => isManager || x.requestedById === session?.userId)
    .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.requestedAt.localeCompare(a.requestedAt))
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
  if (!open.length)
    return (
      <EmptyState
        title={
          isManager ? t('No gift waiting for your approval.', 'لا هدايا بانتظار موافقتك.') : t('You have no gift request open.', 'لا طلبات هدايا مفتوحة لديك.')
        }
      />
    )
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {open.map((x) => {
        const person = persons?.find((p) => p.id === x.personId)
        const ref = x.relatedRef ?? x.id
        const fromMention = ref.startsWith('PUB-')
        return (
          <div key={x.id} id={`gift-${x.id}`} className={cn('scroll-mt-24 rounded-[inherit]', focus === x.id && 'rounded-2xl ring-selected')}>
            <SectionCard
              title={x.fullName || (fromMention ? t('A public commenter', 'صاحب تعليق عام') : t('Customer', 'عميل'))}
              description={
                <span>
                  {fmt(x.requestedAt)} · {L(REASON_LABEL[x.reason])} ·{' '}
                  {fromMention ? (
                    <Link to={`/settings/public-mentions?open=${ref}`} className="underline underline-offset-2">
                      {t(`Public comment ${ref}`, `التعليق العام ${ref}`)}
                    </Link>
                  ) : person ? (
                    <Link to={`/customers/${person.id}`} className="underline underline-offset-2">
                      {t('Customer record', 'سجل العميل')}
                    </Link>
                  ) : null}
                </span>
              }
            >
              <GiftFlow relatedRef={ref} person={person} fullName={x.fullName} justification={x.justification ?? ''} reason={x.reason} />
            </SectionCard>
          </div>
        )
      })}
    </div>
  )
}
