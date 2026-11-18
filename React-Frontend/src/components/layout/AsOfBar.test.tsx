import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { AsOfBar } from './AsOfBar'

beforeAll(() => preferReducedMotion())

const bar = () => screen.getByRole('region', { name: 'Data freshness and environment' })

describe('"Data as of" bar and environment switch (v40 F14)', () => {
  it('shows when the data is as of, the late feed chip as a link to Data feeds, and the Environment select', async () => {
    renderWithProviders(<AsOfBar />, { role: 'cxmgr' })
    expect(within(bar()).getByText(/Data as of/)).toBeInTheDocument()
    const chip = await within(bar()).findByRole('link', { name: '1 feed late or missing' }, { timeout: 8000 })
    expect(chip).toHaveAttribute('href', '/settings/feeds')
    expect(within(bar()).getByText('Environment')).toBeInTheDocument()
    const select = within(bar()).getByRole('combobox')
    expect(select).toHaveTextContent('All environments')
    expect(select).toHaveAccessibleName('Environment')
  })

  it('describes what the switch narrows, and what it does not (decided 18 Nov: fixes and the call list are narrowed)', () => {
    renderWithProviders(<AsOfBar />, { role: 'cxmgr' })
    const hint = document.getElementById('asof-env-hint')!
    expect(hint.textContent).toMatch(/fixes/)
    expect(hint.textContent).toMatch(/call list/)
    expect(hint.textContent).toMatch(/Indicators per product are not narrowed/)
    expect(within(bar()).getByRole('combobox')).toHaveAccessibleDescription(hint.textContent!)
  })

  it('shows the environment that was chosen before (persisted per browser)', () => {
    localStorage.setItem('psicx.env', 'ast')
    renderWithProviders(<AsOfBar />, { role: 'cxmgr' })
    expect(within(bar()).getByRole('combobox')).toHaveTextContent('PSI Assets (rental)')
  })

  it('does not link the chip for a role that cannot open Data feeds, and shows it as plain text', async () => {
    renderWithProviders(<AsOfBar />, { role: 'teamlead' })
    expect(await within(bar()).findByText('1 feed late or missing', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(within(bar()).queryByRole('link')).not.toBeInTheDocument()
  })

  it('a role fixed to one environment sees a chip with its name, not a select', () => {
    localStorage.setItem('psicx.env', 'auh')
    renderWithProviders(<AsOfBar />, { role: 'envmgmt' })
    expect(within(bar()).getByText('Dubai')).toBeInTheDocument()
    expect(within(bar()).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(bar()).getByText('Your role is limited to this environment.')).toBeInTheDocument()
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<AsOfBar />, { role: 'cxmgr', lang: 'ar' })
    const region = screen.getByRole('region', { name: 'حداثة البيانات والبيئة' })
    expect(within(region).getByText(/البيانات حتى/)).toBeInTheDocument()
    expect(await within(region).findByText('تغذية واحدة متأخرة أو مفقودة', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(within(region).getByRole('combobox')).toHaveTextContent('كل البيئات')
  })
})
