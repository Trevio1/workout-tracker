import { Icon } from './Icon'
import { PLATE_COLOR, platesFor } from '../lib/plates'
import { fmtNum } from '../lib/format'
import type { Field, Settings } from '../types'

export type KeypadKey = string // '0'-'9', ',', 'back', 'plus', 'minus', 'next', 'hide'

interface Props {
  draft: string
  hint: number | null
  field: Field
  unit: string
  showPlates: boolean
  settings: Settings
  onKey: (k: KeypadKey) => void
}

const PLATE_H: Record<string, number> = { '25': 58, '20': 58, '15': 52, '10': 46, '5': 36, '2.5': 30, '1.25': 24, '0.5': 20 }
const PLATE_W: Record<string, number> = { '25': 13, '20': 12, '15': 11, '10': 10, '5': 8, '2.5': 7, '1.25': 6, '0.5': 5 }

function Barbell({ kg, settings }: { kg: number; settings: Settings }) {
  const res = platesFor(kg, settings.barKg, settings.plates)
  return (
    <>
      <div className="barbell" aria-hidden="true">
        <div style={{ width: 70, height: 8, background: '#8d8e94', borderRadius: 2 }} />
        <div style={{ width: 6, height: 22, background: '#a4a5ab', borderRadius: 2 }} />
        {res.perSide.map((p, i) => {
          const key = String(p)
          return (
            <div
              key={i}
              style={{
                width: PLATE_W[key] ?? 8,
                height: PLATE_H[key] ?? 30,
                background: PLATE_COLOR[key] ?? '#777',
                borderRadius: 3,
                marginLeft: 1,
                boxShadow: 'inset -2px 0 0 rgba(0,0,0,.18)',
              }}
            />
          )
        })}
        <div style={{ width: 26, height: 12, background: '#a4a5ab', borderRadius: 2 }} />
      </div>
      <div style={{ textAlign: 'right', minWidth: 92 }}>
        <div className="kp-sub">pro Seite</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {res.perSide.length ? res.perSide.map(fmtNum).join(' + ') : 'nur Stange'}
        </div>
        {!res.exact && <div className="kp-sub">≈ {fmtNum(res.achieved)} kg möglich</div>}
      </div>
    </>
  )
}

export function Keypad({ draft, hint, field, unit, showPlates, settings, onKey }: Props) {
  const shown = draft !== '' ? draft : hint !== null ? fmtNum(hint) : '0'
  const numeric = Number((draft !== '' ? draft : String(hint ?? 0)).replace(',', '.')) || 0
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back']
  return (
    <div className="keypad" onPointerDown={(e) => e.preventDefault()}>
      <div className="kp-top">
        <div>
          <div className="kp-value" style={{ opacity: draft === '' ? 0.55 : 1 }}>
            {shown} {unit}
          </div>
          <div className="kp-sub">{field === 'kg' ? 'Gewicht' : 'Wiederholungen'}</div>
        </div>
        {showPlates && field === 'kg' && numeric > 0 ? (
          <Barbell kg={numeric} settings={settings} />
        ) : (
          <div className="spacer" />
        )}
      </div>
      <div className="kp-grid">
        {keys.slice(0, 3).map((k) => (
          <button key={k} className="kp-key" onClick={() => onKey(k)}>
            {k}
          </button>
        ))}
        <button className="kp-key fn" onClick={() => onKey('hide')} aria-label="Tastatur schließen">
          <Icon name="down" size={22} />
        </button>
        {keys.slice(3, 6).map((k) => (
          <button key={k} className="kp-key" onClick={() => onKey(k)}>
            {k}
          </button>
        ))}
        <button className="kp-key fn" onClick={() => onKey('minus')}>
          − {field === 'kg' ? '2,5' : '1'}
        </button>
        {keys.slice(6, 9).map((k) => (
          <button key={k} className="kp-key" onClick={() => onKey(k)}>
            {k}
          </button>
        ))}
        <button className="kp-key fn" onClick={() => onKey('plus')}>
          + {field === 'kg' ? '2,5' : '1'}
        </button>
        <button className="kp-key" onClick={() => onKey(',')} disabled={field === 'reps'}>
          ,
        </button>
        <button className="kp-key" onClick={() => onKey('0')}>
          0
        </button>
        <button className="kp-key" onClick={() => onKey('back')} aria-label="Löschen">
          <Icon name="backspace" size={22} />
        </button>
        <button className="kp-key next" onClick={() => onKey('next')}>
          Weiter
        </button>
      </div>
    </div>
  )
}
