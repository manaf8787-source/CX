import { CHANNEL_LABEL } from '@/components/customers/channels'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import { classifyRunaway, RUNAWAY_TYPE_LABEL, type RunawayClassification } from '@/utils/runaway'
import type {
  Bi,
  ChannelId,
  CorrectiveActionKind,
  EffortSummary,
  Interaction,
  Person,
  ProblemFlag,
  RunawayType,
} from '@/types'

/**
 * Modules KB §13: the assistant "filters people from the CRM and every
 * channel, explains what happened, builds a corrective action plan, or a
 * campaign brief". It "reads the same registers as the ten agents and never
 * computes a number of its own" — every list and count below is filtered out
 * of the same sample records the pages read.
 */

export interface AssistantPerson {
  id: string
  name: string
  reason: Bi
  reachVia: Bi
}

export interface PlanLine {
  flag: ProblemFlag
  fault: Bi
  count: number
  kind: CorrectiveActionKind
  owner: Bi
}

export interface CampaignBriefDraft {
  title: Bi
  who: Bi
  segmentSize: number
  channelSplit: { channel: ChannelId; count: number }[]
  languageSplit: { en: number; ar: number }
  message: Bi
  timing: Bi
  whatNotToDo: Bi
}

export interface IntentResult {
  text: Bi
  people?: AssistantPerson[]
  plan?: PlanLine[]
  brief?: CampaignBriefDraft
  matchedPersonId?: string
}

export interface IntentData {
  persons: Person[]
  interactions: Interaction[]
  effortSummaries: EffortSummary[]
}

const RUNAWAY_WORDS: [RunawayType, RegExp][] = [
  ['silent_lead', /silent|went quiet|stopped answer|صامت|صمت|توقف/],
  ['did_not_renew', /did not renew|didn.t renew|not renew|renew|لم يجدد|تجديد/],
  ['dormant_owner', /dormant|خامل/],
  ['went_to_competitor', /competitor|منافس/],
  ['frozen_deal', /frozen|stalled|مجمد|متوقف/],
  ['complained_then_left', /complained|اشتكى/],
]

const CHANNEL_WORDS: [ChannelId, RegExp][] = [
  ['whatsapp', /whatsapp|واتساب/],
  ['app', /\bapp\b|تطبيق/],
  ['website', /website|web site|الموقع/],
  ['call', /\bcall(ed)?\b|phone|اتصال|مكالمة/],
  ['email', /email|بريد/],
  ['branch', /branch|gallery|فرع|معرض/],
]

const FAULT_WORDS: [ProblemFlag, RegExp][] = [
  ['slow_reply', /late|slow|delay|متأخر|بطء|بطيء/],
  ['promise_not_kept', /promise|وعد/],
  ['forced_channel_switch', /channel switch|switch(ed)? channel|تبديل/],
  ['wrong_language', /language|لغة/],
  ['hand_off', /hand.?off|passed between|تسليم/],
  ['repeat_contact', /repeat|تكرار|متكرر/],
  ['detractor', /detractor|منتقد/],
]

const ENVIRONMENTS: [string, RegExp][] = [
  ['Dubai', /dubai|دبي/],
  ['Abu Dhabi', /abu dhabi|أبوظبي|ابوظبي/],
  ['PSI Assets', /psi assets|assets|rental|rentals|الأصول|للأصول|التأجير/],
]

const TENANT_WORDS = /tenant|مستأجر/
const LEAD_WORDS = /\blead|عملاء محتملين|عميل محتمل/

/** Who receives a fix for each fault, by kind — KB §6 classification table
 * (service and behaviour → the team's manager; training gap → L&D and the
 * environment champion; process → whoever owns it; product and app → product
 * owner and IT; marketing → the Internal Audit and Marketing Lead first).
 * Exact titles per product come from the escalation matrix, still pending. */
export const FAULT_ROUTE: Record<ProblemFlag, { kind: CorrectiveActionKind; owner: Bi }> = {
  slow_reply: { kind: 'service_behaviour', owner: { en: 'Sales manager of the environment', ar: 'مدير مبيعات البيئة' } },
  promise_not_kept: { kind: 'service_behaviour', owner: { en: 'Sales manager of the environment', ar: 'مدير مبيعات البيئة' } },
  detractor: { kind: 'service_behaviour', owner: { en: 'Sales manager of the environment', ar: 'مدير مبيعات البيئة' } },
  wrong_language: { kind: 'training_gap', owner: { en: 'L&D manager and the environment champion', ar: 'مدير التعلم والتطوير وممثل البيئة' } },
  unapproved_discount: { kind: 'training_gap', owner: { en: 'L&D manager and the environment champion', ar: 'مدير التعلم والتطوير وممثل البيئة' } },
  forced_channel_switch: { kind: 'process', owner: { en: 'Owner of the channel process', ar: 'مالك عملية القناة' } },
  hand_off: { kind: 'process', owner: { en: 'Owner of the hand-off process', ar: 'مالك عملية التسليم بين الفرق' } },
  repeat_contact: { kind: 'process', owner: { en: 'Owner of the process', ar: 'مالك العملية' } },
  ivr_complaint_not_logged: { kind: 'product_app', owner: { en: 'Product owner and IT', ar: 'مالك المنتج وتقنية المعلومات' } },
  silence: { kind: 'marketing', owner: { en: 'Internal Audit and Marketing Lead, then Marketing', ar: 'مسؤول التدقيق الداخلي والتسويق، ثم التسويق' } },
}

function flagLabel(flag: ProblemFlag): Bi {
  return JOURNEY_RULES.find((r) => r.id === flag)?.label ?? { en: 'Detractor', ar: 'منتقد' }
}

function classifyAll(data: IntentData) {
  const byPerson = new Map<string, Interaction[]>()
  for (const i of data.interactions) byPerson.set(i.personKey, [...(byPerson.get(i.personKey) ?? []), i])
  const effort = new Map(data.effortSummaries.map((e) => [e.personId, e]))
  const result = new Map<string, RunawayClassification>()
  for (const p of data.persons) {
    const c = classifyRunaway(p, effort.get(p.id), byPerson.get(p.id) ?? [])
    if (c) result.set(p.id, c)
  }
  return { byPerson, result }
}

function findNamedPerson(query: string, persons: Person[]): Person | undefined {
  return persons.find((p) => {
    const first = p.name.split(' ')[0].toLowerCase()
    return query.includes(p.name.toLowerCase()) || (first.length > 2 && new RegExp(`\\b${first}\\b`).test(query))
  })
}

interface Filters {
  runaway: RunawayType[]
  anyRunaway: boolean
  channels: ChannelId[]
  faults: ProblemFlag[]
  environment?: string
  type?: 'lead' | 'customer'
}

function readFilters(query: string): Filters {
  return {
    runaway: RUNAWAY_WORDS.filter(([, re]) => re.test(query)).map(([t]) => t),
    anyRunaway: /\bleft\b|runaway|lost|غادر|هارب/.test(query),
    channels: CHANNEL_WORDS.filter(([, re]) => re.test(query)).map(([c]) => c),
    faults: FAULT_WORDS.filter(([, re]) => re.test(query)).map(([f]) => f),
    environment: ENVIRONMENTS.find(([, re]) => re.test(query))?.[0],
    type: TENANT_WORDS.test(query) ? 'customer' : LEAD_WORDS.test(query) ? 'lead' : undefined,
  }
}

function hasFilters(f: Filters) {
  return f.runaway.length > 0 || f.anyRunaway || f.channels.length > 0 || f.faults.length > 0 || !!f.environment
}

function applyFilters(f: Filters, data: IntentData) {
  const { byPerson, result } = classifyAll(data)
  const people = data.persons.filter((p) => {
    const events = byPerson.get(p.id) ?? []
    const cls = result.get(p.id)
    if (f.environment && p.environment !== f.environment) return false
    if (f.type && p.type !== f.type) return false
    if (f.runaway.length && (!cls || !f.runaway.includes(cls.type))) return false
    if (f.anyRunaway && !f.runaway.length && !cls) return false
    if (f.channels.length && !events.some((e) => f.channels.includes(e.channel))) return false
    if (f.faults.length && !events.some((e) => e.problemFlags.some((fl) => f.faults.includes(fl)))) return false
    return true
  })
  return { people, byPerson, result }
}

function toAssistantPeople(people: Person[], result: Map<string, RunawayClassification>, byPerson: Map<string, Interaction[]>): AssistantPerson[] {
  return people.map((p) => {
    const cls = result.get(p.id)
    const flags = [...new Set((byPerson.get(p.id) ?? []).flatMap((e) => e.problemFlags))]
    const reason: Bi = cls
      ? { en: `${RUNAWAY_TYPE_LABEL[cls.type].en}: ${cls.reason.en}`, ar: `${RUNAWAY_TYPE_LABEL[cls.type].ar}: ${cls.reason.ar}` }
      : flags.length
        ? { en: flags.map((f) => flagLabel(f).en).join(', '), ar: flags.map((f) => flagLabel(f).ar).join('، ') }
        : { en: 'No problem recorded', ar: 'لا مشكلة مسجّلة' }
    return { id: p.id, name: p.name, reason, reachVia: CHANNEL_LABEL[p.preferredChannel] }
  })
}

function describeFilters(f: Filters): Bi {
  const parts: Bi[] = []
  if (f.runaway.length) parts.push({ en: f.runaway.map((r) => RUNAWAY_TYPE_LABEL[r].en.toLowerCase()).join(' or '), ar: f.runaway.map((r) => RUNAWAY_TYPE_LABEL[r].ar).join(' أو ') })
  else if (f.anyRunaway) parts.push({ en: 'who left', ar: 'غادروا' })
  if (f.channels.length) parts.push({ en: `on ${f.channels.map((c) => CHANNEL_LABEL[c].en).join(' or ')}`, ar: `عبر ${f.channels.map((c) => CHANNEL_LABEL[c].ar).join(' أو ')}` })
  if (f.faults.length) parts.push({ en: `with ${f.faults.map((x) => flagLabel(x).en.toLowerCase()).join(' or ')}`, ar: `مع ${f.faults.map((x) => flagLabel(x).ar).join(' أو ')}` })
  if (f.environment) parts.push({ en: `in ${f.environment}`, ar: `في ${f.environment}` })
  return { en: parts.map((p) => p.en).join(', '), ar: parts.map((p) => p.ar).join('، ') }
}

function buildPlan(people: Person[], byPerson: Map<string, Interaction[]>): PlanLine[] {
  const counts = new Map<ProblemFlag, number>()
  for (const p of people) for (const e of byPerson.get(p.id) ?? []) for (const f of e.problemFlags) counts.set(f, (counts.get(f) ?? 0) + 1)
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([flag, count]) => ({ flag, count, fault: flagLabel(flag), ...FAULT_ROUTE[flag] }))
}

function buildBrief(people: Person[], f: Filters): CampaignBriefDraft {
  const channels = new Map<ChannelId, number>()
  for (const p of people) channels.set(p.preferredChannel, (channels.get(p.preferredChannel) ?? 0) + 1)
  const label = describeFilters(f)
  const typeLabel = f.runaway.length ? RUNAWAY_TYPE_LABEL[f.runaway[0]] : { en: 'people in this segment', ar: 'الأشخاص في هذه الشريحة' }
  return {
    title: { en: `Win-back: ${typeLabel.en}`, ar: `استعادة: ${typeLabel.ar}` },
    who: { en: `${people.length} ${label.en || 'people'} (sample data)`, ar: `${people.length} ${label.ar || 'شخص'} (بيانات تجريبية)` },
    segmentSize: people.length,
    channelSplit: [...channels.entries()].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
    languageSplit: { en: people.filter((p) => p.language === 'en').length, ar: people.filter((p) => p.language === 'ar').length },
    message: {
      en: '[Proposed] Acknowledge what went wrong on their record, then offer one named contact. Marketing writes the final wording in both languages.',
      ar: '[مقترح] الاعتراف بما حدث خطأً في سجلهم، ثم تقديم جهة اتصال واحدة باسمها. يكتب التسويق الصياغة النهائية باللغتين.',
    },
    timing: {
      en: 'On the channel each person used last, in their language, inside working hours.',
      ar: 'عبر آخر قناة استخدمها كل شخص، بلغته، ضمن ساعات العمل.',
    },
    whatNotToDo: {
      en: 'No public channels; no unapproved discounts (standard M-20); nobody still on this month’s close-the-loop call list; respect the survey caps.',
      ar: 'لا قنوات عامة؛ لا خصومات غير معتمدة (المعيار M-20)؛ لا أحد ما زال في قائمة اتصال إغلاق الحلقة لهذا الشهر؛ احترام حدود الاستبيانات.',
    },
  }
}

/** Returns null when the query is not one of the §13 intents, so the
 * existing count answers in assistantEngine.ts still apply. */
export function answerIntent(query: string, data: IntentData): IntentResult | null {
  // "Why did Rashid go quiet?" — the journey reading for one person.
  if (/\bwhy\b|لماذا/.test(query)) {
    const person = findNamedPerson(query, data.persons)
    if (person) {
      const { byPerson, result } = classifyAll(data)
      const cls = result.get(person.id)
      const events = [...(byPerson.get(person.id) ?? [])].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      const problems = events.filter((e) => e.problemFlags.length)
      const list = problems
        .slice(0, 4)
        .map((e) => ({ en: `${e.occurredAt.slice(0, 10)} ${e.problemFlags.map((f) => flagLabel(f).en).join(', ')}`, ar: `${e.occurredAt.slice(0, 10)} ${e.problemFlags.map((f) => flagLabel(f).ar).join('، ')}` }))
      return {
        matchedPersonId: person.id,
        text: {
          en: `${person.name}: ${cls ? `${RUNAWAY_TYPE_LABEL[cls.type].en}. ${cls.reason.en}` : 'not classified as a runaway.'}${list.length ? `\nWhat went wrong: ${list.map((l) => l.en).join('; ')}.` : '\nNo problem events on the record.'}`,
          ar: `${person.name}: ${cls ? `${RUNAWAY_TYPE_LABEL[cls.type].ar}. ${cls.reason.ar}` : 'غير مصنَّف كعميل هارب.'}${list.length ? `\nما الذي حدث خطأً: ${list.map((l) => l.ar).join('؛ ')}.` : '\nلا أحداث مشكلات في السجل.'}`,
        },
      }
    }
  }

  // "Cases similar to Priya" — same persona and same runaway type.
  if (/similar|like |مشابه|مثل/.test(query)) {
    const person = findNamedPerson(query, data.persons)
    if (person) {
      const { byPerson, result } = classifyAll(data)
      const cls = result.get(person.id)
      const similar = data.persons.filter(
        (p) => p.id !== person.id && p.personaId === person.personaId && result.get(p.id)?.type === cls?.type,
      )
      return {
        text: {
          en: `${similar.length} people share ${person.name}’s persona${cls ? ` and runaway type (${RUNAWAY_TYPE_LABEL[cls.type].en})` : ''}.`,
          ar: `${similar.length} أشخاص يشاركون ${person.name} الشخصية${cls ? ` ونوع الهروب (${RUNAWAY_TYPE_LABEL[cls.type].ar})` : ''}.`,
        },
        people: toAssistantPeople(similar, result, byPerson),
      }
    }
  }

  const filters = readFilters(query)
  const wantsPlan = /\bplan\b|خطة/.test(query)
  const wantsCampaign = /campaign|حملة/.test(query)
  if (!wantsPlan && !wantsCampaign && !hasFilters(filters)) return null
  // A bare count question ("runaway count") stays with the count answers.
  if (!wantsPlan && !wantsCampaign && /\bhow many\b|\bcount\b|كم عدد/.test(query)) return null

  const scoped = hasFilters(filters) ? filters : { ...filters, anyRunaway: true }
  const { people, byPerson, result } = applyFilters(scoped, data)
  const label = describeFilters(scoped)
  const assistantPeople = toAssistantPeople(people, result, byPerson)

  if (wantsCampaign) {
    const brief = buildBrief(people, scoped)
    return {
      text: {
        en: `Campaign brief for ${people.length} people ${label.en}. Review it, then save it for Marketing.`,
        ar: `ملخص حملة لـ ${people.length} شخصاً ${label.ar}. راجعه ثم احفظه للتسويق.`,
      },
      people: assistantPeople,
      brief,
    }
  }
  if (wantsPlan) {
    const plan = buildPlan(people, byPerson)
    return {
      text: {
        en: `${people.length} people ${label.en}. ${plan.length} repeated fault${plan.length === 1 ? '' : 's'} → one proposed action each, with its owner by title. Nothing starts until the owner approves.`,
        ar: `${people.length} شخصاً ${label.ar}. ${plan.length} خطأً متكرراً ← إجراء مقترح واحد لكل منها مع مالكه حسب المسمى. لا يبدأ شيء قبل موافقة المالك.`,
      },
      people: assistantPeople,
      plan,
    }
  }
  return {
    text: {
      en: people.length ? `${people.length} people ${label.en}, each with the reason and the channel to reach them on.` : `Nobody in the sample data ${label.en}.`,
      ar: people.length ? `${people.length} شخصاً ${label.ar}، مع السبب والقناة المناسبة للتواصل مع كل منهم.` : `لا أحد في البيانات التجريبية ${label.ar}.`,
    },
    people: assistantPeople,
  }
}
