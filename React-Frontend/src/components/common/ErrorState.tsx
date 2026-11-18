import { RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  error?: unknown
  onRetry?: () => void
  className?: string
}

/**
 * Error state per the skill: a well with a 30px light circle holding a 14px alert icon, a Heading 4 that says what failed, a Body M that
 * says what to do (the error message, when there is one) and one primary "Try again". Not a red banner: the alert icon is the only signal.
 */
export function ErrorState({ title, error, onRetry, className }: ErrorStateProps) {
  const { t } = useI18n()
  const detail = error instanceof Error ? error.message : undefined
  return (
    <div role="alert" data-slot="error-state" className={cn('well flex flex-col items-center gap-3 px-6 py-8 text-center', className)}>
      <span aria-hidden className="material-light inline-grid size-[30px] place-items-center rounded-full">
        <TriangleAlert className="size-3.5 text-danger-text" />
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="t-h4">{title ?? t('This section could not load', 'تعذّر تحميل هذا القسم')}</p>
        {detail && <p className="t-body-m max-w-[420px]">{detail}</p>}
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RotateCw />
          {t('Try again', 'حاول مجدداً')}
        </Button>
      )}
    </div>
  )
}
