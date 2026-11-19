import { describe, expect, it } from 'vitest'
import { AGENT_REGISTRY } from './agentRegistry'
import { WATCH_COPY, WATCH_COUNTER_LABELS, WATCH_PATH, WATCH_STEP_MS, buildWatchSteps, maskMobile, type WatchCustomer } from './watchTeam'

const customer: WatchCustomer = { name: { en: 'Nadia Haddad', ar: 'Nadia Haddad' }, mobile: '+9715•••78', env: { en: 'Abu Dhabi', ar: 'أبوظبي' } }
const steps = buildWatchSteps(customer)

describe('Watch the AI team work: the nine steps (v42 F31)', () => {
  it('has nine steps with a clock, in time order, from 09:14:02 to 09:14:08', () => {
    expect(steps).toHaveLength(9)
    expect(steps.map((s) => s.time)).toEqual(['09:14:02', '09:14:03', '09:14:04', '09:14:04', '09:14:06', '09:14:06', '09:14:07', '09:14:07', '09:14:08'])
    expect([...steps.map((s) => s.time)].sort()).toEqual(steps.map((s) => s.time))
    expect(new Set(steps.map((s) => s.id)).size).toBe(9)
  })

  it('every step has an English and an Arabic title, description and output', () => {
    for (const s of steps) {
      for (const field of ['title', 'description', 'output'] as const) {
        expect(s[field].en.trim(), `${s.id} ${field} en`).not.toBe('')
        expect(s[field].ar.trim(), `${s.id} ${field} ar`).not.toBe('')
      }
      expect(s.description.ar, `${s.id} description is Arabic`).toMatch(/[؀-ۿ]/)
      expect(s.title.ar, `${s.id} title is Arabic`).toMatch(/[؀-ۿ]/)
    }
  })

  it('names the agents in the prototype order: Source, 1, 2, 3, 5, the supervisor, 8, 10, Source', () => {
    expect(steps.map((s) => s.agent)).toEqual([null, 1, 2, 3, 5, 'supervisor', 8, 10, null])
  })

  it('every agent key is a real agent of the registry (or the supervisor)', () => {
    for (const s of steps) {
      if (s.agent === null) continue
      expect(AGENT_REGISTRY.some((a) => a.id === s.agent), `${s.id}: ${String(s.agent)}`).toBe(true)
    }
    // the seven worker steps are the agents the spec names, none of them the mystery shopper agent (4), which is not built in phase one
    expect(steps.some((s) => s.agent === 4)).toBe(false)
  })

  it('the supervisor tick is on the five worker outputs that were checked, not on Agent 10, the supervisor itself or the two Source steps', () => {
    expect(steps.map((s) => s.supervisorTick)).toEqual([false, true, true, true, true, false, true, false, false])
  })

  it('keeps the prototype wording verbatim (spot checks, English and Arabic)', () => {
    expect(steps[0].title.en).toBe('A WhatsApp message arrives')
    expect(steps[0].title.ar).toBe('تصل رسالة واتساب')
    expect(steps[2].description.en).toBe('Category: promise not kept. Reason code: callback. Evidence: the quoted sentence, and a CRM activity on Tuesday "callback promised 17:00" with no call after it. Confidence 92%.')
    expect(steps[3].output.en).toBe('SG-9001 → PT-9001')
    expect(steps[4].output).toEqual({ en: 'CA-9001 · proposed', ar: 'CA-9001 · مقترح' })
    expect(steps[5].description.en).toMatch(/^Six checks, in code, on every output above:/)
    expect(steps[5].output).toEqual({ en: '6 of 6 passed', ar: '6 من 6' })
    expect(steps[7].description.en).toMatch(/"skipped: in cap, complaint open"\.$/)
    expect(steps[8].output.en).toBe("6 seconds from message to inbox; the decision is a person's")
  })

  it('fills in the masked mobile, the customer label and the environment in the language of the reader', () => {
    expect(steps[0].description.en).toBe('From +9715•••78 on the official number: "Still waiting for the callback you promised on Tuesday."')
    expect(steps[0].description.ar).toContain('من +9715•••78 على الرقم الرسمي')
    expect(steps[1].description.en).toContain('Environment: Abu Dhabi.')
    expect(steps[1].description.ar).toContain('البيئة: أبوظبي.')
    expect(steps[1].output.en).toBe('EV-9001 · Nadia Haddad')
    expect(steps[3].description.en).toContain('Same issue in Abu Dhabi in the last 30 days')
    expect(steps[8].description.en).toContain('"Call Nadia Haddad · 2 working days"')
    expect(steps[8].description.ar).toContain('اتصل بـ Nadia Haddad · يوما عمل')
    expect(steps[8].description.en).toContain('5 promise-not-kept signals in Abu Dhabi')
  })

  it('shows a reference instead of a name when the page passes one', () => {
    const byRef = buildWatchSteps({ ...customer, name: { en: 'P-001', ar: 'P-001' } })
    expect(byRef[1].output.en).toBe('EV-9001 · P-001')
    expect(byRef[8].description.en).toContain('"Call P-001 · 2 working days"')
    expect(JSON.stringify(byRef)).not.toContain('Nadia')
  })

  it('has no sample step text that mentions a [Proposed] item', () => {
    expect(JSON.stringify(steps)).not.toContain('[Proposed]')
  })
})

describe('mobile mask', () => {
  it('shows the country code, the first digit and the last two for a role that may see mobiles', () => {
    expect(maskMobile('+971512345678', true)).toBe('+9715•••78')
    expect(maskMobile('+971 51 234 5678', true)).toBe('+9715•••78')
  })

  it('shows the country code only to a role that may not see mobiles (the Internal Audit and Marketing Lead)', () => {
    expect(maskMobile('+971512345678', false)).toBe('+971•••••••')
    expect(maskMobile('+971512345678', false)).not.toMatch(/\d{5}/)
  })

  it('does not break on a missing or short number', () => {
    expect(maskMobile(undefined, true)).toBe('+9715•••')
    expect(maskMobile('+9715', false)).toBe('+9715•••')
  })
})

describe('page copy', () => {
  it('has the path under Settings, the 750 ms step and the prototype copy', () => {
    expect(WATCH_PATH).toBe('/settings/watch-ai-team')
    expect(WATCH_STEP_MS).toBe(750)
    expect(WATCH_COPY.title).toEqual({ en: 'Watch the AI team work', ar: 'شاهد فريق الذكاء يعمل' })
    expect(WATCH_COPY.play.en).toBe('Play (6 seconds)')
    expect(WATCH_COPY.weekHeading.en).toBe('This week, by the same team')
    expect(WATCH_COPY.notHeading.en).toBe('What you will not see here')
    expect(WATCH_COPY.notText.en).toMatch(/Agreement of 9 in 10 is the gate to Limited; a critical miss in the weekly sample blocks Live\./)
  })

  it('names the eight counters in English and Arabic', () => {
    expect(Object.keys(WATCH_COUNTER_LABELS)).toEqual(['events', 'signals', 'patterns', 'fixes', 'waiting', 'sentBack', 'handedOver', 'briefs'])
    for (const [id, label] of Object.entries(WATCH_COUNTER_LABELS)) {
      expect(label.en, id).not.toBe('')
      expect(label.ar, id).toMatch(/[؀-ۿ]/)
    }
  })
})
