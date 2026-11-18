import { useI18n } from '@/i18n'
import type { ChannelId } from '@/types'
import { cn } from '@/lib/utils'
import { CHANNEL_ICON, CHANNEL_LABEL, PUBLIC_CHANNELS } from './channels'

/**
 * The source of an event as a light tag with its icon. A public channel (Facebook, Instagram, LinkedIn, Google) carries a 6px info dot
 * in front of the icon, so "public" is a status dot, not a tint.
 */
export function SourceBadge({ channel, className }: { channel: ChannelId; className?: string }) {
  const { L } = useI18n()
  const Icon = CHANNEL_ICON[channel]
  const isPublic = PUBLIC_CHANNELS.has(channel)
  return (
    <span data-slot="source-badge" className={cn('pill pill-light [&_svg]:size-3.5', className)}>
      {isPublic && <span aria-hidden className="dot dot-info" />}
      <Icon aria-hidden />
      {L(CHANNEL_LABEL[channel])}
    </span>
  )
}
