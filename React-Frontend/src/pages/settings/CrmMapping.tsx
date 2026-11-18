// FOUNDATION STUB: owner = workstream C (a working read-only view over `useCrmMapping`: C builds the three tabs, the editable select and the toast).
import { useI18n } from '@/i18n'
import { useCrmMapping } from '@/services/queriesV40'
import { CRM_MAPPING_COPY, mappingCounts } from '@/data/crmMapping'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MappingKind } from '@/types'
import { SubPageHeader } from './SubPageHeader'

const KINDS: MappingKind[] = ['src', 'stg', 'act']

export default function CrmMapping() {
  const { L } = useI18n()
  const { data: mapping, isLoading } = useCrmMapping()
  const counts = mapping ? mappingCounts(mapping) : null
  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader title={<span className="inline-flex items-center gap-2">{L(CRM_MAPPING_COPY.title)} <ProposedBadge /></span>} description={L(CRM_MAPPING_COPY.intro)} />
      {isLoading || !mapping || !counts ? (
        <LoadingState rows={6} />
      ) : (
        KINDS.map((kind) => (
          <div key={kind} className="flex flex-col gap-2">
            <h3 className="text-base font-semibold">{L(CRM_MAPPING_COPY.tabs[kind])}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L(CRM_MAPPING_COPY.columns[kind].crm)}</TableHead>
                  <TableHead>{L(CRM_MAPPING_COPY.columns[kind].portal)}</TableHead>
                  <TableHead>{L(CRM_MAPPING_COPY.rule)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapping.rows
                  .filter((r) => r.kind === kind)
                  .map((r) => (
                    <TableRow key={`${kind}:${r.crmValue}`}>
                      <TableCell>{r.crmValue}</TableCell>
                      <TableCell className="font-medium">{L(mapping.options[kind].find((o) => o.id === r.portalValue)?.label ?? { en: r.portalValue, ar: r.portalValue })}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{L(CRM_MAPPING_COPY.ruleHint[kind])}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
      <p className="text-sm text-muted-foreground">{L(CRM_MAPPING_COPY.footnote)}</p>
    </section>
  )
}
