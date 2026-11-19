import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canOpenPage } from '@/auth/access'
import { WATCH_COPY, WATCH_PATH } from '@/data/watchTeam'
import { prefetchPath } from '@/routes/pages'
import { Button } from '@/components/ui/button'

/**
 * "Watch the AI team work" on Home (v42 F31): a small right-aligned button under the six steps that opens the replay page. It renders only for
 * a role that may open that page, so nobody meets a button that redirects them. The negative top margin tucks it under the steps (the header
 * card's stack gap is 28px).
 */
export function WatchTeamButton() {
  const { L } = useI18n()
  const { role } = useRole()
  if (!canOpenPage(role.id, WATCH_PATH)) return null
  return (
    <div className="-mt-4 flex justify-end">
      <Button asChild size="sm" variant="outline">
        <Link to={WATCH_PATH} onPointerEnter={() => prefetchPath(WATCH_PATH)} onFocus={() => prefetchPath(WATCH_PATH)}>
          <Play aria-hidden className="fill-current" />
          {L(WATCH_COPY.title)}
        </Link>
      </Button>
    </div>
  )
}
