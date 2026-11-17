import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { useRole } from '../../../auth/RoleContext'
import { resolveAgentDisplay } from '../../../auth/permissions'
import { useAgentDirectory, useCorrectiveRationale } from '../../../services/queries'
import type { Pattern } from '../../../types'

/** FR-4.2 — every action carries this panel: sources + dates, the rule that
 * fired with its threshold, where, who (role-gated), why this team, why
 * this action (recovery figure in full sentence form), and what the AI did
 * not do. Reads the AgentOutputEnvelope's `evidence`/`rulesApplied` fields
 * directly (NFR-7) rather than a bespoke shape. */
export function HowAiFoundThis({ actionId, pattern }: { actionId: string; pattern?: Pattern }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const [open, setOpen] = useState(false)
  const { data: envelope } = useCorrectiveRationale(actionId)
  const { data: directory } = useAgentDirectory()

  const agentDisplay = pattern?.agentRef && directory
    ? resolveAgentDisplay(pattern.agentRef, role.id, directory, { en: 'Agent (name withheld)', ar: 'وكيل (الاسم محجوب)' }, lang)
    : null

  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <button type="button" className="row between" style={{ all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <b style={{ fontSize: 13 }}>{t('How the AI found this', 'كيف توصّل الذكاء الاصطناعي لهذا')}</b>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="col" style={{ marginTop: 10, gap: 10 }}>
          <Row label={t('Where', 'أين')} value={pattern?.team ?? '—'} />
          <Row label={t('Who', 'من')} value={agentDisplay ? agentDisplay.label : t('Team-level, no single agent named', 'على مستوى الفريق، دون وكيل بعينه')} />
          <Row label={t('Rule that fired', 'القاعدة التي انطبقت')} value={envelope?.rulesApplied.join(', ') || '—'} />
          {envelope?.payload.whyThisTeam && <Row label={t('Why this team', 'لماذا هذا الفريق')} value={L(envelope.payload.whyThisTeam)} />}
          {pattern?.recoveryFigure && <Row label={t('Why this action', 'لماذا هذا الإجراء')} value={L(pattern.recoveryFigure)} />}
          {envelope?.payload.whatAiDidNotDo && <Row label={t('What the AI did not do', 'ما لم يقم به الذكاء الاصطناعي')} value={L(envelope.payload.whatAiDidNotDo)} />}
          <div>
            <div className="text-sm muted" style={{ marginBottom: 4 }}>{t('Sources', 'المصادر')}</div>
            <ul style={{ margin: 0, paddingInlineStart: 18 }} className="col text-sm">
              {envelope?.evidence.map((e) => (
                <li key={e.sourceId}>
                  {L(e.summary)} <span className="muted">— {new Date(e.occurredAt).toLocaleDateString(lang)}</span>
                </li>
              ))}
              {!envelope?.evidence.length && <li className="muted">{t('No evidence recorded.', 'لا توجد أدلة مسجّلة.')}</li>}
            </ul>
          </div>
          {envelope && (
            <div className="text-sm muted">
              {t('Confidence', 'مستوى الثقة')}: <span className="mono">{Math.round(envelope.confidence * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between" style={{ gap: 12 }}>
      <span className="text-sm muted">{label}</span>
      <span className="text-sm" style={{ textAlign: 'end' }}>{value}</span>
    </div>
  )
}
