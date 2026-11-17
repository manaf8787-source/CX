import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  error?: unknown
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title, error, onRetry, className }: ErrorStateProps) {
  const { t } = useI18n()
  const detail = error instanceof Error ? error.message : undefined
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-6 py-8 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-5 text-danger-text" aria-hidden />
      <p className="text-base font-medium text-foreground">{title ?? t('This section could not load', 'تعذّر تحميل هذا القسم')}</p>
      {detail && <p className="max-w-prose text-sm text-muted-foreground">{detail}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RotateCw />
          {t('Try again', 'حاول مجدداً')}
        </Button>
      )}
    </div>
  )
}
