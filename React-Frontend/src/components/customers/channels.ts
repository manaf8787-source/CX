import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  Share2,
  Smartphone,
  Star,
  UserCheck,
  Wallet,
} from 'lucide-react'
import type { Bi, ChannelId } from '@/types'

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
  google: { en: 'Google reviews', ar: 'تقييمات غوغل' },
  googleplay: { en: 'Google Play', ar: 'غوغل بلاي' },
  appstore: { en: 'App Store', ar: 'آب ستور' },
  webcomment: { en: 'Website comments', ar: 'تعليقات الموقع' },
}

export const CHANNEL_ICON: Record<ChannelId, LucideIcon> = {
  website: Globe,
  app: Smartphone,
  whatsapp: MessageCircle,
  call: Phone,
  ivr: PhoneCall,
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
  googleplay: Smartphone,
  appstore: Smartphone,
  webcomment: Globe,
}

export const PUBLIC_CHANNELS = new Set<ChannelId>(['facebook', 'instagram', 'linkedin', 'google', 'googleplay', 'appstore', 'webcomment'])
