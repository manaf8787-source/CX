import { useState } from 'react'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { canApprovePersona, canViewPersonaAudit } from '../auth/permissions'
import { useCampaignRecommendations, useDecidePersona, usePersonas } from '../services/queries'
import { SampleBanner } from '../components/common/SampleBanner'
import { DecisionDialog } from './actions/components/DecisionDialog'
import type { Persona } from '../types'

/** FR-6.1–6.5 — six rule-built personas, each with a Marketing
 * recommendation and a ranked next campaign; CX-manager approval and
 * Internal Audit review are real role-gated actions, not cosmetic labels;
 * personal fields never appear per-person here, only as aggregates (FR-6.5). */
export default function Personas() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: personas } = usePersonas()
  const { data: recommendations } = useCampaignRecommendations()
  const decide = useDecidePersona()
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const canApprove = canApprovePersona(role.id)
  const canAudit = canViewPersonaAudit(role.id)
  const ranked = [...(recommendations ?? [])].sort((a, b) => a.rank - b.rank)

  function personaName(id: string): string {
    return L(personas?.find((p) => p.id === id)?.name ?? { en: id, ar: id })
  }

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Personas and campaigns', 'الشخصيات والحملات')}</h1>
          <p className="page-lede">
            {t(
              'Six personas built from the CRM, each with a Marketing recommendation and a ranked next campaign.',
              'ست شخصيات مبنية من بيانات نظام إدارة العملاء، لكل منها توصية تسويقية وحملة تالية مرتبة.',
            )}
          </p>
        </div>
        <SampleBanner />
      </div>

      <div className="grid grid-2">
        <div className="card tint">
          <span className="chip accent" style={{ marginBottom: 6 }}>{t('How personas are built', 'كيف تُبنى الشخصيات')}</span>
          <p className="text-sm" style={{ marginTop: 6 }}>
            {t(
              'Built first by rules on CRM fields (residence, work sector, income source, units owned, lost reason) plus the channel actually used — not by clustering. Clustering is a phase-two addition once three months of live timeline data exist (FR-6.3). A persona nobody can act on is dropped.',
              'تُبنى أولاً بقواعد على بيانات نظام إدارة العملاء (السكن، قطاع العمل، مصدر الدخل، الوحدات المملوكة، سبب الخسارة) بالإضافة إلى القناة المستخدمة فعلياً — وليس بالتجميع الآلي. التجميع الآلي إضافة لمرحلة لاحقة بعد توفر ثلاثة أشهر من بيانات حية — FR-6.3. أي شخصية لا يمكن التصرف بناءً عليها تُسقَط.',
            )}
          </p>
        </div>
        <div className="card tint">
          <span className="chip warn" style={{ marginBottom: 6 }}>{t('Aggregated only', 'إجمالي فقط')}</span>
          <p className="text-sm" style={{ marginTop: 6 }}>
            {t(
              'Personal fields used to build a persona are shown only as aggregated attributes and segment sizes on this page — never exported per-person to Marketing (FR-6.5). The CX manager names and approves each persona; the Internal Audit and Marketing Lead audits the criteria behind it.',
              'الحقول الشخصية المستخدمة لبناء الشخصية تُعرض هنا كسمات إجمالية وأحجام شرائح فقط — ولا تُصدَّر أبداً على مستوى الفرد للتسويق — FR-6.5. يسمّي مدير تجربة العملاء ويعتمد كل شخصية، ويراجع مسؤول التدقيق الداخلي والتسويق المعايير خلفها.',
            )}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('Ranked next campaigns', 'الحملات التالية المرتبة')}</h2>
          <span className="text-sm muted">{t('Click a row to open its persona', 'انقر على صف لفتح شخصيته')}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">{t('Rank', 'الترتيب')}</th>
                <th>{t('Persona', 'الشخصية')}</th>
                <th>{t('Campaign', 'الحملة')}</th>
                <th>{t('Who', 'لمن')}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr
                  key={r.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => document.getElementById(`persona-${r.personaId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <td className="num mono">#{r.rank}</td>
                  <td><b>{personaName(r.personaId)}</b></td>
                  <td>{L(r.title)}</td>
                  <td className="text-sm muted">{L(r.summary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ranked.length && <div className="empty-state">{t('No ranked campaigns yet.', 'لا توجد حملات مرتبة بعد.')}</div>}
        </div>
      </div>

      <div className="grid grid-2">
        {personas?.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            canApprove={canApprove}
            canAudit={canAudit}
            onDecide={() => setDecidingId(p.id)}
          />
        ))}
      </div>

      {decidingId && (
        <DecisionDialog
          title={t('Decide this persona', 'اتخاذ قرار بشأن هذه الشخصية')}
          approveLabel="approved"
          onCancel={() => setDecidingId(null)}
          onSubmit={(v) => {
            if (v.decision === 'confirmed') return
            decide.mutate({ id: decidingId, decision: v.decision, reason: v.reason })
            setDecidingId(null)
          }}
        />
      )}
    </div>
  )
}

function PersonaCard({
  persona,
  canApprove,
  canAudit,
  onDecide,
}: {
  persona: Persona
  canApprove: boolean
  canAudit: boolean
  onDecide: () => void
}) {
  const { t, L } = useI18n()
  const r = persona.recommendation
  return (
    <div className="card" id={`persona-${persona.id}`}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="col" style={{ gap: 2 }}>
          <h2>{L(persona.name)}</h2>
          <span className="text-sm muted">{L(persona.who)}</span>
        </div>
        <span className={`chip ${persona.approvedByCxManager ? 'good' : 'warn'}`}>
          {persona.approvedByCxManager ? t('Approved', 'معتمدة') : t('Pending CX approval', 'بانتظار الاعتماد')}
        </span>
      </div>

      <p className="text-sm" style={{ marginTop: 8 }}>
        <b>{t('Main pain', 'المشكلة الرئيسية')}:</b> {L(persona.mainPain)}
      </p>

      <div className="row" style={{ marginTop: 6 }}>
        {persona.channelsUsed.map((c) => <span className="chip" key={c}>{c}</span>)}
        <span className="chip accent">{persona.segmentSize} {t('segment', 'شريحة')}</span>
        <span className="chip crit">{persona.runawayCount} {t('runaway', 'هارب')}</span>
      </div>

      <div className="col" style={{ marginTop: 10, gap: 6, borderBlockStart: '1px solid var(--line)', paddingBlockStart: 10 }}>
        <h3>{t('Marketing recommendation', 'التوصية التسويقية')}</h3>
        <p className="text-sm"><b>{t('Target', 'الفئة المستهدفة')}:</b> {L(r.targetWho)}</p>
        <p className="text-sm"><b>{t('Channel & when', 'القناة والتوقيت')}:</b> {L(r.channelAndWhen)}</p>
        <p className="text-sm"><b>{t('Campaign type', 'نوع الحملة')}:</b> {L(r.campaignType)}</p>
        <p className="text-sm" style={{ color: 'var(--crit)' }}><b>{t('What not to do', 'ما لا يجب فعله')}:</b> {L(r.whatNotToDo)}</p>
      </div>

      {canAudit && persona.auditNote && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-start', gap: 6 }}>
          <span className="chip warn">{t('Audit note', 'ملاحظة تدقيق')}</span>
          <span className="text-sm muted">{L(persona.auditNote)}</span>
        </div>
      )}

      {canApprove && (
        <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn primary sm" onClick={onDecide}>{t('Decide', 'اتخاذ قرار')}</button>
        </div>
      )}
    </div>
  )
}
