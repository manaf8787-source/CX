import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useHrPool, useProducts, useToggleProductLaunch } from '@/services/queries'
import { useHeadNotices, useUpdateHeadNotice, type DigestFrequency } from '@/services/referenceQueries'
import { INFORMED_RULE } from '@/data/v38Reference'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'
import { SettingsSection, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

const DIGEST_LABEL: Record<DigestFrequency, { en: string; ar: string }> = {
  weekly: { en: 'Weekly', ar: 'أسبوعية' },
  daily: { en: 'Daily', ar: 'يومية' },
  off: { en: 'Off', ar: 'متوقفة' },
}

/** Modules KB §15: "Settings holds the launch list (which products are live),
 * the HR pool, the notices heads receive, and Rules as configuration." The
 * CX manager changes them; the CX team reads them.
 *
 * Design: comfortable density and the skill's two-column settings layout (Heading 4 and description on the left, the card on the
 * right, sections 48px apart). The notices matrix is wide, so its heading stacks above a full-width card. Read-only roles see the
 * values as plain text and the view-only note (permission-based UI). */
export default function AdminSettings() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: products, isLoading: productsLoading } = useProducts()
  const toggleLaunch = useToggleProductLaunch()
  const { data: hrPool, isLoading: poolLoading } = useHrPool()
  const { data: notices, isLoading: noticesLoading } = useHeadNotices()
  const updateNotice = useUpdateHeadNotice()

  return (
    <div data-density="comfortable" className="@container flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <SubPageHeader
          title={t('Settings', 'الإعدادات')}
          description={t(
            'Which products are live, who is in the HR pool, and which notices the heads receive. Environments and pools are read from the CRM and are not edited here.',
            'أي المنتجات مُطلقة ومن في مجموعة الموارد البشرية وأي الإشعارات تصل الرؤساء. البيئات والمجموعات تُقرأ من CRM ولا تُعدّل هنا.',
          )}
        />
        {!canEdit && <ViewOnlyNotice>{t('View only. The CX manager changes these settings.', 'للعرض فقط. يغيّر مدير تجربة العملاء هذه الإعدادات.')}</ViewOnlyNotice>}
      </div>

      <div className="flex flex-col gap-12">
        <SettingsSection
          title={t('Product launch', 'إطلاق المنتجات')}
          description={t('Show only what is live. Products that are not launched stay out of the menu, the entry page and the filters.', 'أظهر فقط ما أُطلق. المنتجات التي لم تُطلق تبقى خارج القائمة وصفحة الدخول والفلاتر.')}
        >
          {productsLoading ? (
            <LoadingState rows={4} />
          ) : (
            <ul className="flex flex-col">
              {(products ?? []).map((p) => {
                const status = (
                  <StatusBadge tone={p.live ? 'success' : 'neutral'} dot>
                    {p.live ? t('Live', 'مُفعّل') : t('Hidden', 'مخفي')}
                  </StatusBadge>
                )
                return (
                  <li key={p.id} className="row-divider flex min-h-14 items-center justify-between gap-3 py-2">
                    <ProductTag productId={p.id} lang={lang} />
                    {canEdit ? (
                      <label className="flex cursor-pointer items-center gap-3">
                        {status}
                        <Switch
                          checked={p.live}
                          onCheckedChange={() => toggleLaunch.mutate({ id: p.id })}
                          aria-label={`${L(p.name)}: ${t('show in the portal', 'إظهار في البوابة')}`}
                        />
                      </label>
                    ) : (
                      status
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SettingsSection>

        <SettingsSection
          table
          title={t('HR pool', 'مجموعة الموارد البشرية')}
          description={t('Conduct cases are assigned to the HR pool; the agent’s direct manager reviews HR’s actions.', 'تُعيَّن حالات السلوك لمجموعة الموارد البشرية؛ ويراجع المدير المباشر للموظف إجراءاتها.')}
        >
          {poolLoading ? (
            <LoadingState rows={2} />
          ) : (
            <Table density="comfortable">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Title', 'المسمى')}</TableHead>
                  <TableHead>{t('Email', 'البريد')}</TableHead>
                  <TableHead>{t('Mobile', 'الجوال')}</TableHead>
                  <TableHead className="text-end">{t('Assigned cases', 'الحالات المعيّنة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(hrPool ?? []).map((m) => (
                  <TableRow key={m.title}>
                    <TableCell className="font-medium text-foreground">{m.title}</TableCell>
                    <TableCell className="tabular" dir="ltr">
                      {m.email}
                    </TableCell>
                    <TableCell className="tabular" dir="ltr">
                      {m.mobile}
                    </TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">{m.assignedCases}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="px-2.5 text-sm text-muted-foreground">{t('Real HR pool members are still to be named by HR management. [Proposed]', 'أعضاء مجموعة الموارد البشرية الفعليون لم تحددهم إدارة الموارد بعد. [مقترح]')}</p>
        </SettingsSection>

        <SettingsSection
          table
          layout="stacked"
          title={t('Notices and digests', 'الإشعارات والخلاصات')}
          term="Informed only"
          description={L(INFORMED_RULE)}
        >
          {noticesLoading ? (
            <LoadingState rows={4} />
          ) : (
            <Table density="comfortable">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Product', 'المنتج')}</TableHead>
                  <TableHead>{t('Informed', 'يُبلَّغ')}</TableHead>
                  <TableHead>{t('Digest', 'الخلاصة')}</TableHead>
                  <TableHead>{t('Immediate alert', 'تنبيه فوري')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(notices ?? []).map((n) => {
                  const product = products?.find((p) => p.id === n.productId)
                  return (
                    <TableRow key={n.productId}>
                      <TableCell>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <ProductTag productId={n.productId} lang={lang} />
                          {product && !product.live && <StatusBadge tone="neutral">{t('Not launched', 'لم يُطلق بعد')}</StatusBadge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground">{L(n.informed)}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select
                            value={n.digest}
                            onValueChange={(v) =>
                              updateNotice.mutate(
                                { productId: n.productId, digest: v as DigestFrequency },
                                { onSuccess: () => toast.success(t('Saved.', 'تم الحفظ.')) },
                              )
                            }
                          >
                            <SelectTrigger className="h-9 w-32" aria-label={`${t('Digest', 'الخلاصة')}: ${L(n.informed)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(DIGEST_LABEL) as DigestFrequency[]).map((d) => (
                                <SelectItem key={d} value={d}>
                                  {L(DIGEST_LABEL[d])}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-foreground">{L(DIGEST_LABEL[n.digest])}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <label className={canEdit ? 'flex cursor-pointer items-center gap-3' : 'flex items-center gap-3'}>
                          <Switch
                            checked={n.immediateAlert}
                            disabled={!canEdit}
                            onCheckedChange={(v) => updateNotice.mutate({ productId: n.productId, immediateAlert: v })}
                            aria-label={`${t('Immediate alert', 'تنبيه فوري')}: ${L(n.informed)}`}
                          />
                          <span>{t('High priority past SLA, or a pattern', 'عالية الأولوية بعد المدة أو نمط')}</span>
                        </label>
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow>
                  <TableCell>
                    <ProductTag productId="wl" lang={lang} />
                  </TableCell>
                  <TableCell colSpan={3}>{t('Who is informed for PSI Wallet is awaiting decision. [Proposed]', 'من يُبلَّغ لمحفظة PSI بانتظار القرار. [مقترح]')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </SettingsSection>
      </div>
    </div>
  )
}
