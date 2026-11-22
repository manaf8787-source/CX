import type { Bi, EffortSummary, Interaction, Person, ProblemFlag, RunawayType } from '../types'

/** FR-3.1 — six types, each with a settings-configurable threshold. Named
 * constants here (not magic numbers in `classifyRunaway`) so a later
 * Settings → Rules page can edit them per NFR-4 without touching the logic. */
export const RUNAWAY_THRESHOLDS = {
  silentLeadDays: 30,
  dormantOwnerDays: 365,
  noFurtherBusinessDays: 60,
  frozenDealMinDays: 5,
  frozenDealMaxDays: 29,
  didNotRenewMinDays: 90,
  didNotRenewMaxDays: 364,
}

/** FR-3.5 — the agreed learning order (Programme KB §32/§33): leads that went
 * quiet first, then non-renewing tenants, then dormant owners. The other
 * three types have no stated order, so they follow after. This drives
 * default sort/emphasis, not just narrative copy. */
export const RUNAWAY_LEARNING_ORDER: RunawayType[] = [
  'silent_lead',
  'did_not_renew',
  'dormant_owner',
  'went_to_competitor',
  'frozen_deal',
  'complained_then_left',
]

export const RUNAWAY_TYPE_LABEL: Record<RunawayType, Bi> = {
  went_to_competitor: { en: 'Went to a competitor', ar: 'انتقل إلى منافس' },
  silent_lead: { en: 'Silent lead', ar: 'عميل محتمل صامت' },
  frozen_deal: { en: 'Frozen deal or payment', ar: 'صفقة أو دفعة متوقفة' },
  did_not_renew: { en: 'Did not renew', ar: 'لم يجدد' },
  dormant_owner: { en: 'Dormant owner', ar: 'مالك خامل' },
  complained_then_left: { en: 'Complained, then left', ar: 'اشتكى ثم غادر' },
}

/** Verbatim from Modules KB §5's definition table. */
export const RUNAWAY_TYPE_DEFINITION: Record<RunawayType, Bi> = {
  went_to_competitor: { en: 'Was a lead or a customer, then closed a deal with another broker or developer.', ar: 'كان عميلاً محتملاً أو عميلاً، ثم أتمّ صفقة مع وسيط أو مطوّر آخر.' },
  silent_lead: { en: 'Enquired and was contacted, then stopped answering on every channel for 30 days or more.', ar: 'استفسر وتم التواصل معه، ثم توقف عن الرد على جميع القنوات لمدة 30 يوماً أو أكثر.' },
  frozen_deal: { en: 'Booking, payment plan or handover stalled; still with PSI but nothing moves.', ar: 'توقفت عملية الحجز أو خطة الدفع أو التسليم؛ لا يزال العميل مع PSI لكن لا شيء يتحرك.' },
  did_not_renew: { en: 'Tenant whose lease ended without renewal.', ar: 'مستأجر انتهى عقده دون تجديد.' },
  dormant_owner: { en: 'Owner or investor with no contact, deal or referral for 12 months or more.', ar: 'مالك أو مستثمر دون تواصل أو صفقة أو إحالة لمدة 12 شهراً أو أكثر.' },
  complained_then_left: { en: 'Scored as a detractor or complained, then no further business.', ar: 'صُنّف كمنتقد أو قدّم شكوى، ثم لم تُسجَّل أي تعاملات لاحقة.' },
}

/**
 * The six types in everyday words (22 Nov, owner's request: he must be able to say what each one means). `meaning` is one sentence a
 * non-technical reader understands, `example` a made-up person, `rule` how the portal decides it today. `estimated` marks a type the
 * prototype can only guess, because the CRM does not yet carry the field that would settle it (a "lost reason", a lease end date).
 */
export const RUNAWAY_TYPE_PLAIN: Record<RunawayType, { meaning: Bi; example: Bi; rule: Bi; estimated?: Bi }> = {
  silent_lead: {
    meaning: { en: 'Someone who asked about a property, we replied, and then they stopped answering on every channel.', ar: 'شخص سأل عن عقار وردّينا عليه، ثم توقف عن الرد على كل القنوات.' },
    example: { en: 'Layla asked about a 2-bedroom on 3 October. We called her twice and wrote on WhatsApp. Nothing from her since.', ar: 'ليلى سألت عن شقة غرفتين يوم 3 أكتوبر. اتصلنا بها مرتين وكتبنا لها على واتساب. لا رد منذ ذلك اليوم.' },
    rule: { en: 'A lead with no contact from either side for 30 days or more.', ar: 'عميل محتمل بلا أي تواصل من الطرفين لمدة 30 يوماً أو أكثر.' },
  },
  did_not_renew: {
    meaning: { en: 'A tenant whose lease ended and who did not sign a new one.', ar: 'مستأجر انتهى عقده ولم يوقّع عقداً جديداً.' },
    example: { en: 'Omar’s lease ended in August. Nobody offered him a renewal and he moved out.', ar: 'انتهى عقد عمر في أغسطس. لم يعرض عليه أحد التجديد وانتقل.' },
    rule: { en: 'A customer with no contact for 3 to 12 months and a silence mark on the record.', ar: 'عميل بلا تواصل من 3 إلى 12 شهراً مع علامة صمت على السجل.' },
    estimated: { en: 'Estimated: the lease end date is not in the data yet.', ar: 'تقديري: تاريخ انتهاء العقد غير موجود بالبيانات بعد.' },
  },
  dormant_owner: {
    meaning: { en: 'An owner or investor we have not heard from, and who has done nothing with us, for a year or more.', ar: 'مالك أو مستثمر لم نسمع منه ولم يفعل شيئاً معنا منذ سنة أو أكثر.' },
    example: { en: 'Hind owns a unit with us. No call, no deal and no referral for 14 months.', ar: 'هند تملك وحدة لدينا. لا اتصال ولا صفقة ولا إحالة منذ 14 شهراً.' },
    rule: { en: 'An owner or investor with no contact, deal or referral for 12 months or more.', ar: 'مالك أو مستثمر بلا تواصل أو صفقة أو إحالة منذ 12 شهراً أو أكثر.' },
  },
  went_to_competitor: {
    meaning: { en: 'Someone who was a lead or a customer and bought or rented from another broker or developer.', ar: 'شخص كان عميلاً محتملاً أو عميلاً واشترى أو استأجر من وسيط أو مطوّر آخر.' },
    example: { en: 'Karim asked for a discount, was told yes, then no. Two weeks later he signed with another developer.', ar: 'كريم طلب خصماً، قيل له نعم ثم لا. بعد أسبوعين وقّع مع مطوّر آخر.' },
    rule: { en: 'A lead who stayed reachable but hit a discount, reply-time or channel problem and never converted.', ar: 'عميل محتمل بقي متاحاً لكنه واجه مشكلة خصم أو سرعة رد أو قناة ولم يتحوّل إلى صفقة.' },
    estimated: { en: 'Estimated: we only know for sure once the CRM records a “lost to a competitor” reason.', ar: 'تقديري: لن نعرف بالتأكيد إلا عندما يسجّل CRM سبب “خسرناه لمنافس”.' },
  },
  frozen_deal: {
    meaning: { en: 'A booking, a payment plan or a handover that stopped moving. The person is still with us, but nothing happens.', ar: 'حجز أو خطة دفع أو تسليم توقف عن التقدم. الشخص ما زال معنا لكن لا شيء يتحرك.' },
    example: { en: 'Dana was promised a payment plan by Friday. It is now 3 weeks later and she has heard nothing.', ar: 'وُعدت دانة بخطة دفع يوم الجمعة. مرّت 3 أسابيع ولم تسمع شيئاً.' },
    rule: { en: 'A lead with a promise that was not kept and 5 to 29 days since the last contact.', ar: 'عميل محتمل لديه وعد لم يُنفَّذ ومرّ 5 إلى 29 يوماً على آخر تواصل.' },
  },
  complained_then_left: {
    meaning: { en: 'Someone who complained or gave a very low score, and we have had no business with them since.', ar: 'شخص اشتكى أو أعطى درجة منخفضة جداً، ولم يحدث أي تعامل معه منذ ذلك الحين.' },
    example: { en: 'Sami scored us 2 out of 10 after a handover delay. Two months later there is still no contact.', ar: 'سامي أعطانا 2 من 10 بعد تأخر التسليم. بعد شهرين لا يزال بلا أي تواصل.' },
    rule: { en: 'A detractor score or complaint, then 60 days or more without business.', ar: 'درجة منتقد أو شكوى، ثم 60 يوماً أو أكثر بلا أي تعامل.' },
  },
}

export interface RunawayClassification {
  type: RunawayType
  reason: Bi
}

/**
 * Best-effort derivation from the fields the mock schema actually carries
 * (`Person.type`/`unitsOrDeals`, `EffortSummary.daysSinceLastContact`,
 * `Interaction.problemFlags`). There is no explicit "lost reason" or "lease
 * end date" field anywhere in `types/domain.ts`, so this approximates the
 * six KB definitions from available signals rather than reading a
 * ground-truth classification off the record — a real backend feed would
 * likely carry an explicit lost-reason/deal-stage field this mock doesn't.
 * Checked in priority order (most specific signal first) so a person matches
 * at most one type.
 */
export function classifyRunaway(
  person: Person,
  effort: EffortSummary | undefined,
  interactions: Interaction[],
): RunawayClassification | null {
  if (!effort) return null
  const flags = new Set<ProblemFlag>(interactions.flatMap((i) => i.problemFlags))
  const days = effort.daysSinceLastContact

  if (
    person.type === 'lead' &&
    person.unitsOrDeals === 0 &&
    days < RUNAWAY_THRESHOLDS.silentLeadDays &&
    (flags.has('unapproved_discount') || flags.has('slow_reply') || flags.has('forced_channel_switch'))
  ) {
    return {
      type: 'went_to_competitor',
      reason: {
        en: 'Lead stayed reachable but hit a discount or response problem and never converted — consistent with closing elsewhere.',
        ar: 'ظل العميل المحتمل قابلاً للتواصل لكنه واجه مشكلة خصم أو استجابة ولم يحوَّل — يتوافق مع إتمام صفقة في مكان آخر.',
      },
    }
  }
  if (
    person.type === 'lead' &&
    person.unitsOrDeals === 0 &&
    days >= RUNAWAY_THRESHOLDS.frozenDealMinDays &&
    days <= RUNAWAY_THRESHOLDS.frozenDealMaxDays &&
    flags.has('promise_not_kept')
  ) {
    return {
      type: 'frozen_deal',
      reason: { en: 'A promise was not kept and nothing has moved since.', ar: 'لم يُنفَّذ وعد ولم يتحرك شيء منذ ذلك الحين.' },
    }
  }
  if (
    person.type === 'customer' &&
    days >= RUNAWAY_THRESHOLDS.didNotRenewMinDays &&
    days <= RUNAWAY_THRESHOLDS.didNotRenewMaxDays &&
    flags.has('silence')
  ) {
    return {
      type: 'did_not_renew',
      reason: { en: 'No contact since the last renewal window, with a recorded silence flag.', ar: 'لا تواصل منذ آخر نافذة تجديد، مع علامة صمت مسجّلة.' },
    }
  }
  if (person.type === 'customer' && days >= RUNAWAY_THRESHOLDS.dormantOwnerDays) {
    return {
      type: 'dormant_owner',
      reason: { en: 'No contact, deal or referral for 12 months or more.', ar: 'لا تواصل أو صفقة أو إحالة منذ 12 شهراً أو أكثر.' },
    }
  }
  if (flags.has('detractor') && days >= RUNAWAY_THRESHOLDS.noFurtherBusinessDays) {
    return {
      type: 'complained_then_left',
      reason: { en: 'Scored as a detractor, with no further business since.', ar: 'صُنّف كمنتقد، ولم تُسجَّل تعاملات لاحقة.' },
    }
  }
  if (person.type === 'lead' && days >= RUNAWAY_THRESHOLDS.silentLeadDays) {
    return {
      type: 'silent_lead',
      reason: { en: 'Stopped answering on every channel for 30 days or more.', ar: 'توقف عن الرد على جميع القنوات لمدة 30 يوماً أو أكثر.' },
    }
  }
  return null
}

export interface FaultSummaryItem {
  flag: ProblemFlag
  count: number
}

/** FR-3.2 — "what we keep doing wrong": faults found across every person
 * currently classified as runaway, grouped by journey-rule flag. */
export function buildFaultSummary(
  persons: Person[],
  classifications: Map<string, RunawayClassification>,
  interactions: Interaction[],
): FaultSummaryItem[] {
  const classifiedIds = new Set(persons.filter((p) => classifications.has(p.id)).map((p) => p.id))
  const counts = new Map<ProblemFlag, number>()
  for (const i of interactions) {
    if (!classifiedIds.has(i.personKey)) continue
    for (const f of i.problemFlags) counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return [...counts.entries()].map(([flag, count]) => ({ flag, count })).sort((a, b) => b.count - a.count)
}
