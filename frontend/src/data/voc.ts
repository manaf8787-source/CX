import type { AlertItem, ProductId, VocRow } from '../types'

// Sample data only (every number here is a placeholder, same convention as
// the prototype's "figures are samples" banner) — but internally consistent:
// each product's TREND ending value matches the NPS you'd compute by
// aggregating its VOC rows below.
export const VOC: VocRow[] = [
  // Real Estate — live
  { product: 're', channel: 'digital', n: 420, promoters: 210, passives: 126, detractors: 84, csat: 78 },
  { product: 're', channel: 'call', n: 310, promoters: 140, passives: 93, detractors: 77, csat: 71 },
  { product: 're', channel: 'branch', n: 0, promoters: 0, passives: 0, detractors: 0, csat: 0 }, // QR channel not live yet
  { product: 're', channel: 'app', n: 260, promoters: 145, passives: 68, detractors: 47, csat: 80 },

  // After-Sales — live
  { product: 'af', channel: 'call', n: 540, promoters: 216, passives: 183, detractors: 141, csat: 68 },
  { product: 'af', channel: 'digital', n: 180, promoters: 90, passives: 54, detractors: 36, csat: 74 },

  // PSI Club — built, hidden until launch
  { product: 'cl', channel: 'digital', n: 60, promoters: 39, passives: 15, detractors: 6, csat: 86 },
  { product: 'cl', channel: 'event', n: 40, promoters: 28, passives: 9, detractors: 3, csat: 89 },

  // Tour Estate — built, hidden until launch
  { product: 'to', channel: 'app', n: 95, promoters: 57, passives: 28, detractors: 10, csat: 83 },
  { product: 'to', channel: 'event', n: 50, promoters: 30, passives: 15, detractors: 5, csat: 82 },

  // PSI Events — built, hidden until launch
  { product: 'ev', channel: 'event', n: 70, promoters: 38, passives: 22, detractors: 10, csat: 77 },
  { product: 'ev', channel: 'digital', n: 30, promoters: 15, passives: 10, detractors: 5, csat: 72 },
]

export function vocFor(product: ProductId): VocRow[] {
  return VOC.filter((r) => r.product === product)
}

// Six-month NPS trend per product, most recent last.
export const TREND: Record<ProductId, number[]> = {
  re: [22, 25, 24, 28, 30, 29],
  af: [10, 12, 14, 16, 17, 18],
  cl: [50, 52, 55, 56, 57, 58],
  to: [40, 43, 45, 47, 49, 50],
  ev: [30, 33, 35, 36, 37, 38],
}

export const ALERTS: AlertItem[] = [
  { level: 'crit', product: 'af', text: { en: '3 handover cases breached the resolve SLA this week', ar: '3 حالات تسليم تجاوزت اتفاقية مستوى الخدمة هذا الأسبوع' } },
  { level: 'warn', product: 're', text: { en: 'Gallery-not-staffed reports are rising in Dubai', ar: 'بلاغات عدم تواجد موظفين في المعرض ترتفع في دبي' } },
  { level: 'good', product: 're', text: { en: 'App-channel NPS is up 5 points over last month', ar: 'ارتفع مؤشر NPS لقناة التطبيق 5 نقاط خلال الشهر الماضي' } },
  { level: 'crit', product: 'af', text: { en: '2 incidents have been waiting on the customer for 3+ days', ar: 'حادثتان بانتظار رد العميل منذ 3 أيام أو أكثر' } },
]
