import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canEditEscalationMatrix } from '@/auth/permissions'
import { useConfirmMatrixCell, useMatrix, useSaveMatrixCell } from '@/services/queriesV40'
import { MATRIX_COPY, MATRIX_FIELDS } from '@/data/escalationDefaults'
import { PRODUCTS } from '@/data/products'
import { roleDef } from '@/data/roles'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { MatrixCells, MatrixField, MatrixKind, MatrixRow, ProductId } from '@/types'
import { IN_CARD, PressFilter, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

const PRODUCT_IDS = PRODUCTS.map((p) => p.id)

/**
 * The escalation matrix (v40 F22, S9; decided 18 Nov): one table per product, a row per fix kind (eight kinds and two case types),
 * six columns: kind, first receiver, informed, backup, respond (h), resolve (h). Hours are working hours (9 = one working day).
 * The CX manager and the Internal Audit and Marketing Lead edit the cells (text for titles, a number for hours; an empty text cell
 * means nobody); everyone else reads. A cell still at its default carries [Proposed] until an owner edits it or confirms it as
 * it stands ("Confirm default", the same two roles; the row keeps who confirmed it and when); there is no header badge. A fix reads its own product's row: the "From the matrix" line and, at approval, the due date from "Resolve (h)".
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

  return (
    <section data-density="dense" className="flex flex-col gap-4">
      <SubPageHeader title={L(MATRIX_COPY.title)} description={L(MATRIX_COPY.intro)} />
      {!canEdit && <ViewOnlyNotice>{t('View only — the CX manager and the Internal Audit and Marketing Lead fill these cells.', 'للعرض فقط — يملأ هذه الخلايا مدير تجربة العملاء ومسؤول التدقيق الداخلي والتسويق.')}</ViewOnlyNotice>}

      <PressFilter
        label={t('Product', 'المنتج')}
        value={product}
        onChange={(id) => {
          const next = new URLSearchParams(params)
          next.set('product', id)
          setParams(next, { replace: true })
        }}
        options={PRODUCTS.map((p) => ({ id: p.id, label: L(p.name) }))}
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
                {rows.map((r) => (
                  <TableRow key={r.kind}>
                    <TableCell className="font-medium whitespace-normal text-foreground">{L(r.label)}</TableCell>
                    {MATRIX_FIELDS.map((f) => (
                      <TableCell key={f} className="align-top whitespace-normal">
                        <MatrixCell product={product} row={r} field={f} canEdit={canEdit} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
      <div className="flex flex-col gap-1.5 px-1">
        <p className="t-body-s">{L(MATRIX_COPY.defaultCellsNote)}</p>
        <p className="t-body-s">{L(MATRIX_COPY.hoursHint)}</p>
        <p className="t-body-s">{L(MATRIX_COPY.principles)}</p>
      </div>
    </section>
  )
}

const cellText = (v: MatrixCells[MatrixField], lang: 'en' | 'ar'): string => (v === null ? '' : typeof v === 'number' ? String(v) : v[lang])

/** One cell: an input for the roles that may edit (saved on blur or Enter), plain text for the rest; [Proposed] while it holds the default. */
function MatrixCell({ product, row, field, canEdit }: { product: ProductId; row: MatrixRow; field: MatrixField; canEdit: boolean }) {
  const { t, L, lang } = useI18n()
  const save = useSaveMatrixCell()
  const confirm = useConfirmMatrixCell()
  const hours = field === 'respondH' || field === 'resolveH'
  const stored = cellText(row.cells[field], lang)
  // What is typed. It stays on screen after a save until the stored value arrives (then `base` no longer matches and it falls away).
  const [edit, setEdit] = useState<{ text: string; base: string } | null>(null)
  const shown = edit && edit.base === stored ? edit.text : stored
  const columnLabel = MATRIX_COPY.columns[field][lang]
  const label = `${row.label[lang]} · ${columnLabel}`
  const confirmed = row.confirmed?.[field]
  const by = confirmed ? roleDef(confirmed.byRole)?.name : undefined

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
    save.mutate({ product, kind: row.kind as MatrixKind, field, value, lang }, { onSuccess: () => toast.success(t(`Saved: ${label}`, `تم الحفظ: ${label}`)) })
  }

  return (
    <div className="flex min-w-36 flex-col items-start gap-1">
      {canEdit ? (
        <Input
          aria-label={label}
          type={hours ? 'number' : 'text'}
          min={hours ? 0 : undefined}
          inputMode={hours ? 'numeric' : undefined}
          placeholder="–"
          value={shown}
          onChange={(e) => setEdit({ text: e.target.value, base: stored })}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEdit(null)
          }}
          className={cn('h-9', hours && 'w-24 tabular')}
        />
      ) : (
        <bdi className="text-sm text-foreground">{stored || '–'}</bdi>
      )}
      {row.isDefault[field] && (
        <span className="flex flex-wrap items-center gap-1.5">
          <ProposedBadge />
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={confirm.isPending}
              aria-label={t(`Confirm default: ${label}`, `تأكيد القيمة الافتراضية: ${label}`)}
              onClick={() =>
                confirm.mutate(
                  { product, kind: row.kind as MatrixKind, field },
                  { onSuccess: () => toast.success(t(`Confirmed: ${label}`, `تم التأكيد: ${label}`)), onError: (e) => toast.error(e instanceof Error ? e.message : t('Could not confirm the cell.', 'تعذّر تأكيد الخلية.')) },
                )
              }
            >
              {t('Confirm default', 'تأكيد الافتراضي')}
            </Button>
          )}
        </span>
      )}
      {confirmed && (
        <span className="t-caption inline-flex items-center gap-1.5" data-testid="matrix-confirmed">
          <span aria-hidden className="dot dot-success" />
          {t('Confirmed', 'مؤكَّد')}
          <span className="sr-only">
            {' '}
            {t('by', 'بواسطة')} {by ? L(by) : confirmed.byRole} {new Date(confirmed.at).toLocaleDateString(lang)}
          </span>
        </span>
      )}
    </div>
  )
}
