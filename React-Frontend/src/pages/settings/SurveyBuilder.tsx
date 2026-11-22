import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CornerDownRight, Flag, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { LEGACY_QUESTION_TYPE_LABEL } from '@/data/surveyVocabulary'
import type { EditableQuestion, Route, Target } from '@/data/surveyEditor'
import { answersOf, describeRouting, kindOf, reorder, routesByAnswer, sanitize, targetOf } from '@/data/surveyLogic'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'

/**
 * The campaign survey builder (owner's request, 22 Nov): on one side the flow of the survey, question by question, with where every
 * answer goes; on the other the question that is selected, with its wording, its type, its options and "after this answer, go to".
 * A jump can only go forward, so the survey never loops. "Try it" walks the survey as a customer would, one answer at a time.
 */
export const blankQuestion = (): EditableQuestion => ({ en: '', ar: '', kind: 'yesno' })

const SHORT_TYPE: Record<string, { en: string; ar: string }> = {
  nps: { en: '0–10', ar: '0–10' },
  rating: { en: '1–5', ar: '1–5' },
  choice: { en: 'Choice', ar: 'اختيار' },
  yesno: { en: 'Yes / No', ar: 'نعم / لا' },
  open: { en: 'Text', ar: 'نص' },
}

/** The questions somebody can reach from question 1, following every possible answer. */
function reachable(questions: EditableQuestion[]): Set<number> {
  const seen = new Set<number>()
  const stack = questions.length ? [0] : []
  while (stack.length) {
    const i = stack.pop() as number
    if (seen.has(i)) continue
    seen.add(i)
    const answers = answersOf(questions[i])
    const targets = answers.length ? answers.map((a) => targetOf(questions, i, a.value)) : [targetOf(questions, i, undefined)]
    for (const t of targets) if (t !== null && !seen.has(t)) stack.push(t)
  }
  return seen
}

export function SurveyBuilder({ questions, onChange }: { questions: EditableQuestion[]; onChange: (next: EditableQuestion[]) => void }) {
  const { t, L } = useI18n()
  const [selected, setSelected] = useState(0)
  const [trying, setTrying] = useState(false)
  const sel = Math.min(selected, questions.length - 1)
  const q = questions[sel]
  const canReach = useMemo(() => reachable(questions), [questions])

  const set = (next: EditableQuestion[]) => onChange(sanitize(next))
  const patch = (p: Partial<EditableQuestion>) => set(questions.map((x, i) => (i === sel ? { ...x, ...p } : x)))
  const move = (dir: -1 | 1) => {
    const order = questions.map((_, i) => i)
    const j = sel + dir
    ;[order[sel], order[j]] = [order[j], order[sel]]
    onChange(reorder(questions, order))
    setSelected(j)
  }
  const remove = () => {
    onChange(
      reorder(
        questions,
        questions.map((_, i) => i).filter((i) => i !== sel),
      ),
    )
    setSelected(Math.max(0, sel - 1))
  }
  const add = () => {
    // A new question goes right after the selected one; jumps keep pointing at the same questions.
    const order: (number | 'new')[] = questions.map((_, i) => i)
    order.splice(sel + 1, 0, 'new')
    const withNew = [...questions, blankQuestion()]
    onChange(
      reorder(
        withNew,
        order.map((o) => (o === 'new' ? questions.length : o)),
      ),
    )
    setSelected(sel + 1)
  }

  const goToOptions = (from: number) => [
    {
      value: 'next',
      label:
        from + 1 < questions.length
          ? t(`The next question (Q${from + 2})`, `السؤال التالي (س${from + 2})`)
          : t('End of the survey (last question)', 'نهاية الاستبيان (آخر سؤال)'),
    },
    ...questions
      .map((x, k) => ({ x, k }))
      .filter(({ k }) => k > from + 1)
      .map(({ x, k }) => ({ value: String(k), label: `${t(`Q${k + 1}`, `س${k + 1}`)}: ${short(L(x)) || t('untitled', 'بلا عنوان')}` })),
    { value: 'end', label: t('End the survey', 'إنهاء الاستبيان') },
  ]
  const toValue = (to: Target) => String(to)
  const fromValue = (v: string): Target => (v === 'next' || v === 'end' ? v : Number(v))

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" data-testid="survey-builder">
      {/* The flow */}
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-(--surface-card) p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="t-ui-strong">{t('The flow', 'مسار الاستبيان')}</span>
          <Button variant={trying ? 'default' : 'outline'} size="sm" onClick={() => setTrying((v) => !v)}>
            <Play aria-hidden />
            {trying ? t('Back to building', 'عودة للبناء') : t('Try it', 'جرّبه')}
          </Button>
        </div>
        {trying ? (
          <TryIt questions={questions} />
        ) : (
          <ol className="flex flex-col">
            {questions.map((x, i) => {
              const lost = !canReach.has(i)
              return (
                <li key={i} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-current={i === sel}
                    className={cn(
                      'flex w-full flex-col gap-1.5 rounded-xl border p-3 text-start outline-hidden transition-colors focus-visible:ring-2',
                      i === sel ? 'border-foreground bg-well' : 'border-line hover:bg-(--hover-tint)',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium',
                          i === sel ? 'material-dark text-white' : 'bg-well',
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 text-sm text-foreground">
                        {L(x).trim() || <span className="text-muted-foreground">{t('Untitled question', 'سؤال بلا عنوان')}</span>}
                      </span>
                      <span className="pill pill-light shrink-0">{L(SHORT_TYPE[kindOf(x)])}</span>
                    </span>
                    <span className="flex items-start gap-1.5 ps-8 text-xs text-muted-foreground">
                      <CornerDownRight aria-hidden className="mt-0.5 size-3 shrink-0" />
                      {describeRouting(questions, i, t, L)}
                    </span>
                    {lost && (
                      <span className="flex items-center gap-1.5 ps-8 text-xs text-(--status-warning-text)">
                        <AlertTriangle aria-hidden className="size-3" />
                        {t('Nobody reaches this question with the jumps as they are.', 'لن يصل أحد إلى هذا السؤال بالمسارات الحالية.')}
                      </span>
                    )}
                  </button>
                  <span aria-hidden className="ms-6 h-3 w-px bg-line" />
                </li>
              )
            })}
            <li className="flex items-center gap-2 rounded-xl border border-dashed border-line p-3 text-sm text-muted-foreground">
              <Flag aria-hidden className="size-4" />
              {t('End: thank you message', 'النهاية: رسالة شكر')}
            </li>
          </ol>
        )}
        {!trying && (
          <Button variant="outline" size="sm" onClick={add} className="self-start">
            <Plus aria-hidden />
            {t(`Add a question after Q${sel + 1}`, `أضف سؤالاً بعد س${sel + 1}`)}
          </Button>
        )}
      </div>

      {/* The selected question */}
      {q && (
        <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-(--surface-card) p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="t-ui-strong">{t(`Question ${sel + 1}`, `السؤال ${sel + 1}`)}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label={t('Move up', 'إلى الأعلى')} disabled={sel === 0} onClick={() => move(-1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t('Move down', 'إلى الأسفل')} disabled={sel === questions.length - 1} onClick={() => move(1)}>
                <ArrowDown aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t('Delete this question', 'احذف هذا السؤال')} disabled={questions.length === 1} onClick={remove}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Answer type', 'نوع الإجابة')}
            <Select
              value={kindOf(q)}
              onValueChange={(v) =>
                patch({
                  kind: v,
                  choices:
                    v === 'choice'
                      ? q.choices?.length
                        ? q.choices
                        : [
                            { en: '', ar: '' },
                            { en: '', ar: '' },
                          ]
                      : q.choices,
                })
              }
            >
              <SelectTrigger aria-label={t('Answer type', 'نوع الإجابة')} className="max-w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEGACY_QUESTION_TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {L(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Question in English', 'السؤال بالإنجليزية')}
              <Textarea
                value={q.en}
                rows={2}
                onChange={(e) => patch({ en: e.target.value })}
                placeholder={t('For example: Did you visit one of our branches?', 'مثال: Did you visit one of our branches?')}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Question in Arabic (optional)', 'السؤال بالعربية (اختياري)')}
              <Textarea value={q.ar} rows={2} dir="rtl" onChange={(e) => patch({ ar: e.target.value })} placeholder="مثال: هل زرت أحد فروعنا؟" />
            </label>
          </div>

          {kindOf(q) === 'choice' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">{t('Answer options', 'خيارات الإجابة')}</span>
              {(q.choices ?? []).map((c, k) => (
                <div key={k} className="flex items-center gap-2">
                  <Input
                    value={c.en}
                    aria-label={t(`Option ${k + 1} in English`, `الخيار ${k + 1} بالإنجليزية`)}
                    placeholder={t(`Option ${k + 1}`, `الخيار ${k + 1}`)}
                    onChange={(e) => patch({ choices: (q.choices ?? []).map((x, j) => (j === k ? { ...x, en: e.target.value } : x)) })}
                  />
                  <Input
                    value={c.ar}
                    dir="rtl"
                    aria-label={t(`Option ${k + 1} in Arabic`, `الخيار ${k + 1} بالعربية`)}
                    placeholder={t('In Arabic', 'بالعربية')}
                    onChange={(e) => patch({ choices: (q.choices ?? []).map((x, j) => (j === k ? { ...x, ar: e.target.value } : x)) })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('Remove this option', 'احذف هذا الخيار')}
                    disabled={(q.choices ?? []).length <= 2}
                    onClick={() => patch({ choices: (q.choices ?? []).filter((_, j) => j !== k) })}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="self-start" onClick={() => patch({ choices: [...(q.choices ?? []), { en: '', ar: '' }] })}>
                <Plus aria-hidden />
                {t('Add an option', 'أضف خياراً')}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-xl bg-well p-3">
            <span className="text-sm font-medium text-foreground">{t('After the answer, go to', 'بعد الإجابة، انتقل إلى')}</span>
            <RoutingEditor q={q} goToOptions={goToOptions(sel)} toValue={toValue} fromValue={fromValue} onChange={(next) => patch({ next })} />
          </div>
        </div>
      )}
    </div>
  )
}

function short(s: string) {
  const x = s.trim()
  return x.length > 40 ? `${x.slice(0, 40)}…` : x
}

function RoutingEditor({
  q,
  goToOptions,
  toValue,
  fromValue,
  onChange,
}: {
  q: EditableQuestion
  goToOptions: { value: string; label: string }[]
  toValue: (t: Target) => string
  fromValue: (v: string) => Target
  onChange: (next: EditableQuestion['next']) => void
}) {
  const { t, L } = useI18n()
  const routes = q.next?.routes ?? []
  const otherwise = q.next?.otherwise ?? 'next'
  const answers = answersOf(q)
  const kind = kindOf(q)

  if (routesByAnswer(q)) {
    if (!answers.length) return <p className="text-xs text-muted-foreground">{t('Write the options first.', 'اكتب الخيارات أولاً.')}</p>
    const targetFor = (value: string) => routes.find((r) => r.op === 'is' && r.value === value)?.to ?? otherwise
    const setFor = (value: string, to: Target) => {
      const rest = routes.filter((r) => !(r.op === 'is' && r.value === value))
      onChange({ routes: to === otherwise ? rest : [...rest, { op: 'is', value, to }], otherwise })
    }
    return (
      <ul className="flex flex-col gap-2">
        {answers.map((a) => (
          <li key={a.value} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-28 font-medium text-foreground">
              {t('If', 'إذا')} “{L(a.label)}”
            </span>
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
            <GoTo
              options={goToOptions}
              toValue={toValue}
              fromValue={fromValue}
              value={targetFor(a.value)}
              onPick={(to) => setFor(a.value, to)}
              label={t(`Where “${a.label.en}” goes`, `إلى أين تذهب “${a.label.ar}”`)}
            />
          </li>
        ))}
      </ul>
    )
  }

  if (kind === 'open') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-foreground">{t('Whatever they write', 'أياً كان ما يكتبه')}</span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <GoTo
          options={goToOptions}
          toValue={toValue}
          fromValue={fromValue}
          value={otherwise}
          onPick={(to) => onChange({ routes: [], otherwise: to })}
          label={t('Where it goes next', 'إلى أين بعدها')}
        />
      </div>
    )
  }

  // Scores: rules by range, then everything else.
  const scale = answers.map((a) => a.value)
  const update = (k: number, p: Partial<Route>) => onChange({ routes: routes.map((r, j) => (j === k ? { ...r, ...p } : r)), otherwise })
  return (
    <div className="flex flex-col gap-2">
      {routes.map((r, k) => (
        <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground">{t('If the score is', 'إذا كانت الدرجة')}</span>
          <Select value={r.op} onValueChange={(v) => update(k, { op: v as Route['op'] })}>
            <SelectTrigger aria-label={t('Comparison', 'المقارنة')} className="h-8 min-w-28 bg-(--surface-card)">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="atMost">{t('or lower:', 'أو أقل:')}</SelectItem>
              <SelectItem value="atLeast">{t('or higher:', 'أو أعلى:')}</SelectItem>
              <SelectItem value="is">{t('exactly:', 'بالضبط:')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={r.value} onValueChange={(v) => update(k, { value: v })}>
            <SelectTrigger aria-label={t('Score', 'الدرجة')} className="h-8 min-w-16 bg-(--surface-card)">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scale.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
          <GoTo
            options={goToOptions}
            toValue={toValue}
            fromValue={fromValue}
            value={r.to}
            onPick={(to) => update(k, { to })}
            label={t('Where it goes', 'إلى أين')}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Remove this rule', 'احذف هذه القاعدة')}
            onClick={() => onChange({ routes: routes.filter((_, j) => j !== k), otherwise })}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-foreground">{routes.length ? t('Any other score', 'أي درجة أخرى') : t('Every score', 'كل الدرجات')}</span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <GoTo
          options={goToOptions}
          toValue={toValue}
          fromValue={fromValue}
          value={otherwise}
          onPick={(to) => onChange({ routes, otherwise: to })}
          label={t('Where other scores go', 'إلى أين تذهب الدرجات الأخرى')}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="self-start bg-(--surface-card)"
        onClick={() => onChange({ routes: [...routes, { op: 'atMost', value: kind === 'nps' ? '6' : '2', to: 'next' }], otherwise })}
      >
        <Plus aria-hidden />
        {t('Add a rule by score', 'أضف قاعدة حسب الدرجة')}
      </Button>
    </div>
  )
}

function GoTo({
  options,
  toValue,
  fromValue,
  value,
  onPick,
  label,
}: {
  options: { value: string; label: string }[]
  toValue: (t: Target) => string
  fromValue: (v: string) => Target
  value: Target
  onPick: (t: Target) => void
  label: string
}) {
  return (
    <Select value={toValue(value)} onValueChange={(v) => onPick(fromValue(v))}>
      <SelectTrigger aria-label={label} className="h-8 min-w-48 bg-(--surface-card)">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Walk the survey as a customer: answer, and the next question is the one the routes pick. */
function TryIt({ questions }: { questions: EditableQuestion[] }) {
  const { t, L } = useI18n()
  const [path, setPath] = useState<{ index: number; answer: string }[]>([])
  const [at, setAt] = useState<number | null>(questions.length ? 0 : null)
  const restart = () => {
    setPath([])
    setAt(questions.length ? 0 : null)
  }
  const answer = (value: string | undefined, label: string) => {
    if (at === null) return
    setPath((p) => [...p, { index: at, answer: label }])
    setAt(targetOf(questions, at, value))
  }
  const q = at === null ? undefined : questions[at]

  return (
    <div className="flex flex-col gap-3">
      {path.length > 0 && (
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
          {path.map((p, i) => (
            <li key={i}>
              {t(`Q${p.index + 1}`, `س${p.index + 1}`)}: {short(L(questions[p.index]))} → <span className="font-medium text-foreground">{p.answer}</span>
            </li>
          ))}
        </ol>
      )}
      {q && at !== null ? (
        <div className="flex flex-col gap-3 rounded-xl bg-well p-3">
          <span className="text-xs text-muted-foreground">{t(`Question ${at + 1}`, `السؤال ${at + 1}`)}</span>
          <p className="text-sm font-medium text-foreground">{L(q).trim() || t('Untitled question', 'سؤال بلا عنوان')}</p>
          <div className="flex flex-wrap gap-2">
            {answersOf(q).length ? (
              answersOf(q).map((a) => (
                <Button key={a.value} variant="outline" size="sm" className="bg-(--surface-card)" onClick={() => answer(a.value, L(a.label))}>
                  {L(a.label)}
                </Button>
              ))
            ) : (
              <Button size="sm" onClick={() => answer(undefined, t('(wrote an answer)', '(كتب إجابة)'))}>
                {t('Send my answer', 'أرسل إجابتي')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-well p-3 text-sm text-foreground">
          <Flag aria-hidden className="size-4" />
          {t(
            `End of the survey, after ${path.length} question${path.length === 1 ? '' : 's'}. Thank you!`,
            `نهاية الاستبيان بعد ${path.length} سؤال. شكراً لك!`,
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={restart}>
          <RotateCcw aria-hidden />
          {t('Start again', 'ابدأ من جديد')}
        </Button>
        <StatusBadge>{t('Only a preview, nothing is sent', 'معاينة فقط، لا يُرسل شيء')}</StatusBadge>
      </div>
    </div>
  )
}

