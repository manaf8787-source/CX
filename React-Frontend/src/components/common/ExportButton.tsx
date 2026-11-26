import type { ComponentProps, ReactNode } from 'react'
import { Download, Lock } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/auth/session'
import { useUsers } from '@/data/users'
import { useAuditActor } from '@/auth/useAuditActor'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Bi } from '@/types'

/**
 * 26 Nov (owner): exporting data is a dangerous privilege, so it is given per person, never by role. The Super admin or an Admin
 * switches it on in Users and access. Every export button in the portal goes through this one gate: everyone sees the button,
 * only a person with the privilege can use it, and every export is written to the audit log (who, what, when, which page).
 */
export function useCanExport(): boolean {
  const { session } = useAuth()
  const users = useUsers()
  if (!session) return false
  return users.find((u) => u.id === session.userId)?.canExport === true
}

type Props = Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  /** Builds and downloads the file. Called only when the person holds the privilege. */
  onExport: () => void
  /** What is exported, for the audit log ("the gifts list", "the audit log"). */
  what: Bi
  children: ReactNode
  /** Hide the download icon (a text-only button). */
  noIcon?: boolean
}

export function ExportButton({ onExport, what, children, noIcon, disabled, ...rest }: Props) {
  const { t } = useI18n()
  const allowed = useCanExport()
  const { log } = useAuditActor()

  if (!allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* a disabled button gets no pointer events, so the span carries the tooltip */}
            <span tabIndex={0} className="inline-flex" data-export="locked">
              <Button {...rest} disabled aria-disabled>
                <Lock aria-hidden />
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {t('Exporting needs the export permission. Ask the Super admin or an Admin.', 'التصدير يحتاج صلاحية التصدير. اطلبها من المدير العام أو المسؤول.')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      {...rest}
      disabled={disabled}
      data-export="allowed"
      onClick={() => {
        onExport()
        log('data_exported', { en: `Exported ${what.en}`, ar: `صدّر ${what.ar}` })
      }}
    >
      {!noIcon && <Download aria-hidden />}
      {children}
    </Button>
  )
}
