import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { LineChart } from '../components/LineChart'
import { ExerciseForm } from '../components/ExerciseForm'
import { useDialogs } from '../components/Dialogs'
import { db } from '../db'
import { fieldLabels } from '../hooks'
import { useNav } from '../nav'
import { fmtDate, fmtNum, fmtSet } from '../lib/format'
import { sessionsFor } from '../lib/stats'
import { CATEGORY_LABEL } from '../types'

type Metric = 'maxKg' | 'bestE1rm' | 'volume' | 'reps'

export function ExerciseDetail({ id, z }: { id: string; z: number }) {
  const nav = useNav()
  const dialogs = useDialogs()
  const ex = useLiveQuery(() => db.exercises.get(id), [id])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const [metric, setMetric] = useState<Metric | null>(null)
  const [editing, setEditing] = useState(false)

  const sessions = useMemo(() => sessionsFor(id, workouts ?? []), [id, workouts])

  if (!ex) return null
  const labels = fieldLabels(ex.category)
  const weighted = ex.category !== 'bodyweight' && ex.category !== 'cardio'
  const m: Metric = metric ?? (weighted ? 'bestE1rm' : 'reps')

  const metrics: { id: Metric; label: string; unit: string }[] = weighted
    ? [
        { id: 'bestE1rm', label: '1RM (geschätzt)', unit: 'kg' },
        { id: 'maxKg', label: 'Max. Gewicht', unit: 'kg' },
        { id: 'volume', label: 'Volumen', unit: 'kg' },
      ]
    : [
        { id: 'reps', label: ex.category === 'cardio' ? 'Minuten' : 'Wiederholungen', unit: labels.reps },
        { id: 'maxKg', label: ex.category === 'cardio' ? 'Distanz' : 'Zusatzgewicht', unit: labels.kg.replace('+', '') },
      ]
  const cur = metrics.find((x) => x.id === m) ?? metrics[0]

  const points = sessions
    .map((s) => ({
      x: s.date,
      y:
        cur.id === 'reps'
          ? s.sets.filter((x) => !x.warmup).reduce((n, x) => n + (x.reps ?? 0), 0)
          : s[cur.id],
    }))
    .filter((p) => p.y > 0)

  const bestKg = Math.max(0, ...sessions.map((s) => s.maxKg))
  const best1rm = Math.max(0, ...sessions.map((s) => s.bestE1rm))
  const bestVol = Math.max(0, ...sessions.map((s) => s.volume))
  const bestReps = Math.max(0, ...sessions.flatMap((s) => s.sets.map((x) => x.reps ?? 0)))

  async function menu() {
    if (!ex) return
    const choice = await dialogs.menu(
      [
        { id: 'note', label: ex.note ? 'Notiz bearbeiten' : 'Notiz anheften' },
        ...(ex.custom ? [{ id: 'edit', label: 'Übung bearbeiten' }] : []),
        ...(ex.custom && sessions.length === 0 ? [{ id: 'del', label: 'Übung löschen', danger: true }] : []),
      ],
      ex.name,
    )
    if (choice === 'note') await editNote()
    if (choice === 'edit') setEditing(true)
    if (choice === 'del') {
      const ok = await dialogs.confirm({ title: 'Übung löschen?', confirmLabel: 'Löschen', danger: true })
      if (ok) {
        await db.exercises.delete(ex.id)
        nav.pop()
      }
    }
  }

  async function editNote() {
    if (!ex) return
    const v = await dialogs.prompt({
      title: 'Notiz zur Übung',
      message: 'Wird bei jedem Workout mit dieser Übung angezeigt.',
      value: ex.note ?? '',
      multiline: true,
    })
    if (v !== null) await db.exercises.update(ex.id, { note: v.trim() || undefined })
  }

  return (
    <>
      <Sheet
        z={z}
        title={ex.name}
        onBackdrop={nav.pop}
        left={
          <button className="link" onClick={nav.pop}>
            Schließen
          </button>
        }
        right={
          <button className="icon-btn" onClick={menu} aria-label="Optionen">
            <Icon name="dots" size={20} />
          </button>
        }
      >
        <p className="muted" style={{ margin: '4px 0 12px' }}>
          {CATEGORY_LABEL[ex.category]} · {ex.muscle}
        </p>
        {ex.note ? (
          <button className="pin-note" style={{ marginBottom: 14 }} onClick={editNote}>
            <span>{ex.note}</span>
            <span className="pin">
              <Icon name="pin" size={16} />
            </span>
          </button>
        ) : (
          <button className="btn btn-grey btn-sm" style={{ marginBottom: 14 }} onClick={editNote}>
            <Icon name="pin" size={16} /> Notiz anheften
          </button>
        )}

        {sessions.length === 0 ? (
          <div className="empty">Diese Übung hast du noch nicht gemacht. Nach dem ersten Workout siehst du hier deinen Fortschritt.</div>
        ) : (
          <>
            <div className="seg">
              {metrics.map((x) => (
                <button key={x.id} className={x.id === cur.id ? 'on' : ''} onClick={() => setMetric(x.id)}>
                  {x.label}
                </button>
              ))}
            </div>
            <LineChart points={points} unit={cur.unit} />

            <div className="section-head">
              <h3>Rekorde</h3>
            </div>
            <div className="stat-grid">
              {weighted ? (
                <>
                  <div className="stat">
                    <div className="v">{fmtNum(Math.round(best1rm * 10) / 10)} kg</div>
                    <div className="k">Geschätztes 1RM</div>
                  </div>
                  <div className="stat">
                    <div className="v">{fmtNum(bestKg)} kg</div>
                    <div className="k">Max. Gewicht</div>
                  </div>
                  <div className="stat">
                    <div className="v">{fmtNum(Math.round(bestVol))} kg</div>
                    <div className="k">Max. Volumen (Einheit)</div>
                  </div>
                </>
              ) : (
                <div className="stat">
                  <div className="v">{fmtNum(bestReps)}</div>
                  <div className="k">Beste {labels.reps}</div>
                </div>
              )}
              <div className="stat">
                <div className="v">{sessions.length}</div>
                <div className="k">Einheiten</div>
              </div>
            </div>

            <div className="section-head">
              <h3>Verlauf</h3>
            </div>
            {[...sessions].reverse().map((s) => (
              <button
                key={s.workoutId + s.date}
                className="hcard"
                onClick={() => nav.push({ type: 'workout-detail', id: s.workoutId })}
              >
                <div className="row">
                  <b>{s.name}</b>
                  <span className="spacer" />
                  <span className="muted small">{fmtDate(s.date)}</span>
                </div>
                <div className="hlines" style={{ marginTop: 6 }}>
                  {s.sets.map((x, i) => (
                    <div className="hline" key={x.id + i}>
                      <span>{x.warmup ? 'W' : i + 1 - s.sets.slice(0, i).filter((y) => y.warmup).length}</span>
                      <span style={{ color: 'var(--text)' }}>{fmtSet(x.kg, x.reps, labels.kg.replace('+', ''))}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </>
        )}
      </Sheet>
      {editing && <ExerciseForm z={z + 1} initial={ex} onClose={() => setEditing(false)} />}
    </>
  )
}
