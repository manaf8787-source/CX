import { describe, expect, it } from 'vitest'
import * as mock from '@/services/mockData'
import { RP_ID, buildTraceIndex, caId, chainFrom, displayId, evId, fixHasCheck, fixHasReport, invId, isDisplayId, kindOfTraceId, patternTraceIds, personRef, ptId, resolveTraceRef, sgId, traceIndexFor, traceRoute, vrId } from './trace'

const ix = () => buildTraceIndex({ interactions: mock.MOCK_INTERACTIONS, signals: mock.MOCK_SIGNALS, patterns: mock.MOCK_PATTERNS, fixes: mock.MOCK_CORRECTIVE_ACTIONS })

describe('trace display ids (v40 F10)', () => {
  it('maps internal ids to EV, SG, CA, VR, INV and RP', () => {
    expect(evId('i-0012')).toBe('EV-12')
    expect(evId('i-ctl-dcl-3-121')).toBe('EV-121')
    expect(sgId('sig-0007')).toBe('SG-7')
    expect(sgId('PUB-351')).toBe('PUB-351')
    expect(caId('ca-1')).toBe('CA-201')
    expect(vrId('ca-1')).toBe('VR-201')
    expect(invId('inv-3')).toBe('INV-3')
    expect(RP_ID).toBe('RP-2026-11')
    expect(personRef('p-005')).toBe('P-005')
    expect(displayId('event', 'i-0001')).toBe('EV-1')
    expect(displayId('report', 'anything')).toBe('RP-2026-11')
  })

  it('PT ids are PT- plus 100 to 999, from the key, and stable', () => {
    for (const key of ['same_issue:slow_response', 'same_agent:agent_3', 'environment_concentration:repeat_contact:dubai']) {
      expect(ptId(key)).toMatch(/^PT-[1-9]\d{2}$/)
      expect(ptId(key)).toBe(ptId(key))
    }
  })

  it('never gives two patterns the same PT id (the prototype hash collides), whatever the order', () => {
    const keys = Array.from({ length: 700 }, (_, i) => `same_issue:category_${i}`)
    const ids = patternTraceIds(keys)
    expect(new Set(ids.values()).size).toBe(keys.length)
    const reversed = patternTraceIds([...keys].reverse())
    for (const k of keys) expect(reversed.get(k)).toBe(ids.get(k))
  })

  it('every mock pattern has a unique PT id and a stable id equal to its key', () => {
    expect(mock.MOCK_PATTERNS.length).toBeGreaterThan(0)
    expect(new Set(mock.MOCK_PATTERNS.map((p) => p.traceId)).size).toBe(mock.MOCK_PATTERNS.length)
    for (const p of mock.MOCK_PATTERNS) {
      expect(p.id).toBe(p.key)
      expect(p.traceId).toMatch(/^PT-\d{3}$/)
    }
  })

  it('recognises each kind from a display id', () => {
    expect(kindOfTraceId('EV-12')).toBe('event')
    expect(kindOfTraceId('sg-12')).toBe('signal')
    expect(kindOfTraceId('PUB-351')).toBe('signal')
    expect(kindOfTraceId('PT-204')).toBe('pattern')
    expect(kindOfTraceId('CA-201')).toBe('fix')
    expect(kindOfTraceId('VR-201')).toBe('check')
    expect(kindOfTraceId('RP-2026-11')).toBe('report')
    expect(kindOfTraceId('i-0001')).toBeNull()
  })

  it('tells a display id from an internal id that looks like one (ca-1 is internal, CA-201 is the display id)', () => {
    expect(isDisplayId('CA-201')).toBe(true)
    expect(isDisplayId('EV-12')).toBe(true)
    expect(isDisplayId('ca-1')).toBe(false)
    expect(isDisplayId('sig-0007')).toBe(false)
    expect(isDisplayId('PT-204')).toBe(true)
    const index = ix()
    // An internal id is never read as a display id, even when upper-casing it would hit another record.
    expect(resolveTraceRef('ca-1', index)).toEqual({ kind: 'fix', id: 'ca-1' })
    const complaint = mock.MOCK_SIGNALS.find((x) => x.kind === 'complaint')!
    expect(resolveTraceRef(sgId(complaint.id).toLowerCase(), index)).toEqual({ kind: 'signal', id: complaint.id }) // a lower-case display id from a URL still resolves
  })

  it('which fix status has a check and which has a report', () => {
    expect(['proposed', 'approved', 'in_progress'].map((s) => fixHasCheck(s as never))).toEqual([false, false, false])
    expect(['verification', 'effective', 'partial', 'failed'].map((s) => fixHasCheck(s as never))).toEqual([true, true, true, true])
    expect(fixHasReport('effective')).toBe(true)
    expect(fixHasReport('failed')).toBe(true)
    expect(fixHasReport('verification')).toBe(false)
    expect(fixHasReport('partial')).toBe(false)
  })
})

describe('the sample links signals and events in both directions (v40 F10, F12)', () => {
  it('every signal lists existing events, and every event lists the signals that name it', () => {
    const index = ix()
    for (const s of mock.MOCK_SIGNALS) {
      for (const e of s.eventIds) {
        expect(index.interactionById.has(e), `${s.id} -> ${e}`).toBe(true)
        expect(index.signalsByEvent.get(e)?.some((x) => x.id === s.id)).toBe(true)
      }
    }
    expect(mock.MOCK_SIGNALS.some((s) => s.eventIds.length === 2)).toBe(true)
    expect(mock.MOCK_SIGNALS.every((s) => s.eventIds.length <= 2)).toBe(true)
  })

  it('a public mention has no person, no events, a PUB id, and is public; nothing else is public (B10)', () => {
    const publics = mock.MOCK_SIGNALS.filter((s) => s.kind === 'public_mention')
    expect(publics.length).toBeGreaterThan(0)
    for (const s of publics) {
      expect(s.isPublic).toBe(true)
      expect(s.personId).toBeUndefined()
      expect(s.eventIds).toEqual([])
      expect(s.id).toMatch(/^PUB-3\d\d$/)
      expect(s.publicReplyDueAt).toBeDefined()
    }
    for (const s of mock.MOCK_SIGNALS.filter((x) => x.kind !== 'public_mention')) {
      expect(s.isPublic).toBe(false)
      expect(s.id).toMatch(/^sig-\d{4}$/)
      expect(s.publicReplyDueAt).toBeUndefined()
    }
    expect(new Set(mock.MOCK_SIGNALS.map((s) => s.id)).size).toBe(mock.MOCK_SIGNALS.length)
  })
})

describe('chainFrom walks the chain from any record', () => {
  it('from a signal: its events, itself, the pattern it belongs to', () => {
    const index = ix()
    const s = mock.MOCK_SIGNALS.find((x) => x.kind === 'complaint' && index.patternsBySignal.has(x.id))!
    const chain = chainFrom('signal', s.id, index)!
    expect(chain.from).toEqual({ kind: 'signal', id: s.id })
    expect(chain.signals.map((x) => x.id)).toEqual([s.id])
    expect(chain.events.map((e) => e.id).sort()).toEqual([...s.eventIds].sort())
    expect(chain.pattern?.traceId).toMatch(/^PT-/)
    expect(chain.publicMention).toBe(false)
    expect(chainFrom('signal', sgId(s.id), index)?.signals[0].id).toBe(s.id) // the display id works too
  })

  it('from a public mention: no person, no events', () => {
    const index = ix()
    const s = mock.MOCK_SIGNALS.find((x) => x.kind === 'public_mention')!
    const chain = chainFrom('signal', s.id, index)!
    expect(chain.publicMention).toBe(true)
    expect(chain.events).toEqual([])
  })

  it('from an event: the signals it produced', () => {
    const index = ix()
    const s = mock.MOCK_SIGNALS.find((x) => x.eventIds.length > 0)!
    const chain = chainFrom('event', s.eventIds[0], index)!
    expect(chain.events).toHaveLength(1)
    expect(chain.signals.map((x) => x.id)).toContain(s.id)
    expect(chainFrom('event', 'i-9999', index)).toBeNull()
  })

  it('from a pattern and from a fix: the signals, the events, the fix, the check and the report derived from status', () => {
    const index = ix()
    const withFix = mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => f.patternId)
    expect(withFix.length).toBeGreaterThan(0)
    for (const f of withFix) {
      const chain = chainFrom('fix', f.id, index)!
      expect(chain.fix?.traceId).toBe(caId(f.id))
      expect(chain.pattern?.id).toBe(f.patternId)
      expect(chain.signals.length).toBe(chain.pattern!.signalCount)
      expect(Boolean(chain.check), `${f.status} check`).toBe(fixHasCheck(f.status))
      expect(Boolean(chain.report), `${f.status} report`).toBe(fixHasReport(f.status))
      if (chain.check) expect(chain.check.traceId).toBe(vrId(f.id))
      const fromPattern = chainFrom('pattern', f.patternId!, index)!
      expect(fromPattern.fix?.id).toBeDefined()
      expect(chainFrom('check', f.id, index)?.fix?.id).toBe(f.id)
    }
  })

  it('from the report: the monthly pack and a fix with a verdict', () => {
    const chain = chainFrom('report', RP_ID, ix())!
    expect(chain.report?.traceId).toBe('RP-2026-11')
    expect(chain.report?.label.en).toBe('November pack')
    expect(chain.report?.label.ar).toBe('حزمة نوفمبر')
  })

  it('resolves display ids and internal ids to the same record', () => {
    const index = ix()
    const f = mock.MOCK_CORRECTIVE_ACTIONS[0]
    expect(resolveTraceRef('CA-201', index)).toEqual({ kind: 'fix', id: f.id })
    expect(resolveTraceRef(f.id, index)).toEqual({ kind: 'fix', id: f.id })
    expect(resolveTraceRef(vrId(f.id), index)).toEqual({ kind: 'check', id: f.id })
    expect(resolveTraceRef(mock.MOCK_PATTERNS[0].traceId, index)?.kind).toBe('pattern')
    expect(resolveTraceRef('EV-1', index)).toEqual({ kind: 'event', id: 'i-0001' })
    expect(resolveTraceRef('nope', index)).toBeNull()
  })

  it('caches the index for the same registers and rebuilds when one grows in place', () => {
    const data = { interactions: [...mock.MOCK_INTERACTIONS], signals: mock.MOCK_SIGNALS, patterns: mock.MOCK_PATTERNS, fixes: [...mock.MOCK_CORRECTIVE_ACTIONS] }
    const a = traceIndexFor(data)
    expect(traceIndexFor(data)).toBe(a)
    data.fixes.push({ ...data.fixes[0], id: 'ca-999' })
    const b = traceIndexFor(data)
    expect(b).not.toBe(a)
    expect(b.byTraceId.has('CA-1199')).toBe(true)
  })

  it('says where each kind opens (a signal opens a dialog, so it has no route)', () => {
    expect(traceRoute('signal', 'sig-0001')).toBeNull()
    expect(traceRoute('fix', 'ca-1')).toBe('/actions/corrective?fix=CA-201')
    expect(traceRoute('check', 'ca-1')).toBe('/actions/corrective?fix=CA-201')
    expect(traceRoute('report', RP_ID)).toBe('/settings/monthly-pack')
    expect(traceRoute('event', 'i-0012', { personId: 'p-003' })).toBe('/customers/p-003?ev=EV-12')
    expect(traceRoute('event', 'i-0012')).toBeNull()
  })
})
