import { ArrowRight, Check, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canEditCrmMapping } from '@/auth/permissions'
import { useConfirmMapping, useCrmMapping, useSaveMapping } from '@/services/queriesV40'
import { CRM_MAPPING_COPY as COPY, mappingCounts } from '@/data/crmMapping'
import type { MappingKind } from '@/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { IN_CARD, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

const KINDS: MappingKind[] = ['src', 'stg', 'act']

/**
 * CRM mapping (v40 F15): the translation from what the CRM says to what the portal says, kept as configuration and filled
 * once with the CRM owner. Three tabs: Media to source, lead stage to funnel stage, activity category to event. The CX
 * manager and the Internal Audit and Marketing Lead edit it; everyone else reads. A value with no mapping defaults to
 * "Ignore" and is queued for review in the weekly sample. Every row carries [Proposed] until the CRM owner confirms it:
 * `row.confirmed` clears the badge, and a role that may edit records the confirmation with "Confirm" (changing a value
 * takes it back). The data default is unconfirmed, so today every row still carries it. Counts come from the data, not from the
 * prototype's sentence (it said 13 stages and listed 14).
 *
 * Design: a register, so dense (44px rows). Tabs are the segmented track with the count inside; the table sits in one card. A role
 * that may only read sees the portal value as plain text, not a greyed select (permission-based UI).
 */
export default function CrmMapping() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: mapping, isLoading, isError, refetch } = useCrmMapping()
  const save = useSaveMapping()
  const confirm = useConfirmMapping()
  const canEdit = canEditCrmMapping(role.id)
  const counts = mapping ? mappingCounts(mapping) : null
  const countOf = (k: MappingKind) => (k === 'src' ? counts?.sources.crm : k === 'stg' ? counts?.stages.crm : counts?.events.crm)

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />

      {!canEdit && (
        <ViewOnlyNotice>{t('View only. The CX manager and the Internal Audit and Marketing Lead change the mapping.', 'للعرض فقط. مدير CX ومدير التدقيق الداخلي والتسويق يغيّران الربط.')}</ViewOnlyNotice>
      )}

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !mapping || !counts ? (
        <LoadingState rows={6} />
      ) : (
        <Tabs defaultValue="src" className="gap-4">
          <div className="-m-1 overflow-x-auto p-1">
            <TabsList className="min-w-max">
              {KINDS.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {L(COPY.tabs[k])}
                  <span className="tabular font-normal">{countOf(k)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {KINDS.map((kind) => (
            <TabsContent key={kind} value={kind}>
              <SectionCard
                contentClassName={IN_CARD}
                description={
                  kind === 'src'
                    ? t(`${counts.sources.crm} CRM media values shown, ${counts.sources.portal} portal sources.`, `${counts.sources.crm} قيمة وسيط من CRM معروضة، و${counts.sources.portal} مصادر في البورتال.`)
                    : kind === 'stg'
                      ? t(`${counts.stages.crm} CRM lead stages shown, ${counts.stages.portal} portal funnel stages.`, `${counts.stages.crm} مرحلة ليد من CRM معروضة، و${counts.stages.portal} مراحل قمع في البورتال.`)
                      : t(`${counts.events.crm} CRM activity categories shown, ${counts.events.portal} portal events.`, `${counts.events.crm} فئة نشاط من CRM معروضة، و${counts.events.portal} أحداث في البورتال.`)
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{L(COPY.columns[kind].crm)}</TableHead>
                      <TableHead className="w-8 px-0">
                        <span className="sr-only">→</span>
                      </TableHead>
                      <TableHead>{L(COPY.columns[kind].portal)}</TableHead>
                      <TableHead>{L(COPY.rule)}</TableHead>
                      <TableHead>{t('Status', 'الحالة')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapping.rows
                      .filter((r) => r.kind === kind)
                      .map((r) => {
                        const option = mapping.options[kind].find((o) => o.id === r.portalValue)
                        const ignored = r.portalValue === 'ignore'
                        return (
                          <TableRow key={`${kind}:${r.crmValue}`}>
                            <TableCell className="font-medium text-foreground">
                              <bdi dir="ltr">{r.crmValue}</bdi>
                            </TableCell>
                            <TableCell className="w-8 px-0">
                              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
                            </TableCell>
                            <TableCell>
                              {canEdit ? (
                                <Select
                                  value={r.portalValue}
                                  onValueChange={(portalValue) =>
                                    save.mutate({ kind, crmValue: r.crmValue, portalValue }, { onSuccess: () => toast(L(COPY.toast)), onError: (e) => toast.error(e instanceof Error ? e.message : t('Could not save the mapping.', 'تعذّر حفظ الربط.')) })
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full min-w-44" aria-label={`${r.crmValue} → ${L(COPY.columns[kind].portal)}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mapping.options[kind].map((o) => (
                                      <SelectItem key={o.id} value={o.id}>
                                        {L(o.label)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="font-medium text-foreground">{option ? L(option.label) : r.portalValue}</span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-48 whitespace-normal">{L(COPY.ruleHint[kind])}</TableCell>
                            <TableCell className="min-w-44">
                              <span className="flex flex-wrap items-center gap-1.5">
                                {r.confirmed ? (
                                  <StatusBadge tone="success" icon={<Check aria-hidden />}>
                                    {t('Confirmed', 'مؤكَّد')}
                                  </StatusBadge>
                                ) : (
                                  <>
                                    <ProposedBadge title={t('Not confirmed by the CRM owner yet.', 'لم يؤكده مالك CRM بعد.')} />
                                    {canEdit && (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        disabled={confirm.isPending}
                                        aria-label={t(`Confirm the mapping of ${r.crmValue}`, `تأكيد ربط ${r.crmValue}`)}
                                        onClick={() =>
                                          confirm.mutate({ kind, crmValue: r.crmValue }, { onSuccess: () => toast(t('Mapping confirmed (prototype).', 'تم تأكيد الربط (نموذج أولي).')), onError: (e) => toast.error(e instanceof Error ? e.message : t('Could not confirm the mapping.', 'تعذّر تأكيد الربط.')) })
                                        }
                                      >
                                        {t('Confirm', 'تأكيد')}
                                      </Button>
                                    )}
                                  </>
                                )}
                                {ignored && (
                                  <StatusBadge tone="neutral" icon={<EyeOff aria-hidden />}>
                                    {t('Ignored · queued for review', 'متجاهَل · في طابور المراجعة')}
                                  </StatusBadge>
                                )}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </SectionCard>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <p className="text-sm text-muted-foreground">{L(COPY.footnote)}</p>
    </section>
  )
}
