import { useState } from 'react'
import { Sheet } from './Sheet'
import { db, uid } from '../db'
import { CATEGORY_LABEL, type Category, type Exercise } from '../types'

interface Props {
  z: number
  initial?: Exercise
  onClose: (id: string | null) => void
}

const MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Po', 'Waden', 'Bauch', 'Nacken', 'Cardio', 'Ganzkörper']

export function ExerciseForm({ z, initial, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'barbell')
  const [muscle, setMuscle] = useState(initial?.muscle ?? 'Brust')

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (initial) {
      await db.exercises.update(initial.id, { name: trimmed, category, muscle })
      onClose(initial.id)
    } else {
      const id = `ex-custom-${uid()}`
      await db.exercises.add({ id, name: trimmed, category, muscle, custom: true })
      onClose(id)
    }
  }

  return (
    <Sheet
      z={z}
      title={initial ? 'Übung bearbeiten' : 'Neue Übung'}
      onBackdrop={() => onClose(null)}
      left={
        <button className="link" onClick={() => onClose(null)}>
          Abbrechen
        </button>
      }
      right={
        <button className="link" onClick={save} disabled={!name.trim()}>
          Speichern
        </button>
      }
    >
      <p className="group-label">Name</p>
      <input
        className="text-input"
        value={name}
        autoFocus
        placeholder="z. B. Kurzhantel-Rudern einarmig"
        onChange={(e) => setName(e.target.value)}
      />
      <p className="group-label">Art</p>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
          <button key={c} className={`chip${c === category ? ' on' : ''}`} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <p className="group-label">Muskelgruppe</p>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {MUSCLES.map((m) => (
          <button key={m} className={`chip${m === muscle ? ' on' : ''}`} onClick={() => setMuscle(m)}>
            {m}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
