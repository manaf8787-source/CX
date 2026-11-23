import { useState } from 'react'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { useProducts } from '@/services/queries'
import { ROUTING_FIELDS, resetRouting, setRoutingText, useRouting, type RoutingField } from '@/data/productRouting'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import type { Bi } from '@/types'

/**
 * "By product" tab of Who handles what (23 Nov, moved from Teams and structure and made editable): per product, how a case is assigned
 * and the four roles on it. The CX manager and the Internal Audit and Marketing Lead edit (as for the matrix); everyone else reads.
 */
const FIELD_LABEL: Record<RoutingField, Bi> = {
  mode: { en: 'How it is assigned', ar: 'كيف تُعيَّن' },
  caseOwner: { en: 'Case owner (follows up)', ar: 'صاحب الحالة (يتابع)' },
  assignedTo: { en: 'Assigned to (handles it)', ar: 'المعيَّن (يعالجها)' },
  actionOwner: { en: 'Corrective action owner (confirms the actions)', ar: 'مسؤول الإجراء التصحيحي (يؤكد الإجراءات)' },
  informed: { en: 'Informed only (no task)', ar: 'للعلم فقط (بلا مهمة)' },
}

export function ProductRoutingTab({ canEdit }: { canEdit: boolean }) {
  const { t, L, lang } = useI18n()
  const rows = useRouting()
  const { data: products } = useProducts()

  return (
    <SectionCard
      description={t(
        'Four roles on every case: the case owner follows up, the assigned person handles it, the corrective action owner confirms the actions, and the informed role receives a notice with no task. Cases go to the people concerned, never to top management.',
        'أربعة أدوار في كل حالة: صاحب الحالة يتابع، والمعيَّن يعالجها، ومسؤول الإجراء التصحيحي يؤكد الإجراءات، والمُبلَّغ يصله إشعار بلا مهمة. الحالات تذهب للمعنيين، وليس للإدارة العليا أبداً.',
      )}
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {rows.map((r) => {
          const live = r.key === 'hr' || products?.find((p) => p.id === r.key)?.live
          return (
            <div key={r.key} className="well flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {r.key === 'hr' ? <span className="t-ui-strong">{L(r.label!)}</span> : <ProductTag productId={r.key} lang={lang} />}
                {!live && <StatusBadge tone="neutral">{t('Not launched', 'لم يُطلق بعد')}</StatusBadge>}
                {r.byEnvironment && <StatusBadge tone="info">{t('Differs by environment', 'يختلف حسب البيئة')}</StatusBadge>}
              </div>
              <dl className="flex flex-col gap-2">
                {ROUTING_FIELDS.map((f) => (
                  <RoutingCell key={f} rowKey={r.key} field={f} value={r[f]} edited={r.edited.includes(f)} canEdit={canEdit} />
                ))}
              </dl>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function RoutingCell({ rowKey, field, value, edited, canEdit }: { rowKey: string; field: RoutingField; value: Bi; edited: boolean; canEdit: boolean }) {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const [draft, setDraft] = useState<string | null>(null)
  const current = L(value)
  const dirty = draft !== null && draft.trim() !== current
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        {L(FIELD_LABEL[field])}
        {edited && <StatusBadge tone="info">{t('Edited', 'معدّل')}</StatusBadge>}
      </dt>
      <dd className="text-sm text-foreground">
        {canEdit ? (
          <div className="flex flex-col gap-1.5">
            <Textarea
              rows={2}
              value={draft ?? current}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={L(FIELD_LABEL[field])}
              className="bg-(--surface-card)"
            />
            {(dirty || edited) && (
              <div className="flex flex-wrap justify-end gap-2">
                {edited && !dirty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetRouting(rowKey, field)
                      setDraft(null)
                      log(
                        'action',
                        {
                          en: `Reset "${FIELD_LABEL[field].en}" for ${rowKey} to the decided wording`,
                          ar: `أعاد "${FIELD_LABEL[field].ar}" لـ ${rowKey} إلى الصياغة المقررة`,
                        },
                        '/settings/escalation-matrix',
                      )
                    }}
                  >
                    <RotateCcw aria-hidden />
                    {t('Back to the decided wording', 'العودة للصياغة المقررة')}
                  </Button>
                )}
                {dirty && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                      {t('Discard', 'تراجع')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const text = (draft ?? '').trim()
                        setRoutingText(rowKey, field, { ...value, [lang]: text })
                        log(
                          'action',
                          {
                            en: `Changed "${FIELD_LABEL[field].en}" for ${rowKey} from "${current}" to "${text}"`,
                            ar: `غيّر "${FIELD_LABEL[field].ar}" لـ ${rowKey} من "${current}" إلى "${text}"`,
                          },
                          '/settings/escalation-matrix',
                        )
                        setDraft(null)
                        toast.success(t('Saved.', 'تم الحفظ.'))
                      }}
                    >
                      {t('Save', 'حفظ')}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          current
        )}
      </dd>
    </div>
  )
}

