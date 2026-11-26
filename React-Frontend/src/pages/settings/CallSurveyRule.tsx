import { useMemo, useState } from 'react'
import { Bot, Lock, PhoneIncoming, PhoneOutgoing, User } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { useRulesConfig } from '@/services/queries'
import {
  CALL_RESULTS,
  CALL_SURVEY_DEFAULTS,
  callResultInfo,
  saveCallSurveyRule,
  useCallSurveyRule,
  type CallResult,
  type CallSurveyRule,
} from '@/data/callSurveyRule'
import { SAMPLE_CALLS, OUTBOUND_SCRIPTS, type SampleCall } from '@/data/callSample'
import { SKIP_LABEL, decideCallSurvey, type SkipReason } from '@/utils/callSurveys'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * Settings, Surveys, When we ask: the survey after a call-center call (26 Nov, owner). One survey (CSAT + CES), only after a completed
 * call with an approved result; never NPS; never after a call dropped at the AI greeting. The CX manager edits it; the others read it.
 * Below the rule, the last 30 days of sample calls run through it, so a change shows its effect at once.
 */
export function CallSurveyRuleCard({ canEdit }: { canEdit: boolean }) {
  const { t, L } = useI18n()
  const { log } = useAuditActor()
  const saved = useCallSurveyRule()
  const { data: rules } = useRulesConfig()
  const capDays = rules?.find((r) => r.id === 'rule_survey_csat_cap')?.value ?? 30
  const [draft, setDraft] = useState<CallSurveyRule | null>(null)
  const rule = draft ?? saved
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (patch: Partial<CallSurveyRule>) => setDraft({ ...rule, ...patch })
  const validTimes = rule.sendAfterMin >= 0 && rule.sendBeforeMin > rule.sendAfterMin && rule.fromHour >= 0 && rule.toHour <= 24 && rule.toHour > rule.fromHour

  function save() {
    saveCallSurveyRule(rule)
    const results = rule.sendOn.map((r) => callResultInfo(r).label)
    log('action', {
      en: `Changed the survey after a call: ${rule.enabled ? 'on' : 'off'}; results ${results.map((r) => r.en).join(', ')}; min ${rule.minTalkSeconds}s; ${rule.sendAfterMin}-${rule.sendBeforeMin} min after; ${rule.fromHour}:00-${rule.toHour}:00`,
      ar: `غيّر الاستبيان بعد المكالمة: ${rule.enabled ? 'مفعّل' : 'متوقف'}؛ النتائج ${results.map((r) => r.ar).join('، ')}؛ ${rule.minTalkSeconds} ثانية كحد أدنى؛ بعد ${rule.sendAfterMin}-${rule.sendBeforeMin} دقيقة؛ ${rule.fromHour}:00-${rule.toHour}:00`,
    })
    setDraft(null)
  }

  const toggleResult = (id: CallResult, on: boolean) => set({ sendOn: on ? [...rule.sendOn, id] : rule.sendOn.filter((r) => r !== id) })

  return (
    <div className="flex flex-col gap-6" data-testid="call-survey-rule">
      <SectionCard
        title={t('Survey after a call-center call', 'الاستبيان بعد مكالمة مركز الاتصال')}
        description={t(
          'One survey, satisfaction (CSAT) and effort (CES) on one screen, sent only when the call was completed with an approved result. Never NPS after a call: NPS stays with a completed sale, lease or handover.',
          'استبيان واحد، الرضا (CSAT) والجهد (CES) على شاشة واحدة، يُرسل فقط عندما تكتمل المكالمة بنتيجة معتمدة. لا NPS بعد المكالمة: يبقى NPS مرتبطاً ببيع أو إيجار أو تسليم مكتمل.',
        )}
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className={rule.enabled ? 'text-foreground' : 'text-muted-foreground'}>{rule.enabled ? t('On', 'مفعّل') : t('Off', 'متوقف')}</span>
            <Switch
              checked={rule.enabled}
              disabled={!canEdit}
              onCheckedChange={(v) => set({ enabled: v })}
              aria-label={t('Survey after a call', 'الاستبيان بعد المكالمة')}
            />
          </label>
        }
      >
        <div className={cn('flex flex-col gap-6', !rule.enabled && 'opacity-60')}>
          <div className="flex flex-col gap-2">
            <h3 className="label-style">{t('Send when the call ended with', 'يُرسل عندما تنتهي المكالمة بـ')}</h3>
            <ul className="grid gap-2 sm:grid-cols-2 desktop:grid-cols-3">
              {CALL_RESULTS.map((r) => {
                const on = rule.sendOn.includes(r.id)
                return (
                  <li key={r.id}>
                    <label
                      className={cn(
                        'flex h-full items-start gap-3 rounded-xl border p-3 text-sm',
                        on ? 'border-(--status-success-bg) bg-(--status-success-bg)' : 'border-line bg-well',
                        r.completed && canEdit ? 'cursor-pointer' : 'cursor-default',
                      )}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={on}
                        disabled={!canEdit || !r.completed}
                        onCheckedChange={(v) => toggleResult(r.id, v === true)}
                        aria-label={L(r.label)}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{L(r.label)}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.completed ? L(r.hint) : t('Never surveyed: no completed conversation', 'لا يُستبيَن: لا محادثة مكتملة')}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="label-style pb-1">{t('Conditions', 'الشروط')}</h3>
            <Row
              label={t('Shortest real conversation', 'أقصر محادثة حقيقية')}
              hint={t('Shorter calls get no survey.', 'المكالمات الأقصر لا تحصل على استبيان.')}
            >
              <Num value={rule.minTalkSeconds} disabled={!canEdit} onChange={(v) => set({ minTalkSeconds: v })} label={t('Seconds', 'ثوانٍ')} />
              <span className="text-sm text-muted-foreground">{t('seconds', 'ثانية')}</span>
            </Row>
            <Row
              label={t('When it is sent', 'متى يُرسل')}
              hint={t(
                'Minutes after the call ends, by WhatsApp, or SMS when the number has no WhatsApp.',
                'دقائق بعد انتهاء المكالمة، عبر واتساب، أو SMS إن لم يكن للرقم واتساب.',
              )}
            >
              <Num value={rule.sendAfterMin} disabled={!canEdit} onChange={(v) => set({ sendAfterMin: v })} label={t('From minutes', 'من دقيقة')} />
              <span className="text-sm text-muted-foreground">{t('to', 'إلى')}</span>
              <Num value={rule.sendBeforeMin} disabled={!canEdit} onChange={(v) => set({ sendBeforeMin: v })} label={t('To minutes', 'إلى دقيقة')} />
              <span className="text-sm text-muted-foreground">{t('minutes', 'دقيقة')}</span>
            </Row>
            <Row
              label={t('Sending hours (Gulf time)', 'ساعات الإرسال (توقيت الخليج)')}
              hint={t('A survey due outside these hours waits for the next morning.', 'الاستبيان المستحق خارج هذه الساعات ينتظر صباح اليوم التالي.')}
            >
              <Num value={rule.fromHour} disabled={!canEdit} onChange={(v) => set({ fromHour: v })} label={t('From hour', 'من الساعة')} />
              <span className="text-sm text-muted-foreground">{t('to', 'إلى')}</span>
              <Num value={rule.toHour} disabled={!canEdit} onChange={(v) => set({ toHour: v })} label={t('To hour', 'إلى الساعة')} />
            </Row>
            <Row
              label={t('Which calls', 'أي مكالمات')}
              hint={t('Inbound and outbound calls to existing customers.', 'المكالمات الواردة والصادرة للعملاء الحاليين.')}
            >
              <Toggle
                icon={<PhoneIncoming aria-hidden className="size-4" />}
                label={t('Inbound', 'واردة')}
                checked={rule.inbound}
                disabled={!canEdit}
                onChange={(v) => set({ inbound: v })}
              />
              <Toggle
                icon={<PhoneOutgoing aria-hidden className="size-4" />}
                label={t('Outbound', 'صادرة')}
                checked={rule.outbound}
                disabled={!canEdit}
                onChange={(v) => set({ outbound: v })}
              />
            </Row>
            <Row
              label={t('Handled by', 'تعامل معها')}
              hint={t(
                'The answer records which one, so AI and people can be compared.',
                'الإجابة تسجّل من تعامل مع المكالمة، للمقارنة بين الذكاء الاصطناعي والموظفين.',
              )}
            >
              <Toggle
                icon={<Bot aria-hidden className="size-4" />}
                label={t('AI agent', 'الوكيل الذكي')}
                checked={rule.ai}
                disabled={!canEdit}
                onChange={(v) => set({ ai: v })}
              />
              <Toggle
                icon={<User aria-hidden className="size-4" />}
                label={t('A person', 'موظف')}
                checked={rule.human}
                disabled={!canEdit}
                onChange={(v) => set({ human: v })}
              />
            </Row>
            <Row
              label={t('A critical failure stops the survey', 'الإخفاق الحرج يوقف الاستبيان')}
              hint={t(
                'When the call is flagged for conduct, wrong information or a promise not kept, no survey: a Close the loop item opens instead.',
                'إذا عُلّمت المكالمة بسبب السلوك أو معلومة خاطئة أو وعد لم يُنفَّذ، لا استبيان: يُفتح بند في إغلاق الحلقة بدلاً منه.',
              )}
            >
              <Switch
                checked={rule.criticalStops}
                disabled={!canEdit}
                onCheckedChange={(v) => set({ criticalStops: v })}
                aria-label={t('Critical failure stops the survey', 'الإخفاق الحرج يوقف الاستبيان')}
              />
            </Row>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="label-style">{t('Always applied', 'تُطبَّق دائماً')}</h3>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {[
                t('Only numbers matched to an existing CRM contact', 'فقط الأرقام المطابقة لعميل حالي في CRM'),
                t('Every number checked against the UAE Do Not Call Registry', 'كل رقم يُفحص مقابل سجل عدم الاتصال في الإمارات'),
                t(`At most once every ${capDays} days per customer (How often we ask)`, `مرة واحدة كحد أقصى كل ${capDays} يوماً لكل عميل (كم مرة نسأل)`),
                t('The QA score is saved with the answer when the call is in the QA sample', 'تُحفظ درجة الجودة مع الإجابة إذا كانت المكالمة ضمن عيّنة الجودة'),
                t(
                  'Calls dropped at the AI greeting: no survey, counted per call script',
                  'المكالمات المغلقة عند تحية الذكاء الاصطناعي: لا استبيان، وتُحسب لكل نص مكالمة',
                ),
                t('The call ID, result and AI or person are saved with every answer', 'رقم المكالمة ونتيجتها ومن تعامل معها تُحفظ مع كل إجابة'),
              ].map((x) => (
                <li key={x} className="flex items-start gap-2 rounded-xl bg-well px-3 py-2">
                  <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!dirty || !validTimes} onClick={save}>
                {t('Save the rule', 'حفظ القاعدة')}
              </Button>
              {dirty && (
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  {t('Cancel', 'إلغاء')}
                </Button>
              )}
              {JSON.stringify(saved) !== JSON.stringify(CALL_SURVEY_DEFAULTS) && !dirty && (
                <Button variant="ghost" onClick={() => setDraft(CALL_SURVEY_DEFAULTS)}>
                  {t('Back to the agreed defaults', 'العودة إلى الإعدادات المتفق عليها')}
                </Button>
              )}
              {!validTimes && <span className="text-sm text-(--status-error-text)">{t('Check the minutes and the hours.', 'تحقق من الدقائق والساعات.')}</span>}
            </div>
          )}
        </div>
      </SectionCard>

      <CallSurveyPreview rule={rule} capDays={capDays} />
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="row-divider flex flex-col gap-2 py-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="t-ui-strong">{label}</span>
        <span className="t-caption">{hint}</span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

function Num({ value, onChange, disabled, label }: { value: number; onChange: (v: number) => void; disabled: boolean; label: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      aria-label={label}
      disabled={disabled}
      className="h-9 w-20 text-end tabular"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

function Toggle({
  icon,
  label,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm">
      {icon}
      {label}
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}

interface Agg {
  calls: number
  sent: number
  answered: number
  satisfied: number
  cesSum: number
}
const empty = (): Agg => ({ calls: 0, sent: 0, answered: 0, satisfied: 0, cesSum: 0 })
function add(a: Agg, c: SampleCall, sent: boolean) {
  a.calls++
  if (!sent) return
  a.sent++
  if (c.answer) {
    a.answered++
    if (c.answer.csat >= 4) a.satisfied++
    a.cesSum += c.answer.ces
  }
}
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '–')
const avg = (s: number, n: number) => (n ? (s / n).toFixed(1) : '–')

/** The last 30 days of sample calls run through the rule on screen (the draft, before it is saved). */
function CallSurveyPreview({ rule, capDays }: { rule: CallSurveyRule; capDays: number }) {
  const { t, L } = useI18n()
  const view = useMemo(() => {
    const total = empty()
    const byResult = new Map<CallResult, Agg>()
    const byAgent = { ai: empty(), human: empty() }
    const skips = new Map<SkipReason, number>()
    const qa = { high: empty(), mid: empty(), low: empty() }
    const drops = new Map<string, { calls: number; dropped: number }>()
    for (const c of SAMPLE_CALLS) {
      const d = decideCallSurvey(c, rule, capDays)
      add(total, c, d.send)
      const r = byResult.get(c.result) ?? empty()
      add(r, c, d.send)
      byResult.set(c.result, r)
      add(byAgent[c.handledBy], c, d.send)
      if (!d.send) skips.set(d.reason, (skips.get(d.reason) ?? 0) + 1)
      if (c.qa && d.send) add(c.qa.score >= 85 ? qa.high : c.qa.score >= 70 ? qa.mid : qa.low, c, true)
      if (c.handledBy === 'ai' && c.direction === 'outbound') {
        const s = drops.get(c.script) ?? { calls: 0, dropped: 0 }
        s.calls++
        if (c.result === 'dropped_after_greeting') s.dropped++
        drops.set(c.script, s)
      }
    }
    return { total, byResult, byAgent, skips: [...skips.entries()].sort((a, z) => z[1] - a[1]), qa, drops }
  }, [rule, capDays])
  const { total } = view
  const maxSkip = view.skips[0]?.[1] ?? 1

  return (
    <SectionCard
      title={t('Last 30 days with this rule', 'آخر 30 يوماً بهذه القاعدة')}
      description={t(
        'Sample calls run through the rule above, including changes not saved yet. The real numbers come from the call center once it is connected.',
        'مكالمات تجريبية تمرّ على القاعدة أعلاه، بما فيها التغييرات غير المحفوظة. الأرقام الحقيقية تأتي من مركز الاتصال بعد ربطه.',
      )}
      actions={<StatusBadge tone="neutral">{t('Sample data', 'بيانات تجريبية')}</StatusBadge>}
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
          <KpiTile variant="well" label={t('Calls ended', 'مكالمات انتهت')} value={total.calls} sub={t('inbound and outbound', 'واردة وصادرة')} />
          <KpiTile
            variant="well"
            label={t('Surveys sent', 'استبيانات أُرسلت')}
            value={total.sent}
            sub={t(`${pct(total.sent, total.calls)} of the calls`, `${pct(total.sent, total.calls)} من المكالمات`)}
          />
          <KpiTile
            variant="well"
            label={t('Answered', 'أُجيبت')}
            value={total.answered}
            sub={t(`${pct(total.answered, total.sent)} of those sent`, `${pct(total.answered, total.sent)} من المرسلة`)}
          />
          <KpiTile
            variant="well"
            label={t('CSAT · CES', 'CSAT · CES')}
            value={pct(total.satisfied, total.answered)}
            sub={t(`satisfied (4-5) · CES ${avg(total.cesSum, total.answered)} of 7`, `راضون (4-5) · CES ${avg(total.cesSum, total.answered)} من 7`)}
          />
        </div>

        <div className="grid gap-6 desktop:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="label-style">{t('Why a call got no survey', 'لماذا لم تحصل المكالمة على استبيان')}</h3>
            <ul className="flex flex-col gap-2.5">
              {view.skips.map(([r, n]) => (
                <li key={r} className="flex flex-col gap-1 text-sm">
                  <span className="flex justify-between gap-3">
                    <span className="text-foreground">{L(SKIP_LABEL[r])}</span>
                    <span className="tabular text-muted-foreground">{n}</span>
                  </span>
                  <span aria-hidden className="h-2 overflow-hidden rounded-full bg-well">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(100 * n) / maxSkip}%`, background: r === 'critical' ? 'var(--status-error-solid, #d93025)' : 'var(--chart-1)' }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="label-style">{t('AI agent and people', 'الوكيل الذكي والموظفون')}</h3>
            <AggTable
              rows={[
                [t('AI agent', 'الوكيل الذكي'), view.byAgent.ai],
                [t('A person', 'موظف'), view.byAgent.human],
              ]}
            />
            <h3 className="label-style pt-3">{t('CSAT by QA score (calls in the QA sample)', 'CSAT حسب درجة الجودة (مكالمات عيّنة الجودة)')}</h3>
            <AggTable
              rows={[
                [t('QA 85 and over', 'الجودة 85 فأكثر'), view.qa.high],
                [t('QA 70 to 84', 'الجودة 70 إلى 84'), view.qa.mid],
                [t('QA under 70', 'الجودة أقل من 70'), view.qa.low],
              ]}
            />
            <p className="t-caption">
              {t(
                'When QA is high but CSAT is low, the QA form misses something customers care about; when QA is low but CSAT is high, it is too strict.',
                'عندما تكون الجودة عالية والرضا منخفضاً، فنموذج الجودة يغفل شيئاً يهم العملاء؛ وعندما تكون الجودة منخفضة والرضا عالياً، فهو صارم أكثر من اللازم.',
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="label-style">{t('By call result', 'حسب نتيجة المكالمة')}</h3>
          <AggTable rows={CALL_RESULTS.filter((r) => view.byResult.has(r.id)).map((r) => [L(r.label), view.byResult.get(r.id)!] as [string, Agg])} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="label-style">
            {t('Dropped at the AI greeting, per call script (outbound)', 'الإغلاق عند تحية الذكاء الاصطناعي، لكل نص مكالمة (صادرة)')}
          </h3>
          <Table density="comfortable">
            <TableHeader>
              <TableRow className="row-divider-none">
                <TableHead>{t('Call script', 'نص المكالمة')}</TableHead>
                <TableHead className="text-end">{t('AI calls', 'مكالمات الذكاء الاصطناعي')}</TableHead>
                <TableHead className="text-end">{t('Dropped', 'أُغلقت')}</TableHead>
                <TableHead className="text-end">{t('Drop rate', 'نسبة الإغلاق')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OUTBOUND_SCRIPTS.map((s) => {
                const d = view.drops.get(s) ?? { calls: 0, dropped: 0 }
                const rate = d.calls ? Math.round((100 * d.dropped) / d.calls) : 0
                return (
                  <TableRow key={s}>
                    <TableCell>{s}</TableCell>
                    <TableCell className="text-end tabular">{d.calls}</TableCell>
                    <TableCell className="text-end tabular">{d.dropped}</TableCell>
                    <TableCell className="text-end">
                      <StatusBadge tone={rate >= 25 ? 'danger' : rate >= 15 ? 'warning' : 'neutral'}>{rate}%</StatusBadge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionCard>
  )
}

function AggTable({ rows }: { rows: [string, Agg][] }) {
  const { t } = useI18n()
  return (
    <Table density="comfortable">
      <TableHeader>
        <TableRow className="row-divider-none">
          <TableHead />
          <TableHead className="text-end">{t('Calls', 'مكالمات')}</TableHead>
          <TableHead className="text-end">{t('Sent', 'أُرسل')}</TableHead>
          <TableHead className="text-end">{t('Answered', 'أُجيب')}</TableHead>
          <TableHead className="text-end">CSAT</TableHead>
          <TableHead className="text-end">CES</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([label, a]) => (
          <TableRow key={label}>
            <TableCell className="font-medium">{label}</TableCell>
            <TableCell className="text-end tabular">{a.calls}</TableCell>
            <TableCell className="text-end tabular">{a.sent}</TableCell>
            <TableCell className="text-end tabular">{a.answered}</TableCell>
            <TableCell className="text-end tabular">{pct(a.satisfied, a.answered)}</TableCell>
            <TableCell className="text-end tabular">{avg(a.cesSum, a.answered)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
