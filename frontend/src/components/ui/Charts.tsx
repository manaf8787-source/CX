// Small hand-built SVG charts — matches the prototype's approach (no chart
// library), kept lightweight since these are simple shapes.

export function Sparkline({ values, width = 90, height = 28, color = 'var(--brand)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = width / Math.max(1, values.length - 1)
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / span) * height}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="trend">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Series { label: string; values: number[]; color: string }

export function LineChart({ series, labels, width = 420, height = 160 }: { series: Series[]; labels: string[]; width?: number; height?: number }) {
  const pad = { top: 10, right: 54, bottom: 20, left: 28 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const all = series.flatMap((s) => s.values)
  const min = Math.min(0, ...all)
  const max = Math.max(...all, 1)
  const span = max - min || 1
  const n = labels.length
  const x = (i: number) => pad.left + (innerW * i) / Math.max(1, n - 1)
  const y = (v: number) => pad.top + innerH - ((v - min) / span) * innerH

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="line chart">
      <line x1={pad.left} y1={y(0)} x2={width - pad.right} y2={y(0)} stroke="var(--line)" strokeWidth={1} />
      {labels.map((lab, i) => (
        <text key={lab} x={x(i)} y={height - 4} fontSize={9.5} fill="var(--muted)" textAnchor="middle">{lab}</text>
      ))}
      {series.map((s) => {
        const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
        const last = s.values[s.values.length - 1]
        return (
          <g key={s.label}>
            <polyline points={points} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />)}
            <text x={width - pad.right + 6} y={y(last) + 3.5} fontSize={10} fontWeight={600} fill={s.color}>{s.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function StackBar({ promoters, passives, detractors }: { promoters: number; passives: number; detractors: number }) {
  const total = promoters + passives + detractors || 1
  return (
    <div className="stack" role="img" aria-label="promoters, passives, detractors">
      <i style={{ width: `${(promoters / total) * 100}%`, background: 'var(--good)' }} />
      <i style={{ width: `${(passives / total) * 100}%`, background: 'var(--neutral)' }} />
      <i style={{ width: `${(detractors / total) * 100}%`, background: 'var(--crit)' }} />
    </div>
  )
}

export function Meter({ value, max = 100, colorVar = '--brand' }: { value: number; max?: number; colorVar?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="track">
      <i style={{ width: `${pct}%`, ['--c' as string]: `var(${colorVar})` }} />
    </div>
  )
}
