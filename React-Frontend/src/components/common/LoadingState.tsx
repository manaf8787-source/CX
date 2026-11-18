import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Skeleton rows that reserve the space real content will take (no layout shift). Each block has the radius of what it replaces: a
 * circle for an avatar, 6px text lines at 60 and 40% width, a pill for a tag. The first row is a short title line. Keep headers, cards
 * and wells real around it; skeletonise only the data.
 */
export function LoadingState({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      <span className="sr-only">{t('Loading…', 'جارٍ التحميل…')}</span>
      {Array.from({ length: rows }, (_, i) =>
        i === 0 ? (
          <Skeleton key={i} className="h-5 w-1/3 rounded-[6px]" />
        ) : (
          <div key={i} className="flex h-11 items-center gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-3/5 rounded-[6px]" />
              <Skeleton className="h-3 w-2/5 rounded-[6px]" />
            </div>
            <Skeleton className="hidden h-5 w-16 shrink-0 rounded-full sm:block" />
          </div>
        ),
      )}
    </div>
  )
}
