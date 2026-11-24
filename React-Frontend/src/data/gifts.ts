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
  /** 24 Nov (owner): the case behind the request, so the CX manager decides from the full story: a one-line title and the facts, oldest first. */
  caseTitle?: Bi
  caseFacts?: Bi[]
  /** The CX team member's own note: why they want to give it. */
  teamNote?: Bi
  /** Where the customer is (environment and product), for the card. */
  where?: string
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

/**
 * 24 Nov (owner): proposed gifts for the CX manager to test the approval: five waiting, one already approved (for the team member to send) and
 * one rejected. Each carries the case and the team member's note. Sample customers.
 */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
function proposal(x: Partial<Gift> & Pick<Gift, 'id' | 'fullName' | 'reason' | 'requestedBy' | 'requestedById' | 'status'>, h: number): Gift {
  return {
    phone: '',
    contactMethod: 'call',
    address: '',
    deliverOn: '',
    deliverWindow: '10:00–13:00',
    itemId: '',
    qty: 1,
    emailedTo: 'administration@psi.sample',
    requestedAt: hoursAgo(h),
    ...x,
    // the approval card finds its gift by this reference
    relatedRef: x.relatedRef ?? x.id,
  }
}
const PROPOSALS: Gift[] = [
  proposal(
    {
      id: 'gf-201',
      fullName: 'Mariam Al Hashimi',
      where: 'PSI Assets · Abu Dhabi (tenant)',
      reason: 'recovery',
      itemId: 'gi-flowers',
      relatedRef: 'PUB-306',
      requestedBy: 'Abeer',
      requestedById: 'u-cxteam',
      status: 'pending',
      caseTitle: b('AC maintenance ignored for 18 days, then a public complaint', 'صيانة المكيف أُهملت 18 يوماً، ثم شكوى علنية'),
      caseFacts: [
        b(
          '27 Sep: maintenance request in the tenant app (AC not cooling). Target: visit within 2 working days.',
          '27 سبتمبر: طلب صيانة بالتطبيق (المكيف لا يبرّد). الهدف: زيارة خلال يومي عمل.',
        ),
        b(
          '2, 6 and 9 Oct: she called the call center three times; each time "we will get back to you".',
          '2 و6 و9 أكتوبر: اتصلت بمركز الاتصال 3 مرات؛ كل مرة "سنعود إليك".',
        ),
        b(
          '11 Oct: Facebook post "Rental maintenance request ignored for two weeks" (PUB-306). We replied publicly after 5 h.',
          '11 أكتوبر: منشور فيسبوك "طلب الصيانة متجاهل أسبوعين" (PUB-306). رددنا علناً بعد 5 ساعات.',
        ),
        b(
          '15 Oct: AC fixed, 18 days after the request. Survey after the fix: 2 out of 5.',
          '15 أكتوبر: أُصلح المكيف بعد 18 يوماً. الاستبيان بعد الإصلاح: 2 من 5.',
        ),
        b('Her lease renews on 10 January 2027.', 'عقدها يتجدد في 10 يناير 2027.'),
      ],
      teamNote: b(
        'She chased us three times and only got help after posting publicly. Her lease renews in January and she told me she is looking elsewhere. I would like to send flowers with a handwritten apology, and the leasing manager will call her the same day.',
        'لاحقتنا ثلاث مرات وما انحلت مشكلتها إلا بعد ما نشرت علناً. عقدها يتجدد بيناير وقالتلي إنها بتدور على بديل. بدي أبعثلها ورد مع اعتذار مكتوب، ومدير التأجير يتصل فيها بنفس اليوم.',
      ),
    },
    3,
  ),
  proposal(
    {
      id: 'gf-202',
      fullName: 'Faisal Rahman',
      where: 'PSI Real Estate · Abu Dhabi (buyer)',
      reason: 'recovery',
      itemId: 'gi-dinner',
      relatedRef: 'PUB-327',
      requestedBy: 'Dina',
      requestedById: 'u-cxteam3',
      status: 'pending',
      caseTitle: b('Waited 40 minutes at Reem Island for a booked viewing', 'انتظر 40 دقيقة بمكتب جزيرة الريم لمعاينة محجوزة'),
      caseFacts: [
        b(
          'Viewing booked online for 10:00 at the Reem Island office (unit worth AED 2.4M).',
          'معاينة محجوزة أونلاين الساعة 10:00 بمكتب جزيرة الريم (وحدة بقيمة 2.4 مليون درهم).',
        ),
        b(
          'The agent arrived at 10:40; nobody at reception offered water or explained the wait.',
          'وصل الوكيل الساعة 10:40؛ لا أحد بالاستقبال قدّم ماء أو شرح سبب الانتظار.',
        ),
        b(
          'Same day: Facebook comment "Waited 40 minutes at the Reem Island office for my viewing" (PUB-327). Not replied yet.',
          'بنفس اليوم: تعليق فيسبوك "انتظرت 40 دقيقة بمكتب جزيرة الريم" (PUB-327). لم يُرد عليه بعد.',
        ),
        b(
          'Survey after the visit: NPS 3 (detractor). The lead is still open; he asked for a second viewing.',
          'استبيان بعد الزيارة: NPS 3 (منتقد). الليد ما زال مفتوحاً وطلب معاينة ثانية.',
        ),
      ],
      teamNote: b(
        'He still wants to buy and asked for a second viewing. A dinner voucher with an apology from the branch manager could save the deal. The agent has already been spoken to.',
        'لسا بده يشتري وطلب معاينة ثانية. قسيمة عشاء مع اعتذار من مدير الفرع ممكن تنقذ الصفقة. والوكيل انحكى معه.',
      ),
    },
    6,
  ),
  proposal(
    {
      id: 'gf-203',
      fullName: 'Tariq Al Nuaimi',
      where: 'PSI Real Estate · Dubai (buyer)',
      reason: 'thanks',
      itemId: 'gi-box',
      requestedBy: 'Muhannad',
      requestedById: 'u-cxteam2',
      status: 'pending',
      caseTitle: b('Promoter who referred two friends', 'مروّج أحال صديقين'),
      caseFacts: [
        b('Bought in Dubai Hills in August. NPS after the signed deal: 10.', 'اشترى بدبي هيلز في أغسطس. NPS بعد توقيع العقد: 10.'),
        b('Left a 5-star Google review naming his agent.', 'ترك تقييم 5 نجوم على جوجل وذكر اسم وكيله.'),
        b('Referred two friends in October; both booked viewings and one signed an offer.', 'أحال صديقين في أكتوبر؛ الاثنان حجزا معاينة وواحد وقّع عرضاً.'),
      ],
      teamNote: b(
        'He brought us a sale without being asked. A thank-you box now keeps him a promoter, and he mentioned a third friend.',
        'جابلنا بيعة بدون ما نطلب. علبة شكر هلأ بتخليه مروّج، وحكى عن صديق ثالث.',
      ),
    },
    20,
  ),
  proposal(
    {
      id: 'gf-204',
      fullName: 'Khalid Al Mazrouei',
      where: 'PSI Club · Abu Dhabi (owner of 3 units)',
      reason: 'vip',
      itemId: 'gi-spa',
      requestedBy: 'Abeer',
      requestedById: 'u-cxteam',
      status: 'pending',
      caseTitle: b('PSI Club member: 5 years and a renewed management contract', 'عضو نادي PSI: 5 سنوات وتجديد عقد الإدارة'),
      caseFacts: [
        b('Owns 3 units managed by PSI Assets; customer since November 2021.', 'يملك 3 وحدات تديرها PSI Assets؛ عميل منذ نوفمبر 2021.'),
        b('Renewed the management contract for all 3 units last week.', 'جدد عقد الإدارة للوحدات الثلاث الأسبوع الماضي.'),
        b('No complaint in the last 12 months; last NPS 9.', 'لا شكاوى آخر 12 شهراً؛ آخر NPS 9.'),
      ],
      teamNote: b(
        'Five years with us this month and he just renewed all three units. A spa voucher for him and his wife on the anniversary.',
        'خمس سنين معنا هالشهر وجدد الثلاث وحدات. قسيمة سبا إله ولزوجته بالذكرى.',
      ),
    },
    28,
  ),
  proposal(
    {
      id: 'gf-205',
      fullName: 'Noura Al Shamsi',
      where: 'PSI Real Estate · Abu Dhabi (After-Sales)',
      reason: 'occasion',
      itemId: 'gi-cake',
      requestedBy: 'Muhannad',
      requestedById: 'u-cxteam2',
      status: 'pending',
      caseTitle: b('First home handed over after two date changes', 'تسليم أول بيت بعد تغيير الموعد مرتين'),
      caseFacts: [
        b(
          'Off-plan unit in Saadiyat; handover moved twice by the developer (14 months late).',
          'وحدة على المخطط بالسعديات؛ موعد التسليم تغير مرتين من المطور (14 شهراً تأخير).',
        ),
        b('She stayed patient; two calls from After-Sales explained each delay.', 'ضلت صبورة؛ مكالمتان من خدمة ما بعد البيع شرحتا كل تأخير.'),
        b('Handover done on 20 Nov. NPS after handover: 9.', 'تم التسليم 20 نوفمبر. NPS بعد التسليم: 9.'),
      ],
      teamNote: b(
        'Her first home, after a long wait. A cake on moving day to say welcome home.',
        'أول بيت إلها بعد انتظار طويل. كيكة بيوم الانتقال نقول لها أهلاً بيتك.',
      ),
    },
    46,
  ),
  proposal(
    {
      id: 'gf-206',
      fullName: 'Hamad Al Ketbi',
      where: 'PSI Real Estate · Dubai (buyer)',
      reason: 'recovery',
      itemId: 'gi-flowers',
      relatedRef: 'PUB-304',
      requestedBy: 'Abeer',
      requestedById: 'u-cxteam',
      status: 'approved',
      approvedBy: 'CX manager',
      decidedAt: hoursAgo(20),
      decisionNote: 'Approved. Call him first so the flowers do not arrive cold.',
      caseTitle: b('Quoted a payment plan that does not exist', 'أُعطي خطة دفع غير موجودة'),
      caseFacts: [
        b(
          '8 Oct: an agent quoted a 40/60 payment plan by phone; the developer only offers 60/40.',
          '8 أكتوبر: وكيل أعطاه بالهاتف خطة 40/60؛ المطور يعرض 60/40 فقط.',
        ),
        b('Google review, 1 star (PUB-304). We replied the same day.', 'تقييم جوجل نجمة واحدة (PUB-304). رددنا بنفس اليوم.'),
        b('Sales Support corrected the offer in writing on 10 Oct.', 'دعم المبيعات صحّح العرض كتابياً في 10 أكتوبر.'),
      ],
      teamNote: b('He was misled by us. Flowers with the corrected offer and an apology.', 'إحنا ضللناه. ورد مع العرض المصحح واعتذار.'),
    },
    30,
  ),
  proposal(
    {
      id: 'gf-207',
      fullName: 'Layla Nasser',
      where: 'PSI Real Estate · Dubai (buyer)',
      reason: 'thanks',
      itemId: 'gi-box',
      requestedBy: 'Abeer',
      requestedById: 'u-cxteam',
      status: 'rejected',
      decidedAt: hoursAgo(26),
      approvedBy: 'CX manager',
      decisionNote: 'She received a gift box on 22 Sep. One gift per customer in six months.',
      caseTitle: b('Kind comment after a viewing', 'تعليق لطيف بعد معاينة'),
      caseFacts: [b('Instagram comment thanking her agent after a viewing.', 'تعليق إنستغرام تشكر وكيلها بعد معاينة.')],
      teamNote: b('A small thank-you for a kind comment.', 'شكر بسيط على تعليق لطيف.'),
    },
    50,
  ),
]

const DEFAULT_STATE: GiftState = {
  items: DEFAULT_ITEMS,
  moves: DEFAULT_MOVES,
  gifts: [...PROPOSALS, ...DEFAULT_GIFTS],
  adminEmail: 'administration@psi.sample',
}
const KEY = 'psicx.gifts'

function read(): GiftState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<GiftState>
      // 24 Nov: sample proposals added later reach a browser that already saved its gifts
      const gifts = saved.gifts ?? []
      const missing = PROPOSALS.filter((p) => !gifts.some((x) => x.id === p.id))
      return { ...DEFAULT_STATE, ...saved, gifts: [...missing, ...gifts] }
    }
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
    // 24 Nov (owner): one row per proposal, with the customer, the reason and who asked
    return s.gifts
      .filter((x) => x.status === 'pending')
      .map((x) => ({
        id: `gift:${x.id}`,
        kind: 'gift' as const,
        text: b(
          `Approve a gift? ${x.fullName || 'Customer'} · ${REASON_LABEL[x.reason].en}${x.caseTitle ? ` · ${x.caseTitle.en}` : ''}`,
          `موافقة على هدية؟ ${x.fullName || 'عميل'} · ${REASON_LABEL[x.reason].ar}${x.caseTitle ? ` · ${x.caseTitle.ar}` : ''}`,
        ),
        daysLeft: 1,
        unit: 'd' as const,
        who: b(`Asked by ${x.requestedBy}`, `طلبها ${x.requestedBy}`),
        priority: 1,
        target: `/gifts?tab=approvals&gift=${x.id}`,
      }))
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
