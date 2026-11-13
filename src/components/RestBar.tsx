import { fmtClock } from '../lib/format'
import { useNow } from '../hooks'
import type { RestState } from '../types'

interface Props {
  rest: RestState
  onChange: (rest: RestState | undefined) => void
}

export function RestBar({ rest, onChange }: Props) {
  const now = useNow(250)
  const left = Math.max(0, (rest.endsAt - now) / 1000)
  const pct = rest.total > 0 ? Math.min(100, (left / rest.total) * 100) : 0
  const adjust = (sec: number) => {
    const endsAt = rest.endsAt + sec * 1000
    if (endsAt <= Date.now()) onChange(undefined)
    else onChange({ endsAt, total: Math.max(1, rest.total + sec) })
  }
  return (
    <div className="rest-bar">
      <button className="btn btn-grey btn-sm" onClick={() => adjust(-15)}>
        −15
      </button>
      <div className="rest-track" role="timer" aria-label="Pause">
        <div className="rest-fill" style={{ width: `${pct}%` }} />
        <div className="rest-time">Pause {fmtClock(Math.ceil(left))}</div>
      </div>
      <button className="btn btn-grey btn-sm" onClick={() => adjust(15)}>
        +15
      </button>
      <button className="btn btn-soft btn-sm" onClick={() => onChange(undefined)}>
        Skip
      </button>
    </div>
  )
}
