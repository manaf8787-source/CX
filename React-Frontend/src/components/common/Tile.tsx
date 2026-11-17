import type { ReactNode, CSSProperties } from 'react'

interface TileProps {
  label: string
  value: ReactNode
  sub?: string
  colorVar?: string // e.g. '--brand', '--crit', '--p-re'
  onClick?: () => void
}

export function Tile({ label, value, sub, colorVar, onClick }: TileProps) {
  const style = colorVar ? ({ '--c': `var(${colorVar})` } as CSSProperties) : undefined
  return (
    <button type="button" className="tile" style={style} onClick={onClick}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </button>
  )
}
