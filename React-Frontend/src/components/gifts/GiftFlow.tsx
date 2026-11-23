import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Gift as GiftIcon, Mail, Send, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { useAuditActor } from '@/auth/useAuditActor'
import { useUsers } from '@/data/users'
import {
  CONTACT_LABEL,
  REASON_LABEL,
  STATUS_LABEL,
  available,
  decideGift,
  giftEmail,
  proposeGift,
  sendApproved,
  useGifts,
  type ContactMethod,
  type Gift,
  type GiftReason,
} from '@/data/gifts'
import type { Person } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'

/**
 * The gift workflow in place (owner, 23 Nov), so nobody has to leave the comment or the customer to do it:
 * 1. A CX team member marks the customer "eligible for a gift"; the justification is written from the experience on record and can be edited.
 * 2. The CX manager approves (choosing the gift if none was chosen) or rejects, with a note. The member sees the answer here and in the inbox.
 * 3. Once approved, the member fills the delivery details right here and it is emailed to Administration; the stock goes down.
 * The CX manager's own requests skip step 2.
 */
export const WINDOWS = ['09:00–12:00', '10:00–13:00', '12:00–15:00', '15:00–18:00', '18:00–21:00']
const CONTACT_OF: Partial<Record<string, ContactMethod>> = { whatsapp: 'whatsapp', email: 'email', call: 'call', phone: 'call' }

export function GiftFlow({
  relatedRef,
  person,
  fullName,
  justification,
  reason,
  className,
}: {
  /** What the gift answers: a public comment id, or the customer id. */
  relatedRef: string
  person?: Person
  fullName?: string
  /** Written from the record; the member can edit it. */
  justification: string
  reason: GiftReason
  className?: string
}) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const { log } = useAuditActor()
  const s = useGifts()
  const me = users.find((u) => u.id === session?.userId)
  const isManager = role.id === 'cxmgr'
  const canAct = isManager || role.id === 'cxteam'
  const existing = s.gifts.filter((x) => x.relatedRef === relatedRef).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0]
  const [asking, setAsking] = useState(false)
  const [itemId, setItemId] = useState('')
  const [why, setWhy] = useState<GiftReason>(reason)
  const [text, setText] = useState(justification)
  const [note, setNote] = useState('')
  const items = s.items.filter((i) => !i.archived)

  if (!canAct) return null

  const ask = () => {
    const g = proposeGift({
      personId: person?.id,
      fullName: person?.name ?? fullName,
      itemId: itemId || undefined,
      reason: why,
      justification: text.trim(),
      relatedRef,
      requestedBy: me?.name ?? 'CX team',
      requestedById: session?.userId,
      byManager: isManager,
    })
    log(
      'action',
      { en: `Marked eligible for a gift (${g.id}), ${isManager ? 'approved' : 'sent to the CX manager'}`, ar: `علّم مؤهلاً لهدية (${g.id})` },
      '/gifts',
    )
    toast(
      isManager
        ? t('Approved. Fill the delivery details.', 'تمت الموافقة. املأ بيانات التوصيل.')
        : t('Sent to the CX manager for approval.', 'أُرسل لمدير CX للموافقة.'),
    )
    setAsking(false)
  }

  const head = (
    <span className="flex items-center gap-2 font-medium text-foreground">
      <GiftIcon aria-hidden className="size-4" />
      {t('Gift', 'هدية')}
    </span>
  )

  // nothing yet, or the last one was rejected or cancelled: offer to ask
  if (!existing || existing.status === 'rejected' || existing.status === 'cancelled') {
    return (
      <div className={cn('flex flex-col gap-3 rounded-xl border p-3', className)}>
        <span className="flex flex-wrap items-center justify-between gap-2">
          {head}
          {!asking && (
            <Button size="sm" variant="outline" onClick={() => setAsking(true)}>
              <GiftIcon aria-hidden />
              {t('Eligible for a gift', 'مؤهل لهدية')}
            </Button>
          )}
        </span>
        {existing?.status === 'rejected' && !asking && (
          <p className="text-xs text-muted-foreground">
            {t(`Not approved by ${existing.approvedBy}`, `لم يوافق ${existing.approvedBy}`)}
            {existing.decisionNote && `: “${existing.decisionNote}”`}
          </p>
        )}
        {asking && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                {t('Gift (the CX manager can choose)', 'الهدية (يمكن لمدير CX أن يختار)')}
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Let the CX manager choose', 'اترك الاختيار لمدير CX')} />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id} disabled={available(s, i.id) <= 0}>
                        {L(i.name)} · {t(`${available(s, i.id)} left`, `بقي ${available(s, i.id)}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('Why', 'السبب')}
                <Select value={why} onValueChange={(v) => setWhy(v as GiftReason)}>
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
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              {t('Justification (written from the record; edit it if needed)', 'المبرر (مكتوب من السجل؛ عدّله إن لزم)')}
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
            </label>
            <span className="flex gap-2">
              <Button size="sm" disabled={!text.trim()} onClick={ask}>
                <Send aria-hidden />
                {isManager ? t('Approve and continue', 'وافق وتابع') : t('Send to the CX manager', 'أرسل لمدير CX')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
                {t('Cancel', 'إلغاء')}
              </Button>
            </span>
          </>
        )}
      </div>
    )
  }

  const item = s.items.find((i) => i.id === existing.itemId)
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border p-3', className)}>
      <span className="flex flex-wrap items-center justify-between gap-2">
        {head}
        <StatusBadge tone={existing.status === 'pending' ? 'warning' : existing.status === 'approved' ? 'info' : 'success'}>
          {L(STATUS_LABEL[existing.status])}
        </StatusBadge>
      </span>
      <p className="text-xs text-muted-foreground">
        {t(`Asked by ${existing.requestedBy}`, `طلبها ${existing.requestedBy}`)}
        {existing.approvedBy && existing.status !== 'pending' && t(` · approved by ${existing.approvedBy}`, ` · وافق ${existing.approvedBy}`)}
        {item && ` · ${L(item.name)}`}
      </p>
      {existing.justification && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-sm">{existing.justification}</p>}
      {existing.decisionNote && <p className="text-xs">{t(`CX manager: “${existing.decisionNote}”`, `مدير CX: “${existing.decisionNote}”`)}</p>}

      {existing.status === 'pending' &&
        (isManager ? (
          <div className="flex flex-col gap-2">
            {!existing.itemId && (
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger aria-label={t('Choose the gift', 'اختر الهدية')}>
                  <SelectValue placeholder={t('Choose the gift', 'اختر الهدية')} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id} disabled={available(s, i.id) <= 0}>
                      {L(i.name)} · {t(`${available(s, i.id)} left`, `بقي ${available(s, i.id)}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Note to the team (optional)', 'ملاحظة للفريق (اختياري)')} />
            <span className="flex gap-2">
              <Button
                size="sm"
                disabled={!existing.itemId && !itemId}
                onClick={() => {
                  decideGift(existing.id, true, me?.name ?? 'CX manager', note.trim() || undefined, itemId)
                  log('action', { en: `Approved gift ${existing.id}`, ar: `وافق على الهدية ${existing.id}` }, '/gifts')
                  toast(t(`Approved. ${existing.requestedBy} is told in the inbox.`, `تمت الموافقة. يصل الإشعار إلى ${existing.requestedBy} في صندوقه.`))
                }}
              >
                <Check aria-hidden />
                {t('Approve', 'موافقة')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  decideGift(existing.id, false, me?.name ?? 'CX manager', note.trim() || undefined)
                  log('action', { en: `Did not approve gift ${existing.id}`, ar: `لم يوافق على الهدية ${existing.id}` }, '/gifts')
                  toast(t('Not approved.', 'لم تتم الموافقة.'))
                }}
              >
                <X aria-hidden />
                {t('Reject', 'رفض')}
              </Button>
            </span>
          </div>
        ) : (
          <p className="text-sm">
            {t('Waiting for the CX manager. You will see the answer here and in your inbox.', 'بانتظار مدير CX. سترى الرد هنا وفي صندوقك.')}
          </p>
        ))}

      {existing.status === 'approved' && <GiftSendForm gift={existing} person={person} />}

      {(existing.status === 'sent' || existing.status === 'delivered') && (
        <p className="text-sm">
          <Mail aria-hidden className="me-1 inline size-3.5" />
          {t(
            `Emailed to ${existing.emailedTo}: deliver on ${existing.deliverOn}, ${existing.deliverWindow}.`,
            `أُرسلت إلى ${existing.emailedTo}: التوصيل يوم ${existing.deliverOn}، ${existing.deliverWindow}.`,
          )}
        </p>
      )}
    </div>
  )
}

/** Step 3: the delivery details of an approved request, filled from the CRM when the customer is known, then emailed to Administration. */
export function GiftSendForm({ gift, person, onSent }: { gift: Gift; person?: Person; onSent?: (g: Gift) => void }) {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const s = useGifts()
  const [f, setF] = useState({
    fullName: gift.fullName || person?.name || '',
    phone: gift.phone || person?.identity.mobile || '',
    email: gift.email ?? person?.identity.email ?? '',
    contactMethod: (person ? (CONTACT_OF[person.preferredChannel] ?? 'call') : gift.contactMethod) as ContactMethod,
    address: gift.address || person?.residence || '',
    deliverOn: gift.deliverOn,
    deliverWindow: gift.deliverWindow || WINDOWS[1],
    itemId: gift.itemId,
    qty: String(gift.qty || 1),
    note: gift.note ?? '',
  })
  const item = s.items.find((i) => i.id === f.itemId)
  const qty = Math.max(1, Number(f.qty) || 1)
  const stock = item ? available(s, item.id) : 0
  const ready = f.fullName.trim() && f.phone.trim() && f.address.trim() && f.deliverOn && item && stock >= qty
  const details = {
    fullName: f.fullName.trim(),
    phone: f.phone.trim(),
    email: f.email.trim() || undefined,
    contactMethod: f.contactMethod,
    address: f.address.trim(),
    deliverOn: f.deliverOn,
    deliverWindow: f.deliverWindow,
    itemId: f.itemId,
    qty,
    note: f.note.trim() || undefined,
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="t-small text-muted-foreground">{t('Delivery details for Administration', 'بيانات التوصيل لفريق الإدارة')}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label={t('Full name', 'الاسم الكامل')}
          placeholder={t('Full name', 'الاسم الكامل')}
          value={f.fullName}
          onChange={(e) => setF({ ...f, fullName: e.target.value })}
        />
        <Input
          aria-label={t('Phone', 'الهاتف')}
          placeholder={t('Phone', 'الهاتف')}
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
          dir="ltr"
        />
        <Input
          aria-label={t('Email (optional)', 'البريد (اختياري)')}
          placeholder={t('Email (optional)', 'البريد (اختياري)')}
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          dir="ltr"
        />
        <Select value={f.contactMethod} onValueChange={(v) => setF({ ...f, contactMethod: v as ContactMethod })}>
          <SelectTrigger aria-label={t('Best way to reach them', 'أفضل طريقة للتواصل')}>
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
        <Input
          className="sm:col-span-2"
          aria-label={t('Delivery address', 'عنوان التوصيل')}
          placeholder={t('Delivery address', 'عنوان التوصيل')}
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
        />
        <Input
          type="date"
          aria-label={t('Deliver on', 'التوصيل يوم')}
          value={f.deliverOn}
          onChange={(e) => setF({ ...f, deliverOn: e.target.value })}
          dir="ltr"
        />
        <Select value={f.deliverWindow} onValueChange={(v) => setF({ ...f, deliverWindow: v })}>
          <SelectTrigger aria-label={t('Between', 'بين الساعات')}>
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
        <Select value={f.itemId} onValueChange={(v) => setF({ ...f, itemId: v })}>
          <SelectTrigger aria-label={t('Gift', 'الهدية')}>
            <SelectValue placeholder={t('Gift', 'الهدية')} />
          </SelectTrigger>
          <SelectContent>
            {s.items
              .filter((i) => !i.archived)
              .map((i) => (
                <SelectItem key={i.id} value={i.id} disabled={available(s, i.id) <= 0}>
                  {L(i.name)} · {t(`${available(s, i.id)} left`, `بقي ${available(s, i.id)}`)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Input type="number" min={1} aria-label={t('Quantity', 'الكمية')} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} dir="ltr" />
        <Textarea
          className="sm:col-span-2"
          rows={2}
          aria-label={t('Card message or a note for Administration', 'رسالة البطاقة أو ملاحظة للإدارة')}
          placeholder={t('Card message or a note for Administration (optional)', 'رسالة البطاقة أو ملاحظة للإدارة (اختياري)')}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </div>
      {item && stock < qty && <p className="text-xs text-destructive">{t(`Only ${stock} left.`, `بقي ${stock} فقط.`)}</p>}
      <Button
        size="sm"
        className="w-fit"
        disabled={!ready}
        onClick={() => {
          try {
            const sent = sendApproved(gift.id, details)
            log('action', { en: `Emailed gift ${gift.id} to Administration`, ar: `أرسل الهدية ${gift.id} لفريق الإدارة` }, '/gifts')
            const email = giftEmail(sent, item, lang)
            toast(t(`Emailed to ${email.to}. ${L(item!.name)}: ${stock - qty} left.`, `أُرسلت إلى ${email.to}. ${L(item!.name)}: بقي ${stock - qty}.`))
            onSent?.(sent)
          } catch {
            toast(t('Not enough in stock.', 'لا يكفي المخزون.'))
          }
        }}
      >
        <Mail aria-hidden />
        {t('Email it to Administration', 'أرسلها لفريق الإدارة')}
      </Button>
    </div>
  )
}

// --- the justification, written from the record ---------------------------------------------------------------------------

/** From a public comment: where, when, what was said, how it was classified and how we answered. */
export function mentionJustification(
  m: { platform: string; date: string; text: string; sentiment: number; replied: boolean; replyHours: number | null; repliedBy?: { en: string; ar: string } },
  where: string,
  platformName: string,
  lang: 'en' | 'ar',
): string {
  const neg = m.sentiment < 0
  if (lang === 'ar') {
    return [
      `${neg ? 'تعليق عام سلبي' : m.sentiment > 0 ? 'تعليق عام إيجابي' : 'تعليق عام'} على ${platformName} (${where}) بتاريخ ${m.date}:`,
      `“${m.text}”`,
      neg ? 'صنّفه الوكيل 2 سلبياً: عميل غير راضٍ (منتقد).' : m.sentiment > 0 ? 'صنّفه الوكيل 2 إيجابياً: نشكره على كلامه.' : 'صنّفه الوكيل 2 محايداً.',
      m.replied ? `رددنا علناً بعد ${m.replyHours ?? '–'} ساعة${m.repliedBy ? ` (${m.repliedBy.ar})` : ''}.` : 'لم نرد عليه بعد.',
    ].join('\n')
  }
  return [
    `${neg ? 'Negative' : m.sentiment > 0 ? 'Positive' : 'Neutral'} public comment on ${platformName} (${where}), ${m.date}:`,
    `“${m.text}”`,
    neg
      ? 'Classified negative by Agent 2: an unhappy customer (a detractor).'
      : m.sentiment > 0
        ? 'Classified positive by Agent 2: we thank them for it.'
        : 'Classified neutral by Agent 2.',
    m.replied ? `We replied publicly after ${m.replyHours ?? '–'} h${m.repliedBy ? ` (${m.repliedBy.en})` : ''}.` : 'Not replied yet.',
  ].join('\n')
}

/** From the customer's record: the last score, the problems found, whether they are drifting away, VIP. */
export function customerJustification(
  p: Person,
  facts: { lastFeedback?: { score: number; at: string; tone: 'positive' | 'negative' }; problems?: number; drifting?: string },
  lang: 'en' | 'ar',
): string {
  const fb = facts.lastFeedback
  const day = fb?.at.slice(0, 10)
  if (lang === 'ar') {
    return [
      `${p.name}، ${p.environment}${p.vip ? '، عضو نادي PSI' : ''}.`,
      fb ? `آخر تقييم: ${fb.score} من 10 بتاريخ ${day} (${fb.score <= 6 ? 'منتقد' : fb.score >= 9 ? 'مروّج' : 'محايد'}).` : 'لا تقييم مسجّل بعد.',
      facts.problems ? `مشاكل وُجدت في رحلته: ${facts.problems}.` : '',
      facts.drifting ? `يبتعد عنا: ${facts.drifting}.` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `${p.name}, ${p.environment}${p.vip ? ', PSI Club member' : ''}.`,
    fb ? `Last score: ${fb.score} out of 10 on ${day} (${fb.score <= 6 ? 'detractor' : fb.score >= 9 ? 'promoter' : 'passive'}).` : 'No score on record yet.',
    facts.problems ? `Problems found on their journey: ${facts.problems}.` : '',
    facts.drifting ? `Drifting away: ${facts.drifting}.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
