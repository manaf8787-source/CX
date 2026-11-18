import type { Bi, DataFeed, EnvId, EnvScope, FeedScope, FeedStatus } from '../types'
import type { Tone } from '../lib/status'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** Data feeds page and "Data as of" bar copy (v40 S5). */
export const FEEDS_COPY = {
  title: b('Data feeds', 'تغذيات البيانات'),
  intro: b(
    'Where every number comes from, and whether it arrived today. Three CRM environments, separate databases, each connected on its own; the rest of the sources are shared.',
    'من أين يأتي كل رقم، وهل وصل اليوم. ثلاث بيئات CRM بقواعد بيانات منفصلة، كل واحدة مربوطة لحالها؛ بقية المصادر مشتركة.',
  ),
  columns: {
    feed: b('Feed', 'التغذية'),
    environment: b('Environment', 'البيئة'),
    today: b('Today', 'اليوم'),
    lastReceived: b('Last received', 'آخر وصول'),
    records: b('Records', 'السجلات'),
    carries: b('What it carries', 'ماذا تحمل'),
  },
  shared: b('shared', 'مشتركة'),
  rule: b(
    "Rule: a number from a late feed is shown with yesterday's date, never silently. Agent 1 reconciles nightly; the Internal Audit and Marketing Lead marks a feed as trusted once a month.",
    'القاعدة: الرقم من تغذية متأخرة يُعرض بتاريخ الأمس، لا بصمت. الوكيل 1 يطابق ليلياً؛ مدير التدقيق الداخلي والتسويق يعتمد التغذية كموثوقة مرة في الشهر.',
  ),
  barDataAsOf: b('Data as of', 'البيانات حتى'),
  barAllReceived: b('All feeds received', 'كل التغذيات وصلت'),
  barEnvironment: b('Environment', 'البيئة'),
}

export const FEED_STATUS: Record<FeedStatus, { label: Bi; tone: Tone }> = {
  ok: { label: b('Received', 'وصل'), tone: 'success' },
  late: { label: b('Late', 'متأخر'), tone: 'warning' },
  down: { label: b('Not received', 'لم يصل'), tone: 'danger' },
}

/** "{n} feed late or missing": the prototype says it with a singular only; this says it for any n. */
export function lateFeedsLabel(n: number): Bi {
  return n === 1
    ? b('1 feed late or missing', 'تغذية واحدة متأخرة أو مفقودة')
    : b(`${n} feeds late or missing`, `${n} تغذيات متأخرة أو مفقودة`)
}

interface FeedSeed {
  id: string
  env?: EnvId
  name: Bi
  /** 0 = today, 1 = yesterday; then the time of day of the last file. */
  daysAgo: 0 | 1
  at: [number, number]
  status: FeedStatus
  rows: number
  note: Bi
}

/** v40 sample table (docs/V40_DELTA.md F13). All values are sample data; times are anchored to "today". */
const SEEDS: FeedSeed[] = [
  { id: 'crm_auh', env: 'auh', name: b('CRM · Abu Dhabi', 'CRM · أبوظبي'), daysAgo: 0, at: [6, 10], status: 'ok', rows: 3_728_460, note: b('Leads, activities, contacts, transactions, history', 'العملاء المحتملون، الأنشطة، جهات الاتصال، الصفقات، السجل') },
  { id: 'crm_dub', env: 'dub', name: b('CRM · Dubai', 'CRM · دبي'), daysAgo: 0, at: [6, 12], status: 'ok', rows: 1_890_213, note: b('Separate database, same business', 'قاعدة بيانات منفصلة، نفس العمل') },
  { id: 'crm_ast', env: 'ast', name: b('CRM · PSI Assets (rental)', 'CRM · PSI للأصول (التأجير)'), daysAgo: 1, at: [6, 5], status: 'late', rows: 402_118, note: b("Yesterday's file; today's not received by 07:00", 'ملف الأمس؛ ملف اليوم لم يصل حتى 07:00') },
  { id: 'wa', name: b('WhatsApp Business', 'واتساب للأعمال'), daysAgo: 0, at: [6, 40], status: 'ok', rows: 3_105, note: b('Messages, direction, reply times', 'الرسائل، الاتجاه، أزمنة الرد') },
  { id: 'ai', name: b('AI caller and IVR', 'المتصل الذكي والرد الآلي'), daysAgo: 0, at: [6, 30], status: 'ok', rows: 1_240, note: b('Calls, durations, outcomes', 'المكالمات، المدد، النتائج') },
  { id: 'app', name: b('PSI Real Estate app and PSI Website', 'تطبيق PSI العقارية وموقع PSI'), daysAgo: 0, at: [5, 50], status: 'ok', rows: 8_220, note: b('Enquiries, chats, abandoned steps, ratings', 'الاستفسارات، المحادثات، الخطوات المتروكة، التقييمات') },
  { id: 'sv', name: b('Surveys', 'الاستبيانات'), daysAgo: 0, at: [5, 30], status: 'ok', rows: 1_646, note: b('Sent, answered, skipped, with the skip reason', 'المرسلة، المجابة، المتخطاة، مع سبب التخطي') },
  { id: 'pub', name: b('Facebook, Instagram, LinkedIn, Google', 'فيسبوك، إنستغرام، لينكد إن، Google'), daysAgo: 0, at: [4, 0], status: 'ok', rows: 16, note: b('Public mentions and ratings; no person matched', 'الإشارات والتقييمات العامة؛ لا مطابقة لأشخاص') },
]

/** Builds the feed table anchored to `now` (default: the current time). */
export function buildFeeds(now: Date = new Date()): DataFeed[] {
  return SEEDS.map((s) => {
    const d = new Date(now)
    d.setDate(d.getDate() - s.daysAgo)
    d.setHours(s.at[0], s.at[1], 0, 0)
    return { id: s.id, env: s.env, name: s.name, receivedAt: d.toISOString(), status: s.status, rows: s.rows, note: s.note }
  })
}

/** Feeds in scope: every shared feed, plus the CRM feeds of the selected environment (or of all three). */
export function feedsInScope(feeds: DataFeed[], scope: EnvScope): DataFeed[] {
  return feeds.filter((f) => !f.env || scope === 'all' || f.env === scope)
}

/** "Data as of" = the latest `receivedAt` among the feeds in scope; the late count = feeds not 'ok'. */
export function summariseFeeds(feeds: DataFeed[], scope: EnvScope): FeedScope {
  const inScope = feedsInScope(feeds, scope)
  const latest = inScope.reduce<string | null>((max, f) => (max === null || f.receivedAt > max ? f.receivedAt : max), null)
  return { asOf: latest, lateCount: inScope.filter((f) => f.status !== 'ok').length, feeds: inScope }
}
