import type { Bi, ChannelId, ProductId } from '../types'

export interface VocComment {
  product: ProductId
  channel: ChannelId
  sentiment: 'positive' | 'neutral' | 'negative'
  theme: Bi
  text: Bi
}

export const VOC_COMMENTS: VocComment[] = [
  { product: 're', channel: 'app', sentiment: 'positive', theme: { en: 'Agent responsiveness', ar: 'استجابة الوكيل' }, text: { en: 'The agent answered every question within minutes, very impressed.', ar: 'أجاب الوكيل على كل الأسئلة خلال دقائق، انطباع رائع.' } },
  { product: 're', channel: 'branch', sentiment: 'negative', theme: { en: 'Staffing', ar: 'التوظيف' }, text: { en: 'No one at the gallery desk for almost 10 minutes.', ar: 'لا أحد عند مكتب المعرض لمدة 10 دقائق تقريباً.' } },
  { product: 'af', channel: 'call', sentiment: 'negative', theme: { en: 'Handover delay', ar: 'تأخر التسليم' }, text: { en: 'Three weeks late and nobody called to explain why.', ar: 'تأخر ثلاثة أسابيع ولم يتصل أحد لشرح السبب.' } },
  { product: 'af', channel: 'digital', sentiment: 'positive', theme: { en: 'Maintenance', ar: 'الصيانة' }, text: { en: 'Maintenance request was handled the same day, thank you.', ar: 'تمت معالجة طلب الصيانة في نفس اليوم، شكراً.' } },
  { product: 're', channel: 'digital', sentiment: 'neutral', theme: { en: 'Pricing clarity', ar: 'وضوح الأسعار' }, text: { en: 'Prices were fine but took a while to get a final quote.', ar: 'الأسعار جيدة لكن أخذ وقتاً للحصول على عرض نهائي.' } },
  { product: 'cl', channel: 'event', sentiment: 'positive', theme: { en: 'VIP treatment', ar: 'معاملة مميزة' }, text: { en: 'Felt genuinely valued as a Club member at the launch event.', ar: 'شعرت بالتقدير الحقيقي كعضو في النادي خلال فعالية الإطلاق.' } },
]
