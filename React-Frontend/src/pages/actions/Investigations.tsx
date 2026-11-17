import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useI18n } from '../../i18n'
import {
  useInvestigations,
  usePatterns,
  useRequestInvestigation,
  useReturnInvestigation,
} from '../../services/queries'
import type { Pattern } from '../../types'

const STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  requested: { en: 'Requested', ar: 'مطلوب' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ' },
  returned: { en: 'Returned', ar: 'عاد' },
}

export default function Investigations() {
  const { t, L } = useI18n()
  const { data: investigations } = useInvestigations()
  const { data: patterns } = usePatterns()
  const returnInv = useReturnInvestigation()
  const [returningId, setReturningId] = useState<string | null>(null)

  const thinPatterns = (patterns ?? []).filter((p) => !p.hasMinimumSample && !investigations?.some((i) => i.patternId === p.id))

  return (
    <div className="col">
      <div className="card tint">
        <p className="text-sm">{t('When pattern evidence is thin, the system does not guess a fix — it requests customer interviews or a mystery shopper check, and only proposes an action once that evidence comes back.', 'عندما تكون أدلة النمط ضعيفة، لا يُخمَّن حل — بل يُطلب إجراء مقابلات مع العملاء أو فحص تسوق سري، ولا يُقترح إجراء إلا بعد عودة تلك الأدلة.')}</p>
      </div>

      {thinPatterns.length > 0 && (
        <div className="card">
          <h2 style={{ marginBlockEnd: 8 }}>{t('Thin-evidence patterns awaiting a request', 'أنماط ذات أدلة ضعيفة بانتظار طلب')}</h2>
          <div className="col">
            {thinPatterns.map((p) => <RequestRow key={p.id} pattern={p} />)}
          </div>
        </div>
      )}

      <div className="col">
        {investigations?.map((inv) => {
          const pattern = patterns?.find((p) => p.id === inv.patternId)
          return (
            <div className="card" key={inv.id}>
              <div className="row between">
                <div className="col" style={{ gap: 4 }}>
                  <b>{inv.kind.replace(/_/g, ' ')}</b>
                  <span className="text-sm muted">
                    {pattern ? `${pattern.category.replace(/_/g, ' ')} — ${pattern.team}` : inv.environment}
                    {inv.requestedCount ? ` · ${inv.requestedCount} ${t('interviews', 'مقابلات')}` : ''}
                    {inv.scenario ? ` · ${L(inv.scenario)}` : ''}
                  </span>
                </div>
                <span className={`chip ${inv.status === 'returned' ? 'good' : inv.status === 'in_progress' ? 'accent' : 'warn'}`}>{L(STATUS_LABEL[inv.status])}</span>
              </div>
              {inv.resultSummary && <p className="text-sm" style={{ marginTop: 8 }}>{L(inv.resultSummary)}</p>}
              {inv.status !== 'returned' && (
                <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn sm" onClick={() => setReturningId(inv.id)}>{t('Record evidence returned', 'تسجيل عودة الأدلة')}</button>
                </div>
              )}
            </div>
          )
        })}
        {!investigations?.length && !thinPatterns.length && <div className="empty-state">{t('No investigations needed right now — every pattern has enough evidence.', 'لا حاجة لتحقيقات الآن — كل الأنماط لديها أدلة كافية.')}</div>}
      </div>

      {returningId && (
        <ReturnDialog
          onCancel={() => setReturningId(null)}
          onSubmit={(summary) => {
            returnInv.mutate({ id: returningId, resultSummary: summary })
            setReturningId(null)
          }}
        />
      )}
    </div>
  )
}

function RequestRow({ pattern }: { pattern: Pattern }) {
  const { t } = useI18n()
  const request = useRequestInvestigation()
  const [kind, setKind] = useState<'customer_interviews' | 'mystery_shopper_check'>('customer_interviews')
  return (
    <div className="row between">
      <span className="text-sm">{pattern.category.replace(/_/g, ' ')} — {pattern.team} <span className="muted">({pattern.sampleSize} {t('signals', 'إشارة')})</span></span>
      <div className="row">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="customer_interviews">{t('Customer interviews', 'مقابلات عملاء')}</option>
          <option value="mystery_shopper_check">{t('Mystery shopper check', 'فحص تسوق سري')}</option>
        </select>
        <button
          type="button"
          className="btn sm primary"
          onClick={() =>
            request.mutate({
              patternId: pattern.id,
              kind,
              requestedCount: kind === 'customer_interviews' ? 5 : undefined,
              environment: pattern.team,
              scenario: kind === 'mystery_shopper_check' ? `${pattern.category.replace(/_/g, ' ')} scenario, ${pattern.team}` : undefined,
            })
          }
        >
          {t('Request', 'طلب')}
        </button>
      </div>
    </div>
  )
}

const returnSchema = z.object({ summary: z.string().min(5, 'Summarize what came back') })

function ReturnDialog({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (summary: string) => void }) {
  const { t } = useI18n()
  const { register, handleSubmit, formState: { errors } } = useForm<{ summary: string }>()
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit((v) => {
          const parsed = returnSchema.safeParse(v)
          if (!parsed.success) return
          onSubmit(parsed.data.summary)
        })}
      >
        <h2>{t('Record what came back', 'تسجيل ما عاد من نتائج')}</h2>
        <textarea {...register('summary')} placeholder={t('Root cause confirmed, action proposed...', 'تم تأكيد السبب الجذري، واقتُرح إجراء...')} />
        {errors.summary && <span className="text-sm" style={{ color: 'var(--crit)' }}>{errors.summary.message}</span>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn primary">{t('Save', 'حفظ')}</button>
        </div>
      </form>
    </div>
  )
}
