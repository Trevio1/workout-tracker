import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { CATEGORY_LABEL, type Category, type Exercise } from '../types'

interface Props {
  exercises: Exercise[]
  selected?: Set<string>
  onPick: (ex: Exercise) => void
}

const FILTERS: (Category | 'all')[] = ['all', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'cardio', 'other']

export function ExerciseList({ exercises, selected, onPick }: Props) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | 'all'>('all')

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = exercises
      .filter((e) => cat === 'all' || e.category === cat)
      .filter(
        (e) =>
          !needle || e.name.toLowerCase().includes(needle) || e.muscle.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    const map = new Map<string, Exercise[]>()
    for (const e of filtered) {
      const letter = e.name[0]?.toUpperCase() ?? '#'
      const arr = map.get(letter) ?? []
      arr.push(e)
      map.set(letter, arr)
    }
    return [...map.entries()]
  }, [exercises, q, cat])

  return (
    <>
      <div className="search">
        <Icon name="search" size={18} />
        <input
          className="text-input"
          type="search"
          placeholder="Übung suchen"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f} className={`chip${f === cat ? ' on' : ''}`} onClick={() => setCat(f)}>
            {f === 'all' ? 'Alle' : CATEGORY_LABEL[f]}
          </button>
        ))}
      </div>
      {groups.length === 0 && <div className="empty">Keine Übung gefunden.</div>}
      {groups.map(([letter, items]) => (
        <div key={letter}>
          <div className="letter">{letter}</div>
          <div className="list">
            {items.map((e) => {
              const on = selected?.has(e.id) ?? false
              return (
                <button key={e.id} className={`list-item${on ? ' selected' : ''}`} onClick={() => onPick(e)}>
                  <div className="avatar">{on ? <Icon name="check" size={18} stroke={3} /> : e.name[0]}</div>
                  <div className="grow">
                    <div className="name">{e.name}</div>
                    <div className="meta">
                      {CATEGORY_LABEL[e.category]} · {e.muscle}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
