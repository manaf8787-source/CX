import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { useAllInteractions, useEffortSummaries, usePersons } from '../services/queries'
import { SampleBanner } from '../components/common/SampleBanner'
import { Tile } from '../components/common/Tile'
import { JOURNEY_RULES } from '../utils/journeyRules'
import {
  buildFaultSummary,
  classifyRunaway,
  RUNAWAY_LEARNING_ORDER,
  RUNAWAY_TYPE_DEFINITION,
  RUNAWAY_TYPE_LABEL,
  type RunawayClassification,
} from '../utils/runaway'
import type { RunawayType } from '../types'

/** FR-3.1–3.5 — six types as live counters (classified from real sample
 * data, not static placeholders), a cross-type "what we keep doing wrong"
 * list clickable into Actions, per-person detail linking to the full
 * Customers journey, environment scoping, and the agreed learning order. */
export default function Runaway() {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const { role } = useRole()
  const { data: persons } = usePersons()
  const { data: effortSummaries } = useEffortSummaries()
  const { data: interactions } = useAllInteractions()

  const scopedPersons = useMemo(() => {
    let list = persons ?? []
    if (role.id === 'envmgmt' && role.environment) list = list.filter((p) => p.environment === role.environment)
    return list
  }, [persons, role])

  const classifications = useMemo(() => {
    const map = new Map<string, RunawayClassification>()
    for (const p of scopedPersons) {
      const effort = effortSummaries?.find((e) => e.personId === p.id)
      const mine = (interactions ?? []).filter((i) => i.personKey === p.id)
      const result = classifyRunaway(p, effort, mine)
      if (result) map.set(p.id, result)
    }
    return map
  }, [scopedPersons, effortSummaries, interactions])

  const byType = useMemo(() => {
    const groups = new Map<RunawayType, { id: string; name: string }[]>()
    for (const [personId, c] of classifications) {
      const person = scopedPersons.find((p) => p.id === personId)
      if (!person) continue
      const list = groups.get(c.type) ?? []
      list.push({ id: person.id, name: person.name })
      groups.set(c.type, list)
    }
    return groups
  }, [classifications, scopedPersons])

  const faults = useMemo(() => buildFaultSummary(scopedPersons, classifications, interactions ?? []), [scopedPersons, classifications, interactions])

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Runaway customers', 'العملاء الهاربون')}</h1>
          <p className="page-lede">
            {t(
              'Six types as counters, plus a cross-type "what we keep doing wrong" list. The point is to learn and fix the cause, not to chase each one.',
              'ستة أنواع كعدادات، مع قائمة الأخطاء المتكررة عبر الأنواع. الهدف التعلّم وإصلاح السبب، لا ملاحقة كل حالة.',
            )}
          </p>
        </div>
        <SampleBanner />
      </div>
      {role.id === 'envmgmt' && role.environment && (
        <p className="text-sm muted">{t('Scoped to your environment:', 'محصور ببيئتك:')} {role.environment}</p>
      )}

      <div className="grid grid-3">
        {RUNAWAY_LEARNING_ORDER.map((type) => (
          <Tile
            key={type}
            label={L(RUNAWAY_TYPE_LABEL[type])}
            value={(byType.get(type) ?? []).length}
            colorVar="--crit"
            onClick={() => document.getElementById(`ra-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('What we keep doing wrong', 'ما زلنا نكرر هذه الأخطاء')}</h2>
          <span className="text-sm muted">{t('Click a fault to open a corrective-action candidate', 'انقر على خطأ لفتح إجراء تصحيحي مقترح')}</span>
        </div>
        <div className="col">
          {faults.map((f) => {
            const rule = JOURNEY_RULES.find((r) => r.id === f.flag)
            return (
              <button type="button" key={f.flag} className="row between" style={{ all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box', padding: '6px 0' }} onClick={() => navigate('/actions/corrective')}>
                <span className="text-sm">{rule ? L(rule.label) : f.flag}</span>
                <span className="chip crit">{f.count}</span>
              </button>
            )
          })}
          {!faults.length && <div className="empty-state">{t('No faults found across runaway records yet.', 'لا توجد أخطاء مسجّلة عبر السجلات الهاربة بعد.')}</div>}
        </div>
      </div>

      {RUNAWAY_LEARNING_ORDER.map((type) => {
        const list = byType.get(type) ?? []
        if (!list.length) return null
        return (
          <div className="card" key={type} id={`ra-${type}`}>
            <div className="card-head">
              <h2>{L(RUNAWAY_TYPE_LABEL[type])}</h2>
              <span className="text-sm muted">{list.length}</span>
            </div>
            <p className="text-sm muted" style={{ marginBottom: 10 }}>{L(RUNAWAY_TYPE_DEFINITION[type])}</p>
            <div className="col">
              {list.map((p) => {
                const reason = classifications.get(p.id)?.reason
                return (
                  <div className="row between" key={p.id}>
                    <div className="col" style={{ gap: 2 }}>
                      <b>{p.name}</b>
                      {reason && <span className="text-sm muted">{L(reason)}</span>}
                    </div>
                    <button type="button" className="btn sm" onClick={() => navigate(`/customers/${p.id}`)}>{t('Full journey', 'الرحلة الكاملة')} →</button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {![...byType.values()].some((l) => l.length) && (
        <div className="empty-state">{t('No runaway customers classified in this scope yet.', 'لا يوجد عملاء هاربون مصنَّفون ضمن هذا النطاق بعد.')}</div>
      )}
    </div>
  )
}
