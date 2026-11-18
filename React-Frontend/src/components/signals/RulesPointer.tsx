import { Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { RULES_POINTER_COPY } from '@/data/whatIf'
import { Button } from '@/components/ui/button'

/**
 * "One place for every threshold." (v40 F16, S16): a tinted card that says the numbers on this page are the same ones as
 * Settings, Rules as configuration, and that changing them there recomputes every page (patterns are computed from the rules
 * at read time). The "Open" button shows only for a role that may open the Rules page.
 */
export function RulesPointer() {
  const { L } = useI18n()
  const { role } = useRole()
  const canOpen = canAccessPath(role.id, '/settings/rules')
  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="rules-pointer">
      <div className="flex min-w-0 gap-3">
        <SlidersHorizontal aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold">{L(RULES_POINTER_COPY.pointerTitle)}</p>
          <p className="max-w-[80ch] text-sm text-muted-foreground">{L(RULES_POINTER_COPY.pointerText)}</p>
        </div>
      </div>
      {canOpen && (
        <Button variant="outline" size="sm" asChild className="h-9 shrink-0 self-start sm:self-auto">
          <Link to="/settings/rules">{L(RULES_POINTER_COPY.open)}</Link>
        </Button>
      )}
    </aside>
  )
}
