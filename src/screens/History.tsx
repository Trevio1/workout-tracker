import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { db } from '../db'
import { useExercises } from '../hooks'
import { useNav } from '../nav'
import { fmtDay, fmtDuration, fmtMonth, fmtNum, fmtSet } from '../lib/format'
import { e1rm, workoutVolume } from '../lib/stats'
import type { Workout } from '../types'

export function History() {
  const nav = useNav()
  const exercises = useExercises()
  const workouts = useLiveQuery(() => db.workouts.orderBy('start').reverse().toArray(), [])

  const groups = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of workouts ?? []) {
      const key = fmtMonth(w.start)
      const arr = m.get(key) ?? []
      arr.push(w)
      m.set(key, arr)
    }
    return [...m.entries()]
  }, [workouts])

  return (
    <div className="screen">
      <h1 className="screen-title">Verlauf</h1>
      {workouts && workouts.length === 0 && (
        <div className="empty">Noch keine Workouts. Nach deinem ersten Training erscheint es hier.</div>
      )}
      {groups.map(([month, items]) => (
        <div key={month}>
          <div className="letter" style={{ fontSize: 15 }}>
            {month} · {items.length} {items.length === 1 ? 'Workout' : 'Workouts'}
          </div>
          {items.map((w) => (
            <button key={w.id} className="hcard" onClick={() => nav.push({ type: 'workout-detail', id: w.id })}>
              <h4>{w.name}</h4>
              <div className="muted small">{fmtDay(w.start)}</div>
              <div className="hstats">
                <span>
                  <Icon name="clock" size={14} /> {fmtDuration(w.end - w.start)}
                </span>
                <span>
                  <Icon name="weight" size={14} /> {fmtNum(Math.round(workoutVolume(w)))} kg
                </span>
                <span>
                  <Icon name="check" size={14} /> {w.exercises.reduce((n, e) => n + e.sets.length, 0)} Sätze
                </span>
              </div>
              <div className="hlines">
                <div className="hline muted small" style={{ fontWeight: 700 }}>
                  <span>Übung</span>
                  <span>Bester Satz</span>
                </div>
                {w.exercises.map((e) => {
                  const best = [...e.sets]
                    .filter((s) => !s.warmup)
                    .sort((a, b) => e1rm(b.kg, b.reps) - e1rm(a.kg, a.reps) || (b.reps ?? 0) - (a.reps ?? 0))[0]
                  return (
                    <div className="hline" key={e.id}>
                      <span>
                        {e.sets.length} × {exercises.get(e.exerciseId)?.name ?? 'Unbekannt'}
                      </span>
                      <span>{best ? fmtSet(best.kg, best.reps) : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
