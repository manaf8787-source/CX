import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { PRODUCTS } from '@/data/products'
import { WALLET_SIGNALS_NO_SURVEY } from '@/data/v38Reference'
import type { ProductId, RoleId } from '@/types'
import ProductPage from './ProductPage'

/** v42.3 and v42.4 F35: the PSI Wallet product page, "When this product asks" and "Signals, no survey" (docs/V42_WALLET.md). */

beforeAll(() => preferReducedMotion())

const T = { timeout: 8000 }
const wallet = PRODUCTS.find((p) => p.id === 'wl')!

// The launch list is edited in place (the Product launch switch): put the Wallet back to "not launched" after each test.
afterEach(() => {
  wallet.live = false
})

function open(product: ProductId, { role = 'cxmgr', lang = 'en' }: { role?: RoleId; lang?: 'en' | 'ar' } = {}) {
  return renderWithProviders(<ProductPage />, { role, lang, route: `/products/${product}`, path: '/products/:productId', routes: [{ path: '/home', element: <p>Home page</p> }] })
}

const cardOf = (title: string) => screen.getByText(title).closest<HTMLElement>('[data-slot="card"]')!

describe('PSI Wallet product page: "When this product asks" (v42.3 F35)', () => {
  it('shows the four moments of the Wallet review, verbatim', async () => {
    open('wl')
    await screen.findByText('When this product asks', {}, T)
    const card = within(cardOf('When this product asks'))
    expect(card.getByText('Wallet created (screens 12 to 13), a call with the advisor (48), a property added (51)')).toBeInTheDocument()
    const boxes = card.getAllByRole('term').map((dt) => [dt.textContent, dt.nextElementSibling?.textContent])
    expect(boxes).toEqual([
      ['NPS', 'On the Dashboard (13) about 30 days after the wallet was created, then yearly; never at a touchpoint'],
      ['CSAT', 'After the call with the advisor (48): "How satisfied were you with your call with your advisor?" 1 to 5'],
      ['CES', 'After the wallet is created (13): "The wallet was easy to set up" 1 to 7. After a property is added (51): "Adding my property was easy" 1 to 7, tagged single or bulk'],
      [
        '"What stopped you?"',
        'One rating and one optional comment per touchpoint, never two questions. CES 4 or less, CSAT 3 or less: a short "What went wrong?" opens; a low call score also notifies the advisor team. High scores: "Thanks" only.',
      ],
    ])
    expect(card.getByText('PSI Wallet app only; indicators on Wallet’s own line')).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'All surveys' })).toHaveAttribute('href', '/settings/surveys')
    // the pilot wording it replaced is gone
    expect(screen.queryByText(/Investor onboarded with properties and documents added/)).not.toBeInTheDocument()
    expect(screen.queryByText(/After a suggestion is acted on/)).not.toBeInTheDocument()
  })

  it('leaves the other products as they were', async () => {
    open('re')
    await screen.findByText('When this product asks', {}, T)
    const card = within(cardOf('When this product asks'))
    expect(card.getByText('Sale or tenancy contract signed; handover; renewal')).toBeInTheDocument()
    expect(card.getByText('After an agent call over 2 min, a viewing, a valuation, a handover visit, a branch visit')).toBeInTheDocument()
  })
})

describe('PSI Wallet product page: "Signals, no survey" (v42.4 F35)', () => {
  it('lists the seven moments and the signal each becomes, under the heading and the hint of the prototype', async () => {
    open('wl')
    await screen.findByText('Signals, no survey', {}, T)
    const card = within(cardOf('Signals, no survey'))
    expect(card.getByText('From the approved design (85 screens). Each becomes a signal in the portal; nothing is asked of the investor.')).toBeInTheDocument()
    expect(card.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Moment (screen)', 'Signal'])
    const rows = card.getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))).toEqual(WALLET_SIGNALS_NO_SURVEY.rows.map((r) => [r.moment.en, r.signal.en]))
    expect(rows).toHaveLength(7)
    expect(within(rows[0]).getByText('One "What stopped you?" once, then abandoned onboarding with the step reached')).toBeInTheDocument()
    expect(within(rows[4]).getByText('Product signal to the Wallet product owner, Information Security informed')).toBeInTheDocument()
    // a reading table: nothing to press in it
    expect(card.queryByRole('button')).not.toBeInTheDocument()
    expect(card.queryByRole('link')).not.toBeInTheDocument()
  })

  it('sits after "When this product asks", as the last block of the page', async () => {
    open('wl')
    await screen.findByText('Signals, no survey', {}, T)
    const asks = cardOf('When this product asks')
    const signals = cardOf('Signals, no survey')
    expect(asks.compareDocumentPosition(signals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(signals.nextElementSibling).toBeNull()
  })

  it('is on the Wallet page when the product is switched live', async () => {
    wallet.live = true
    open('wl')
    await screen.findByText('Signals, no survey', {}, T)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByText('Not launched — shown to CX for planning')).not.toBeInTheDocument()
    expect(within(cardOf('Signals, no survey')).getAllByRole('row')).toHaveLength(8)
    expect(screen.getByText('When this product asks')).toBeInTheDocument()
  })

  it('while the Wallet is not launched only CX reaches the page (for planning); it says so', async () => {
    open('wl', { role: 'cxteam' })
    await screen.findByText('Signals, no survey', {}, T)
    expect(screen.getByText('Not launched — shown to CX for planning')).toBeInTheDocument()
  })

  it('a role outside CX is sent home from the not-launched Wallet page: no card, nothing of the Wallet', async () => {
    open('wl', { role: 'envmgmt' })
    expect(await screen.findByText('Home page', {}, T)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/home')
    expect(screen.queryByText('Signals, no survey')).not.toBeInTheDocument()
    expect(screen.queryByText('PSI Wallet')).not.toBeInTheDocument()
  })

  for (const product of ['re', 'af', 'cl', 'to', 'ev'] as const) {
    it(`is not on the ${product} page`, async () => {
      open(product)
      await screen.findByText('When this product asks', {}, T)
      expect(screen.queryByText('Signals, no survey')).not.toBeInTheDocument()
      expect(screen.queryByText('Moment (screen)')).not.toBeInTheDocument()
      expect(screen.queryByText(/abandoned onboarding/)).not.toBeInTheDocument()
    })
  }

  it('speaks Arabic: the heading, the hint, the column headings and the rows', async () => {
    open('wl', { lang: 'ar' })
    await screen.findByText('إشارات بلا استبيان', {}, T)
    const card = within(cardOf('إشارات بلا استبيان'))
    expect(card.getByText('من التصميم المعتمد (85 شاشة). كل واحدة تصبح إشارة في البورتال؛ لا يُسأل المستثمر شيئاً.')).toBeInTheDocument()
    expect(card.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['اللحظة (الشاشة)', 'الإشارة'])
    const rows = card.getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))).toEqual(WALLET_SIGNALS_NO_SURVEY.rows.map((r) => [r.moment.ar, r.signal.ar]))
    // and "When this product asks" above it
    const asks = within(cardOf('متى يسأل هذا المنتج'))
    expect(asks.getByText('إنشاء المحفظة (الشاشتان 12 إلى 13)، مكالمة مع المستشار (48)، إضافة عقار (51)')).toBeInTheDocument()
    expect(asks.getByText('بعد المكالمة مع المستشار (48): "ما مدى رضاك عن مكالمتك مع مستشارك؟" 1 إلى 5')).toBeInTheDocument()
  })
})
