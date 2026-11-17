import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useNow } from '../../hooks/useNow'
import { useRole } from '../../auth/RoleContext'
import { canActOnCorrectiveAction } from '../../auth/permissions'
import { useCreateActionFromPattern, useHandoffs, usePatterns, useSignals } from '../../services/queries'
import { PatternThresholdMeter } from './components/PatternThresholdMeter'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'
import type { CorrectiveActionKind, Pattern } from '../../types'

const CORRECTIVE_KINDS: CorrectiveActionKind[] = ['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']

export default function Signals() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const { data: signals } = useSignals()
  const { data: patterns } = usePatterns()
  const { data: handoffs } = useHandoffs()
  const createAction = useCreateActionFromPattern()
  const [creatingFor, setCreatingFor] = useState<Pattern | null>(null)

  const volumeSeries = useMemo(() => {
    if (!signals) return []
    const byDay = new Map<string, number>()
    for (const s of signals) {
      const day = s.occurredAt.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day: day.slice(5), count }))
  }, [signals])

  const publicMentions = signals?.filter((s) => s.isPublic) ?? []

  return (
    <div className="col">
      <ScoresVsSignalsNotice register="signals" />

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2>{t('Signals (counted, not worked)', 'الإشارات (تُحصى ولا تُعالج فردياً)')}</h2>
            <span className="tile-value" style={{ fontSize: 24 }}>{signals?.length ?? '—'}</span>
          </div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeSeries}>
                <defs>
                  <linearGradient id="sigFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="var(--brand)" fill="url(#sigFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginBlockEnd: 8 }}>{t('Patterns past threshold', 'أنماط تجاوزت الحد')}</h2>
          <div className="tile-value" style={{ fontSize: 32 }}>{patterns?.length ?? '—'}</div>
          <Link to="/settings/rules" className="text-sm">{t('Edit thresholds under Rules as configuration →', 'تعديل الحدود ضمن القواعد كإعدادات ←')}</Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBlockEnd: 10 }}>{t('Patterns', 'الأنماط')}</h2>
        <div className="col">
          {patterns?.map((p) => (
            <div className="card tint" key={p.id}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ gap: 6, flex: 1 }}>
                  <b>{p.category.replace(/_/g, ' ')} — {p.team}</b>
                  <PatternThresholdMeter pattern={p} />
                  <span className="text-sm">{L(p.aiSuggestion)}</span>
                  <span className="text-sm muted">{L(p.recoveryFigure)}</span>
                </div>
                {canActOnCorrectiveAction(role.id, 'process') && p.hasMinimumSample && (
                  <button type="button" className="btn sm primary" onClick={() => setCreatingFor(p)}>{t('Create action', 'إنشاء إجراء')}</button>
                )}
              </div>
            </div>
          ))}
          {!patterns?.length && <div className="empty-state">{t('No patterns past threshold yet.', 'لا توجد أنماط تجاوزت الحد بعد.')}</div>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBlockEnd: 10 }}>{t('Public mentions', 'الإشارات العامة')}</h2>
        <div className="col">
          {publicMentions.map((s) => {
            const dueMs = s.publicReplyDueAt ? new Date(s.publicReplyDueAt).getTime() - now : null
            const breached = dueMs !== null && dueMs <= 0
            return (
              <div className="row between" key={s.id}>
                <div className="row">
                  <span className="chip accent">{t('Public', 'عام')}</span>
                  <span className="text-sm">{s.category.replace(/_/g, ' ')}</span>
                  <span className="text-sm muted">{t('never tied to a person unless self-identified', 'لا تُربط بشخص إلا إذا عرّف نفسه')}</span>
                </div>
                {s.publicReplyDueAt && <span className={`chip ${breached ? 'crit' : 'warn'}`}>{breached ? t('48h reply breached', 'تجاوز ساعة الرد 48') : t('48h reply clock running', 'ساعة الرد 48 جارية')}</span>}
              </div>
            )
          })}
          {!publicMentions.length && <div className="empty-state">{t('No public mentions yet.', 'لا توجد إشارات عامة بعد.')}</div>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBlockEnd: 10 }}>{t('Hand-offs', 'التسليمات')}</h2>
        <p className="text-sm muted" style={{ marginBottom: 8 }}>{t('One-customer fixes owned by another system — status tracked, no SLA clock runs here.', 'إصلاحات فردية تملكها أنظمة أخرى — تُتابع حالتها دون ساعة التزام.')}</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('Owner system', 'النظام المالك')}</th><th>{t('Status', 'الحالة')}</th></tr></thead>
            <tbody>
              {handoffs?.map((h) => (
                <tr key={h.id}>
                  <td>{L(h.ownerSystem)}</td>
                  <td><span className={`chip ${h.status === 'done' ? 'good' : ''}`}>{h.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creatingFor && (
        <CreateActionDialog
          pattern={creatingFor}
          onCancel={() => setCreatingFor(null)}
          onCreate={(values) => {
            createAction.mutate({ pattern: creatingFor, ...values })
            setCreatingFor(null)
          }}
        />
      )}
    </div>
  )
}

const createSchema = z.object({
  kind: z.enum(['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']),
  owner: z.string().min(2, 'Owner title is required'),
  dueDate: z.string().min(1, 'Due date is required'),
})
type CreateValues = z.infer<typeof createSchema>

function CreateActionDialog({ pattern, onCancel, onCreate }: { pattern: Pattern; onCancel: () => void; onCreate: (v: CreateValues) => void }) {
  const { t } = useI18n()
  const now = useNow()
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    defaultValues: { kind: 'process', owner: `${pattern.team.replace(' team', '')} environment manager`, dueDate: new Date(now + 5 * 86_400_000).toISOString().slice(0, 10) },
  })

  function submit(values: CreateValues) {
    const parsed = createSchema.safeParse(values)
    if (!parsed.success) return
    onCreate(parsed.data)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit(submit)}>
        <h2>{t('Create a corrective action', 'إنشاء إجراء تصحيحي')}</h2>
        <p className="text-sm muted">{pattern.category.replace(/_/g, ' ')} — {pattern.team}</p>
        <label className="col text-sm">{t('Kind', 'النوع')}
          <select {...register('kind')}>
            {CORRECTIVE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="col text-sm">{t('Owner (title)', 'المالك (المسمى الوظيفي)')}
          <input type="text" {...register('owner')} />
          {errors.owner && <span style={{ color: 'var(--crit)' }}>{errors.owner.message}</span>}
        </label>
        <label className="col text-sm">{t('Due date', 'تاريخ الاستحقاق')}
          <input type="date" {...register('dueDate')} />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn primary">{t('Propose action', 'اقتراح إجراء')}</button>
        </div>
      </form>
    </div>
  )
}
