import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from './Sheet'
import { ExerciseList } from './ExerciseList'
import { ExerciseForm } from './ExerciseForm'
import { db } from '../db'

interface Props {
  z: number
  single?: boolean
  onClose: (ids: string[]) => void
}

export function ExercisePicker({ z, single, onClose }: Props) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const toggle = (id: string) => {
    if (single) {
      onClose([id])
      return
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <>
      <Sheet
        z={z}
        title={single ? 'Übung ersetzen' : 'Übungen hinzufügen'}
        onBackdrop={() => onClose([])}
        left={
          <button className="link" onClick={() => onClose([])}>
            Abbrechen
          </button>
        }
        right={
          <button className="link" onClick={() => setCreating(true)}>
            Neu
          </button>
        }
        footer={
          !single && (
            <div className="rest-bar">
              <button
                className="btn btn-primary btn-block"
                disabled={selected.length === 0}
                onClick={() => onClose(selected)}
              >
                {selected.length > 0 ? `Hinzufügen (${selected.length})` : 'Übungen auswählen'}
              </button>
            </div>
          )
        }
      >
        <ExerciseList exercises={exercises} selected={new Set(selected)} onPick={(e) => toggle(e.id)} />
      </Sheet>
      {creating && (
        <ExerciseForm
          z={z + 1}
          onClose={(id) => {
            setCreating(false)
            if (id) toggle(id)
          }}
        />
      )}
    </>
  )
}
