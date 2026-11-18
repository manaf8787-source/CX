import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { TraceHost } from './TraceHost'

beforeAll(() => preferReducedMotion())

describe('TraceHost (v40 F11)', () => {
  it('is free on every page: with no ?sg= it renders nothing and runs no query', () => {
    const { client } = renderWithProviders(<TraceHost />, { route: '/home' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('opens the signal dialog from ?sg= with its display id, and closes with Escape', async () => {
    const complaint = mock.MOCK_SIGNALS.find((s) => s.kind === 'complaint')!
    const display = `SG-${Number(complaint.id.replace(/\D/g, ''))}`
    renderWithProviders(<TraceHost />, { route: `/home?sg=${display}` })
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(display)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says so for an unknown signal instead of failing', async () => {
    renderWithProviders(<TraceHost />, { route: '/home?sg=SG-99999' })
    expect(await screen.findByText('Signal not found')).toBeInTheDocument()
  })

  it('opens a public mention by its PUB id', async () => {
    const pub = mock.MOCK_SIGNALS.find((s) => s.kind === 'public_mention')!
    renderWithProviders(<TraceHost />, { route: `/home?sg=${pub.id}` })
    expect(await screen.findByRole('dialog')).toHaveTextContent(pub.id)
  })
})
