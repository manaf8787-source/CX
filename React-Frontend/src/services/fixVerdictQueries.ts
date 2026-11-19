import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { latency, mock } from './mockStore'
import { useCorrectiveActionsAll } from './queries'
import { dueFromMatrix } from './fixClockStore'
import { useRole } from '../auth/RoleContext'
import { canRecordFixVerdict } from '../auth/permissions'
import {
  acceptedAsIsAudit,
  buildInvestigationFromFix,
  buildSecondStep,
  hasOpenSecondStep,
  investigationRequestedAudit,
  isOpenVerdict,
  nextNumberedId,
  secondStepRequestedAudit,
  secondStepsOf,
} from '../utils/fixVerdict'
import type { CorrectiveAction, Investigation } from '../types'

/**
 * v40.1: what a person does after the 60-day check (docs/V401_VERDICT.md). The verdict itself is `useSetFixStatus` (queriesV40.ts):
 * it writes the status, `verificationResult` and an audit line. These three are decision 3 after a partial or failed verdict.
 * Same repository seam as the other query files: each is the call a real API replaces later. Only the CX manager and the CX team
 * may call them (`canRecordFixVerdict`); the card shows no button to anyone else, and the mutation refuses as well.
 */

const LATENCY_MS = 150

const REFUSED = 'Only the CX manager and the CX team close the 60-day check'

/** The second steps requested on a fix (a trace id each, "the original shows the child"). Not narrowed by the environment switch. */
export function useSecondSteps(parentId: string): CorrectiveAction[] {
  const { data, dataUpdatedAt } = useCorrectiveActionsAll()
  // The mock register grows in place: `dataUpdatedAt` is the change signal.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => secondStepsOf(data ?? [], parentId), [data, dataUpdatedAt, parentId])
}

/**
 * "Ask for a second step": a NEW fix on the same pattern (see `buildSecondStep`), the parent keeps its partial or failed status and gets
 * the audit line "Second step requested: CA-2yy". The returned fix is the new one; the card selects it (`?fix=`).
 */
export function useRequestSecondStep() {
  const qc = useQueryClient()
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { parentId: string }): Promise<CorrectiveAction> => {
      await latency(LATENCY_MS)
      if (!canRecordFixVerdict(role.id)) throw new Error(REFUSED)
      const fixes = mock.MOCK_CORRECTIVE_ACTIONS
      const parent = fixes.find((f) => f.id === input.parentId)
      if (!parent) throw new Error('Corrective action not found')
      if (!isOpenVerdict(parent.status)) throw new Error('A second step follows a partial or failed check')
      if (hasOpenSecondStep(fixes, parent.id)) throw new Error('This fix already has an open second step')
      const at = new Date().toISOString()
      // The product's matrix gives the due date approval today would give, as for any new fix; approval later overwrites it.
      const dueDate = dueFromMatrix({ product: parent.product, kind: parent.kind, patternId: parent.patternId }).dueAt
      const child = buildSecondStep(parent, { id: nextNumberedId('ca', fixes), dueDate, byRole: role.id, at })
      fixes.push(child)
      parent.auditLog.push(secondStepRequestedAudit(child.id, role.id, at))
      return child
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrective-actions'] }),
  })
}

/**
 * "Investigate first (5 interviews)": opens an investigation on the fix's pattern (kind interviews, 5, running, the note "Requested from
 * CA-2xx after a partial result.") and writes an audit line on the fix. `environment` is the pattern's team, as the Investigations
 * page shows it. The returned investigation is the new one (the card opens the Investigations page on it).
 */
export function useInvestigateFromFix() {
  const qc = useQueryClient()
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { fixId: string; environment?: string }): Promise<Investigation> => {
      await latency(LATENCY_MS)
      if (!canRecordFixVerdict(role.id)) throw new Error(REFUSED)
      const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === input.fixId)
      if (!fix) throw new Error('Corrective action not found')
      const inv = buildInvestigationFromFix(fix, { id: nextNumberedId('inv', mock.MOCK_INVESTIGATIONS), environment: input.environment })
      mock.MOCK_INVESTIGATIONS.push(inv)
      fix.auditLog.push(investigationRequestedAudit(inv.id, role.id))
      return inv
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-actions'] })
      return qc.invalidateQueries({ queryKey: ['investigations'] })
    },
  })
}

/**
 * "Accept as is": the person takes the partial or failed result as it stands and closes the fix as effective (prototype: `caSt` with
 * `eff`). One audit line says it was accepted after a partial or failed result; `verificationResult` is effective.
 */
export function useAcceptFixAsIs() {
  const qc = useQueryClient()
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { id: string }): Promise<CorrectiveAction> => {
      await latency(LATENCY_MS)
      if (!canRecordFixVerdict(role.id)) throw new Error(REFUSED)
      const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === input.id)
      if (!fix) throw new Error('Corrective action not found')
      if (!isOpenVerdict(fix.status)) throw new Error('Accept as is follows a partial or failed check')
      const outcome = fix.status
      fix.status = 'effective'
      fix.verificationResult = 'effective'
      fix.auditLog.push(acceptedAsIsAudit(outcome, role.id))
      return fix
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrective-actions'] }),
  })
}
