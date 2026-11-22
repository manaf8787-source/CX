import type { Bi, CorrectiveAction, CorrectiveActionKind, HrPoolMember, LdRequest, ShopperCase, Standard } from '../types'

/**
 * Work the CX side is waiting on from other departments, in one list (owner's request, 22 Nov): the fixes their owners still have to
 * decide or carry out, the conduct cases with HR, and the training requests with L&D. One place instead of a page per department; a
 * new department (Sales support, say) is one more value of `Dept`, not one more page.
 */
export type Dept = 'hr' | 'ld' | 'sales' | 'managers' | 'environment' | 'product' | 'operations' | 'legal' | 'marketing'

export const DEPT_LABEL: Record<Dept, Bi> = {
  hr: { en: 'HR', ar: 'الموارد البشرية' },
  ld: { en: 'L&D', ar: 'التعلم والتطوير' },
  sales: { en: 'Sales and Sales support', ar: 'المبيعات ودعم المبيعات' },
  managers: { en: 'Line managers', ar: 'المدراء المباشرون' },
  environment: { en: 'Environments and branches', ar: 'البيئات والفروع' },
  product: { en: 'Product and IT', ar: 'المنتج وتقنية المعلومات' },
  operations: { en: 'Operations', ar: 'العمليات' },
  legal: { en: 'Legal', ar: 'القانونية' },
  marketing: { en: 'Marketing', ar: 'التسويق' },
}

const DEPT_BY_KIND: Record<CorrectiveActionKind, Dept> = {
  employee: 'managers',
  service_behaviour: 'environment',
  training_gap: 'ld',
  product_app: 'product',
  process: 'operations',
  environment: 'environment',
  legal_privacy: 'legal',
  marketing: 'marketing',
}

export type PendingSource = 'fix' | 'conduct' | 'training' | 'document'

export interface PendingItem {
  id: string
  source: PendingSource
  dept: Dept
  title: Bi
  /** A title, never a person's name (NFR-2). */
  owner: string
  product?: string
  /** What we are waiting for, in a few words. */
  waitingFor: Bi
  openedAt?: string
  dueAt?: string
  fix?: CorrectiveAction
  shopperCase?: ShopperCase
  request?: LdRequest
  standard?: Standard
}

const FIX_WAITING: Partial<Record<CorrectiveAction['status'], Bi>> = {
  proposed: { en: 'Their yes or no on the fix', ar: 'موافقتهم أو رفضهم للإصلاح' },
  approved: { en: 'Start the work', ar: 'بدء العمل' },
  in_progress: { en: 'Finish the work', ar: 'إنهاء العمل' },
  partial: { en: 'The second step', ar: 'الخطوة الثانية' },
}

/** The HR specialist a conduct case sits with: conduct cases not closed, shared round the pool in order. */
export function hrCasesBySpecialist(cases: ShopperCase[], pool: HrPoolMember[]): Map<string, ShopperCase[]> {
  const out = new Map<string, ShopperCase[]>(pool.map((m) => [m.title, []]))
  if (!pool.length) return out
  cases
    .filter((c) => c.isConductIssue && c.status !== 'closed')
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt))
    .forEach((c, i) => out.get(pool[i % pool.length].title)?.push(c))
  return out
}

/** Which department writes a standard, from its owner title. CX's own documents are not "waiting on another team". */
function deptOfOwner(owner: string): Dept | null {
  const o = owner.toLowerCase()
  if (o.includes('cx')) return null
  if (o.includes('legal')) return 'legal'
  if (o.includes('l&d')) return 'ld'
  if (o.startsWith('hr') || o.includes(' hr')) return 'hr'
  if (o.includes('sales') && !o.includes('after')) return 'sales'
  if (o.includes('after-sales') || o.includes('operations')) return 'operations'
  if (o.includes('marketing')) return 'marketing'
  return 'product'
}

const DOC_WAITING: Record<Standard['status'], Bi | undefined> = {
  not_started: { en: 'Write the document', ar: 'كتابة المستند' },
  drafted: { en: 'Finish and approve the draft', ar: 'إنهاء المسودة واعتمادها' },
  legal_review: { en: 'Legal review', ar: 'المراجعة القانونية' },
  approved_scored: undefined,
}

export function pendingItems(
  fixes: CorrectiveAction[],
  cases: ShopperCase[],
  requests: LdRequest[],
  pool: HrPoolMember[],
  standards: Standard[] = [],
): PendingItem[] {
  const items: PendingItem[] = []
  for (const f of fixes) {
    const waitingFor = FIX_WAITING[f.status]
    if (!waitingFor) continue
    items.push({
      id: f.id,
      source: 'fix',
      dept: DEPT_BY_KIND[f.kind],
      title: f.title,
      owner: f.owner,
      product: f.product,
      waitingFor,
      openedAt: f.proposedAt,
      dueAt: f.dueDate,
      fix: f,
    })
  }
  const bySpecialist = hrCasesBySpecialist(cases, pool)
  for (const [specialist, list] of bySpecialist)
    for (const c of list)
      items.push({
        id: c.id,
        source: 'conduct',
        dept: 'hr',
        title: { en: `Conduct case: ${c.category.replace(/_/g, ' ')}`, ar: `حالة سلوك: ${c.category.replace(/_/g, ' ')}` },
        owner: specialist,
        product: c.product,
        waitingFor: { en: 'HR review and action', ar: 'مراجعة الموارد البشرية وإجراؤها' },
        openedAt: c.openedAt,
        dueAt: c.resolveDueAt,
        shopperCase: c,
      })
  for (const r of requests) {
    if (r.status === 'delivered') continue
    items.push({
      id: r.id,
      source: 'training',
      dept: 'ld',
      title: r.title,
      owner: 'L&D manager',
      waitingFor: r.status === 'requested' ? { en: 'Schedule the training', ar: 'جدولة التدريب' } : { en: 'Deliver the training', ar: 'تقديم التدريب' },
      request: r,
    })
  }
  for (const d of standards) {
    const waitingFor = DOC_WAITING[d.status]
    const dept = d.status === 'legal_review' ? 'legal' : deptOfOwner(d.owner)
    if (!waitingFor || !dept) continue
    items.push({ id: d.id, source: 'document', dept, title: d.title, owner: d.owner, waitingFor, standard: d })
  }
  return items
}

export type Timing = 'late' | 'soon' | 'ok' | 'none'

/** Late: past the due date. Soon: due within 7 days. */
export function timingOf(item: PendingItem, now = Date.now()): { timing: Timing; days: number } {
  if (!item.dueAt) return { timing: 'none', days: 0 }
  const days = Math.round((new Date(item.dueAt).getTime() - now) / 86_400_000)
  return { timing: days < 0 ? 'late' : days <= 7 ? 'soon' : 'ok', days }
}

