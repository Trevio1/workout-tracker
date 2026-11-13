import { useState } from 'react'
import { fmtNum, fmtShort } from '../lib/format'

interface Point {
  x: number
  y: number
}

interface Props {
  points: Point[]
  unit: string
}

const W = 340
const H = 180
const PAD = { l: 40, r: 12, t: 14, b: 26 }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const span = max - min
  const step0 = span / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0
  const start = Math.floor(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + step * 0.01; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

export function LineChart({ points, unit }: Props) {
  const [active, setActive] = useState<number | null>(null)
  if (points.length === 0) return <div className="empty">Noch keine Daten.</div>

  const ys = points.map((p) => p.y)
  const rawMin = Math.min(...ys)
  const rawMax = Math.max(...ys)
  const pad = rawMax === rawMin ? Math.max(1, rawMax * 0.1) : (rawMax - rawMin) * 0.12
  const ticks = niceTicks(Math.max(0, rawMin - pad), rawMax + pad)
  const yMin = ticks[0]
  const yMax = ticks[ticks.length - 1] === yMin ? yMin + 1 : ticks[ticks.length - 1]
  const xMin = points[0].x
  const xMax = points[points.length - 1].x
  const sx = (x: number) =>
    points.length === 1 ? PAD.l + (W - PAD.l - PAD.r) / 2 : PAD.l + ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const sy = (y: number) => PAD.t + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
  const area = `${d} L${sx(xMax).toFixed(1)},${H - PAD.b} L${sx(xMin).toFixed(1)},${H - PAD.b} Z`
  const sel = active !== null ? points[active] : points[points.length - 1]
  const selIdx = active ?? points.length - 1

  return (
    <div className="chart-box">
      <div style={{ padding: '0 8px 6px' }}>
        <span style={{ fontSize: 22, fontWeight: 800 }}>
          {fmtNum(Math.round(sel.y * 10) / 10)} {unit}
        </span>{' '}
        <span className="muted small">{fmtShort(sel.x)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', touchAction: 'pan-y' }}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const x = ((e.clientX - r.left) / r.width) * W
          let best = 0
          points.forEach((p, i) => {
            if (Math.abs(sx(p.x) - x) < Math.abs(sx(points[best].x) - x)) best = i
          })
          setActive(best)
        }}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 6} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fontSize="11" fill="var(--muted)">
          {fmtShort(xMin)}
        </text>
        {points.length > 1 && (
          <text x={W - PAD.r} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="end">
            {fmtShort(xMax)}
          </text>
        )}
        <path d={area} fill="var(--accent)" opacity="0.12" />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={i === selIdx ? 5 : 3}
            fill={i === selIdx ? 'var(--accent)' : 'var(--surface)'}
            stroke="var(--accent)"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  )
}
