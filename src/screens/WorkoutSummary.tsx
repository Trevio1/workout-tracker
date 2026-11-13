import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { db } from '../db'
import { useExercises, useSettings } from '../hooks'
import { useNav } from '../nav'
import { fmtDuration, fmtNum, relativeDay } from '../lib/format'
import { summarize, type PersonalRecord } from '../lib/summary'

const CONFETTI_COLORS = ['#3b8cf0', '#5bc46a', '#f2cb4b', '#e5534b', '#e8862b', '#ffffff']

function Confetti() {
  // fixed pseudo-random layout so re-renders don't reshuffle it
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 13) % 10) / 20,
    rot: (i * 47) % 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 6 + (i % 3) * 2,
  }))
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            background: p.color,
            width: p.w,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function delta(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return null
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return { text: '± 0 %', up: true }
  return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`, up: pct > 0 }
}

export function WorkoutSummary({ id, z }: { id: string; z: number }) {
  const nav = useNav()
  const exercises = useExercises()
  const settings = useSettings()
  const workout = useLiveQuery(() => db.workouts.get(id), [id])
  const all = useLiveQuery(() => db.workouts.toArray(), [])

  const sum = useMemo(
    () => (workout && all && exercises.size ? summarize(workout, all, exercises, settings) : null),
    [workout, all, exercises, settings],
  )
  if (!workout || !sum) return null

  const name = (exId: string) => exercises.get(exId)?.name ?? 'Übung'
  const recordText = (r: PersonalRecord) => {
    if (r.kind === 'kg') return `${fmtNum(r.value)} kg (vorher ${fmtNum(r.previous)})`
    if (r.kind === 'e1rm') return `1RM ≈ ${fmtNum(Math.round(r.value * 10) / 10)} kg (vorher ${fmtNum(Math.round(r.previous * 10) / 10)})`
    return `${r.value} Wdh. bei ${fmtNum(r.kg ?? 0)} kg (vorher ${r.previous})`
  }
  const celebrate = sum.records.length > 0 || sum.increased.length > 0
  const dv = sum.previous ? delta(sum.volume, sum.previous.volume) : null
  const dr = sum.previous ? sum.reps - sum.previous.reps : null

  return (
    <Sheet
      z={z}
      title="Geschafft"
      onBackdrop={nav.pop}
      right={
        <button className="link" onClick={nav.pop}>
          Fertig
        </button>
      }
      footer={
        <div className="rest-bar">
          <button
            className="btn btn-grey btn-block"
            onClick={() => {
              nav.pop()
              nav.push({ type: 'workout-detail', id })
            }}
          >
            Alle Sätze ansehen
          </button>
        </div>
      }
    >
      {celebrate && <Confetti />}
      <div className="sum-hero">
        <div className="sum-emoji" aria-hidden="true">
          <Icon name="trophy" size={34} />
        </div>
        <h2>{workout.name} erledigt</h2>
        <p className="muted">
          {celebrate
            ? `${sum.records.length} ${sum.records.length === 1 ? 'Rekord' : 'Rekorde'}, ${sum.increased.length} ${sum.increased.length === 1 ? 'Übung' : 'Übungen'} gesteigert`
            : 'Sauber durchgezogen. Konstanz schlägt alles.'}
        </p>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="stat">
          <div className="v">{fmtDuration(workout.end - workout.start)}</div>
          <div className="k">Dauer</div>
        </div>
        <div className="stat">
          <div className="v">{fmtNum(Math.round(sum.volume))}</div>
          <div className="k">kg Volumen</div>
        </div>
        <div className="stat">
          <div className="v">{sum.sets}</div>
          <div className="k">Sätze</div>
        </div>
      </div>

      {sum.previous && (
        <div className="sum-compare">
          <span className="muted small">Im Vergleich zu {relativeDay(sum.previous.date)}</span>
          <div className="row" style={{ gap: 16, marginTop: 6 }}>
            {dv && <span className={`delta ${dv.up ? 'up' : 'down'}`}>Volumen {dv.text}</span>}
            {dr !== null && (
              <span className={`delta ${dr >= 0 ? 'up' : 'down'}`}>
                Wdh. {dr > 0 ? '+' : dr < 0 ? '−' : '±'}
                {Math.abs(dr)}
              </span>
            )}
          </div>
        </div>
      )}

      {sum.records.length > 0 && (
        <>
          <div className="section-head">
            <h3>Neue Rekorde</h3>
          </div>
          <div className="list">
            {sum.records.map((r) => (
              <div className="list-item" key={r.exerciseId}>
                <div className="avatar pr">
                  <Icon name="trophy" size={18} />
                </div>
                <div className="grow">
                  <div className="name">{name(r.exerciseId)}</div>
                  <div className="meta">{recordText(r)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {sum.increased.length > 0 && (
        <>
          <div className="section-head">
            <h3>Gesteigert</h3>
          </div>
          <div className="list">
            {sum.increased.map((x) => (
              <div className="list-item" key={x.exerciseId}>
                <div className="grow name">{name(x.exerciseId)}</div>
                <span className="delta up">
                  {fmtNum(x.from)} → {fmtNum(x.to)} kg
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {sum.readyNext.length > 0 && (
        <div className="sum-next">
          <b>Nächstes Mal mehr Gewicht:</b> {sum.readyNext.map(name).join(', ')}
        </div>
      )}
    </Sheet>
  )
}
