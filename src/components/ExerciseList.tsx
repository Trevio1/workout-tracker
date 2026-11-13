import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { ExerciseThumb } from './ExerciseThumb'
import { englishName, libraryItem } from '../lib/library'
import { normalize } from '../lib/text'
import { CATEGORY_LABEL, type Category, type Exercise } from '../types'

interface Props {
  exercises: Exercise[]
  selected?: Set<string>
  onPick: (ex: Exercise) => void
}

const FILTERS: (Category | 'all')[] = ['all', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'cardio', 'other']
const MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Po', 'Waden', 'Bauch', 'Unterarme', 'Nacken', 'Ganzkörper', 'Cardio']

/** text the search runs against: German name, muscles, aliases and the English source name */
function haystack(e: Exercise): string {
  const lib = libraryItem(e)
  const parts = [e.name, e.muscle]
  if (lib) parts.push(...lib.aliases, englishName(lib), ...lib.primary)
  return parts.map((p) => normalize(p)).join(' ')
}

export function ExerciseList({ exercises, selected, onPick }: Props) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [muscle, setMuscle] = useState<string>('all')

  const index = useMemo(() => new Map(exercises.map((e) => [e.id, haystack(e)])), [exercises])

  const groups = useMemo(() => {
    const words = q.trim().split(/\s+/).map(normalize).filter(Boolean)
    const filtered = exercises
      .filter((e) => cat === 'all' || e.category === cat)
      .filter((e) => muscle === 'all' || e.muscle === muscle)
      .filter((e) => {
        if (words.length === 0) return true
        const h = index.get(e.id) ?? ''
        return words.every((w) => h.includes(w))
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    const map = new Map<string, Exercise[]>()
    for (const e of filtered) {
      const letter = e.name[0]?.toUpperCase() ?? '#'
      const arr = map.get(letter) ?? []
      arr.push(e)
      map.set(letter, arr)
    }
    return { list: [...map.entries()], count: filtered.length }
  }, [exercises, q, cat, muscle, index])

  return (
    <>
      <div className="search">
        <Icon name="search" size={18} />
        <input
          className="text-input"
          type="search"
          placeholder="Übung suchen, auch englisch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f} className={`chip${f === cat ? ' on' : ''}`} onClick={() => setCat(f)}>
            {f === 'all' ? 'Alle Geräte' : CATEGORY_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: -4 }}>
        {['all', ...MUSCLES].map((m) => (
          <button key={m} className={`chip small${m === muscle ? ' on' : ''}`} onClick={() => setMuscle(m)}>
            {m === 'all' ? 'Alle Muskeln' : m}
          </button>
        ))}
      </div>
      <div className="muted small" style={{ margin: '2px 4px 0' }}>
        {groups.count} {groups.count === 1 ? 'Übung' : 'Übungen'}
      </div>
      {groups.list.length === 0 && <div className="empty" style={{ marginTop: 10 }}>Keine Übung gefunden.</div>}
      {groups.list.map(([letter, items]) => (
        <div key={letter}>
          <div className="letter">{letter}</div>
          <div className="list">
            {items.map((e) => {
              const on = selected?.has(e.id) ?? false
              return (
                <button key={e.id} className={`list-item${on ? ' selected' : ''}`} onClick={() => onPick(e)}>
                  <ExerciseThumb exercise={e} selected={on} />
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
