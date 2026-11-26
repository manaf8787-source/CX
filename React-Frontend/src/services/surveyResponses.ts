import type { Bi, EnvId, ProductId, VocDetailRow } from '../types'
import { seededRandom, intBetween, pick } from '../utils/random'

/**
 * Every survey answer, one row each (26 Nov, owner): the table behind the NPS, CSAT and CES tiles on Home. Clicking a tile opens
 * it; it filters and exports with everything about the answer: the survey and its rule, the moment that triggered it, the score,
 * the customer (name, mobile, age, persona, type, nationality), the environment, the agent, the date and the time.
 *
 * NPS rows are generated from the per-environment survey rows (`VocDetailRow`), so the table count and the tile's NPS always
 * agree: n answers per row, split exactly into promoters, passives and detractors. A signed lease in PSI Assets is a completed
 * transaction (data/npsMilestones.ts) and its answers are in the table like a sale's. CSAT and CES rows follow the same rows at a
 * smaller volume (one moment answered per survey). Sample only: a separate seed, so the rest of the sample does not move.
 */

export type ResponseInstrument = 'nps' | 'csat' | 'ces'
export type ResponseGroup = 'promoter' | 'passive' | 'detractor'

export interface SurveyResponse {
  id: string
  /** ISO date and time the answer arrived. */
  answeredAt: string
  instrument: ResponseInstrument
  /** NPS 0 to 10; CSAT 1 to 5; CES 1 to 7. */
  score: number
  /** Promoter / passive / detractor for NPS; satisfied (4-5) / neutral (3) / unsatisfied (1-2) for CSAT; easy / neutral / hard for CES. */
  group: ResponseGroup
  surveyName: Bi
  /** The survey rule that sent it (trigger and cap). */
  surveyRule: Bi
  /** The moment that triggered the survey. */
  moment: Bi
  product: ProductId
  /** Unset for a product without a CRM environment (PSI Club, Tour Estate, PSI Events). */
  envId?: EnvId
  channel: string
  /** The customer's own words, when they wrote any. */
  comment?: Bi
  customer: {
    crmId: string
    name: string
    mobile: string
    email: string
    age: number
    gender: 'male' | 'female'
    nationality: Bi
    type: Bi
    persona: Bi
    vip: boolean
    language: 'en' | 'ar'
  }
  agent: string
  /** Project or unit the moment was about. */
  unit: string
  /** For a detractor: the close-the-loop call. */
  followUp?: 'called' | 'to_call' | 'recovered'
}

const b = (en: string, ar: string): Bi => ({ en, ar })

const FIRST_M = ['Omar', 'Khaled', 'Yousef', 'Tariq', 'Fadi', 'Hassan', 'Zaid', 'Ahmed', 'Rami', 'Sami', 'James', 'Ivan', 'Raj', 'Ali', 'Majed']
const FIRST_F = ['Sara', 'Lina', 'Maya', 'Rana', 'Dana', 'Noura', 'Aisha', 'Lara', 'Huda', 'Reem', 'Emma', 'Olga', 'Priya', 'Mariam', 'Hala']
const LAST = [
  'Haddad',
  'Khoury',
  'Saleh',
  'Nasser',
  'Qasim',
  'Hamad',
  'Farouk',
  'Aziz',
  'Al Mansoori',
  'Al Hashimi',
  'Smith',
  'Petrov',
  'Sharma',
  'Kamal',
  'Odeh',
]
const NATIONALITIES: Bi[] = [
  b('Emirati', 'إماراتي'),
  b('Jordanian', 'أردني'),
  b('Egyptian', 'مصري'),
  b('Indian', 'هندي'),
  b('British', 'بريطاني'),
  b('Russian', 'روسي'),
  b('Lebanese', 'لبناني'),
  b('Saudi', 'سعودي'),
  b('Pakistani', 'باكستاني'),
  b('Chinese', 'صيني'),
]
const PERSONAS: Bi[] = [
  b('Overseas investor', 'مستثمر من الخارج'),
  b('First-time expat buyer', 'مشترٍ مغترب لأول مرة'),
  b('Local family renter', 'عائلة مستأجرة محلية'),
  b('Portfolio owner', 'مالك محفظة'),
  b('Comparison shopper', 'متسوق مقارن'),
  b('Referral-driven member', 'عضو عبر الإحالة'),
]
const AGENTS = ['Ahmad Saleh', 'Rania Khalil', 'Mohammed Darwish', 'Sana Yousef', 'Karim Odeh', 'Nadia Fares', 'Bilal Hamdan', 'Ola Nimer']
const UNITS = [
  'Saadiyat Lagoons',
  'Yas Acres',
  'Al Reem · Marina Square',
  'Dubai Hills · Park Ridge',
  'JVC · Belgravia',
  'Al Raha Gardens',
  'Masdar · Leila',
  'Al Ghadeer',
]

const CHANNEL_NOTE: Record<string, Bi> = {
  digital: b('Survey link (SMS / email)', 'رابط استبيان (رسالة / بريد)'),
  call: b('AI call', 'مكالمة ذكية'),
  app: b('PSI Real Estate app', 'تطبيق PSI العقارية'),
  event: b('QR at the booth', 'رمز QR عند الجناح'),
}
export const responseChannelLabel = (c: string): Bi => CHANNEL_NOTE[c] ?? b(c, c)

const NPS_RULE = b('Transactional NPS: after a completed milestone; once per 90 days per person', 'NPS معاملاتي: بعد إتمام مرحلة؛ مرة كل 90 يوماً للشخص')

/** The survey, its rule and the triggering moment, per product and completed transaction. */
function npsSurvey(r: VocDetailRow): { name: Bi; rule: Bi; moment: Bi } {
  if (r.product === 'cl')
    return {
      name: b('PSI Club · member NPS', 'نادي PSI · NPS الأعضاء'),
      rule: b('End of a nomination cycle; once per 90 days', 'نهاية دورة الترشيح؛ مرة كل 90 يوماً'),
      moment: b('Nomination cycle closed', 'إغلاق دورة الترشيح'),
    }
  if (r.product === 'to')
    return {
      name: b('Tour Estate · end-of-tour survey', 'تور إستيت · استبيان نهاية الجولة'),
      rule: b('After a completed tour only', 'بعد جولة مكتملة فقط'),
      moment: b('Tour completed', 'جولة مكتملة'),
    }
  if (r.product === 'ev')
    return {
      name: b('PSI Events · booth rating', 'فعاليات PSI · تقييم الجناح'),
      rule: b('QR rating at the booth', 'تقييم عبر QR عند الجناح'),
      moment: b('Event visit', 'زيارة فعالية'),
    }
  switch (r.milestone) {
    case 'lease':
      return { name: b('Transactional NPS · lease signed', 'NPS معاملاتي · توقيع عقد إيجار'), rule: NPS_RULE, moment: b('Lease signed', 'توقيع عقد الإيجار') }
    case 'renewal':
      return { name: b('After-Sales NPS · renewal', 'NPS ما بعد البيع · التجديد'), rule: NPS_RULE, moment: b('Lease renewed', 'تجديد العقد') }
    case 'handover':
      return r.envId === 'ast'
        ? {
            name: b('After-Sales NPS · move-in', 'NPS ما بعد البيع · الاستلام'),
            rule: NPS_RULE,
            moment: b('Move-in / keys handed over', 'الاستلام / تسليم المفاتيح'),
          }
        : { name: b('After-Sales NPS · handover', 'NPS ما بعد البيع · التسليم'), rule: NPS_RULE, moment: b('Unit handed over', 'تسليم الوحدة') }
    default:
      return { name: b('Transactional NPS · deal signed', 'NPS معاملاتي · توقيع صفقة'), rule: NPS_RULE, moment: b('Sale contract signed', 'توقيع عقد البيع') }
  }
}

const CSAT_RULE = b('CSAT + CES after a meaningful moment; once per 30 days per person', 'CSAT + CES بعد لحظة مهمة؛ مرة كل 30 يوماً للشخص')
const CSAT_MOMENTS: Record<string, Bi[]> = {
  re: [b('Viewing done', 'معاينة تمت'), b('Offer made', 'عرض قُدّم'), b('Agent call over 2 minutes', 'مكالمة وكيل فوق دقيقتين')],
  af: [b('Maintenance ticket closed', 'إغلاق تذكرة صيانة'), b('Complaint closed', 'إغلاق شكوى'), b('Statement explained', 'شرح كشف الحساب')],
}
const CSAT_LEASE_MOMENTS = [
  b('Rental viewing done', 'معاينة إيجار تمت'),
  b('Maintenance ticket closed', 'إغلاق تذكرة صيانة'),
  b('Leasing call over 2 minutes', 'مكالمة تأجير فوق دقيقتين'),
]

const COMMENTS: Record<ResponseGroup, Bi[]> = {
  promoter: [
    b('The agent answered every question within minutes.', 'أجاب الوكيل على كل الأسئلة خلال دقائق.'),
    b('Smooth paperwork, everything explained.', 'إجراءات سلسة وكل شيء موضّح.'),
    b('Keys on time and the unit was clean.', 'المفاتيح في موعدها والوحدة نظيفة.'),
  ],
  passive: [
    b('Fine overall, but I had to call twice.', 'جيد عموماً لكن اضطررت للاتصال مرتين.'),
    b('Good unit, slow replies on WhatsApp.', 'وحدة جيدة وردود بطيئة على واتساب.'),
  ],
  detractor: [
    b('Nobody called back after the viewing.', 'لم يتصل أحد بعد المعاينة.'),
    b('Maintenance took two weeks.', 'الصيانة استغرقت أسبوعين.'),
    b('The price changed after I agreed.', 'تغيّر السعر بعد موافقتي.'),
    b('Deposit refund is still pending.', 'استرداد التأمين ما زال معلّقاً.'),
  ],
}

const NOW = Date.parse('2026-11-26T06:40:00Z')
const DAY = 86_400_000

function customer(rng: () => number, r: VocDetailRow, i: number): SurveyResponse['customer'] {
  const female = rng() < 0.45
  const first = pick(rng, female ? FIRST_F : FIRST_M)
  const last = pick(rng, LAST)
  const lease = r.milestone === 'lease' || r.milestone === 'renewal' || (r.envId === 'ast' && r.milestone === 'handover')
  const type = lease
    ? b('Tenant', 'مستأجر')
    : r.product === 'cl'
      ? b('Member', 'عضو')
      : r.product === 'af'
        ? pick(rng, [b('Owner', 'مالك'), b('Investor', 'مستثمر')])
        : pick(rng, [b('Buyer', 'مشترٍ'), b('Investor', 'مستثمر'), b('Lead', 'عميل محتمل')])
  const persona = lease
    ? rng() < 0.7
      ? PERSONAS[2]
      : PERSONAS[1]
    : r.product === 'cl'
      ? PERSONAS[5]
      : pick(rng, [PERSONAS[0], PERSONAS[1], PERSONAS[3], PERSONAS[4]])
  return {
    crmId: `C-${100000 + i}`,
    name: `${first} ${last}`,
    mobile: `+971 5${intBetween(rng, 0, 8)} ${intBetween(rng, 100, 999)} ${intBetween(rng, 1000, 9999)}`,
    email: `${first}.${last.replace(/\s/g, '')}@mail.sample`.toLowerCase(),
    age: intBetween(rng, lease ? 23 : 27, lease ? 55 : 68),
    gender: female ? 'female' : 'male',
    nationality: pick(rng, NATIONALITIES),
    type,
    persona,
    vip: r.product === 'cl' || rng() < 0.06,
    language: rng() < 0.55 ? 'ar' : 'en',
  }
}

function at(rng: () => number): string {
  // within the last 90 days, between 08:00 and 22:00 Gulf time
  const day = intBetween(rng, 0, 89)
  const minutes = intBetween(rng, 8 * 60, 22 * 60)
  const d = new Date(NOW - day * DAY)
  d.setUTCHours(0, 0, 0, 0)
  return new Date(d.getTime() + (minutes - 240) * 60_000).toISOString()
}

/** NPS bucket counts of one survey row, in order: promoters, passives, detractors. */
function npsScores(r: VocDetailRow): { score: number; group: ResponseGroup }[] {
  const out: { score: number; group: ResponseGroup }[] = []
  for (let i = 0; i < r.promoters; i++) out.push({ score: i % 3 === 0 ? 9 : 10, group: 'promoter' })
  for (let i = 0; i < r.passives; i++) out.push({ score: i % 2 ? 7 : 8, group: 'passive' })
  for (let i = 0; i < r.detractors; i++) out.push({ score: [0, 2, 3, 4, 5, 5, 6, 6, 6][i % 9], group: 'detractor' })
  return out
}

export function buildSurveyResponses(rows: readonly VocDetailRow[]): SurveyResponse[] {
  const rng = seededRandom(26_112_026)
  const out: SurveyResponse[] = []
  let seq = 0
  for (const r of rows) {
    const survey = npsSurvey(r)
    const leaseSide = r.envId === 'ast'
    for (const s of npsScores(r)) {
      seq++
      const c = customer(rng, r, seq)
      out.push({
        id: `R-${String(seq).padStart(5, '0')}`,
        answeredAt: at(rng),
        instrument: 'nps',
        score: s.score,
        group: s.group,
        surveyName: survey.name,
        surveyRule: survey.rule,
        moment: survey.moment,
        product: r.product,
        envId: r.envId,
        channel: r.channel,
        comment: rng() < (s.group === 'detractor' ? 0.7 : 0.3) ? pick(rng, COMMENTS[s.group]) : undefined,
        customer: c,
        agent: pick(rng, AGENTS),
        unit: pick(rng, UNITS),
        followUp: s.group === 'detractor' ? pick(rng, ['called', 'to_call', 'recovered'] as const) : undefined,
      })
    }
    // CSAT and CES follow the moments before and after the milestone (re and af only), at a third of the volume
    const moments = leaseSide ? CSAT_LEASE_MOMENTS : CSAT_MOMENTS[r.product]
    if (!moments) continue
    const n = Math.round(r.n / 3)
    const satisfiedShare = r.csat / 100
    for (let i = 0; i < n; i++) {
      seq++
      const c = customer(rng, r, seq)
      const happy = i / n < satisfiedShare
      const csat = happy ? intBetween(rng, 4, 5) : intBetween(rng, 1, 3)
      const csatGroup: ResponseGroup = csat >= 4 ? 'promoter' : csat === 3 ? 'passive' : 'detractor'
      const moment = pick(rng, moments)
      const base = {
        surveyRule: CSAT_RULE,
        moment,
        product: r.product,
        envId: r.envId,
        channel: r.channel,
        customer: c,
        agent: pick(rng, AGENTS),
        unit: pick(rng, UNITS),
      }
      const when = at(rng)
      out.push({
        ...base,
        id: `R-${String(seq).padStart(5, '0')}`,
        answeredAt: when,
        instrument: 'csat',
        score: csat,
        group: csatGroup,
        surveyName: b(`CSAT + CES · ${moment.en.toLowerCase()}`, `CSAT + CES · ${moment.ar}`),
        comment: rng() < 0.25 ? pick(rng, COMMENTS[csatGroup]) : undefined,
        followUp: csatGroup === 'detractor' ? pick(rng, ['called', 'to_call', 'recovered'] as const) : undefined,
      })
      // the CES question sits on the same screen; most people answer both
      if (rng() < 0.8) {
        const ces = Math.max(1, Math.min(7, csat + intBetween(rng, 1, 2)))
        out.push({
          ...base,
          id: `R-${String(seq).padStart(5, '0')}-E`,
          answeredAt: when,
          instrument: 'ces',
          score: ces,
          group: ces >= 6 ? 'promoter' : ces >= 4 ? 'passive' : 'detractor',
          surveyName: b(`CSAT + CES · ${moment.en.toLowerCase()}`, `CSAT + CES · ${moment.ar}`),
        })
      }
    }
  }
  return out.sort((a, z) => z.answeredAt.localeCompare(a.answeredAt))
}

export const GROUP_LABEL: Record<ResponseInstrument, Record<ResponseGroup, Bi>> = {
  nps: { promoter: b('Promoter', 'مروّج'), passive: b('Passive', 'محايد'), detractor: b('Detractor', 'منتقد') },
  csat: { promoter: b('Satisfied', 'راضٍ'), passive: b('Neutral', 'محايد'), detractor: b('Unsatisfied', 'غير راضٍ') },
  ces: { promoter: b('Easy', 'سهل'), passive: b('Neutral', 'محايد'), detractor: b('Hard', 'صعب') },
}

export const FOLLOW_UP_LABEL: Record<NonNullable<SurveyResponse['followUp']>, Bi> = {
  called: b('Called', 'تم الاتصال'),
  to_call: b('To call', 'بانتظار الاتصال'),
  recovered: b('Recovered', 'تم استعادته'),
}

export const SCALE: Record<ResponseInstrument, string> = { nps: '0-10', csat: '1-5', ces: '1-7' }
