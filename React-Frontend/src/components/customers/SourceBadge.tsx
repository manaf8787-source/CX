import { useI18n } from '@/i18n'
import type { ChannelId } from '@/types'
import { cn } from '@/lib/utils'
import { CHANNEL_ICON, CHANNEL_LABEL, PUBLIC_CHANNELS } from './channels'

export function SourceBadge({ channel, className }: { channel: ChannelId; className?: string }) {
  const { L } = useI18n()
  const Icon = CHANNEL_ICON[channel]
  const isPublic = PUBLIC_CHANNELS.has(channel)
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
        isPublic ? 'border-info/20 bg-info/10 text-info-text' : 'border-border bg-card text-foreground',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {L(CHANNEL_LABEL[channel])}
    </span>
  )
}
