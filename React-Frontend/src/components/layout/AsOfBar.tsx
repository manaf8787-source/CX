import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Globe2, Lock, RefreshCw, TriangleAlert } from 'lucide-react'
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
 * "Data as of" and the Environment switch (v40 F14, S5), now the left side of the top bar: the skill's workspace selector (a 30px round
 * tile, the environment as the 14/500 name, "Environment" as the 13px meta line, a chevron) followed by a status (the latest time the
 * feeds in scope were received) and a feeds state ("N feeds late or missing" as a tinted tag that opens Data feeds when the role may
 * open it, else "All feeds received" as a green dot and text). A role fixed to one environment (environment management) sees its
 * environment name and a lock instead of the select.
 *
 * Decided 18 Nov: the switch narrows everything that carries an environment: people, signals, patterns, shopper cases,
 * fixes, the close-the-loop list, investigations, hand-offs, public mentions and the Home counts. It does not narrow what
 * has no environment in the sample (survey rows and the indicators built on them, the agents, the non-CRM feeds); the
 * switch's description says so, and Home repeats it under the indicators while a single environment is chosen.
 *
 * Inside the top bar (a container named `bar`) the date and the feed text collapse to screen-reader text below 1000 and 900px, leaving
 * the dot or icon; on its own (tests) it shows everything.
 */
/** 24 Nov (owner): pages with their own environment filter, where the top switch has no effect; the switch is hidden there. */
const OWN_ENV_FILTER = ['/settings/hr-team']

export function AsOfBar() {
  const { t, L, lang } = useI18n()
  const { pathname } = useLocation()
  const hideSwitch = OWN_ENV_FILTER.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const { role } = useRole()
  const { env, setEnv, allowed, fixed } = useEnvScope()
  const { data } = useFeedScope()
  // 23 Nov: the feeds live on Integrations for the Super admin and the Admin; other roles that read them keep the Settings page
  const feedsPath = canAccessPath(role.id, '/admin/integrations') ? '/admin/integrations?tab=feeds' : '/settings/feeds'
  const link = canAccessPath(role.id, feedsPath.split('?')[0])
  const late = data?.lateCount ?? 0
  const asOf = data?.asOf
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
        new Date(data.asOf),
      )
    : '–'

  const feedLabel = late > 0 ? L(lateFeedsLabel(late)) : L(FEEDS_COPY.barAllReceived)
  const chip =
    late > 0 ? (
      <StatusBadge tone="warning" icon={<TriangleAlert aria-hidden />}>
        <span className="sr-only @min-[1120px]/bar:not-sr-only @min-[1120px]/bar:whitespace-nowrap!">{feedLabel}</span>
      </StatusBadge>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span aria-hidden className="dot dot-success" />
        <span className="sr-only @min-[1120px]/bar:not-sr-only @min-[1120px]/bar:whitespace-nowrap!">{feedLabel}</span>
      </span>
    )

  const switchHint = t(
    'Narrows people, signals, patterns, shopper cases, fixes, the call list, investigations and public mentions. Indicators per product are not narrowed.',
    'يضيّق الأشخاص والإشارات والأنماط وحالات المتسوق والحلول وقائمة الاتصال والتحقيقات والإشارات العامة. مؤشرات كل منتج لا تُضيَّق.',
  )
  const fixedHint = t('Your role is limited to this environment.', 'دورك محصور في هذه البيئة.')

  const tile = (icon: ReactNode) => (
    <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-full bg-line text-muted-foreground [&_svg]:size-4">
      {icon}
    </span>
  )

  return (
    <div role="region" aria-label={t('Data freshness and environment', 'حداثة البيانات والبيئة')} className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-1">
      {hideSwitch ? null : fixed ? (
        <div title={fixedHint} className="flex min-w-0 items-center gap-2.5 px-1">
          {tile(<Lock />)}
          <span className="flex min-w-0 flex-col text-start leading-tight">
            <span className="t-ui-strong truncate">{L(envName(fixed))}</span>
            <span id="asof-env-label" className="truncate text-sm text-muted-foreground">
              {L(FEEDS_COPY.barEnvironment)}
            </span>
            <span className="sr-only">{fixedHint}</span>
          </span>
        </div>
      ) : (
        <>
          <Select value={env} onValueChange={(v) => setEnv(v as EnvScope)}>
            <SelectTrigger
              size="sm"
              aria-labelledby="asof-env-label"
              aria-describedby="asof-env-hint"
              title={switchHint}
              className="h-auto max-w-[13rem] min-w-0 gap-2 rounded-xl bg-transparent px-1 py-1 shadow-none! hover:bg-(--hover-tint) focus-visible:bg-transparent data-[state=open]:bg-(--hover-tint) @min-[640px]/bar:max-w-[15rem]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {tile(<Globe2 />)}
                <span className="flex min-w-0 flex-col items-start text-start leading-tight">
                  {/* Radix drops className on SelectValue, so the name style sits on a wrapper */}
                  <span className="t-ui-strong block max-w-full truncate">
                    <SelectValue />
                  </span>
                  <span id="asof-env-label" className="max-w-full truncate text-sm text-muted-foreground">
                    {L(FEEDS_COPY.barEnvironment)}
                  </span>
                </span>
              </span>
            </SelectTrigger>
            <SelectContent position="popper" align="start">
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

      <span className="sr-only items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground @min-[1180px]/bar:not-sr-only @min-[1180px]/bar:inline-flex">
        <RefreshCw aria-hidden className="size-3.5" />
        <span>
          {L(FEEDS_COPY.barDataAsOf)}{' '}
          <bdi dir="ltr" className="font-medium text-foreground">
            {asOf}
          </bdi>
        </span>
      </span>

      {link ? (
        <Link
          to={feedsPath}
          title={`${L(FEEDS_COPY.barDataAsOf)} ${asOf}`}
          className="rounded-full outline-hidden transition-opacity duration-200 hover:opacity-80"
        >
          {chip}
        </Link>
      ) : (
        <span title={`${L(FEEDS_COPY.barDataAsOf)} ${asOf}`} className="inline-flex">
          {chip}
        </span>
      )}
    </div>
  )
}
