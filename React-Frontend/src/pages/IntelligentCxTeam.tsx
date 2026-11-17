import { useMemo, useState, type CSSProperties } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { canViewAgentNames } from '../auth/permissions'
import { AGENT_REGISTRY, ENVELOPE_FIELD_GROUPS, ROUTING_MATRIX, SUPERVISOR_CHECK_ORDER } from '../data/agentRegistry'
import { useAgentActivity } from '../services/queries'
import { SampleBanner } from '../components/common/SampleBanner'
import type { AgentActivityEntry, AgentProfile, CorrectiveActionKind } from '../types'

const KIND_LABEL: Record<CorrectiveActionKind, { en: string; ar: string }> = {
  employee: { en: 'Employee', ar: 'موظف' },
  service_behaviour: { en: 'Service & behaviour', ar: 'الخدمة والسلوك' },
  training_gap: { en: 'Training gap', ar: 'فجوة تدريبية' },
  process: { en: 'Process', ar: 'العملية' },
  product_app: { en: 'Product & app', ar: 'المنتج والتطبيق' },
  environment: { en: 'Environment', ar: 'البيئة' },
  legal_privacy: { en: 'Legal & privacy', ar: 'قانوني وخصوصية' },
  marketing: { en: 'Marketing', ar: 'تسويق' },
}

const VERDICT_TONE: Record<AgentActivityEntry['supervisorVerdict'], 'good' | 'warn' | 'crit'> = {
  approved: 'good',
  returned: 'warn',
  escalated: 'crit',
}

/** APPLICATION_MODULES.md §E — "not a frontend module to build so much as a
 * contract the frontend must consume". This page is that contract made
 * legible: the envelope shape every agent shares, the ten agents + the one
 * supervisor who checks them (AI Agents Specification), the classification
 * routing matrix that decides who receives a corrective action, and a run
 * log derived from the same mock data every other page already reads. */
export default function IntelligentCxTeam() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: activity } = useAgentActivity()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const activityByAgent = useMemo(() => {
    const map = new Map<string, AgentActivityEntry[]>()
    for (const entry of activity ?? []) {
      const list = map.get(entry.agentKey) ?? []
      list.push(entry)
      map.set(entry.agentKey, list)
    }
    return map
  }, [activity])

  const approvalRate = useMemo(() => {
    const map = new Map<string, { approved: number; total: number }>()
    for (const entry of activity ?? []) {
      const row = map.get(entry.agentKey) ?? { approved: 0, total: 0 }
      row.total += 1
      if (entry.supervisorVerdict === 'approved') row.approved += 1
      map.set(entry.agentKey, row)
    }
    return map
  }, [activity])

  return (
    <div className="col">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Intelligent CX team', 'فريق تجربة العملاء الذكي')}</h1>
          <p className="page-lede">
            {t(
              'Ten single-task agents and one supervisor that do the work of the CX team inside the portal — nothing else.',
              'عشرة وكلاء بمهمة واحدة ومشرف واحد يؤدون عمل فريق تجربة العملاء داخل البوابة — لا شيء غير ذلك.',
            )}
          </p>
        </div>
        <SampleBanner />
      </div>

      {/* --- The common contract --------------------------------------- */}
      <div className="card">
        <span className="eyebrow">{t('The shape', 'الشكل')}</span>
        <h2 style={{ marginBlockEnd: 10 }}>{t('One output shape, for every agent', 'شكل مخرجات واحد لكل وكيل')}</h2>
        <p className="text-sm muted" style={{ maxWidth: '72ch', marginBlockEnd: 12 }}>
          {t(
            'Every agent writes the same eleven-field envelope. The "how the AI found this" panel on actions, patterns and AI Insights reads straight from it — nothing is rendered from a bespoke shape.',
            'يكتب كل وكيل نفس المغلف المكوَّن من أحد عشر حقلاً. تقرأ لوحة "كيف توصّل الذكاء الاصطناعي لهذا" في الإجراءات والأنماط ورؤى الذكاء الاصطناعي من هذا المغلف مباشرة — دون أي شكل مخصص.',
          )}
        </p>
        <div className="grid grid-3">
          {ENVELOPE_FIELD_GROUPS.map((g) => (
            <div key={g.title.en} className="card tint" style={{ borderBlockStart: '3px solid var(--brand)' }}>
              <b>{L(g.title)}</b>
              <div className="text-sm muted mono" style={{ marginBlockStart: 6 }}>{L(g.fields)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Agent roster ------------------------------------------------- */}
      <div>
        <h2 style={{ marginBlockEnd: 10 }}>{t('The ten agents', 'الوكلاء العشرة')}</h2>
        <div className="grid grid-3">
          {AGENT_REGISTRY.map((agent) => (
            <AgentCard
              key={agent.key}
              agent={agent}
              recent={activityByAgent.get(agent.key) ?? []}
              rate={approvalRate.get(agent.key)}
              expanded={expandedKey === agent.key}
              onToggle={() => setExpandedKey((k) => (k === agent.key ? null : agent.key))}
            />
          ))}
        </div>
      </div>

      {/* --- The supervisor ------------------------------------------------ */}
      <div className="card" style={{ borderBlockStart: '3px solid var(--gold)' }}>
        <div className="card-head">
          <h2>{t('The CX Supervisor', 'المشرف الذكي')}</h2>
          <span className="chip accent">{t('Different model family, temperature 0', 'عائلة نموذج مختلفة، درجة حرارة 0')}</span>
        </div>
        <p className="text-sm muted" style={{ maxWidth: '72ch' }}>
          {t(
            'Checks every worker output before it is released: approve, return with a reason, or escalate. It never edits a worker’s output and never approves its own escalation.',
            'يراجع مخرجات كل وكيل قبل اعتمادها: الموافقة، أو الإعادة بسبب، أو التصعيد. لا يُعدّل مخرجات الوكيل أبداً ولا يعتمد تصعيده الخاص.',
          )}
        </p>
        <div className="row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 240 }}>
            <h3 style={{ marginBlockEnd: 8 }}>{t('Order of checks', 'ترتيب الفحوصات')}</h3>
            <ol className="col text-sm" style={{ margin: 0, paddingInlineStart: 18, gap: 6 }}>
              {SUPERVISOR_CHECK_ORDER.map((c, i) => (
                <li key={i}>{L(c)}</li>
              ))}
            </ol>
          </div>
          <div style={{ flex: '1 1 260px', minWidth: 240 }}>
            <h3 style={{ marginBlockEnd: 8 }}>{t('Approval rate per agent (sample)', 'معدل الاعتماد لكل وكيل (عينة)')}</h3>
            <div className="col" style={{ gap: 8 }}>
              {AGENT_REGISTRY.filter((a) => a.key !== 'supervisor').map((a) => {
                const r = approvalRate.get(a.key)
                const pct = r && r.total > 0 ? Math.round((r.approved / r.total) * 100) : null
                return (
                  <div key={a.key} className="row between" style={{ gap: 10 }}>
                    <span className="text-sm" style={{ minWidth: 150 }}>{L(a.name)}</span>
                    {pct === null ? (
                      <span className="text-sm muted">{t('no run sampled', 'لا يوجد تشغيل في العينة')}</span>
                    ) : (
                      <>
                        <div className="meter" style={{ flex: 1 }}>
                          <i style={{ width: `${pct}%`, '--c': pct >= 90 ? 'var(--good)' : pct >= 75 ? 'var(--warn)' : 'var(--crit)' } as CSSProperties} />
                        </div>
                        <span className="text-sm mono" style={{ width: 38, textAlign: 'end' }}>{pct}%</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-sm muted" style={{ marginBlockStart: 8 }}>
              {t('From this prototype’s own sample run log below — a real calibration sample is 50 outputs reviewed weekly.', 'من سجل التشغيل التجريبي أدناه — العينة الفعلية للمعايرة هي 50 مخرجاً تُراجَع أسبوعياً.')}
            </p>
          </div>
        </div>
      </div>

      {/* --- Routing by classification -------------------------------------- */}
      <div className="card">
        <h2 style={{ marginBlockEnd: 10 }}>{t('Routing of corrective actions by classification', 'توجيه الإجراءات التصحيحية حسب التصنيف')}</h2>
        <p className="text-sm muted" style={{ marginBlockEnd: 10 }}>
          {t('Agent 5 tags every action with one classification, and the classification chooses the path — the matrix supplies the names, the path itself does not change per product.', 'يضع الوكيل 5 تصنيفاً واحداً لكل إجراء، والتصنيف يحدد المسار — المصفوفة تزوّد الأسماء، أما المسار نفسه فلا يتغير حسب المنتج.')}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Classification', 'التصنيف')}</th>
                <th>{t('Typical signal', 'إشارة نموذجية')}</th>
                <th>{t('Path', 'المسار')}</th>
                <th>{t('Receiver', 'المستلم')}</th>
                <th>{t('What comes back', 'ما يعود')}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ROUTING_MATRIX) as CorrectiveActionKind[]).map((kind) => {
                const row = ROUTING_MATRIX[kind]
                return (
                  <tr key={kind}>
                    <td><b>{L(KIND_LABEL[kind])}</b></td>
                    <td className="text-sm muted">{L(row.typicalSignal)}</td>
                    <td className="text-sm">{L(row.path)}</td>
                    <td className="text-sm">{L(row.receiver)}</td>
                    <td className="text-sm muted">{L(row.whatComesBack)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Recent activity log ------------------------------------------- */}
      <div className="card">
        <h2 style={{ marginBlockEnd: 10 }}>{t('Recent activity', 'النشاط الأخير')}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Agent', 'الوكيل')}</th>
                <th>{t('What ran', 'ما الذي عمل')}</th>
                <th>{t('Supervisor verdict', 'قرار المشرف')}</th>
                <th>{t('When', 'متى')}</th>
              </tr>
            </thead>
            <tbody>
              {(activity ?? []).map((entry) => {
                const agent = AGENT_REGISTRY.find((a) => a.key === entry.agentKey)
                return (
                  <tr key={entry.id}>
                    <td className="text-sm">{agent ? L(agent.name) : entry.agentKey}</td>
                    <td className="text-sm">{L(entry.subjectSummary)}</td>
                    <td><span className={`chip ${VERDICT_TONE[entry.supervisorVerdict]}`}>{entry.supervisorVerdict}</span></td>
                    <td className="text-sm muted">{new Date(entry.createdAt).toLocaleString(lang)}</td>
                  </tr>
                )
              })}
              {!activity?.length && (
                <tr><td colSpan={4} className="text-sm muted">{t('No runs sampled yet.', 'لا يوجد تشغيل في العينة بعد.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!canViewAgentNames(role.id) && (
        <p className="text-sm muted">
          {t(
            'This page never names a human agent — only the AI agents themselves and the roles they escalate to.',
            'هذه الصفحة لا تذكر اسم أي موظف بشري أبداً — فقط وكلاء الذكاء الاصطناعي والأدوار التي يصعّدون إليها.',
          )}
        </p>
      )}
    </div>
  )
}

function AgentCard({
  agent,
  recent,
  rate,
  expanded,
  onToggle,
}: {
  agent: AgentProfile
  recent: AgentActivityEntry[]
  rate?: { approved: number; total: number }
  expanded: boolean
  onToggle: () => void
}) {
  const { t, L, lang } = useI18n()
  const accent = agent.phaseNote ? 'var(--neutral)' : 'var(--brand)'
  const latest = recent[0]

  return (
    <div className="card" style={{ borderBlockStart: `3px solid ${accent}`, opacity: agent.phaseNote ? 0.75 : 1 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="eyebrow">{typeof agent.id === 'number' ? t(`Agent ${agent.id}`, `الوكيل ${agent.id}`) : t('Supervisor', 'المشرف')}</span>
          <b>{L(agent.name)}</b>
        </div>
        {rate && rate.total > 0 && (
          <span className={`chip ${rate.approved / rate.total >= 0.9 ? 'good' : 'warn'}`}>{Math.round((rate.approved / rate.total) * 100)}%</span>
        )}
      </div>
      <p className="text-sm" style={{ marginBlockStart: 8 }}>{L(agent.task)}</p>

      {agent.phaseNote && (
        <div className="text-sm" style={{ color: 'var(--warn)', marginBlockStart: 6 }}>{L(agent.phaseNote)}</div>
      )}

      {latest && !agent.phaseNote && (
        <div className="text-sm muted" style={{ marginBlockStart: 8 }}>
          {L(latest.subjectSummary)} <span className="muted">— {new Date(latest.createdAt).toLocaleDateString(lang)}</span>
        </div>
      )}

      <button
        type="button"
        className="row between"
        style={{ all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box', marginBlockStart: 10 }}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="text-sm" style={{ color: 'var(--brand)', fontWeight: 600 }}>{t('Details', 'التفاصيل')}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="col text-sm" style={{ marginBlockStart: 8, gap: 8 }}>
          <KeyValue label={t('Trigger', 'المحفّز')} value={L(agent.trigger)} />
          <KeyValue label={t('Runs on', 'يعمل وفق')} value={L(agent.runsOn)} />
          <KeyValue label={t('Escalates to', 'يصعّد إلى')} value={L(agent.escalatesTo)} />
          <KeyValue label={t('Must not', 'يُمنع من')} value={L(agent.mustNot)} />
        </div>
      )}
    </div>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: 2 }}>{label}</div>
      <div>{value}</div>
    </div>
  )
}
