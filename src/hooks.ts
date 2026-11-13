import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS } from './db'
import type { Exercise, Settings } from './types'

export function useExercises(): Map<string, Exercise> {
  const list = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => new Map((list ?? []).map((e) => [e.id, e])), [list])
}

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('settings'), []) ?? DEFAULT_SETTINGS
}

/** Re-renders every `ms` milliseconds while enabled */
export function useNow(ms = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms, enabled])
  return now
}

export function fieldLabels(category: Exercise['category'] | undefined): { kg: string; reps: string } {
  if (category === 'cardio') return { kg: 'km', reps: 'Min.' }
  if (category === 'bodyweight') return { kg: '+kg', reps: 'Wdh.' }
  return { kg: 'kg', reps: 'Wdh.' }
}
