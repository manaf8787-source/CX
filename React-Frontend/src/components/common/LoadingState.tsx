import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/** Skeleton rows that reserve the space real content will take (no layout shift). */
export function LoadingState({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">{t('Loading…', 'جارٍ التحميل…')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn('h-10 w-full', i === 0 && 'h-6 w-1/3')} />
      ))}
    </div>
  )
}
