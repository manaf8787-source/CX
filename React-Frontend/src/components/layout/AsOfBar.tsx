import { Link } from 'react-router-dom'
import { CheckCircle2, Lock, TriangleAlert } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { ALL_ENVIRONMENTS, ENVIRONMENTS, envName } from '@/data/environments'
import { FEEDS_COPY, lateFeedsLabel } from '@/data/feeds'
import { useEnvScope, useFeedScope } from '@/services/queriesV40'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { EnvId, EnvScope } from '@/types'

/**
 * The thin "Data as of" bar under the top bar on every signed-in page (v40 F14, S5): the latest time the feeds in scope were
 * received, a chip for late or missing feeds ("N feeds late or missing" opens Data feeds when the role may open it, else
 * "All feeds received"), and the Environment switch. A role fixed to one environment (environment management) sees a
 * chip with its environment name instead of the select.
 *
 * Decided 18 Nov: the switch narrows everything that carries an environment: people, signals, patterns, shopper cases,
 * fixes, the close-the-loop list, investigations, hand-offs, public mentions and the Home counts. It does not narrow what
 * has no environment in the sample (survey rows and the indicators built on them, the agents, the non-CRM feeds); the
 * switch's description says so, and Home repeats it under the indicators while a single environment is chosen.
 */
export function AsOfBar() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { env, setEnv, allowed, fixed } = useEnvScope()
  const { data } = useFeedScope()
  const link = canAccessPath(role.id, '/settings/feeds')
  const late = data?.lateCount ?? 0
  const asOf = data?.asOf
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(data.asOf))
    : '–'

  const chip =
    late > 0 ? (
      <StatusBadge tone="warning" icon={<TriangleAlert aria-hidden />}>
        {L(lateFeedsLabel(late))}
      </StatusBadge>
    ) : (
      <StatusBadge tone="success" icon={<CheckCircle2 aria-hidden />}>
        {L(FEEDS_COPY.barAllReceived)}
      </StatusBadge>
    )

  const switchHint = t(
    'Narrows people, signals, patterns, shopper cases, fixes, the call list, investigations and public mentions. Indicators per product are not narrowed.',
    'يضيّق الأشخاص والإشارات والأنماط وحالات المتسوق والحلول وقائمة الاتصال والتحقيقات والإشارات العامة. مؤشرات كل منتج لا تُضيَّق.',
  )
  const fixedHint = t('Your role is limited to this environment.', 'دورك محصور في هذه البيئة.')

  return (
    <div
      role="region"
      aria-label={t('Data freshness and environment', 'حداثة البيانات والبيئة')}
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b bg-muted/40 px-3 py-1.5 text-sm md:px-5"
    >
      <span className="text-muted-foreground">
        {L(FEEDS_COPY.barDataAsOf)}{' '}
        <bdi dir="ltr" className="font-semibold text-foreground">
          {asOf}
        </bdi>
      </span>
      {link ? (
        <Link to="/settings/feeds" className="rounded-full outline-none transition-opacity duration-150 hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {chip}
        </Link>
      ) : (
        chip
      )}
      <div className="ms-auto flex items-center gap-2">
        <span id="asof-env-label" className="text-muted-foreground">
          {L(FEEDS_COPY.barEnvironment)}
        </span>
        {fixed ? (
          <span title={fixedHint} className="inline-flex">
            <StatusBadge tone="info" icon={<Lock aria-hidden />}>
              {L(envName(fixed))}
            </StatusBadge>
            <span className="sr-only">{fixedHint}</span>
          </span>
        ) : (
          <>
            <Select value={env} onValueChange={(v) => setEnv(v as EnvScope)}>
              <SelectTrigger size="sm" aria-labelledby="asof-env-label" aria-describedby="asof-env-hint" title={switchHint} className="h-8 min-w-44 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">{L(ALL_ENVIRONMENTS)}</SelectItem>
                {ENVIRONMENTS.filter((e) => allowed.includes(e.id as EnvId)).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {L(e.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span id="asof-env-hint" className="sr-only">
              {switchHint}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
