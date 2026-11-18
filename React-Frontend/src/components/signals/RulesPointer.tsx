import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { RULES_POINTER_COPY } from '@/data/whatIf'
import { Button } from '@/components/ui/button'

/**
 * "One place for every threshold." (v40 F16, S16): an inline notification (a well with a dot, not a tinted card) that says the numbers on this page are the same ones as
 * Settings, Rules as configuration, and that changing them there recomputes every page (patterns are computed from the rules
 * at read time). The "Open" button shows only for a role that may open the Rules page.
 */
export function RulesPointer() {
  const { L } = useI18n()
  const { role } = useRole()
  const canOpen = canAccessPath(role.id, '/settings/rules')
  return (
    <aside className="well flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between" data-testid="rules-pointer">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="dot mt-[7px]" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="t-small-strong">{L(RULES_POINTER_COPY.pointerTitle)}</p>
          <p className="max-w-[80ch] text-sm text-muted-foreground">{L(RULES_POINTER_COPY.pointerText)}</p>
        </div>
      </div>
      {canOpen && (
        <Button variant="outline" size="sm" asChild className="shrink-0 self-start sm:self-auto">
          <Link to="/settings/rules">{L(RULES_POINTER_COPY.open)}</Link>
        </Button>
      )}
    </aside>
  )
}
