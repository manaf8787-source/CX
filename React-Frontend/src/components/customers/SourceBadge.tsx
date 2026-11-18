import { useI18n } from '@/i18n'
import type { ChannelId } from '@/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CHANNEL_ICON, CHANNEL_LABEL, PUBLIC_CHANNELS } from './channels'

/**
 * The source of an event as a light tag with its icon. A public channel (Facebook, Instagram, LinkedIn, Google) carries a 6px info dot
 * in front of the icon (dot + icon + label), so "public" is a status dot, not a tint.
 */
export function SourceBadge({ channel, className }: { channel: ChannelId; className?: string }) {
  const { L } = useI18n()
  const Icon = CHANNEL_ICON[channel]
  const isPublic = PUBLIC_CHANNELS.has(channel)
  return (
    <StatusBadge tone={isPublic ? 'info' : 'neutral'} dot={isPublic} icon={<Icon aria-hidden />} className={className}>
      {L(CHANNEL_LABEL[channel])}
    </StatusBadge>
  )
}
