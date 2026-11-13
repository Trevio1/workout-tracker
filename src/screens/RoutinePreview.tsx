import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { db } from '../db'
import { useExercises } from '../hooks'
import { useNav } from '../nav'
import { useStartWorkout } from './Home'
import { fmtDate, fmtSet } from '../lib/format'
import { CATEGORY_LABEL } from '../types'

export function RoutinePreview({ id, z }: { id: string; z: number }) {
  const nav = useNav()
  const exercises = useExercises()
  const start = useStartWorkout()
  const routine = useLiveQuery(() => db.routines.get(id), [id])
  const last = useLiveQuery(
    () => db.workouts.orderBy('start').reverse().filter((w) => w.routineId === id).first(),
    [id],
  )

  if (!routine) return null

  return (
    <Sheet
      z={z}
      title={routine.name}
      onBackdrop={nav.pop}
      left={
        <button className="link" onClick={nav.pop}>
          Schließen
        </button>
      }
      right={
        <button className="link" onClick={() => nav.push({ type: 'routine-edit', id })}>
          Bearbeiten
        </button>
      }
      footer={
        <div className="rest-bar">
          <button
            className="btn btn-primary btn-block"
            onClick={async () => {
              nav.pop()
              await start(routine)
            }}
          >
            Workout starten
          </button>
        </div>
      }
    >
      {last && <p className="muted small">Zuletzt: {fmtDate(last.start)}</p>}
      {routine.note && <p>{routine.note}</p>}
      {routine.exercises.length === 0 && <div className="empty">Diese Routine hat noch keine Übungen.</div>}
      <div className="list" style={{ marginTop: 10 }}>
        {routine.exercises.map((e) => {
          const ex = exercises.get(e.exerciseId)
          const first = e.sets.find((s) => !s.warmup) ?? e.sets[0]
          return (
            <div className="list-item" key={e.id}>
              <div className="avatar">{ex?.name[0] ?? '?'}</div>
              <div className="grow">
                <div className="name">
                  {e.sets.length} × {ex?.name ?? 'Unbekannt'}
                </div>
                <div className="meta">
                  {ex ? CATEGORY_LABEL[ex.category] : ''}
                  {first && (first.kg !== null || first.reps !== null) ? ` · ${fmtSet(first.kg, first.reps)}` : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
