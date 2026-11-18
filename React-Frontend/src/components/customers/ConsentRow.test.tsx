import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { ConsentRow } from './ConsentRow'

beforeAll(() => preferReducedMotion())

const row = (over: Partial<{ dncr: boolean; whatsapp: boolean; sms: boolean; email: boolean }> = {}) => ({ consent: { dncr: false, whatsapp: true, sms: true, email: true, ...over } })

describe('Consent row on a person (v40 F24)', () => {
  it('shows "Consent given" and the three channels when there is no DNCR flag', () => {
    renderWithProviders(<ConsentRow person={row()} />)
    const region = screen.getByRole('region', { name: 'Consent' })
    expect(within(region).getByText('Consent (from the CRM):')).toBeInTheDocument()
    expect(within(region).getByText('Consent given')).toBeInTheDocument()
    expect(within(region).queryByText(/DNCR ·/)).not.toBeInTheDocument()
    for (const c of ['WhatsApp', 'Email', 'SMS']) expect(within(region).getByText(c).closest('span')).toHaveTextContent(`${c}: yes`)
  })

  it('shows the critical DNCR chip and the skip reason for a DNCR person', () => {
    renderWithProviders(<ConsentRow person={row({ dncr: true })} />)
    expect(screen.getByText('DNCR · no calls, no surveys by call')).toBeInTheDocument()
    expect(screen.queryByText('Consent given')).not.toBeInTheDocument()
    expect(screen.getByText('Surveys skipped for this person, reason logged:')).toBeInTheDocument()
    expect(screen.getByText('DNCR', { selector: 'span' })).toBeInTheDocument()
  })

  it('marks a channel without consent and says no survey goes on it', () => {
    renderWithProviders(<ConsentRow person={row({ whatsapp: false })} />)
    expect(screen.getByText('WhatsApp').closest('span')).toHaveTextContent('WhatsApp: no')
    expect(screen.getByText(/No survey on WhatsApp: no consent/)).toBeInTheDocument()
  })

  it('speaks Arabic', () => {
    renderWithProviders(<ConsentRow person={row({ dncr: true })} />, { lang: 'ar' })
    expect(screen.getByText('الموافقة (من CRM):')).toBeInTheDocument()
    expect(screen.getByText('DNCR · لا مكالمات ولا استبيانات بالهاتف')).toBeInTheDocument()
  })
})
