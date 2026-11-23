import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canEditEscalationMatrix } from '@/auth/permissions'
import { useMatrix, useSaveMatrixCell } from '@/services/queriesV40'
import { MATRIX_COPY, MATRIX_FIELDS } from '@/data/escalationDefaults'
import { PRODUCTS } from '@/data/products'
import { formatClock, formatFactor } from '@/utils/matrixFormat'
import { InlineNote } from '@/components/common/InlineNote'
import { LoadingState } from '@/components/common/LoadingState'
import { SectionCard } from '@/components/common/SectionCard'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { MatrixCellRow, MatrixCells, MatrixField, MatrixRuleRow, ProductId } from '@/types'
import { Segmented } from '@/components/ui/segmented'
import { IN_CARD, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { INFORMED_RULE } from '@/data/v38Reference'
import { ProductRoutingTab } from './ProductRoutingTab'

const PRODUCT_IDS = PRODUCTS.map((p) => p.id)

/**
 * The escalation matrix (v40 F22, S9; v42 F30, cells set 19 Nov 2026, Decision 4 closed): one table per product, twelve rows (eight fix
 * kinds, two case types, a data-exposure row, and the VIP rule), six columns: kind, first receiver, informed, backup, respond (h), resolve (h).
 * Hours are working hours (9 = one working day); a few cells are written in days ("1 day", "5 days") and still hold hours.
 * The CX manager and the Internal Audit and Marketing Lead edit the cells (text for titles, a number for hours; an empty text cell
 * means nobody); everyone else reads. An edited cell is marked "Edited"; there is no [Proposed] anywhere: the set is decided, titles
 * adjustable until 28 Nov, the clocks stay. The VIP row is a rule (clocks halved), not a receiver, so it is not edited.
 * Above the product tabs: "Three rules behind the cells" and the clock legend. A fix reads its own product's row: the "From the matrix"
 * line and, at approval, the due date from "Resolve (h)" (halved for a VIP-related fix).
 * `?product=af` opens another product (the "Matrix" button on a fix links here).
 */
export default function EscalationMatrix() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canEdit = canEditEscalationMatrix(role.id)
  const [params, setParams] = useSearchParams()
  const asked = params.get('product') as ProductId | null
  const product: ProductId = asked && PRODUCT_IDS.includes(asked) ? asked : 're'
  const { data: rows, isLoading } = useMatrix(product)
  const c = MATRIX_COPY.columns
  const view = params.get('view') === 'routing' ? 'routing' : 'matrix'

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Who handles what', 'من يتولّى ماذا')}
        description={t(
          'Who receives each kind of problem, who is informed, the backup, and how fast they must respond and resolve, per product; and, on the second tab, how a case is assigned in each product.',
          'من يستلم كل نوع من المشاكل، ومن يُبلَّغ، والبديل، ومدى سرعة الرد والحل، لكل منتج؛ وفي التبويب الثاني كيف تُعيَّن الحالة في كل منتج.',
        )}
      />
      {!canEdit && (
        <ViewOnlyNotice>
          {t(
            'View only — the CX manager and the Internal Audit and Marketing Lead fill these cells.',
            'للعرض فقط — يملأ هذه الخلايا مدير تجربة العملاء ومسؤول التدقيق الداخلي والتسويق.',
          )}
        </ViewOnlyNotice>
      )}

      <Tabs
        value={view}
        onValueChange={(v) => {
          const next = new URLSearchParams(params)
          next.set('view', v)
          setParams(next, { replace: true })
        }}
        className="gap-4"
      >
        <TabsList aria-label={t('Who handles what', 'من يتولّى ماذا')}>
          <TabsTrigger value="matrix">{t('By kind of problem (escalation matrix)', 'حسب نوع المشكلة (مصفوفة التصعيد)')}</TabsTrigger>
          <TabsTrigger value="routing">{t('By product (case routing)', 'حسب المنتج (توجيه الحالات)')}</TabsTrigger>
        </TabsList>
        <TabsContent value="routing">
          <ProductRoutingTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="matrix" className="flex flex-col gap-4">
          <RulesCard />

          <Segmented
            variant="pressed"
            label={t('Product', 'المنتج')}
            value={product}
            onValueChange={(id) => {
              const next = new URLSearchParams(params)
              next.set('product', id)
              setParams(next, { replace: true })
            }}
            options={PRODUCTS.map((p) => ({ value: p.id, label: L(p.name) }))}
          />

          <Card>
            <div className={IN_CARD}>
              {isLoading || !rows ? (
                <LoadingState rows={6} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="row-divider-none">
                      <TableHead>{L(c.kind)}</TableHead>
                      {MATRIX_FIELDS.map((f) => (
                        <TableHead key={f}>{L(c[f])}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) =>
                      r.kind === 'vip' ? (
                        <VipRuleRow key={r.kind} row={r} />
                      ) : (
                        <TableRow key={r.kind} data-row={r.kind}>
                          <TableCell className="min-w-28 font-medium whitespace-normal text-foreground">{L(r.label)}</TableCell>
                          {MATRIX_FIELDS.map((f) => (
                            <TableCell key={f} className="align-top whitespace-normal">
                              <MatrixCell product={product} row={r} field={f} canEdit={canEdit} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
          <div className="flex flex-col gap-1.5 px-1">
            <p className="t-body-s" data-testid="matrix-set-note">
              {L(MATRIX_COPY.setNote)}
            </p>
            <p className="t-body-s" data-testid="matrix-vip-row-note">
              {L(MATRIX_COPY.vipRowNote)}
            </p>
            <p className="t-body-s">{L(MATRIX_COPY.principles)}</p>
            {/* 23 Nov: "Who is informed" was a tab of Teams and structure; one line here now */}
            <p className="t-body-s">{L(INFORMED_RULE)}</p>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

/** "Three rules behind the cells" and the clock legend: a card above the product tabs, the prototype's text verbatim. */
function RulesCard() {
  const { L } = useI18n()
  const { rules, legend } = MATRIX_COPY
  return (
    <SectionCard title={L(rules.title)} contentClassName="flex flex-col gap-4">
      <ol className="flex flex-col gap-3" data-testid="matrix-rules">
        {rules.items.map((item, i) => (
          <li key={item.lead.en} className="flex gap-3 text-sm">
            <span aria-hidden className="material-light mt-px grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular">
              {i + 1}
            </span>
            <p className="max-w-[88ch] text-muted-foreground">
              <strong className="font-medium text-foreground">{L(item.lead)}</strong> {L(item.body)}
            </p>
          </li>
        ))}
      </ol>
      <InlineNote tone="neutral" data-testid="matrix-legend">
        {L(legend)}
      </InlineNote>
    </SectionCard>
  )
}

/** The VIP row: a rule, not a receiver. Its clocks are the factor ("½"), never a number of hours, and nobody edits it. */
function VipRuleRow({ row }: { row: MatrixRuleRow }) {
  const { L } = useI18n()
  const { rule } = row
  const factor = formatFactor(rule.factor)
  return (
    <TableRow data-row="vip">
      <TableCell className="min-w-28 font-medium whitespace-normal text-foreground">
        {L(row.label)}
        <span className="pill pill-light mt-1.5 block w-fit font-normal" data-testid="matrix-rule-tag">
          {L(MATRIX_COPY.ruleTag)}
        </span>
      </TableCell>
      {[rule.receiver, rule.informed, rule.backup].map((v) => (
        <TableCell key={v.en} className="align-top whitespace-normal">
          <bdi className="text-sm text-foreground">{L(v)}</bdi>
        </TableCell>
      ))}
      {[0, 1].map((i) => (
        <TableCell key={i} className="align-top">
          <bdi className="text-sm tabular text-foreground" data-testid="matrix-vip-factor">
            {factor}
          </bdi>
        </TableCell>
      ))}
    </TableRow>
  )
}

const cellText = (v: MatrixCells[MatrixField], lang: 'en' | 'ar'): string => (v === null ? '' : typeof v === 'number' ? String(v) : v[lang])

/** One cell: an input for the roles that may edit (saved on blur or Enter), plain text for the rest; "Edited" once someone changed it after the 19 Nov set. */
function MatrixCell({ product, row, field, canEdit }: { product: ProductId; row: MatrixCellRow; field: MatrixField; canEdit: boolean }) {
  const { t, L, lang } = useI18n()
  const save = useSaveMatrixCell()
  const hours = field === 'respondH' || field === 'resolveH'
  const stored = cellText(row.cells[field], lang)
  // What is typed. It stays on screen after a save until the stored value arrives (then `base` no longer matches and it falls away).
  const [edit, setEdit] = useState<{ text: string; base: string } | null>(null)
  const shown = edit && edit.base === stored ? edit.text : stored
  const columnLabel = MATRIX_COPY.columns[field][lang]
  const label = `${row.label[lang]} · ${columnLabel}`
  // "1 day" / "5 days": the cell holds hours (9, 45) and the document writes days. Editors see the hours in the field and the days beside it.
  const asDays = hours && !!row.cells.asDays?.[field]
  const clock = hours ? formatClock(row.cells[field] as number | null, { asDays, lang }) : ''

  function commit() {
    if (!edit || edit.base !== stored) return
    const text = edit.text.trim()
    if (text === stored) {
      setEdit(null)
      return
    }
    let value: string | number | null
    if (hours) {
      if (text === '') value = null
      else {
        const n = Number(text)
        if (!Number.isFinite(n) || n < 0) {
          toast.error(t('Hours must be a number, 0 or more.', 'الساعات رقم، صفر أو أكثر.'))
          return
        }
        value = n
      }
    } else {
      value = text === '' ? null : text
    }
    save.mutate({ product, kind: row.kind, field, value, lang }, { onSuccess: () => toast.success(t(`Saved: ${label}`, `تم الحفظ: ${label}`)) })
  }

  return (
    <div className={cn('flex flex-col items-start gap-1', hours ? 'min-w-18' : 'min-w-40')}>
      {canEdit && hours ? (
        <Input
          aria-label={label}
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="–"
          value={shown}
          onChange={(e) => setEdit({ text: e.target.value, base: stored })}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEdit(null)
          }}
          className="h-9 w-18 tabular"
        />
      ) : canEdit ? (
        // A title such as "Information Security lead · CX manager · Head of Investor Relations" is longer than the column: the field grows with its text (field-sizing) instead of cutting it.
        <Textarea
          aria-label={label}
          rows={1}
          placeholder="–"
          value={shown}
          onChange={(e) => setEdit({ text: e.target.value, base: stored })}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
            if (e.key === 'Escape') setEdit(null)
          }}
          className="min-h-9 resize-none rounded-md py-2 text-sm"
        />
      ) : (
        <bdi className={cn('text-sm text-foreground', hours && 'tabular')}>{hours ? clock : stored || '–'}</bdi>
      )}
      {canEdit && asDays && (
        <span className="t-caption tabular" data-testid="matrix-days">
          {clock}
        </span>
      )}
      {row.edited[field] && (
        <span className="t-caption inline-flex items-center gap-1.5" data-testid="matrix-edited">
          <span aria-hidden className="dot dot-info" />
          {L(MATRIX_COPY.edited)}
        </span>
      )}
    </div>
  )
}

