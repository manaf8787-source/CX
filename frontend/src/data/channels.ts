import type { Channel } from '../types'

export const CHANNELS: Channel[] = [
  { id: 'digital', name: { en: 'Digital', ar: 'رقمي' }, short: { en: 'Digital', ar: 'رقمي' } },
  { id: 'call', name: { en: 'AI call center', ar: 'مركز الاتصال الذكي' }, short: { en: 'Call', ar: 'اتصال' } },
  { id: 'branch', name: { en: 'Branch visits', ar: 'زيارات الفرع' }, short: { en: 'Branch', ar: 'فرع' } },
  { id: 'app', name: { en: 'App users', ar: 'مستخدمو التطبيق' }, short: { en: 'App', ar: 'تطبيق' } },
  { id: 'event', name: { en: 'Events', ar: 'الفعاليات' }, short: { en: 'Event', ar: 'فعالية' } },
]

export function channel(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id)
}
