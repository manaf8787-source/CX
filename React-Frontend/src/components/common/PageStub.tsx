import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import type { Bi } from '../../types'
import { SampleBanner } from './SampleBanner'

interface PageStubProps {
  title: Bi
  lede: Bi
  /** Short bullet list of what this page will do once content-building reaches it. */
  comingUp?: Bi[]
  children?: ReactNode
}

/** Foundation-pass placeholder: routing/layout/theming/i18n all work end to
 * end; actual page content is a later build pass (see IMPLEMENTATION_PLAN.md §3). */
export function PageStub({ title, lede, comingUp, children }: PageStubProps) {
  const { L, t } = useI18n()
  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{L(title)}</h1>
          <p className="page-lede">{L(lede)}</p>
        </div>
        <SampleBanner />
      </div>
      {comingUp && comingUp.length > 0 && (
        <div className="card tint">
          <h3 style={{ marginBlockEnd: 8 }}>{t('Coming in a later build pass', 'قادم في مرحلة بناء لاحقة')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: 18 }} className="col">
            {comingUp.map((item, i) => (
              <li key={i}>{L(item)}</li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </div>
  )
}
