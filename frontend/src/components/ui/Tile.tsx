import type { ReactNode } from 'react'

export function Tile({ label, value, sub, colorVar, trend }: { label: string; value: ReactNode; sub?: ReactNode; colorVar?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="tile" style={colorVar ? ({ ['--c' as string]: `var(${colorVar})` }) : undefined}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className={`s ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : ''}`}>{sub}</div>}
    </div>
  )
}
