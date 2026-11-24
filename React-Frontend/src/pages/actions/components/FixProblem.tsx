import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, Quote, Target, Wrench } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useSignalsAll } from '@/services/queries'
import { useRules } from '@/services/queriesV40'
import { fixPlan, problemFor } from '@/data/fixProblem'
import { signalKindLabel } from './labels'
import type { CorrectiveAction, Pattern, SignalKind } from '@/types'

/**
 * "The problem" (24 Nov, owner: "still I didn't understand the problem, no details"): always shown on a fix, above the details. In plain
 * words: what customers went through, how many and where, what they said (sample lines), the likely cause, what the fix will actually do,
 * and how we will know it worked (the 60-day check against the months before).
 */
export function FixProblem({ fix, pattern }: { fix: CorrectiveAction; pattern?: Pattern }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const rules = useRules()
  const { data: signals } = useSignalsAll()
  const facts = useMemo(() => {
    if (!pattern) return null
    const ids = new Set(pattern.signalIds)
    const mine = (signals ?? []).filter((s) => ids.has(s.id))
    const people = new Set(mine.flatMap((s) => (s.personId ? [s.personId] : []))).size
    const kinds = new Map<SignalKind, number>()
    mine.forEach((s) => kinds.set(s.kind, (kinds.get(s.kind) ?? 0) + 1))
    const dates = mine.map((s) => s.occurredAt).sort()
    return { total: pattern.signalIds.length, people, kinds: [...kinds.entries()].sort((a, b) => b[1] - a[1]), first: dates[0], last: dates[dates.length - 1] }
  }, [pattern, signals])

  if (!pattern) return null
  const p = problemFor(pattern.category)
  const team = pattern.team
  const series = fix.monthlySignalSeries
  const start = fix.startedMonthIndex ?? 3
  const before = series ? Math.round(series.slice(0, start).reduce((s, v) => s + v, 0) / start) : null
  const target = before === null ? null : Math.max(0, Math.floor((before * (100 - rules.effectiveDropPct)) / 100))
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')
  const canOpenSignals = canAccessPath(role.id, '/actions/signals')

  return (
    <section className="well flex flex-col gap-4 text-sm" aria-label={t('The problem', 'المشكلة')} data-testid="fix-problem">
      <div className="flex flex-col gap-1.5">
        <span className="t-body-s inline-flex items-center gap-1.5 text-(--status-error-text)">
          <AlertCircle aria-hidden className="size-3.5" />
          {t('The problem', 'المشكلة')}
        </span>
        <p className="text-base font-medium text-foreground">{L(p.headline)}</p>
        <p className="text-foreground">{L(p.experience)}</p>
        {facts && (
          <p className="text-muted-foreground">
            {t(
              `${facts.total} times in the last ${pattern.windowDays} days (${fmt(facts.first)} to ${fmt(facts.last)}), from ${facts.people} customers, in ${team}.`,
              `${facts.total} مرة خلال آخر ${pattern.windowDays} يوماً (من ${fmt(facts.first)} إلى ${fmt(facts.last)})، من ${facts.people} عميلاً، في ${team}.`,
            )}{' '}
            {facts.kinds
              .map(([k, n]) => {
                const w = L(signalKindLabel(k)).toLowerCase()
                return `${n} ${lang === 'en' && n !== 1 ? (w.endsWith('ch') ? `${w}es` : `${w}s`) : w}`
              })
              .join(' · ')}
            {canOpenSignals && (
              <>
                {' '}
                <Link
                  to={`/actions/signals?pt=${encodeURIComponent(pattern.id)}#patterns`}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
                >
                  {t('See them', 'اعرضها')}
                  <ArrowRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {p.quotes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="t-body-s inline-flex items-center gap-1.5">
            <Quote aria-hidden className="size-3.5" />
            {t('What customers said (sample)', 'ما قاله العملاء (عينة)')}
          </span>
          <ul className="flex flex-col gap-1">
            {p.quotes.map((q) => (
              <li key={q.en} className="border-s-2 ps-3 text-foreground italic">
                “{L(q)}”
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="t-body-s">{t('Likely cause', 'السبب المرجّح')}</span>
          <span className="text-foreground">{L(p.cause)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="t-body-s inline-flex items-center gap-1.5">
            <Wrench aria-hidden className="size-3.5" />
            {t('What the fix does', 'ماذا يفعل الإجراء')}
          </span>
          <span className="text-foreground">{L(fixPlan(fix.kind, pattern.category, team))}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="t-body-s inline-flex items-center gap-1.5">
            <Target aria-hidden className="size-3.5" />
            {t('How we know it worked', 'كيف نعرف أنه نجح')}
          </span>
          <span className="text-foreground">
            {before === null
              ? t(
                  `60 days after it is done, this problem drops by at least ${rules.effectiveDropPct}% in ${team}.`,
                  `بعد 60 يوماً من التنفيذ، تنخفض هذه المشكلة ${rules.effectiveDropPct}% على الأقل في ${team}.`,
                )
              : t(
                  `Today about ${before} a month in ${team}. 60 days after it is done it should be ${target} a month or fewer (a ${rules.effectiveDropPct}% drop).`,
                  `حالياً نحو ${before} شهرياً في ${team}. بعد 60 يوماً من التنفيذ يجب أن تصبح ${target} شهرياً أو أقل (انخفاض ${rules.effectiveDropPct}%).`,
                )}
          </span>
        </div>
      </div>
    </section>
  )
}
