import { useEffect, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { EntriesEditor } from '../components/EntriesEditor'
import { useDialogs } from '../components/Dialogs'
import { db, uid } from '../db'
import { useExercises, useSettings } from '../hooks'
import { useNav } from '../nav'
import type { ExerciseEntry, Routine } from '../types'

export function RoutineEditor({ id, z }: { id?: string; z: number }) {
  const nav = useNav()
  const dialogs = useDialogs()
  const exercises = useExercises()
  const settings = useSettings()
  const [loaded, setLoaded] = useState(!id)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [dirty, setDirty] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    void db.routines.get(id).then((r) => {
      if (r) {
        setName(r.name)
        setNote(r.note ?? '')
        setEntries(r.exercises)
      }
      setLoaded(true)
    })
  }, [id])

  async function save() {
    const trimmed = name.trim() || 'Neue Routine'
    if (id) {
      await db.routines.update(id, { name: trimmed, note: note.trim() || undefined, exercises: entries })
    } else {
      const last = await db.routines.orderBy('order').last()
      const r: Routine = {
        id: uid(),
        name: trimmed,
        note: note.trim() || undefined,
        exercises: entries,
        order: (last?.order ?? 0) + 1,
        createdAt: Date.now(),
      }
      await db.routines.add(r)
    }
    nav.pop()
  }

  async function close() {
    if (dirty) {
      const ok = await dialogs.confirm({
        title: 'Änderungen verwerfen?',
        confirmLabel: 'Verwerfen',
        cancelLabel: 'Weiter bearbeiten',
        danger: true,
      })
      if (!ok) return
    }
    nav.pop()
  }

  if (!loaded) return null

  return (
    <Sheet
      z={z}
      title={id ? 'Routine bearbeiten' : 'Neue Routine'}
      onBackdrop={close}
      bodyClass={kbOpen ? 'kb-open' : ''}
      left={
        <button className="link" onClick={close}>
          Abbrechen
        </button>
      }
      right={
        <button className="link" onClick={save}>
          Sichern
        </button>
      }
    >
      <input
        className="text-input"
        style={{ fontSize: 20, fontWeight: 700, height: 50, marginTop: 6 }}
        placeholder="Name der Routine"
        value={name}
        autoFocus={!id}
        onChange={(e) => {
          setName(e.target.value)
          setDirty(true)
        }}
      />
      <textarea
        className="note-input"
        rows={1}
        placeholder="Notizen"
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setDirty(true)
        }}
      />
      {entries.length === 0 && (
        <p className="muted small" style={{ marginTop: 16 }}>
          Füge Übungen hinzu und trage ein, wie viele Sätze du machen willst. Gewicht und Wiederholungen sind optional,
          beim Training siehst du sowieso deine letzten Werte.
        </p>
      )}
      <EntriesEditor
        mode="plan"
        z={z}
        entries={entries}
        onChange={(e) => {
          setEntries(e)
          setDirty(true)
        }}
        exercises={exercises}
        settings={settings}
        onKeypadChange={setKbOpen}
      />
      {id && (
        <div className="big-actions">
          <button
            className="btn btn-danger-soft btn-block"
            onClick={async () => {
              const ok = await dialogs.confirm({
                title: 'Routine löschen?',
                message: 'Deine bisherigen Workouts bleiben im Verlauf.',
                confirmLabel: 'Löschen',
                danger: true,
              })
              if (!ok) return
              await db.routines.delete(id)
              nav.pop()
              // the preview below would show a deleted routine, so close it too
              const top = nav.stack[nav.stack.length - 2]
              if (top?.type === 'routine-preview' && top.id === id) nav.pop()
            }}
          >
            Routine löschen
          </button>
        </div>
      )}
    </Sheet>
  )
}
