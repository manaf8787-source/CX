import type { Product } from '../types'

/** The six products, live/hidden exactly as PROJECT_ANALYSIS.md §2 states.
 * PSI Website and the PSI Real Estate app are sources, not products, and are
 * never listed here. */
export const PRODUCTS: Product[] = [
  { id: 're', colorVar: '--p-re', live: true, name: { en: 'PSI Real Estate', ar: 'بي إس آي العقارية' }, blurb: { en: 'Sales of units — digital, AI call center, branch/gallery, app channels.', ar: 'بيع الوحدات عبر القنوات الرقمية ومركز الاتصال الذكي والمعرض والتطبيق.' } },
  { id: 'af', colorVar: '--p-af', live: true, name: { en: 'After-Sales', ar: 'ما بعد البيع' }, blurb: { en: 'Calls customers after the transaction; evaluates agent and developer.', ar: 'يتصل بالعملاء بعد إتمام الصفقة، ويقيّم الوكيل والمطوّر.' } },
  { id: 'cl', colorVar: '--p-cl', live: false, name: { en: 'PSI Club', ar: 'نادي بي إس آي' }, blurb: { en: 'VIP members nominate leads.', ar: 'أعضاء النادي المميزون يرشحون العملاء المحتملين.' } },
  { id: 'to', colorVar: '--p-to', live: false, name: { en: 'Tour Estate', ar: 'تور إستيت' }, blurb: { en: 'Tours, guides, drivers, cars — has its own CX team.', ar: 'جولات ومرشدون وسائقون وسيارات — له فريق تجربة عملاء خاص.' } },
  { id: 'ev', colorVar: '--p-ev', live: false, name: { en: 'PSI Events', ar: 'فعاليات بي إس آي' }, blurb: { en: 'Events and launches.', ar: 'الفعاليات وإطلاقات المشاريع.' } },
  { id: 'wl', colorVar: '--p-wl', live: false, name: { en: 'PSI Wallet', ar: 'محفظة بي إس آي' }, blurb: { en: "Investor's portfolio across countries, documents, cash flow.", ar: 'محفظة المستثمر عبر الدول، المستندات والتدفقات النقدية.' } },
]

export function liveProducts(): Product[] {
  return PRODUCTS.filter((p) => p.live)
}
