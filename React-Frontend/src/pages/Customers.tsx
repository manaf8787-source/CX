import { useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { usePersonEffort, usePersonInteractions, usePersons, useAiJourneyReading } from '../services/queries'
import { SampleBanner } from '../components/common/SampleBanner'
import { ProfileCard } from '../components/customers/ProfileCard'
import { AiReadingCard } from '../components/customers/AiReadingCard'
import { Timeline } from '../components/customers/Timeline'
import { CHANNEL_LABEL } from '../components/customers/SourceBadge'
import { JOURNEY_RULES } from '../utils/journeyRules'

export default function Customers() {
  const { personId } = useParams()
  if (personId) return <CustomerDetail personId={personId} />
  return <CustomerList />
}

/** FR-2.1 — the search list behind Home's "no exact match" fallback
 * (`/customers?q=...`); FR-1.4 — environment management sees only their own
 * environment here too, not just from Home's search. */
function CustomerList() {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const { role } = useRole()
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const { data: persons, isLoading } = usePersons()

  const visible = useMemo(() => {
    let list = persons ?? []
    if (role.id === 'envmgmt' && role.environment) list = list.filter((p) => p.environment === role.environment)
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.identity.mobile?.includes(q) || p.identity.emiratesId?.toLowerCase().includes(q))
    return list
  }, [persons, role, q])

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Customers', 'العملاء')}</h1>
          <p className="page-lede">
            {t('One record per person: CRM profile, effort tiles, AI reading, and a channel timeline.', 'سجل واحد لكل شخص: الملف الشخصي، مؤشرات الجهد، قراءة الذكاء الاصطناعي، والجدول الزمني.')}
          </p>
        </div>
        <SampleBanner />
      </div>
      {role.id === 'envmgmt' && role.environment && (
        <p className="text-sm muted">{t('Scoped to your environment:', 'محصور ببيئتك:')} {role.environment}</p>
      )}
      {q && !visible.length && (
        <div className="empty-state">{t('No match for', 'لا توجد نتيجة لـ')} &ldquo;{params.get('q')}&rdquo;.</div>
      )}
      <div className="card">
        <div className="card-head">
          <h2>{t('People', 'الأشخاص')}</h2>
          <span className="text-sm muted">{visible.length} {t('records', 'سجل')}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Name', 'الاسم')}</th>
                <th>{t('Type', 'النوع')}</th>
                <th>{t('Environment', 'البيئة')}</th>
                <th>{t('Preferred channel', 'القناة المفضلة')}</th>
                <th className="num">{t('Units/deals', 'الوحدات/الصفقات')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="muted">{t('Loading…', 'جارٍ التحميل…')}</td>
                </tr>
              )}
              {visible.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${p.id}`)}>
                  <td>
                    {p.name}
                    {p.vip && <span className="chip warn" style={{ marginInlineStart: 6 }}>VIP</span>}
                  </td>
                  <td>{p.type === 'customer' ? t('Customer', 'عميل') : t('Lead', 'عميل محتمل')}</td>
                  <td>{p.environment}</td>
                  <td>{L(CHANNEL_LABEL[p.preferredChannel])}</td>
                  <td className="num">{p.unitsOrDeals}</td>
                </tr>
              ))}
              {!isLoading && !visible.length && !q && (
                <tr>
                  <td colSpan={5} className="muted">{t('No records in scope.', 'لا توجد سجلات ضمن النطاق.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CustomerDetail({ personId }: { personId: string }) {
  const { t, L } = useI18n()
  const { data: persons } = usePersons()
  const { data: effort } = usePersonEffort(personId)
  const { data: interactions } = usePersonInteractions(personId)
  const { data: reading } = useAiJourneyReading(personId)
  const person = persons?.find((p) => p.id === personId)

  const problemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of interactions ?? []) for (const f of i.problemFlags) counts.set(f, (counts.get(f) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [interactions])
  const channelsUsed = useMemo(() => [...new Set((interactions ?? []).map((i) => i.channel))], [interactions])
  const totalProblems = problemCounts.reduce((sum, [, c]) => sum + c, 0)

  if (!person) {
    return (
      <div className="skeleton-page">
        <div className="empty-state">{t('Loading, or no such record.', 'جارٍ التحميل، أو لا يوجد سجل كهذا.')}</div>
      </div>
    )
  }

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{person.name}</h1>
          <p className="page-lede">{t('One record, every channel, newest first.', 'سجل واحد، كل القنوات، الأحدث أولاً.')}</p>
        </div>
        <SampleBanner />
      </div>

      <ProfileCard person={person} />

      <div className="grid grid-4">
        <div className="tile"><div className="tile-label">{t('Interactions', 'التفاعلات')}</div><div className="tile-value">{effort?.interactions ?? '—'}</div></div>
        <div className="tile"><div className="tile-label">{t('Contacts in 90 days', 'تواصل خلال 90 يوماً')}</div><div className="tile-value">{effort?.contactsLast90Days ?? '—'}</div></div>
        <div className="tile"><div className="tile-label">{t('Problems found', 'مشاكل مكتشفة')}</div><div className="tile-value">{effort?.problemsFound ?? '—'}</div></div>
        <div className="tile"><div className="tile-label">{t('Days since last contact', 'أيام منذ آخر تواصل')}</div><div className="tile-value">{effort?.daysSinceLastContact ?? '—'}</div></div>
      </div>

      {reading && <AiReadingCard reading={reading} interactions={interactions ?? []} />}

      <Timeline interactions={interactions ?? []} />

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Problems found', 'المشاكل المكتشفة')} ({totalProblems})</summary>
        <div className="col" style={{ marginTop: 10 }}>
          {problemCounts.map(([flag, count]) => {
            const rule = JOURNEY_RULES.find((r) => r.id === flag)
            return (
              <div className="row between" key={flag}>
                <span className="text-sm">{rule ? L(rule.label) : flag}</span>
                <span className="text-sm mono muted">{count}</span>
              </div>
            )
          })}
          {!problemCounts.length && <span className="text-sm muted">{t('None recorded.', 'لا يوجد.')}</span>}
        </div>
      </details>

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Channels used', 'القنوات المستخدمة')} ({channelsUsed.length})</summary>
        <div className="row" style={{ marginTop: 10 }}>
          {channelsUsed.map((c) => (
            <span key={c} className="chip">{L(CHANNEL_LABEL[c])}</span>
          ))}
          {!channelsUsed.length && <span className="text-sm muted">{t('None recorded.', 'لا يوجد.')}</span>}
        </div>
      </details>
    </div>
  )
}
