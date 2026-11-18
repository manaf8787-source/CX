import type { LucideIcon } from 'lucide-react'
import { Database } from 'lucide-react'
import { useI18n } from '@/i18n'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SOURCE_LABEL } from '@/data/customersList'
import type { LeadSource } from '@/types'
import { CHANNEL_ICON } from './channels'

const ICON: Record<LeadSource, LucideIcon> = {
  app: CHANNEL_ICON.app,
  website: CHANNEL_ICON.website,
  whatsapp: CHANNEL_ICON.whatsapp,
  club: CHANNEL_ICON.club,
  crm: Database,
}

/** The source of the lead as a badge (v40 F29). Website and app stay two named sources; "CRM" is an internal one. */
export function LeadSourceBadge({ source }: { source: LeadSource }) {
  const { L } = useI18n()
  const Icon = ICON[source]
  return (
    <StatusBadge icon={<Icon aria-hidden />}>{L(SOURCE_LABEL[source])}</StatusBadge>
  )
}
