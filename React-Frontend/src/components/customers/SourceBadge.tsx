import type { ComponentType } from 'react'
import { Building2, CalendarDays, Globe, Mail, MapPin, MessageCircle, Phone, Share2, Smartphone, Star, UserCheck, Wallet, ClipboardList } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { Bi, ChannelId } from '../../types'

/** FR-2.5 — the 16 named source badges; website and app are kept as two
 * distinct sources (never merged) so a web user and an app user can always
 * be told apart, per Modules KB §4. */
export const CHANNEL_LABEL: Record<ChannelId, Bi> = {
  website: { en: 'PSI Website', ar: 'موقع PSI' },
  app: { en: 'PSI Real Estate app', ar: 'تطبيق PSI العقاري' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  call: { en: 'Call', ar: 'اتصال' },
  ivr: { en: 'IVR', ar: 'الرد الآلي' },
  branch: { en: 'Branch', ar: 'الفرع' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  survey: { en: 'Survey', ar: 'استبيان' },
  shopper: { en: 'Mystery shopper', ar: 'التسوق السري' },
  club: { en: 'PSI Club', ar: 'نادي PSI' },
  wallet: { en: 'PSI Wallet', ar: 'محفظة PSI' },
  events: { en: 'PSI Events', ar: 'فعاليات PSI' },
  tours: { en: 'Tour Estate', ar: 'تور إستيت' },
  facebook: { en: 'Facebook', ar: 'فيسبوك' },
  instagram: { en: 'Instagram', ar: 'إنستغرام' },
  linkedin: { en: 'LinkedIn', ar: 'لينكد إن' },
  google: { en: 'Google', ar: 'غوغل' },
}

const CHANNEL_ICON: Record<ChannelId, ComponentType<{ size?: number }>> = {
  website: Globe,
  app: Smartphone,
  whatsapp: MessageCircle,
  call: Phone,
  ivr: Phone,
  branch: Building2,
  email: Mail,
  survey: ClipboardList,
  shopper: UserCheck,
  club: Star,
  wallet: Wallet,
  events: CalendarDays,
  tours: MapPin,
  facebook: Share2,
  instagram: Share2,
  linkedin: Share2,
  google: Share2,
}

const PUBLIC_CHANNELS = new Set<ChannelId>(['facebook', 'instagram', 'linkedin', 'google'])

export function SourceBadge({ channel }: { channel: ChannelId }) {
  const { L } = useI18n()
  const Icon = CHANNEL_ICON[channel]
  return (
    <span className={`chip ${PUBLIC_CHANNELS.has(channel) ? 'accent' : ''}`}>
      <Icon size={12} /> {L(CHANNEL_LABEL[channel])}
    </span>
  )
}
