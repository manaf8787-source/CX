import { beforeAll, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import type { Interaction, RoleId } from '@/types'
import { Timeline } from './Timeline'

beforeAll(() => preferReducedMotion())

const base: Omit<Interaction, 'id' | 'channel' | 'text'> = {
  personKey: 'p1',
  sourceRef: 'r',
  direction: 'inbound',
  occurredAt: '2026-11-10T09:00:00Z',
  product: 're',
  environment: 'Dubai',
  language: 'en',
  problemFlags: [],
}
const interactions: Interaction[] = [
  { ...base, id: 'w', channel: 'whatsapp', text: 'SECRET-CHAT-TEXT' },
  { ...base, id: 'c', channel: 'call', occurredAt: '2026-11-11T09:00:00Z', text: 'SECRET-CALL-TRANSCRIPT' },
]

const renderAs = (role: RoleId) => renderWithProviders(<Timeline interactions={interactions} />, { role })

describe('Timeline role gating (NFR-2, FR-2.9)', () => {
  it.each<RoleId>(['cxmgr', 'cxteam'])('%s sees conversation text', (role) => {
    renderAs(role)
    expect(screen.getByText('SECRET-CHAT-TEXT')).toBeInTheDocument()
  })

  it.each<RoleId>(['exec', 'envmgmt', 'teamlead', 'marketing', 'hrmgr', 'auditmkt'])('%s never sees conversation text', (role) => {
    renderAs(role)
    expect(screen.queryByText('SECRET-CHAT-TEXT')).not.toBeInTheDocument()
  })

  it('never shows a call transcript, even to the CX manager', () => {
    renderAs('cxmgr')
    expect(screen.queryByText('SECRET-CALL-TRANSCRIPT')).not.toBeInTheDocument()
  })
})
