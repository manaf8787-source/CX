import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { RULES_POINTER_COPY } from '@/data/whatIf'
import { Button } from '@/components/ui/button'
import { InlineNote } from '@/components/common/InlineNote'

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
    <InlineNote
      as="aside"
      tone="neutral"
      data-testid="rules-pointer"
      title={L(RULES_POINTER_COPY.pointerTitle)}
      action={
        canOpen && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/rules">{L(RULES_POINTER_COPY.open)}</Link>
          </Button>
        )
      }
    >
      {L(RULES_POINTER_COPY.pointerText)}
    </InlineNote>
  )
}
