import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { EntriesEditor } from '../components/EntriesEditor'
import { useDialogs } from '../components/Dialogs'
import { db } from '../db'
import { useExercises, useSettings, fieldLabels } from '../hooks'
import { useNav } from '../nav'
import { saveAsRoutine } from '../lib/actions'
import { fmtDay, fmtDuration, fmtNum, fmtSet, fmtTime } from '../lib/format'
import { e1rm, workoutVolume } from '../lib/stats'
import type { ExerciseEntry, Workout } from '../types'

export function WorkoutDetail({ id, z }: { id: string; z: number }) {
  const nav = useNav()
  const dialogs = useDialogs()
  const exercises = useExercises()
  const settings = useSettings()
  const workout = useLiveQuery(() => db.workouts.get(id), [id])
  const [editing, setEditing] = useState<Workout | null>(null)
  const [kbOpen, setKbOpen] = useState(false)

  if (!workout) return null

  async function menu(w: Workout) {
    const choice = await dialogs.menu(
      [
        { id: 'edit', label: 'Bearbeiten' },
        { id: 'routine', label: 'Als Routine speichern' },
        { id: 'del', label: 'Workout löschen', danger: true },
      ],
      w.name,
    )
    if (choice === 'edit') setEditing(structuredClone(w))
    if (choice === 'routine') {
      const name = await dialogs.prompt({ title: 'Neue Routine', value: w.name, confirmLabel: 'Anlegen' })
      if (name && name.trim()) {
        const rid = await saveAsRoutine(name.trim(), w.exercises)
        if (!w.routineId) await db.workouts.update(w.id, { routineId: rid })
        dialogs.toast('Routine angelegt')
      }
    }
    if (choice === 'del') {
      const ok = await dialogs.confirm({
        title: 'Workout löschen?',
        message: 'Das lässt sich nicht rückgängig machen.',
        confirmLabel: 'Löschen',
        danger: true,
      })
      if (ok) {
        await db.workouts.delete(w.id)
        nav.pop()
      }
    }
  }

  async function saveEdit() {
    if (!editing) return
    const cleaned: Workout = {
      ...editing,
      exercises: editing.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((s) => s.kg !== null || s.reps !== null).map((s) => ({ ...s, done: true })) }))
        .filter((e) => e.sets.length > 0),
    }
    await db.workouts.put(cleaned)
    setEditing(null)
  }

  if (editing) {
    return (
      <Sheet
        z={z}
        title="Workout bearbeiten"
        bodyClass={kbOpen ? 'kb-open' : ''}
        left={
          <button className="link" onClick={() => setEditing(null)}>
            Abbrechen
          </button>
        }
        right={
          <button className="link" onClick={saveEdit}>
            Sichern
          </button>
        }
      >
        <input
          className="text-input"
          style={{ fontSize: 20, fontWeight: 700, height: 50, marginTop: 6 }}
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
        />
        <textarea
          className="note-input"
          rows={1}
          placeholder="Notizen"
          value={editing.note ?? ''}
          onChange={(e) => setEditing({ ...editing, note: e.target.value })}
        />
        <EntriesEditor
          mode="edit"
          z={z}
          entries={editing.exercises}
          onChange={(ex: ExerciseEntry[]) => setEditing((cur) => (cur ? { ...cur, exercises: ex } : cur))}
          exercises={exercises}
          settings={settings}
          onKeypadChange={setKbOpen}
        />
      </Sheet>
    )
  }

  const w = workout
  const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0)

  return (
    <Sheet
      z={z}
      title={w.name}
      onBackdrop={nav.pop}
      left={
        <button className="link" onClick={nav.pop}>
          Schließen
        </button>
      }
      right={
        <button className="icon-btn" onClick={() => menu(w)} aria-label="Optionen">
          <Icon name="dots" size={20} />
        </button>
      }
    >
      <p className="muted" style={{ margin: '4px 0 12px' }}>
        {fmtDay(w.start)}, {fmtTime(w.start)} Uhr
      </p>
      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="stat">
          <div className="v">{fmtDuration(w.end - w.start)}</div>
          <div className="k">Dauer</div>
        </div>
        <div className="stat">
          <div className="v">{fmtNum(Math.round(workoutVolume(w)))}</div>
          <div className="k">kg Volumen</div>
        </div>
        <div className="stat">
          <div className="v">{totalSets}</div>
          <div className="k">Sätze</div>
        </div>
      </div>
      {w.note && <p style={{ whiteSpace: 'pre-wrap' }}>{w.note}</p>}

      {w.exercises.map((e) => {
        const ex = exercises.get(e.exerciseId)
        const labels = fieldLabels(ex?.category)
        let n = 0
        return (
          <div key={e.id} style={{ marginTop: 22 }}>
            <button className="ex-name" onClick={() => ex && nav.push({ type: 'exercise-detail', id: ex.id })}>
              {ex?.name ?? 'Unbekannte Übung'}
            </button>
            <div className="list" style={{ marginTop: 8 }}>
              {e.sets.map((s) => {
                if (!s.warmup) n += 1
                const est = e1rm(s.kg, s.reps)
                return (
                  <div className="list-item" key={s.id} style={{ padding: '10px 14px' }}>
                    <span className={`set-num${s.warmup ? ' warm' : ''}`} style={{ width: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.warmup ? 'W' : n}
                    </span>
                    <span className="grow" style={{ fontWeight: 600 }}>
                      {fmtSet(s.kg, s.reps, labels.kg.replace('+', ''))}
                    </span>
                    {est > 0 && ex?.category !== 'cardio' && (
                      <span className="muted small">1RM ≈ {fmtNum(Math.round(est * 10) / 10)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </Sheet>
  )
}
