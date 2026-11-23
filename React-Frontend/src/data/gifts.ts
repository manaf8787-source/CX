import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * Gifts (owner's request, 23 Nov): the CX manager or the CX team sends a gift to any customer (a detractor to recover them, a promoter or
 * a kind public comment to thank them, a Club member on an occasion). The request goes by email to the Administration team, who deliver
 * it; they need no portal user. The email carries everything they need: the full name, the phone, how to reach the person, the address,
 * the gift and exactly when to deliver it.
 *
 * Inventory: each item has a stock. A request takes the quantity out of the stock at once; a cancelled request puts it back. The CX
 * manager adds items and stock; the CX team sees what is available. Every gift stays in the history with its date and who received it.
 *
 * Prototype: kept in this browser's localStorage; nothing is emailed ("Sample data, nothing is sent"). In the real platform the email is
 * sent by the backend (one template, in English and Arabic) and the Administration team confirms delivery from a link in it.
 */
export type GiftKind = 'physical' | 'voucher' | 'experience'
export type GiftReason = 'recovery' | 'thanks' | 'occasion' | 'vip' | 'other'
/**
 * 23 Nov (owner): a CX team member first asks the CX manager ("eligible for a gift", with the justification); the CX manager approves or
 * rejects; once approved the member fills the delivery details and it is emailed to Administration. The CX manager's own requests are
 * approved at once. Only a request that was emailed (sent or delivered) takes the gift out of the stock.
 */
export type GiftStatus = 'pending' | 'approved' | 'rejected' | 'sent' | 'delivered' | 'cancelled'
export const COUNTS_IN_STOCK: GiftStatus[] = ['sent', 'delivered']
export type ContactMethod = 'call' | 'whatsapp' | 'email'

export interface GiftItem {
  id: string
  name: Bi
  kind: GiftKind
  /** What it is, for the Administration team (size, supplier, what is inside). */
  nature: Bi
  /** Value of one unit, AED (optional). */
  unitValue?: number
  /** Warn when the stock falls to this. */
  lowAt: number
  archived?: boolean
}

/** A stock movement: + when stock is received, − when it is corrected down. Gifts are counted separately. */
export interface StockMove {
  id: string
  itemId: string
  qty: number
  at: string
  by: string
  note?: string
}

export interface Gift {
  id: string
  personId?: string
  fullName: string
  phone: string
  email?: string
  contactMethod: ContactMethod
  address: string
  /** Delivery day (YYYY-MM-DD) and window (e.g. "10:00–12:00"). */
  deliverOn: string
  deliverWindow: string
  itemId: string
  qty: number
  reason: GiftReason
  /** What the gift says or what Admin should know (a card message, a gate code). */
  note?: string
  /** A link to what it answers (a public comment id, a call, a case). */
  relatedRef?: string
  requestedBy: string
  requestedAt: string
  emailedTo: string
  status: GiftStatus
  deliveredAt?: string
  cancelledAt?: string
  /** Why this customer gets a gift: written from the experience on record (the comment, the scores), editable. */
  justification?: string
  /** The portal user who asked. */
  requestedById?: string
  approvedBy?: string
  decidedAt?: string
  /** The CX manager's note when approving or rejecting. */
  decisionNote?: string
}

export interface GiftState {
  items: GiftItem[]
  moves: StockMove[]
  gifts: Gift[]
  /** Where the requests are emailed. */
  adminEmail: string
}

const b = (en: string, ar: string): Bi => ({ en, ar })

export const KIND_LABEL: Record<GiftKind, Bi> = {
  physical: b('Physical item', 'هدية عينية'),
  voucher: b('Voucher', 'قسيمة'),
  experience: b('Experience', 'تجربة'),
}
export const REASON_LABEL: Record<GiftReason, Bi> = {
  recovery: b('Recover an unhappy customer', 'استعادة عميل غير راضٍ'),
  thanks: b('Thank you (kind comment or promoter)', 'شكر (تعليق إيجابي أو مروّج)'),
  occasion: b('Occasion (handover, birthday, anniversary)', 'مناسبة (تسليم، عيد ميلاد، ذكرى)'),
  vip: b('VIP or PSI Club member', 'عميل مميز أو عضو نادي PSI'),
  other: b('Other', 'أخرى'),
}
export const STATUS_LABEL: Record<GiftStatus, Bi> = {
  pending: b('Waiting for the CX manager', 'بانتظار موافقة مدير CX'),
  approved: b('Approved: details to send', 'موافق عليها: بانتظار الإرسال'),
  rejected: b('Not approved', 'لم تتم الموافقة'),
  sent: b('Emailed to Administration', 'أُرسلت للإدارة'),
  delivered: b('Delivered', 'سُلّمت'),
  cancelled: b('Cancelled', 'أُلغيت'),
}
export const CONTACT_LABEL: Record<ContactMethod, Bi> = {
  call: b('Phone call', 'اتصال هاتفي'),
  whatsapp: b('WhatsApp', 'واتساب'),
  email: b('Email', 'البريد الإلكتروني'),
}

const DEFAULT_ITEMS: GiftItem[] = [
  {
    id: 'gi-flowers',
    name: b('Flower bouquet', 'باقة ورد'),
    kind: 'physical',
    nature: b('Medium bouquet with a PSI card', 'باقة متوسطة مع بطاقة PSI'),
    unitValue: 250,
    lowAt: 3,
  },
  {
    id: 'gi-box',
    name: b('PSI gift box', 'صندوق هدايا PSI'),
    kind: 'physical',
    nature: b('Chocolates, dates and a PSI notebook', 'شوكولاتة وتمر ودفتر PSI'),
    unitValue: 180,
    lowAt: 5,
  },
  {
    id: 'gi-dinner',
    name: b('Dinner voucher', 'قسيمة عشاء'),
    kind: 'voucher',
    nature: b('AED 500 at a partner restaurant, valid 6 months', '500 درهم في مطعم شريك، صالحة 6 أشهر'),
    unitValue: 500,
    lowAt: 2,
  },
  {
    id: 'gi-spa',
    name: b('Spa day for two', 'يوم سبا لشخصين'),
    kind: 'experience',
    nature: b('Partner hotel spa, booked by Administration', 'سبا فندق شريك، تحجزه الإدارة'),
    unitValue: 900,
    lowAt: 1,
  },
  {
    id: 'gi-cake',
    name: b('Handover cake', 'كعكة التسليم'),
    kind: 'physical',
    nature: b('Ordered 2 days ahead, delivered with the keys', 'تُطلب قبل يومين وتُسلّم مع المفاتيح'),
    unitValue: 150,
    lowAt: 2,
  },
]
const DEFAULT_MOVES: StockMove[] = [
  { id: 'sm-1', itemId: 'gi-flowers', qty: 20, at: '2026-08-01T08:00:00Z', by: 'CX manager', note: 'Opening stock' },
  { id: 'sm-2', itemId: 'gi-box', qty: 30, at: '2026-08-01T08:00:00Z', by: 'CX manager', note: 'Opening stock' },
  { id: 'sm-3', itemId: 'gi-dinner', qty: 10, at: '2026-08-01T08:00:00Z', by: 'CX manager', note: 'Opening stock' },
  { id: 'sm-4', itemId: 'gi-spa', qty: 4, at: '2026-08-01T08:00:00Z', by: 'CX manager', note: 'Opening stock' },
  { id: 'sm-5', itemId: 'gi-cake', qty: 8, at: '2026-08-01T08:00:00Z', by: 'CX manager', note: 'Opening stock' },
  { id: 'sm-6', itemId: 'gi-flowers', qty: 10, at: '2026-10-15T08:00:00Z', by: 'CX manager', note: 'Restock' },
]
/** Sample history: names and numbers are invented for the prototype. */
const DEFAULT_GIFTS: Gift[] = [
  g('gf-101', 'Omar Haddad', '+971 50 111 2041', 'gi-flowers', 1, 'recovery', '2026-08-14', 'delivered', 'Abeer', 'whatsapp', 'Al Reem Island, Abu Dhabi'),
  g('gf-102', 'Sara Al Mansoori', '+971 55 320 7781', 'gi-cake', 1, 'occasion', '2026-08-29', 'delivered', 'Muhannad', 'call', 'Dubai Hills, Dubai'),
  g('gf-103', 'Rami Khoury', '+971 52 870 1102', 'gi-dinner', 1, 'recovery', '2026-09-10', 'delivered', 'CX manager', 'call', 'Saadiyat, Abu Dhabi'),
  g('gf-104', 'Layla Nasser', '+971 50 994 3120', 'gi-box', 2, 'thanks', '2026-09-22', 'delivered', 'Dina', 'whatsapp', 'JVC, Dubai'),
  g('gf-105', 'Khalid Al Suwaidi', '+971 56 210 6650', 'gi-spa', 1, 'vip', '2026-10-05', 'delivered', 'CX manager', 'email', 'Yas Island, Abu Dhabi'),
  g('gf-106', 'Hana Farouk', '+971 50 431 0098', 'gi-flowers', 1, 'thanks', '2026-10-27', 'cancelled', 'Abeer', 'whatsapp', 'Business Bay, Dubai'),
  g('gf-107', 'Yousef Barakat', '+971 54 765 2219', 'gi-box', 1, 'recovery', '2026-11-12', 'delivered', 'Muhannad', 'call', 'Al Raha Beach, Abu Dhabi'),
]

function g(
  id: string,
  fullName: string,
  phone: string,
  itemId: string,
  qty: number,
  reason: GiftReason,
  deliverOn: string,
  status: GiftStatus,
  requestedBy: string,
  contactMethod: ContactMethod,
  address: string,
): Gift {
  const req = new Date(Date.parse(`${deliverOn}T08:00:00Z`) - 3 * 86_400_000).toISOString()
  return {
    id,
    fullName,
    phone,
    contactMethod,
    address,
    deliverOn,
    deliverWindow: '10:00–13:00',
    itemId,
    qty,
    reason,
    requestedBy,
    requestedAt: req,
    emailedTo: 'administration@psi.sample',
    status,
    deliveredAt: status === 'delivered' ? `${deliverOn}T11:30:00Z` : undefined,
    cancelledAt: status === 'cancelled' ? req : undefined,
  }
}

const DEFAULT_STATE: GiftState = { items: DEFAULT_ITEMS, moves: DEFAULT_MOVES, gifts: DEFAULT_GIFTS, adminEmail: 'administration@psi.sample' }
const KEY = 'psicx.gifts'

function read(): GiftState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<GiftState>) }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_STATE
}

let state = read()
const listeners = new Set<() => void>()
function write(next: GiftState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useGifts(): GiftState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

/** Units of an item still available: stock received minus every gift that was not cancelled. */
export function available(s: GiftState, itemId: string): number {
  const inStock = s.moves.filter((m) => m.itemId === itemId).reduce((n, m) => n + m.qty, 0)
  const given = s.gifts.filter((x) => x.itemId === itemId && COUNTS_IN_STOCK.includes(x.status)).reduce((n, x) => n + x.qty, 0)
  return inStock - given
}
export function given(s: GiftState, itemId: string): number {
  return s.gifts.filter((x) => x.itemId === itemId && COUNTS_IN_STOCK.includes(x.status)).reduce((n, x) => n + x.qty, 0)
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}`

/** Records the request and takes the quantity out of the stock. Refuses when the stock is short. */
export function requestGift(input: Omit<Gift, 'id' | 'requestedAt' | 'emailedTo' | 'status'>): Gift {
  if (available(state, input.itemId) < input.qty) throw new Error('Not enough in stock')
  const gift: Gift = { ...input, id: newId('gf'), requestedAt: new Date().toISOString(), emailedTo: state.adminEmail, status: 'sent' }
  write({ ...state, gifts: [gift, ...state.gifts] })
  return gift
}
/** "Eligible for a gift": asks the CX manager. When the CX manager asks, it is approved at once. */
export function proposeGift(input: {
  personId?: string
  fullName?: string
  itemId?: string
  qty?: number
  reason: GiftReason
  justification: string
  relatedRef?: string
  requestedBy: string
  requestedById?: string
  byManager?: boolean
}): Gift {
  const now = new Date().toISOString()
  const gift: Gift = {
    id: newId('gf'),
    personId: input.personId,
    fullName: input.fullName ?? '',
    phone: '',
    contactMethod: 'call',
    address: '',
    deliverOn: '',
    deliverWindow: '10:00–13:00',
    itemId: input.itemId ?? '',
    qty: input.qty ?? 1,
    reason: input.reason,
    relatedRef: input.relatedRef,
    justification: input.justification,
    requestedBy: input.requestedBy,
    requestedById: input.requestedById,
    requestedAt: now,
    emailedTo: '',
    status: input.byManager ? 'approved' : 'pending',
    approvedBy: input.byManager ? input.requestedBy : undefined,
    decidedAt: input.byManager ? now : undefined,
  }
  write({ ...state, gifts: [gift, ...state.gifts] })
  return gift
}
export function decideGift(id: string, approve: boolean, by: string, note?: string, itemId?: string) {
  write({
    ...state,
    gifts: state.gifts.map((x) =>
      x.id === id
        ? {
            ...x,
            status: approve ? 'approved' : 'rejected',
            approvedBy: by,
            decidedAt: new Date().toISOString(),
            decisionNote: note,
            itemId: itemId || x.itemId,
          }
        : x,
    ),
  })
}
/** Sends an approved request to Administration with the delivery details; takes it out of the stock. */
export function sendApproved(
  id: string,
  details: Pick<Gift, 'fullName' | 'phone' | 'email' | 'contactMethod' | 'address' | 'deliverOn' | 'deliverWindow' | 'itemId' | 'qty' | 'note'>,
): Gift {
  const g0 = state.gifts.find((x) => x.id === id)
  if (!g0 || g0.status !== 'approved') throw new Error('Not approved')
  if (available(state, details.itemId) < details.qty) throw new Error('Not enough in stock')
  const sent: Gift = { ...g0, ...details, status: 'sent', emailedTo: state.adminEmail }
  write({ ...state, gifts: state.gifts.map((x) => (x.id === id ? sent : x)) })
  return sent
}
export const giftFor = (s: GiftState, ref: string) => s.gifts.find((x) => x.relatedRef === ref && x.status !== 'cancelled')

export function markDelivered(id: string) {
  write({ ...state, gifts: state.gifts.map((x) => (x.id === id ? { ...x, status: 'delivered', deliveredAt: new Date().toISOString() } : x)) })
}
/** Cancelling puts the quantity back in the stock. */
export function cancelGift(id: string) {
  write({ ...state, gifts: state.gifts.map((x) => (x.id === id ? { ...x, status: 'cancelled', cancelledAt: new Date().toISOString() } : x)) })
}
export function saveItem(item: Omit<GiftItem, 'id'> & { id?: string }, openingStock = 0, by = 'CX manager') {
  const id = item.id ?? newId('gi')
  const exists = state.items.some((x) => x.id === id)
  const items = exists ? state.items.map((x) => (x.id === id ? { ...item, id } : x)) : [...state.items, { ...item, id }]
  const moves =
    !exists && openingStock > 0
      ? [...state.moves, { id: newId('sm'), itemId: id, qty: openingStock, at: new Date().toISOString(), by, note: 'Opening stock' }]
      : state.moves
  write({ ...state, items, moves })
}
export function addStock(itemId: string, qty: number, by: string, note?: string) {
  write({ ...state, moves: [...state.moves, { id: newId('sm'), itemId, qty, at: new Date().toISOString(), by, note }] })
}
export function setAdminEmail(adminEmail: string) {
  write({ ...state, adminEmail })
}

/** The email the Administration team receives (subject and body), in the language chosen. */
export function giftEmail(x: Gift, item: GiftItem | undefined, lang: 'en' | 'ar'): { to: string; subject: string; body: string } {
  const L = (v: Bi) => v[lang]
  const itemName = item ? L(item.name) : x.itemId
  if (lang === 'ar') {
    return {
      to: x.emailedTo,
      subject: `طلب هدية ${x.id}: ${itemName} إلى ${x.fullName} يوم ${x.deliverOn}`,
      body: [
        'مرحباً فريق الإدارة،',
        '',
        'يرجى توصيل الهدية التالية:',
        `• الهدية: ${itemName} × ${x.qty}${item ? ` (${L(item.nature)})` : ''}`,
        `• المستلم: ${x.fullName}`,
        `• الهاتف: ${x.phone}`,
        x.email ? `• البريد: ${x.email}` : null,
        `• طريقة التواصل المفضلة: ${L(CONTACT_LABEL[x.contactMethod])}`,
        `• العنوان: ${x.address}`,
        `• موعد التوصيل: ${x.deliverOn}، بين ${x.deliverWindow}`,
        x.note ? `• ملاحظة: ${x.note}` : null,
        '',
        `السبب: ${L(REASON_LABEL[x.reason])}. طلبها: ${x.requestedBy}، فريق تجربة العملاء.`,
        'يرجى الرد على هذا البريد عند التسليم.',
      ]
        .filter((l) => l !== null)
        .join('\n'),
    }
  }
  return {
    to: x.emailedTo,
    subject: `Gift request ${x.id}: ${itemName} for ${x.fullName} on ${x.deliverOn}`,
    body: [
      'Hello Administration team,',
      '',
      'Please deliver this gift:',
      `• Gift: ${itemName} × ${x.qty}${item ? ` (${L(item.nature)})` : ''}`,
      `• To: ${x.fullName}`,
      `• Phone: ${x.phone}`,
      x.email ? `• Email: ${x.email}` : null,
      `• Best way to reach them: ${L(CONTACT_LABEL[x.contactMethod])}`,
      `• Address: ${x.address}`,
      `• Deliver on: ${x.deliverOn}, between ${x.deliverWindow}`,
      x.note ? `• Note: ${x.note}` : null,
      '',
      `Reason: ${L(REASON_LABEL[x.reason])}. Requested by ${x.requestedBy}, CX team.`,
      'Please reply to this email once it is delivered.',
    ]
      .filter((l) => l !== null)
      .join('\n'),
  }
}

/** Inbox rows (owner, 23 Nov): the CX manager sees the gifts waiting for approval; the member who asked sees the approved ones to send. */
export function giftInboxItems(role: string, userId: string | undefined, s: GiftState): import('../types').InboxItem[] {
  if (role === 'cxmgr') {
    const n = s.gifts.filter((x) => x.status === 'pending').length
    if (!n) return []
    return [
      {
        id: 'gift:pending',
        kind: 'gift',
        text: b(`Gift approvals waiting: ${n}`, `هدايا بانتظار موافقتك: ${n}`),
        daysLeft: 1,
        unit: 'd',
        who: b('CX team', 'فريق CX'),
        priority: 1,
        target: '/gifts?tab=approvals',
      },
    ]
  }
  if (role === 'cxteam' && userId) {
    const mine = s.gifts.filter((x) => x.requestedById === userId && (x.status === 'approved' || x.status === 'rejected'))
    const ok = mine.filter((x) => x.status === 'approved').length
    const no = mine.length - ok
    if (!mine.length) return []
    return [
      {
        id: 'gift:decided',
        kind: 'gift',
        text: b(
          `Gifts: ${ok ? `${ok} approved by the CX manager, send ${ok === 1 ? 'it' : 'them'}` : ''}${ok && no ? '; ' : ''}${no ? `${no} not approved` : ''}`,
          `الهدايا: ${ok ? `${ok} وافق عليها مدير CX، أرسلها` : ''}${ok && no ? '؛ ' : ''}${no ? `${no} لم يوافق عليها` : ''}`,
        ),
        daysLeft: ok ? 1 : null,
        unit: 'd',
        who: b('CX manager', 'مدير CX'),
        priority: ok ? 1 : 0,
        target: '/gifts?tab=approvals',
      },
    ]
  }
  return []
}
