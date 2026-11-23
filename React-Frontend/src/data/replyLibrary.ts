import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * The reply library of the Public mentions page (owner's request, 23 Nov):
 * - Reply scripts: ready-made public replies for positive, negative and neutral comments.
 * - Common questions: the questions people ask most on the posts, each with its approved answer.
 * The CX manager edits both; the CX team, Marketing and the auditor use them (read only). A script can carry placeholders that are
 * filled when it is used: {whatsapp} (the number below), {branch} (the mention's environment) and {platform}.
 *
 * Prototype: kept in this browser's localStorage over the defaults below. In the real platform this is a small table the CX manager
 * owns, and every change is audit-logged.
 */
export type ScriptTone = 'positive' | 'negative' | 'neutral'

export interface ReplyScript {
  id: string
  tone: ScriptTone
  title: Bi
  text: Bi
}

export interface CommonQuestion {
  id: string
  question: Bi
  answer: Bi
  /** How often it was asked in the last 90 days (sample, read from the mentions once the feed is live). */
  timesAsked: number
}

export interface ReplyLibrary {
  scripts: ReplyScript[]
  questions: CommonQuestion[]
  /** What {whatsapp} becomes in a reply. */
  whatsapp: string
}

const b = (en: string, ar: string): Bi => ({ en, ar })

export const DEFAULT_LIBRARY: ReplyLibrary = {
  whatsapp: '+971 50 000 0000',
  scripts: [
    {
      id: 'rs-pos-1',
      tone: 'positive',
      title: b('Thank you', 'شكراً لك'),
      text: b(
        'Thank you for your kind words! We are glad you had a great experience with PSI, and we look forward to serving you again.',
        'شكراً لكلماتك الطيبة! يسعدنا أن تجربتك مع PSI كانت رائعة، ونتطلع لخدمتك مجدداً.',
      ),
    },
    {
      id: 'rs-pos-2',
      tone: 'positive',
      title: b('Thank you, we will tell the team', 'شكراً، سننقلها للفريق'),
      text: b(
        'Thank you for taking the time to share this. We will pass your thanks to our {branch} team.',
        'شكراً لأنك خصصت وقتاً لمشاركة هذا. سننقل شكرك إلى فريقنا في {branch}.',
      ),
    },
    {
      id: 'rs-neg-1',
      tone: 'negative',
      title: b('Sorry, let us fix it privately', 'نعتذر، دعنا نحلها على الخاص'),
      text: b(
        'We are sorry to hear this, and we would like to make it right. Please message us on WhatsApp at {whatsapp} with your mobile number or booking reference, and our team will follow up with you today.',
        'نأسف لسماع ذلك ونود تصحيح الأمر. يرجى مراسلتنا على واتساب على الرقم {whatsapp} مع رقم جوالك أو مرجع الحجز، وسيتابع فريقنا معك اليوم.',
      ),
    },
    {
      id: 'rs-neg-2',
      tone: 'negative',
      title: b('Nobody called back', 'لم يتصل بك أحد'),
      text: b(
        'We are sorry that nobody got back to you; that is not the service we want you to have. Please message us on WhatsApp at {whatsapp} and we will call you back today, within working hours.',
        'نعتذر لأن أحداً لم يعاود الاتصال بك؛ هذه ليست الخدمة التي نريدها لك. يرجى مراسلتنا على واتساب على الرقم {whatsapp} وسنتصل بك اليوم خلال ساعات العمل.',
      ),
    },
    {
      id: 'rs-neg-3',
      tone: 'negative',
      title: b('Price or payment plan', 'السعر أو خطة الدفع'),
      text: b(
        'Thank you for raising this. We would like to check the details with you. Please share your booking reference with us on WhatsApp at {whatsapp} and our team will review it.',
        'شكراً لطرحك هذا. نود التحقق من التفاصيل معك. يرجى مشاركة مرجع الحجز معنا على واتساب على الرقم {whatsapp} وسيراجعه فريقنا.',
      ),
    },
    {
      id: 'rs-neu-1',
      tone: 'neutral',
      title: b('Asking for information', 'طلب معلومات'),
      text: b(
        'Thank you for your interest. Our team will be happy to help: please message us on WhatsApp at {whatsapp} or use the PSI app.',
        'شكراً لاهتمامك. يسعد فريقنا مساعدتك: يرجى مراسلتنا على واتساب على الرقم {whatsapp} أو استخدام تطبيق PSI.',
      ),
    },
  ],
  questions: [
    {
      id: 'cq-1',
      question: b('How do I book a viewing?', 'كيف أحجز موعد معاينة؟'),
      answer: b(
        'You can book a viewing in the PSI app or by messaging us on WhatsApp at {whatsapp}. A consultant will confirm the time with you.',
        'يمكنك حجز المعاينة من تطبيق PSI أو بمراسلتنا على واتساب على الرقم {whatsapp}. سيؤكد معك أحد المستشارين الموعد.',
      ),
      timesAsked: 21,
    },
    {
      id: 'cq-2',
      question: b('Is the price on the listing final?', 'هل السعر في الإعلان نهائي؟'),
      answer: b(
        'The listed price is the asking price on the day it was published. Your consultant will confirm the current price and any offer in writing.',
        'السعر في الإعلان هو السعر المطلوب يوم النشر. سيؤكد لك المستشار السعر الحالي وأي عرض كتابياً.',
      ),
      timesAsked: 17,
    },
    {
      id: 'cq-3',
      question: b('What payment plans do you offer on off-plan projects?', 'ما خطط الدفع المتاحة في مشاريع على الخارطة؟'),
      answer: b(
        'Payment plans differ by project and developer. Message us on WhatsApp at {whatsapp} with the project name and we will send you its plan.',
        'تختلف خطط الدفع حسب المشروع والمطور. راسلنا على واتساب على الرقم {whatsapp} باسم المشروع وسنرسل لك خطته.',
      ),
      timesAsked: 14,
    },
    {
      id: 'cq-4',
      question: b('Do you charge a commission?', 'هل تأخذون عمولة؟'),
      answer: b(
        'It depends on the property. Any fee is always stated in writing before you sign anything.',
        'يعتمد ذلك على العقار. أي رسوم تُذكر دائماً كتابياً قبل أن توقّع على أي شيء.',
      ),
      timesAsked: 11,
    },
    {
      id: 'cq-5',
      question: b('How do I request maintenance for my rental?', 'كيف أطلب صيانة لعقاري المستأجَر؟'),
      answer: b(
        'Open a maintenance request in the PSI app, or message us on WhatsApp at {whatsapp} with your unit number.',
        'افتح طلب صيانة من تطبيق PSI، أو راسلنا على واتساب على الرقم {whatsapp} مع رقم الوحدة.',
      ),
      timesAsked: 9,
    },
    {
      id: 'cq-6',
      question: b('Can I buy from abroad?', 'هل يمكنني الشراء من خارج الدولة؟'),
      answer: b(
        'Yes. Our consultants handle the whole process remotely, including the viewing by video call and the documents.',
        'نعم. يتولى مستشارونا العملية كاملة عن بُعد، بما في ذلك المعاينة عبر مكالمة فيديو والمستندات.',
      ),
      timesAsked: 7,
    },
  ],
}

const KEY = 'psicx.replyLibrary'

function read(): ReplyLibrary {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_LIBRARY, ...(JSON.parse(raw) as Partial<ReplyLibrary>) }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_LIBRARY
}

let state = read()
const listeners = new Set<() => void>()

function write(next: ReplyLibrary) {
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

export function useReplyLibrary(): ReplyLibrary {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}`

export function saveScript(s: Omit<ReplyScript, 'id'> & { id?: string }) {
  const id = s.id ?? newId('rs')
  const exists = state.scripts.some((x) => x.id === id)
  write({ ...state, scripts: exists ? state.scripts.map((x) => (x.id === id ? { ...s, id } : x)) : [...state.scripts, { ...s, id }] })
}
export function deleteScript(id: string) {
  write({ ...state, scripts: state.scripts.filter((x) => x.id !== id) })
}
export function saveQuestion(q: Omit<CommonQuestion, 'id'> & { id?: string }) {
  const id = q.id ?? newId('cq')
  const exists = state.questions.some((x) => x.id === id)
  write({ ...state, questions: exists ? state.questions.map((x) => (x.id === id ? { ...q, id } : x)) : [...state.questions, { ...q, id }] })
}
export function deleteQuestion(id: string) {
  write({ ...state, questions: state.questions.filter((x) => x.id !== id) })
}
export function setWhatsapp(whatsapp: string) {
  write({ ...state, whatsapp })
}
export function resetLibrary() {
  write(DEFAULT_LIBRARY)
}

/** Fills the placeholders of a script or answer. */
export function fillText(text: string, values: { whatsapp: string; branch?: string; platform?: string }) {
  return text
    .replaceAll('{whatsapp}', values.whatsapp)
    .replaceAll('{branch}', values.branch ?? 'PSI')
    .replaceAll('{platform}', values.platform ?? '')
}
