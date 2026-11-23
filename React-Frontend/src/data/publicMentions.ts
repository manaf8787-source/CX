import type { Bi } from '../types'
import type { PublicMention, PublicPlatform } from './v38Reference'
import { PRODUCTS } from './products'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Public mentions page copy (v40 S14). */
export const PUBLIC_MENTIONS_COPY = {
  title: b('Public mentions', 'الإشارات العامة'),
  intro: (hours: number): Bi =>
    b(
      `Every public comment on Facebook, Instagram, LinkedIn and Google, with its reply status. Rule: a public reply within ${hours} hours from the approved wording, inviting the person to WhatsApp or the app. Nobody here is surveyed or matched to a record.`,
      `كل تعليق عام على فيسبوك وإنستغرام ولينكد إن وGoogle مع حالة الرد. القاعدة: رد عام خلال ${hours} ساعة بالصيغة المعتمدة يدعو الشخص إلى واتساب أو التطبيق. لا أحد هنا يُستبان أو يُطابق بسجل.`,
    ),
  columns: {
    date: b('Date', 'التاريخ'),
    channel: b('Channel', 'القناة'),
    mention: b('Mention', 'الإشارة'),
    tone: b('Tone', 'النبرة'),
    reply: b('Reply', 'الرد'),
    identified: b('Identified', 'تعرّف'),
    owner: b('Owner', 'المسؤول'),
  },
  tone: { negative: b('Negative', 'سلبي'), positive: b('Positive', 'إيجابي'), neutral: b('Neutral', 'محايد') },
  /** [Proposed] the prototype says "Moved to WhatsApp" whatever the channel; this says it per row when known. */
  identified: {
    whatsapp: b('Moved to WhatsApp', 'انتقل إلى واتساب'),
    app: b('Moved to the app', 'انتقل إلى التطبيق'),
    private: b('Moved to a private channel', 'انتقل إلى قناة خاصة'),
  },
  action: b('Mark replied', 'تعليم كمردود'),
  toast: b('Marked replied; the index updates.', 'عُلّم كمردود؛ يتحدث المؤشر.'),
  reputationButton: b('Work the mentions', 'اعمل على الإشارات'),
  /** Decided 18 Nov: Marketing owns the reply; CX watches the clock; the Internal Audit and Marketing Lead audits monthly. */
  ownerNote: (hours: number): Bi =>
    b(
      `Marketing (the channel owner) or the CX team replies within ${hours} hours, using the approved scripts. The CX team also watches the clock and raises a signal when it is missed; the Internal Audit and Marketing Lead audits it monthly.`,
      `التسويق (مسؤول القناة) أو فريق CX يرد خلال ${hours} ساعة باستخدام الردود المعتمدة. ويراقب فريق CX المهلة ويرفع إشارة عند تفويتها؛ ومسؤول التدقيق الداخلي والتسويق يدقق شهرياً.`,
    ),
  /** The signal CX raises for a missed reply. */
  missedSignal: b('Past the SLA: escalated to the CX manager', 'تجاوزت المهلة: صُعّدت لمدير CX'),
}

export type ReplyState = 'replied' | 'overdue' | 'awaiting'

/** Reply chip state: replied; not replied and older than the reply clock (default 48 h): overdue; else awaiting. */
export function replyState(m: Pick<PublicMention, 'replied' | 'date'>, now: number = Date.now(), clockHours = 48): ReplyState {
  if (m.replied) return 'replied'
  return now - Date.parse(m.date) > clockHours * 3_600_000 ? 'overdue' : 'awaiting'
}

/** Mentions with no reply past the reply clock: CX raises a signal for each (decided 18 Nov). */
export function publicReplyBreaches<T extends Pick<PublicMention, 'replied' | 'date'>>(mentions: readonly T[], now: number = Date.now(), clockHours = 48): T[] {
  return mentions.filter((m) => replyState(m, now, clockHours) === 'overdue')
}

/** Reply chip text (v40 S14): "Replied in {n} h" / "No reply, over {48} h" / "Awaiting reply". */
export function replyLabel(m: Pick<PublicMention, 'replied' | 'replyHours' | 'date'>, now: number = Date.now(), clockHours = 48): Bi {
  const state = replyState(m, now, clockHours)
  if (state === 'replied') return b(`Replied in ${m.replyHours} h`, `رُدّ خلال ${m.replyHours} ساعة`)
  if (state === 'overdue') return b(`No reply, over ${clockHours} h`, `لا رد، تجاوز ${clockHours} ساعة`)
  return b('Awaiting reply', 'بانتظار الرد')
}

/**
 * Where a mention was posted (owner's request, 23 Nov): the page or listing, the post it sits under, a link to the original, and the
 * other comments on that post. Google reviews sit on the branch's Google listing, not under a post.
 *
 * Prototype: generated from the mention, the same on every load; the link is a sample. Once the social feed is connected each
 * platform's API returns these fields (Facebook and Instagram: the page, post id and permalink; LinkedIn: the organisation post;
 * Google: the location and review id).
 */
export interface MentionPost {
  page: string
  /** The post the comment is under (absent for a Google review). */
  post?: Bi
  url: string
  thread: { who: string; text: string; hoursAfter: number; isPsi?: boolean }[]
}

const PAGE_HANDLE: Record<string, string> = { Dubai: 'dubai', 'Abu Dhabi': 'abudhabi', 'PSI Assets': 'assets', 'PSI-AI': 'ai' }
const POSTS: Bi[] = [
  b('New launch: waterfront apartments, 10% down payment', 'إطلاق جديد: شقق على الواجهة البحرية، دفعة أولى 10%'),
  b('Open house this weekend at our Reem Island office', 'يوم مفتوح هذا الأسبوع في مكتبنا في جزيرة الريم'),
  b('Market report: Q3 prices by community', 'تقرير السوق: أسعار الربع الثالث حسب المنطقة'),
  b('Handover season: what to check in your new home', 'موسم التسليم: ما الذي تتحقق منه في منزلك الجديد'),
  b('Ready villas with a payment plan over 5 years', 'فلل جاهزة بخطة دفع على 5 سنوات'),
]
const OTHERS = [
  'Same here, still waiting.',
  'Is this still available?',
  'Please share the payment plan.',
  'Great service from Ahmed at the office.',
  'Sent you a message, no reply yet.',
  'How far is it from the metro?',
]
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

export function postOf(
  m: Pick<PublicMention, 'id' | 'platform' | 'environment' | 'text' | 'replied' | 'replyHours' | 'pageProduct'> & { replyText?: string },
): MentionPost {
  const h = hash(m.id)
  const handle = PAGE_HANDLE[m.environment] ?? 'psi'
  const env = m.environment
  const brand = env.startsWith('PSI') ? env : `PSI ${env}`
  const num = String(1_000_000 + (h % 8_999_999))
  const product = m.pageProduct ? PRODUCTS.find((p) => p.id === m.pageProduct)?.name.en : undefined
  const app = product ? `${product} app` : 'PSI app'
  const byPlatform: Record<PublicPlatform, { page: string; url: string }> = {
    facebook: { page: `${brand} · Facebook page`, url: `https://www.facebook.com/psi.${handle}/posts/${num}` },
    instagram: { page: `@psi.${handle} · Instagram`, url: `https://www.instagram.com/p/C${num}/` },
    linkedin: { page: 'Property Shop Investment · LinkedIn page', url: `https://www.linkedin.com/feed/update/urn:li:activity:7${num}` },
    google: { page: `${brand} office · Google reviews`, url: `https://www.google.com/maps/place/?q=PSI+${handle}&review=${num}` },
    googleplay: {
      page: `${app} · Google Play reviews`,
      url: `https://play.google.com/store/apps/details?id=com.psi.${m.pageProduct ?? 'app'}&reviewId=${num}`,
    },
    appstore: { page: `${app} · App Store reviews`, url: `https://apps.apple.com/app/id${num}?see-all=reviews` },
    webcomment: { page: `${product ?? 'PSI'} website · comments`, url: `https://www.psinv.net/${m.pageProduct ?? 'blog'}#comment-${num}` },
  }
  const byPage = byPlatform[m.platform]
  const thread: MentionPost['thread'] = [{ who: 'Commenter', text: m.text, hoursAfter: 0 }]
  if (m.platform !== 'google' && m.platform !== 'googleplay' && m.platform !== 'appstore') {
    thread.push({ who: `User ${String.fromCharCode(65 + (h % 20))}.`, text: OTHERS[h % OTHERS.length], hoursAfter: 2 + (h % 9) })
    if (h % 3 === 0) thread.push({ who: `User ${String.fromCharCode(66 + (h % 19))}.`, text: OTHERS[(h >>> 3) % OTHERS.length], hoursAfter: 11 + (h % 7) })
  }
  if (m.replied)
    thread.push({
      who: 'PSI',
      text: m.replyText ?? 'Reply posted on the platform (text not captured in the sample).',
      hoursAfter: m.replyHours ?? 0,
      isPsi: true,
    })
  return {
    ...byPage,
    post:
      m.platform === 'google' || m.platform === 'googleplay' || m.platform === 'appstore'
        ? undefined
        : m.pageProduct === 'to'
          ? b('Blog: the best tours to book in the UAE this winter', 'مدونة: أفضل الجولات للحجز في الإمارات هذا الشتاء')
          : POSTS[h % POSTS.length],
    thread,
  }
}

/**
 * Where a public comment is on the reply clock (owner, 23 Nov): a human from the CX team replies. With no reply after the reminder
 * hours (24 by default) the assigned member is reminded; past the SLA (48 hours by default) it is escalated to the CX manager.
 * Both numbers are in Rules as configuration.
 */
export type MentionStage = 'replied' | 'new' | 'reminded' | 'escalated'

export function mentionStage(
  m: Pick<PublicMention, 'replied' | 'date'>,
  now: number,
  rules: { publicReplyHours: number; publicReminderHours: number },
): MentionStage {
  if (m.replied) return 'replied'
  const h = (now - Date.parse(m.date)) / 3_600_000
  if (h > rules.publicReplyHours) return 'escalated'
  if (h > rules.publicReminderHours) return 'reminded'
  return 'new'
}

export const STAGE_LABEL: Record<Exclude<MentionStage, 'replied'>, Bi> = {
  new: b('New', 'جديدة'),
  reminded: b('Reminder sent', 'أُرسل تذكير'),
  escalated: b('Escalated to the CX manager', 'صُعّدت لمدير CX'),
}

/**
 * Inbox rows (owner, 23 Nov): a CX team member sees the comments assigned to them that still need a reply; the CX manager sees the
 * ones escalated to him (past the SLA). Each row opens Public mentions filtered to those comments.
 */
export function mentionInboxItems(
  role: string,
  userId: string | undefined,
  mentions: readonly PublicMention[],
  now: number,
  rules: { publicReplyHours: number; publicReminderHours: number },
): import('../types').InboxItem[] {
  const open = mentions.filter((m) => !m.replied)
  if (role === 'cxteam' && userId) {
    const mine = open.filter((m) => m.assignee === userId)
    if (!mine.length) return []
    const late = mine.filter((m) => mentionStage(m, now, rules) !== 'new').length
    return [
      {
        id: 'mention:mine',
        kind: 'mention',
        text: b(
          `Public comments to reply to: ${mine.length}${late ? `, ${late} past the reminder` : ''}`,
          `تعليقات عامة بانتظار ردك: ${mine.length}${late ? `، ${late} تجاوزت التذكير` : ''}`,
        ),
        daysLeft: late ? 0 : 1,
        unit: 'd',
        who: null,
        priority: late ? 2 : 1,
        target: '/settings/public-mentions?assignee=me&status=open',
      },
    ]
  }
  if (role === 'cxmgr') {
    const esc = open.filter((m) => mentionStage(m, now, rules) === 'escalated')
    if (!esc.length) return []
    return [
      {
        id: 'mention:escalated',
        kind: 'mention',
        text: b(
          `Escalated: ${esc.length} public ${esc.length === 1 ? 'comment' : 'comments'} past the ${rules.publicReplyHours} h reply SLA`,
          `مُصعَّد: ${esc.length} تعليق عام تجاوز مهلة الرد ${rules.publicReplyHours} ساعة`,
        ),
        daysLeft: -1,
        unit: 'd',
        who: b('CX team', 'فريق CX'),
        priority: 2,
        target: '/settings/public-mentions?status=overdue',
      },
    ]
  }
  return []
}
