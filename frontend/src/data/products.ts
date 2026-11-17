import type { Product } from '../types'

// Colours and launch state per the knowledge base (section 25/26 of the
// Programme KB): only Real Estate and After-Sales are live; Club, Tour
// Estate and Events are built but hidden until the CX manager switches
// them on.
export const PRODUCTS: Product[] = [
  {
    id: 're',
    colorVar: '--p-re',
    name: { en: 'PSI Real Estate', ar: 'بي إس آي العقارية' },
    blurb: { en: 'Sales of units via digital, AI call center, branch gallery and app channels.', ar: 'مبيعات الوحدات عبر القنوات الرقمية ومركز الاتصال الذكي والمعرض والتطبيق.' },
    live: true,
  },
  {
    id: 'af',
    colorVar: '--p-af',
    name: { en: 'After-Sales', ar: 'ما بعد البيع' },
    blurb: { en: 'The team that calls customers after the transaction.', ar: 'الفريق الذي يتواصل مع العملاء بعد إتمام الصفقة.' },
    live: true,
  },
  {
    id: 'cl',
    colorVar: '--p-cl',
    name: { en: 'PSI Club', ar: 'نادي بي إس آي' },
    blurb: { en: 'VIP members nominate leads.', ar: 'أعضاء النادي المميزون يرشحون العملاء المحتملين.' },
    live: false,
  },
  {
    id: 'to',
    colorVar: '--p-to',
    name: { en: 'Tour Estate', ar: 'تور إستيت' },
    blurb: { en: 'Tours with guides, drivers and cars.', ar: 'جولات مع مرشدين وسائقين وسيارات.' },
    live: false,
  },
  {
    id: 'ev',
    colorVar: '--p-ev',
    name: { en: 'PSI Events', ar: 'فعاليات بي إس آي' },
    blurb: { en: 'Events and launches.', ar: 'الفعاليات وإطلاقات المشاريع.' },
    live: false,
  },
]

export function product(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function liveProducts(): Product[] {
  return PRODUCTS.filter((p) => p.live)
}
