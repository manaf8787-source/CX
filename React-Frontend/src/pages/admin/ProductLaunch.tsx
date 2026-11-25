import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { useProducts, useToggleProductLaunch } from '@/services/queries'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'

/**
 * Product launch (owner's request, 23 Nov; cards like Integrations, 25 Nov; moved from the CX manager's Settings): which products are live in the portal. A product that
 * is not launched stays out of the menu, the entry page and the filters for everyone. Super admin and Admin only; each switch is logged.
 */
export default function ProductLaunch() {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const { data: products, isLoading } = useProducts()
  const toggle = useToggleProductLaunch()

  return (
    <div data-density="comfortable" className="flex flex-col gap-5">
      <PageHeader
        title={t('Product launch', 'إطلاق المنتجات')}
        description={t(
          'Show only what is live. Products that are not launched stay out of the menu, the entry page and the filters, for every user. Super admin and Admin only.',
          'أظهر فقط ما أُطلق. المنتجات التي لم تُطلق تبقى خارج القائمة وصفحة الدخول والفلاتر لكل المستخدمين. للمشرف العام والمشرف فقط.',
        )}
      />
      <SectionCard>
        {isLoading ? (
          <LoadingState rows={4} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {(products ?? []).map((p) => (
              <li key={p.id} className="well flex flex-col gap-4 p-4">
                <span className="w-fit">
                  <ProductTag productId={p.id} lang={lang} />
                </span>
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <StatusBadge tone={p.live ? 'success' : 'neutral'} dot>
                    {p.live ? t('Live', 'مُفعّل') : t('Hidden', 'مخفي')}
                  </StatusBadge>
                  <Switch
                    checked={p.live}
                    onCheckedChange={() => {
                      toggle.mutate({ id: p.id })
                      log(
                        'action',
                        { en: `${p.live ? 'Hid' : 'Launched'} ${p.name.en} in the portal`, ar: `${p.live ? 'أخفى' : 'أطلق'} ${p.name.ar} في البوابة` },
                        '/admin/products',
                      )
                    }}
                    aria-label={`${L(p.name)}: ${t('show in the portal', 'إظهار في البوابة')}`}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
