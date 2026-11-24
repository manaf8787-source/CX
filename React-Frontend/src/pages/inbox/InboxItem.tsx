import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { Button } from '@/components/ui/button'
import Corrective from '@/pages/actions/Corrective'
import ShopperCases from '@/pages/actions/ShopperCases'
import Investigations from '@/pages/actions/Investigations'
import CloseTheLoop from '@/pages/CloseTheLoop'
import { ApprovalsTab } from '@/pages/Gifts'
import PublicMentions from '@/pages/settings/PublicMentions'
import WeeklySample from '@/pages/settings/WeeklySample'

/**
 * An inbox item on its own page (owner, 24 Nov: "each item opens alone, not inside Problems and fixes, Gifts or Close the loop").
 * The URL is `/inbox/open` + the item's own path and query, so the page keeps the same filters (`?fix=`, `?item=`, `?gift=`, `?status=`).
 * Each record shows with every action it has; what is done here is the same record the full pages show.
 */
const PREFIX = '/inbox/open'

const SUPPORTED = [
  '/actions/corrective',
  '/actions/shopper-cases',
  '/settings/mystery-shopper',
  '/actions/investigations',
  '/close-the-loop',
  '/gifts',
  '/settings/public-mentions',
  '/settings/weekly-sample',
]

/** The link an inbox row's "Open" uses: the item page for the kinds above, else the item's own page. */
export function inboxItemHref(target: string): string {
  const path = target.split('?')[0]
  return SUPPORTED.includes(path) ? `${PREFIX}${target}` : target
}

export default function InboxItem() {
  const { t } = useI18n()
  const { role } = useRole()
  const { pathname, search } = useLocation()
  const [params] = useSearchParams()
  const path = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : ''
  const fullTarget = `${path}${search}`
  if (!SUPPORTED.includes(path)) return <Navigate to={path ? fullTarget : '/inbox'} replace />
  if (!canAccessPath(role.id, path)) return <Navigate to="/inbox" replace />

  let body: React.ReactNode
  let allLabel = t('See it on its full page', 'اعرضه في صفحته الكاملة')
  if (path === '/actions/corrective' && params.get('fix')) {
    body = <Corrective only={params.get('fix')!} />
    allLabel = t('See it among all the fixes', 'اعرضه بين كل الإجراءات')
  } else if ((path === '/actions/shopper-cases' || path === '/settings/mystery-shopper') && params.get('case')) {
    body = <ShopperCases only={params.get('case')!} />
    allLabel = t('See it among all the cases', 'اعرضها بين كل الحالات')
  } else if (path === '/actions/investigations' && params.get('inv')) {
    body = <Investigations only={params.get('inv')!} />
  } else if (path === '/close-the-loop' && params.get('item')) {
    body = <CloseTheLoop only={params.get('item')!} />
    allLabel = t('See the whole call list', 'اعرض قائمة الاتصال كاملة')
  } else if (path === '/gifts') {
    body = <ApprovalsTab only={params.get('gift') ?? undefined} />
    allLabel = t('See all gift requests', 'اعرض كل طلبات الهدايا')
  } else if (path === '/settings/public-mentions') {
    body = <PublicMentions />
  } else if (path === '/settings/weekly-sample') {
    body = <WeeklySample />
  } else {
    return <Navigate to={fullTarget} replace />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/inbox">
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
            {t('Back to my inbox', 'العودة لصندوقي')}
          </Link>
        </Button>
        <Link to={fullTarget} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          {allLabel}
        </Link>
      </div>
      {body}
    </div>
  )
}
