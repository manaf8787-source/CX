import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../../components/common/SampleBanner'
import { useRulesConfig, useUpdateRuleConfig } from '../../services/queries'

/** Net-new (NFR-4): "every numeric threshold named anywhere in the
 * requirements must be editable under Settings by the CX manager, without a
 * code deploy." This is the single page every other page's threshold
 * ultimately traces back to — each row cites the FR it backs so a change
 * here is auditable against the source requirement, not a bare number. */
export default function Rules() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: rules } = useRulesConfig()
  const update = useUpdateRuleConfig()
  const [draft, setDraft] = useState<Record<string, number>>({})

  const areas = useMemo(() => [...new Set((rules ?? []).map((r) => r.area.en))], [rules])

  function valueFor(id: string, current: number) {
    return draft[id] ?? current
  }

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted" style={{ maxWidth: '64ch' }}>
          {t('Every threshold named in the functional requirements, editable here — not a magic number buried in a component.', 'كل حد مذكور في المتطلبات الوظيفية، قابل للتعديل هنا — وليس رقماً ثابتاً مدفوناً داخل الواجهة.')}
        </p>
        <SampleBanner />
      </div>
      {!canEdit && <p className="text-sm" style={{ color: 'var(--warn)' }}>{t('View only — the CX manager edits these.', 'للعرض فقط — يعدّل هذه القيم مدير تجربة العملاء.')}</p>}

      {areas.map((area) => (
        <div className="card" key={area}>
          <div className="card-head"><h2>{area}</h2></div>
          <div className="col" style={{ gap: 8 }}>
            {(rules ?? []).filter((r) => r.area.en === area).map((r) => (
              <div className="row between" key={r.id}>
                <div className="col" style={{ gap: 0 }}>
                  <span className="text-sm">{L(r.label)}</span>
                  <span className="text-sm muted mono">{r.source}</span>
                </div>
                <div className="row">
                  {canEdit ? (
                    <>
                      <input
                        type="number"
                        style={{ width: 90 }}
                        value={valueFor(r.id, r.value)}
                        onChange={(e) => setDraft((d) => ({ ...d, [r.id]: Number(e.target.value) }))}
                      />
                      <span className="text-sm muted">{L(r.unit)}</span>
                      {draft[r.id] !== undefined && draft[r.id] !== r.value && (
                        <button type="button" className="btn sm primary" onClick={() => update.mutate({ id: r.id, value: draft[r.id] })}>{t('Save', 'حفظ')}</button>
                      )}
                    </>
                  ) : (
                    <span className="mono">{r.value} <span className="text-sm muted">{L(r.unit)}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
