import type { ReactNode } from 'react'

export function PageHeader({ title, lede, actions }: { title: string; lede?: string; actions?: ReactNode }) {
  return (
    <div className="row between" style={{ alignItems: 'flex-start' }}>
      <div className="pagehead">
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  )
}
