import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { ExerciseList } from '../components/ExerciseList'
import { ExerciseForm } from '../components/ExerciseForm'
import { db } from '../db'
import { useNav } from '../nav'

export function Exercises() {
  const nav = useNav()
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [creating, setCreating] = useState(false)
  return (
    <div className="screen">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="screen-title">Übungen</h1>
        <button className="btn btn-soft btn-sm" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} /> Neu
        </button>
      </div>
      <ExerciseList exercises={exercises} onPick={(e) => nav.push({ type: 'exercise-detail', id: e.id })} />
      {creating && <ExerciseForm z={60} onClose={() => setCreating(false)} />}
    </div>
  )
}
