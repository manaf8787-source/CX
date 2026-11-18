import type { Bi } from '../types'
import type { PublicMention } from './v38Reference'

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
  identified: { whatsapp: b('Moved to WhatsApp', 'انتقل إلى واتساب'), app: b('Moved to the app', 'انتقل إلى التطبيق'), private: b('Moved to a private channel', 'انتقل إلى قناة خاصة') },
  action: b('Mark replied', 'تعليم كمردود'),
  toast: b('Marked replied; the index updates.', 'عُلّم كمردود؛ يتحدث المؤشر.'),
  reputationButton: b('Work the mentions', 'اعمل على الإشارات'),
}

export type ReplyState = 'replied' | 'overdue' | 'awaiting'

/** Reply chip state: replied; not replied and older than the reply clock (default 48 h): overdue; else awaiting. */
export function replyState(m: Pick<PublicMention, 'replied' | 'date'>, now: number = Date.now(), clockHours = 48): ReplyState {
  if (m.replied) return 'replied'
  return now - Date.parse(m.date) > clockHours * 3_600_000 ? 'overdue' : 'awaiting'
}

/** Reply chip text (v40 S14): "Replied in {n} h" / "No reply, over {48} h" / "Awaiting reply". */
export function replyLabel(m: Pick<PublicMention, 'replied' | 'replyHours' | 'date'>, now: number = Date.now(), clockHours = 48): Bi {
  const state = replyState(m, now, clockHours)
  if (state === 'replied') return b(`Replied in ${m.replyHours} h`, `رُدّ خلال ${m.replyHours} ساعة`)
  if (state === 'overdue') return b(`No reply, over ${clockHours} h`, `لا رد، تجاوز ${clockHours} ساعة`)
  return b('Awaiting reply', 'بانتظار الرد')
}
