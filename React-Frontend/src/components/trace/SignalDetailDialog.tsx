import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewAgentNames, resolveAgentDisplay } from '@/auth/permissions'
import { useAgentDirectory } from '@/services/queries'
import { useSignalDetail, useTraceNav } from '@/services/queriesV40'
import { TRACE_COPY } from '@/data/steps'
import { PRODUCTS } from '@/data/products'
import { envNameFromShort } from '@/data/environments'
import { signalCategoryLabel, signalKindLabel } from '@/pages/actions/components/labels'
import { CHANNEL_LABEL } from '@/components/customers/channels'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TraceCard } from './TraceCard'

/**
 * The signal detail dialog (v40 F11): `SG-n · {signal}`, chips (kind, source channel, environment, product, date, and the agent
 * name only for roles that may see names), "Classified by Agent 2 as {category}. Counted by Agent 3; ..." and the Trace card for
 * the signal. A shadcn Dialog: focus is trapped, Escape and the backdrop close it, focus returns to what opened it. A public
 * mention names no person and links to none.
 */
export function SignalDetailDialog({ id }: { id: string }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { close } = useTraceNav()
  const { signal, chain, traceId } = useSignalDetail(id)
  const { data: directory } = useAgentDirectory()
  if (signal === undefined) return null

  const product = signal ? PRODUCTS.find((p) => p.id === signal.product) : undefined
  const channels = chain ? [...new Set(chain.events.map((e) => e.channel))] : []
  const agent =
    signal?.agentRef && directory && canViewAgentNames(role.id)
      ? resolveAgentDisplay(signal.agentRef, role.id, directory, { en: 'Agent', ar: 'وكيل' }, lang)
      : null
  const category = signal ? signalCategoryLabel(signal.category) : null

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>{signal && category ? `${traceId} · ${L(category)}` : t('Signal not found', 'الإشارة غير موجودة')}</DialogTitle>
          <DialogDescription>{signal ? L(TRACE_COPY.hint) : t('No signal has this id.', 'لا توجد إشارة بهذا الرقم.')}</DialogDescription>
        </DialogHeader>
        {signal && category && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2" aria-label={t('Signal details', 'تفاصيل الإشارة')} role="group">
              <StatusBadge tone={signal.kind === 'legal_privacy_safety' ? 'danger' : signal.isPublic ? 'info' : 'warning'}>{L(signalKindLabel(signal.kind))}</StatusBadge>
              {channels.map((c) => (
                <StatusBadge key={c}>{L(CHANNEL_LABEL[c])}</StatusBadge>
              ))}
              <StatusBadge>{L(envNameFromShort(signal.environment))}</StatusBadge>
              {product && <StatusBadge>{L(product.name)}</StatusBadge>}
              <StatusBadge>
                <bdi dir="ltr">{signal.occurredAt.slice(0, 10)}</bdi>
              </StatusBadge>
              {agent?.visible && <StatusBadge>{agent.label}</StatusBadge>}
              {signal.isPublic && <StatusBadge tone="neutral">{t('No person identified', 'لا شخص معرَّف')}</StatusBadge>}
            </div>
            <p className="text-sm">
              {t(
                `Classified by Agent 2 as ${L(category)}. Counted by Agent 3; it is worked only through the pattern it belongs to, never alone.`,
                `صنّفه الوكيل 2 كـ ${L(category)}. عدّه الوكيل 3؛ يُعالج فقط عبر النمط الذي ينتمي إليه، لا وحده.`,
              )}
            </p>
            <TraceCard kind="signal" id={signal.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
