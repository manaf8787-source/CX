import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import ActionsLayout from './ActionsLayout'

beforeAll(() => preferReducedMotion())

const box = () => screen.getByRole('region', { name: 'Next step' })
const current = () => within(box()).getByRole('navigation', { name: 'The six steps' }).querySelector('[aria-current="step"]')!

describe('Actions page: where you are, what happens next (v40 F07)', () => {
  it.each([
    ['/actions/signals', '2 Signal', 'Signals that cross the line become a pattern; a pattern gets one suggested fix'],
    ['/actions/investigations', '3 Pattern', 'Interviews or a shopper check come back as evidence; only then is a fix proposed'],
    ['/actions/corrective', '4 Fix', 'Open any fix to see who must say yes and by when'],
    ['/actions/ai-insights', '4 Fix', 'Open any fix to see who must say yes and by when'],
    ['/actions/shopper-cases', '4 Fix', 'Open any fix to see who must say yes and by when'],
  ])('%s: step %s, "%s"', (route, step, text) => {
    renderWithProviders(<ActionsLayout />, { route })
    expect(box()).toHaveTextContent('Next step:')
    expect(box()).toHaveTextContent(text)
    expect(current()).toHaveTextContent(step)
  })

  it('sits above the tabs', () => {
    renderWithProviders(<ActionsLayout />, { route: '/actions/corrective' })
    const tabs = screen.getByRole('navigation', { name: 'Actions sections' })
    expect(box().compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('reads in Arabic', () => {
    renderWithProviders(<ActionsLayout />, { route: '/actions/signals', lang: 'ar' })
    expect(screen.getByRole('region', { name: 'الخطوة التالية' })).toHaveTextContent('الإشارات التي تتجاوز الحد تصبح نمطاً؛ النمط يحصل على حل واحد مقترح')
  })
})
