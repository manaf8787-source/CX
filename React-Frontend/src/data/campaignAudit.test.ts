import { describe, expect, it } from 'vitest'
import * as mock from '@/services/mockData'
import type { AiInterviewCampaign } from '@/types'
import { ROLE_DEFS } from './roles'
import { ROLE_SCOPE } from './v38Reference'
import {
  AUDIT_CHECKS,
  CAMPAIGN_AUDIT_COPY,
  CHECK_IDS,
  TARGETING_LINE_PCT,
  aed,
  belowTargetingLine,
  buildAuditCampaigns,
  campaignSays,
  expectedCostPerLead,
  expectedResponses,
  pct,
  sampleResults,
} from './campaignAudit'

const ARABIC = /[؀-ۿ]/

/** The campaigns the way the app builds them: one per persona, then the AI interview campaigns. */
const campaigns = () => buildAuditCampaigns(mock.MOCK_PERSONAS, mock.MOCK_AI_CAMPAIGNS)

describe('campaign audit data (v42.1 F33)', () => {
  it('lists one Marketing campaign per persona, in persona order, then every AI interview campaign', () => {
    const list = campaigns()
    const personaCampaigns = list.filter((c) => c.kind === 'persona')
    expect(mock.MOCK_PERSONAS).toHaveLength(6)
    expect(personaCampaigns.map((c) => c.id)).toEqual(['MC-101', 'MC-102', 'MC-103', 'MC-104', 'MC-105', 'MC-106'])
    expect(personaCampaigns.map((c) => c.sourceId)).toEqual(mock.MOCK_PERSONAS.map((p) => p.id))
    const ai = list.filter((c) => c.kind === 'ai')
    expect(ai.map((c) => c.id)).toEqual(mock.MOCK_AI_CAMPAIGNS.map((c) => c.id))
    expect(ai.length).toBeGreaterThan(0)
    // the persona campaigns come first, the AI ones after them
    expect(list.map((c) => c.kind)).toEqual([...personaCampaigns.map(() => 'persona'), ...ai.map(() => 'ai')])
    expect(new Set(list.map((c) => c.id)).size).toBe(list.length)
  })

  it("takes the persona campaign's words from the persona's own recommendation", () => {
    const [first] = campaigns()
    const p = mock.MOCK_PERSONAS[0]
    expect(first.persona).toEqual(p.name)
    expect(first.name).toEqual(p.recommendation.campaignType)
    expect(first.who).toEqual(p.recommendation.targetWho)
    expect(first.channel).toEqual(p.recommendation.channelAndWhen)
    expect(first.whatNot).toEqual(p.recommendation.whatNotToDo)
    expect(first.owner).toEqual({ en: 'Marketing manager', ar: 'مدير التسويق' })
  })

  it("computes size, budget and cost per contact as the prototype does (segment x 40 + 60, (k+2) x 3,500, 3 + k mod 3)", () => {
    campaigns()
      .filter((c) => c.kind === 'persona')
      .forEach((c, k) => {
        expect(c.size, c.id).toBe(mock.MOCK_PERSONAS[k].segmentSize * 40 + 60)
        expect(c.budget, c.id).toBe((k + 2) * 3500)
        expect(c.costPerContact, c.id).toBe(3 + (k % 3))
      })
  })

  it('starts the sample in the prototype states: two running, two waiting for clearance, two finished; an AI campaign follows its status', () => {
    const stages = campaigns()
      .filter((c) => c.kind === 'persona')
      .map((c) => c.seedStage)
    expect(stages).toEqual(['running', 'running', 'before', 'before', 'after', 'after'])
    const ai = (status: AiInterviewCampaign['status']): AiInterviewCampaign => ({ id: `x-${status}`, name: { en: 'X', ar: 'س' }, segmentDescription: { en: 'S', ar: 'ش' }, script: { en: 's', ar: 'ص' }, status, memberIds: ['a', 'b', 'c'] })
    const built = buildAuditCampaigns([], [ai('draft'), ai('running'), ai('closed')])
    expect(built.map((c) => c.seedStage)).toEqual(['before', 'running', 'after'])
    expect(built[0]).toMatchObject({ kind: 'ai', size: 3, budget: 400, costPerContact: 1, persona: null, owner: { en: 'CX team', ar: 'فريق CX' } })
  })

  it('has exactly five checks, in the prototype order, each with an English and an Arabic title and rule', () => {
    expect(CHECK_IDS).toEqual(['people', 'proj', 'chan', 'msg', 'money'])
    expect(AUDIT_CHECKS.map((c) => c.title.en)).toEqual(['Right people', 'Right projects and developers', 'Right channel, language and timing', 'Right message', 'The money'])
    for (const c of AUDIT_CHECKS) {
      expect(c.title.en.trim(), c.id).not.toBe('')
      expect(c.rule.en.trim(), c.id).not.toBe('')
      expect(ARABIC.test(c.title.ar), `${c.id} title`).toBe(true)
      expect(ARABIC.test(c.rule.ar), `${c.id} rule`).toBe(true)
    }
  })

  it("keeps the prototype's rule texts word for word", () => {
    const rule = (id: string) => AUDIT_CHECKS.find((c) => c.id === id)!.rule
    expect(rule('people').en).toBe("The segment is the persona's definition, the size is from the record, consent and DNCR applied, no detractor with an open complaint")
    expect(rule('people').ar).toBe('الشريحة هي تعريف الشخصية، الحجم من السجل، الموافقة وDNCR مطبّقان، لا زبون غير راضٍ بشكوى مفتوحة')
    expect(rule('msg').en).toBe('Nothing promised that the approved sheets do not allow; no discount pushes; the "what not to do" line respected')
    expect(rule('money').ar).toBe('الميزانية وتكلفة التواصل والاستجابات المتوقعة مذكورة؛ التكلفة المتوقعة للعميل المحتمل أقل من حد المنتج')
  })

  it('says what the campaign says for every check, in both languages', () => {
    for (const c of campaigns()) {
      for (const id of CHECK_IDS) {
        const says = campaignSays(c, id)
        expect(says.en.trim(), `${c.id} ${id}`).not.toBe('')
        expect(says.ar.trim(), `${c.id} ${id} ar`).not.toBe('')
      }
    }
    const c = campaigns()[0]
    expect(campaignSays(c, 'people').en).toBe(`${c.persona!.en} · ${c.who.en} · ${c.size} people`)
    expect(campaignSays(c, 'msg').en).toBe(`${c.name.en} · not: ${c.whatNot.en}`)
    expect(campaignSays(c, 'money').en).toBe(
      `Budget ${aed(c.budget)} · AED ${c.costPerContact} per contact · ${expectedResponses(c)} expected responses · ${aed(expectedCostPerLead(c))} per expected lead`,
    )
    expect(campaignSays(c, 'money').ar).toContain('استجابة متوقعة')
  })

  it("computes the money lines as the prototype does: 12% responses, a cost per lead over 30% of them, at least one", () => {
    expect(expectedResponses({ size: 300 })).toBe(36)
    expect(expectedCostPerLead({ size: 300, budget: 3500 })).toBe(Math.round(3500 / (300 * 0.12 * 0.3)))
    // a tiny segment still divides by one
    expect(expectedCostPerLead({ size: 4, budget: 400 })).toBe(400)
    expect(aed(7000)).toBe('AED 7,000')
  })

  it('gives sample results as deterministic as the prototype’s: 71% for the two running Marketing campaigns, one run above and one below 80%', () => {
    expect(sampleResults({ id: 'MC-101', budget: 7000 })).toEqual({ reached: 0.71, responded: 0.14, leads: 9, cost: 7000 })
    expect(sampleResults({ id: 'MC-102', budget: 10500 }).reached).toBe(0.71)
    expect(pct(sampleResults({ id: 'MC-105', budget: 21000 }).reached)).toBe(86)
    expect(pct(sampleResults({ id: 'MC-106', budget: 24500 }).reached)).toBe(78)
    // an id with no seeded figure reads one derived from the id, the same every time
    expect(sampleResults({ id: 'camp-ai-9', budget: 400 })).toEqual(sampleResults({ id: 'camp-ai-9', budget: 400 }))
    expect(sampleResults({ id: 'camp-ai-9', budget: 400 }).cost).toBe(400)
  })

  it('raises a targeting signal only below 80% of the right people', () => {
    expect(TARGETING_LINE_PCT).toBe(80)
    expect(belowTargetingLine({ reached: 0.71 })).toBe(true)
    expect(belowTargetingLine({ reached: 0.79 })).toBe(true)
    expect(belowTargetingLine({ reached: 0.8 })).toBe(false)
    expect(belowTargetingLine({ reached: 0.86 })).toBe(false)
  })

  it('writes the inbox rows with the count in both languages, agreeing in number', () => {
    const w = CAMPAIGN_AUDIT_COPY.inboxWaiting
    expect(w(2)).toEqual({ en: 'Clear or send back: 2 campaigns waiting before they run', ar: 'إجازة أو إعادة: حملتان تنتظران قبل التشغيل' })
    expect(w(1).en).toBe('Clear or send back: 1 campaign waiting before it runs')
    expect(w(1).ar).toBe('إجازة أو إعادة: حملة واحدة تنتظر قبل التشغيل')
    expect(w(3).ar).toBe('إجازة أو إعادة: 3 حملات تنتظر قبل التشغيل')
    expect(w(12).ar).toBe('إجازة أو إعادة: 12 حملة تنتظر قبل التشغيل')
    const f = CAMPAIGN_AUDIT_COPY.inboxFinished
    expect(f(2)).toEqual({ en: 'Audit after the run: 2 finished campaigns', ar: 'تدقيق بعد التشغيل: حملتان انتهتا' })
    expect(f(1).en).toBe('Audit after the run: 1 finished campaign')
    expect(f(4).ar).toBe('تدقيق بعد التشغيل: 4 حملات انتهت')
  })

  it("has Arabic for every word of the page and the gates (nothing is left in English)", () => {
    const seen: string[] = []
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'function') return
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>
        if (typeof o.en === 'string' && typeof o.ar === 'string') {
          expect(o.en.trim(), path).not.toBe('')
          expect(ARABIC.test(o.ar) || /^[–-]$/.test(o.ar), `${path} needs Arabic`).toBe(true)
          seen.push(path)
          return
        }
        for (const [k, x] of Object.entries(o)) walk(x, `${path}.${k}`)
      }
    }
    walk(CAMPAIGN_AUDIT_COPY, 'copy')
    expect(seen.length).toBeGreaterThan(40)
    // the function-valued strings, with a sample argument
    for (const bi of [
      CAMPAIGN_AUDIT_COPY.kpi.waitingSub(2),
      CAMPAIGN_AUDIT_COPY.kpi.waitingSub(0),
      CAMPAIGN_AUDIT_COPY.verdictHint.locked('running', '1 Nov'),
      CAMPAIGN_AUDIT_COPY.verdictHint.locked('after', '1 Nov'),
      CAMPAIGN_AUDIT_COPY.summary.cleared('1 Nov'),
      CAMPAIGN_AUDIT_COPY.summary.sentBack('X'),
      CAMPAIGN_AUDIT_COPY.signal.text(71),
      CAMPAIGN_AUDIT_COPY.signal.none(86),
      CAMPAIGN_AUDIT_COPY.gate.blockedSentBack('X'),
    ]) {
      expect(bi.en.trim()).not.toBe('')
      expect(ARABIC.test(bi.ar)).toBe(true)
    }
  })
})

describe('the Internal Audit and Marketing Lead audits, never approves fixes (v42.1 F33, Decision 2)', () => {
  const lead = ROLE_DEFS.find((r) => r.id === 'auditmkt')!

  it("describes the role with the prototype's `ROLES.ia.d`, word for word, English and Arabic", () => {
    expect(lead.description.en).toBe(
      'Audits, never approves fixes: marks data feeds and standards as trusted; reads the audit part of the weekly sample (routing, classification, access, targeting); audits every campaign before it runs (right people, right projects and developers, right channel and message, the money) and after it ran. Sees aggregates and audit views; no cases, no conversation text, no agent names.',
    )
    expect(lead.description.ar).toBe(
      'يدقّق ولا يعتمد الحلول: يوسم تغذيات البيانات والمعايير موثوقة؛ يقرأ الجزء التدقيقي من العينة الأسبوعية (التوجيه، التصنيف، الصلاحيات، الاستهداف)؛ يدقّق كل حملة قبل تشغيلها (الأشخاص الصحيحون، المشاريع والمطورون الصحيحون، القناة والرسالة الصحيحتان، المال) وبعد تشغيلها. يرى المجاميع وصفحات التدقيق؛ لا حالات ولا نص محادثات ولا أسماء موظفين.',
    )
  })

  it('no other role says it audits campaigns', () => {
    for (const r of ROLE_DEFS.filter((d) => d.id !== 'auditmkt')) expect(r.description.en, r.id).not.toMatch(/never approves fixes/)
  })

  it('the "who uses it" table on Teams and structure says the same (Modules KB section 2, the v42 row)', () => {
    const row = ROLE_SCOPE.find((r) => r.role === 'auditmkt')!
    expect(row.pages.en).toBe('Overview, Intelligent CX team, Personas, Runaway, Standards, Monthly pack, Data feeds, Weekly sample, Campaign audit, Settings')
    expect(row.can.en).toMatch(/^Audits, never approves fixes: marks feeds and standards as trusted;/)
    expect(row.can.en).toContain('clears or sends back every campaign before it runs')
    expect(ARABIC.test(row.can.ar) && ARABIC.test(row.pages.ar) && ARABIC.test(row.sees.ar)).toBe(true)
  })
})
